import { NextResponse } from 'next/server';
import { PrismaClient, EstadoAprobacionCombustible } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ==========================================
// 1. POST: Recibe y guarda datos del celular
// ==========================================
export async function POST(request: Request) {
  try {
    // 1. Validación de Sesión y Usuario
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'No autorizado. Por favor, inicia sesión.' }, { status: 401 });
    }
    const usuarioId = parseInt(session.user.id);

    // 2. Parseo de FormData
    const formData = await request.formData();
    const vehiculoId = formData.get('vehiculoId') as string;
    const kilometraje = formData.get('kilometraje') as string;
    const litros = formData.get('litros') as string;
    const importe = formData.get('importe') as string;
    const esExcepcionStr = formData.get('esExcepcion') as string;
    const esExcepcion = esExcepcionStr === 'true';
    const justificacion = formData.get('justificacion') as string | null;
    const preautorizacionId = formData.get('preautorizacionId') as string | null;
    
    // Evidencia puede venir como archivo File o texto base64, o nada
    const evidenciaFile = formData.get('evidencia') as File | null;
    const evidenciaBase64 = formData.get('evidenciaBase64') as string | null;

    // 3. Validación de Entrada (Input Validation)
    if (!vehiculoId || !kilometraje || !litros || !importe) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (vehiculoId, kilometraje, litros, importe).' }, { status: 400 });
    }

    const kilometrajeNuevo = parseInt(kilometraje);
    const litrosSolicitados = parseFloat(litros);
    const costoTotal = parseFloat(importe);

    if (isNaN(kilometrajeNuevo) || isNaN(litrosSolicitados) || isNaN(costoTotal)) {
      return NextResponse.json({ error: 'Formatos de número inválidos.' }, { status: 400 });
    }

    // 4. Validación de Lógica de Negocio (Vehículo)
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id: vehiculoId }
    });

    if (!vehiculo) {
      return NextResponse.json({ error: 'El vehículo especificado no existe en el sistema.' }, { status: 404 });
    }

    if (kilometrajeNuevo <= vehiculo.kilometrajeActual) {
      return NextResponse.json({ error: `Fraude o error detectado: El kilometraje ingresado (${kilometrajeNuevo}) no puede ser menor o igual al actual (${vehiculo.kilometrajeActual}).` }, { status: 400 });
    }

    // 5. Manejo de Evidencia Real (Guardado de Archivo)
    let rutaEvidenciaFinal = "/uploads/ticket_placeholder.jpg"; // Fallback por si no envían nada (pruebas)
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'tickets');
    
    try {
      await mkdir(uploadDir, { recursive: true }); // Crear carpeta si no existe
    } catch (e) {
      // Ignorar error si ya existe la carpeta
    }

    if (evidenciaFile && evidenciaFile.size > 0) {
      const bytes = await evidenciaFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `ticket_${Date.now()}_${evidenciaFile.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, buffer);
      rutaEvidenciaFinal = `/uploads/tickets/${fileName}`;
    } else if (evidenciaBase64) {
      // Si la app móvil lo manda en base64
      const base64Data = evidenciaBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `ticket_${Date.now()}.jpg`;
      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, buffer);
      rutaEvidenciaFinal = `/uploads/tickets/${fileName}`;
    }

    // 6. Validación Estricta de Preautorización
    let estadoAprobacion: EstadoAprobacionCombustible = esExcepcion ? 'PENDIENTE_REVISION' : 'APROBADA';

    if (preautorizacionId) {
      const preauth = await prisma.preautorizacionCombustible.findUnique({
        where: { id: preautorizacionId }
      });

      if (!preauth) {
        return NextResponse.json({ error: 'La preautorización no existe.' }, { status: 400 });
      }
      
      if (preauth.estado !== 'ACTIVA') {
        return NextResponse.json({ error: 'La preautorización ya fue usada o está cancelada.' }, { status: 400 });
      }

      if (new Date() > new Date(preauth.horaFin)) {
        return NextResponse.json({ error: 'El tiempo límite de la preautorización ha caducado.' }, { status: 400 });
      }

      const litrosAutorizados = parseFloat(preauth.litros.toString());

      if (litrosSolicitados > litrosAutorizados) {
         return NextResponse.json({ error: `La recarga supera el límite preautorizado de ${litrosAutorizados} L.` }, { status: 400 });
      }

      estadoAprobacion = 'APROBADA'; 
    }

    // 7. Transacción a Base de Datos
    const transactionActions = [
      prisma.registroCombustible.create({
        data: {
          vehiculoId: vehiculoId,
          usuarioId: usuarioId, // Ahora es el usuario real
          kilometraje: kilometrajeNuevo,
          litrosCargados: litrosSolicitados,
          costoTotal: costoTotal,
          rutaEvidencia: rutaEvidenciaFinal,
          esExcepcion: esExcepcion,
          justificacion: justificacion || null,
          estadoAprobacion: estadoAprobacion,
          preautorizacionId: preautorizacionId || null
        }
      }),
      prisma.vehiculo.update({
        where: { id: vehiculoId },
        data: { kilometrajeActual: kilometrajeNuevo }
      })
    ];

    if (preautorizacionId) {
      transactionActions.push(
        prisma.preautorizacionCombustible.update({
          where: { id: preautorizacionId },
          data: { estado: 'USADA' }
        }) as any
      );
    }

    const [nuevoRegistro] = await prisma.$transaction(transactionActions);

    const registroSerializado = {
      ...nuevoRegistro,
      id: nuevoRegistro.id.toString(),
    };

    return NextResponse.json({ success: true, registro: registroSerializado }, { status: 201 });

  } catch (error) {
    console.error("Error al guardar la recarga de combustible:", error);
    return NextResponse.json(
      { error: 'Ocurrió un error al guardar en la base de datos.' },
      { status: 500 }
    );
  }
}

// ==========================================
// 2. GET: Envía los datos reales al Dashboard
// ==========================================
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Agregamos paginación defensiva para no tumbar la base de datos
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const take = limit ? parseInt(limit) : 100; // Traer máximo 100 por defecto

    const registros = await prisma.registroCombustible.findMany({
      orderBy: { fechaCarga: 'desc' },
      take: take,
      include: { 
        vehiculo: true,
        usuario: true // Traemos el usuario real que hizo la carga
      },
    });

    const serializados = registros.map(r => ({
      ...r,
      id: r.id.toString(),
      fechaCarga: r.fechaCarga ? new Date(r.fechaCarga).toISOString() : null,
      usuario: r.usuario ? {
        id: r.usuario.id,
        nombre: r.usuario.nombre,
      } : null
    }));

    return NextResponse.json(serializados);
  } catch (error) {
    console.error("Error al consultar recargas:", error);
    return NextResponse.json({ error: 'Error al consultar la base de datos.' }, { status: 500 });
  }
}

// ==========================================
// 3. PATCH: Actualiza el estado (Aprobar/Rechazar)
// ==========================================
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Aquí podrías agregar validación extra: if (session.user.rolName !== 'Administrador') return 403

    const body = await request.json();
    const { id, estadoAprobacion } = body;

    if (!id || !estadoAprobacion) {
      return NextResponse.json({ error: 'Faltan datos obligatorios.' }, { status: 400 });
    }

    let bigIntId;
    try {
      bigIntId = BigInt(id);
    } catch (e) {
      return NextResponse.json({ error: 'Formato de ID inválido.' }, { status: 400 });
    }

    const registroActualizado = await prisma.registroCombustible.update({
      where: { id: bigIntId }, 
      data: { estadoAprobacion: estadoAprobacion }
    });

    const registroSerializado = {
      ...registroActualizado,
      id: registroActualizado.id.toString(),
      vehiculoId: registroActualizado.vehiculoId.toString()
    };

    return NextResponse.json({ 
      success: true, 
      registro: registroSerializado 
    });
  } catch (error) {
    console.error("Error al actualizar la petición:", error);
    return NextResponse.json({ error: 'Error al actualizar en la base de datos.' }, { status: 500 });
  }
}