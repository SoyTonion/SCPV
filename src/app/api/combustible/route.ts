import { NextResponse } from 'next/server';
import { PrismaClient, EstadoAprobacionCombustible } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ==========================================
// 1. POST: Recibe y guarda datos del celular
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // 🆕 [NUEVO CFE] Recibimos también si es excepción y su justificación, y preautorizacionId si aplica
    const { vehiculoId, kilometraje, litros, importe, esExcepcion, justificacion, preautorizacionId } = body;

    const rutaFalsaEvidencia = "/uploads/ticket_" + Date.now() + ".jpg";
    const kilometrajeNuevo = parseInt(kilometraje);

    // 🆕 [NUEVO CFE] Validación Estricta de Preautorización
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

      const litrosSolicitados = parseFloat(litros);
      const litrosAutorizados = parseFloat(preauth.litros.toString());

      if (litrosSolicitados > litrosAutorizados) {
         return NextResponse.json({ error: `La recarga supera el límite preautorizado de ${litrosAutorizados} L.` }, { status: 400 });
      }

      estadoAprobacion = 'APROBADA'; // Si pasa todas las validaciones, se auto-aprueba
    }

    const transactionActions = [
      // Acción 1: Guardamos el ticket de combustible en la bitácora
      prisma.registroCombustible.create({
        data: {
          vehiculoId: vehiculoId,
          usuarioId: 1, 
          kilometraje: kilometrajeNuevo,
          litrosCargados: parseFloat(litros),
          costoTotal: parseFloat(importe),
          rutaEvidencia: rutaFalsaEvidencia,
          
          // 🆕 [NUEVO CFE] Guardamos los datos de la excepción
          esExcepcion: esExcepcion || false,
          justificacion: justificacion || null,
          estadoAprobacion: estadoAprobacion,
          preautorizacionId: preautorizacionId || null
        }
      }),
      // Acción 2: Le actualizamos el odómetro al vehículo para bloquear fraudes futuros
      prisma.vehiculo.update({
        where: { id: vehiculoId },
        data: { kilometrajeActual: kilometrajeNuevo }
      })
    ];

    // Acción 3: Si se usó una preautorización, la marcamos como USADA
    if (preautorizacionId) {
      transactionActions.push(
        prisma.preautorizacionCombustible.update({
          where: { id: preautorizacionId },
          data: { estado: 'USADA' }
        }) as any
      );
    }

    // Usamos una "Transacción" para ejecutar todas las acciones al mismo tiempo
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
export async function GET() {
  try {
    // Ordenamos por 'fechaCarga' como está definido en tu schema.prisma
    const registros = await prisma.registroCombustible.findMany({
      orderBy: { fechaCarga: 'desc' },
      include: { vehiculo: true },
    });

    // Serializamos BigInts y fechas
    const serializados = registros.map(r => ({
      ...r,
      id: r.id.toString(),
      fechaCarga: r.fechaCarga ? new Date(r.fechaCarga).toISOString() : null,
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
    const body = await request.json();
    const { id, estadoAprobacion } = body;

    if (!id || !estadoAprobacion) {
      return NextResponse.json({ error: 'Faltan datos obligatorios.' }, { status: 400 });
    }

    // Actualizamos el estado en la base de datos
    // Nota: Como tus IDs usan BigInt, lo convertimos usando BigInt(id)
    const registroActualizado = await prisma.registroCombustible.update({
      where: { id: BigInt(id) }, 
      data: { estadoAprobacion: estadoAprobacion }
    });

    // Serializamos el BigInt de regreso a String para que React lo entienda
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