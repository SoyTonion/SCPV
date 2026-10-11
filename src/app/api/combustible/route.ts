import { NextResponse } from 'next/server';
import { EstadoAprobacionCombustible } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';

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
    const kilometrajeOcr = formData.get('kilometrajeOcr') as string;
    
    const litros = formData.get('litros') as string;
    const litrosOcr = formData.get('litrosOcr') as string;
    
    const importe = formData.get('importe') as string;
    const importeOcr = formData.get('importeOcr') as string;
    const esExcepcionStr = formData.get('esExcepcion') as string;
    const esExcepcion = esExcepcionStr === 'true';
    const falsoPositivoStr = formData.get('falsoPositivo') as string;
    const falsoPositivo = falsoPositivoStr === 'true';
    
    const justificacionOriginal = formData.get('justificacion') as string | null;
    const justificacion = falsoPositivo 
      ? `[REVISIÓN REQUERIDA POR IA] Los valores extraídos por la Inteligencia Artificial fueron modificados manualmente por el chofer. ${justificacionOriginal || ''}`
      : justificacionOriginal;

    const preautorizacionId = formData.get('preautorizacionId') as string | null;
    
    // Evidencia de Ticket
    const evidenciaFile = formData.get('evidencia') as File | null;
    const evidenciaBase64 = formData.get('evidenciaBase64') as string | null;

    // Evidencia de Odómetro
    const evidenciaOdometroFile = formData.get('evidenciaOdometro') as File | null;
    const evidenciaOdometroBase64 = formData.get('evidenciaOdometroBase64') as string | null;

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
      return NextResponse.json({ error: `Fraude o error detectado: El kilometraje ingresado (${kilometrajeNuevo}) no puede ser menor o igual al actual registrado (${vehiculo.kilometrajeActual}).` }, { status: 400 });
    }

    // 4.1. Detección de Sobrellenado de Tanque Físico
    let alertaTanque = false;
    let textoAlertaTanque = '';
    if (vehiculo.capacidadTanque) {
      const capTanqueNum = parseFloat(vehiculo.capacidadTanque.toString());
      if (capTanqueNum > 0 && litrosSolicitados > capTanqueNum * 1.10) { // Margen de tolerancia del 10%
        alertaTanque = true;
        textoAlertaTanque = `[TIPO_D] SOBRECARGA_VOLUMETRICA (${litrosSolicitados} L en tanque de ${capTanqueNum} L)`;
      }
    }

    // 4.2. Cálculo Automático de Rendimiento (km/L) entre cargas
    const ultimaCargaPrevia = await prisma.registroCombustible.findFirst({
      where: {
        vehiculoId: vehiculoId,
        estadoAprobacion: { in: ['APROBADA', 'PENDIENTE_REVISION'] }
      },
      orderBy: { fechaCarga: 'desc' }
    });

    let rendimientoCalculado: number | null = null;
    let alertaRendimiento = false;
    let textoAlertaRendimiento = '';

    if (ultimaCargaPrevia && ultimaCargaPrevia.kilometraje) {
      const kmRecorridos = kilometrajeNuevo - ultimaCargaPrevia.kilometraje;
      if (kmRecorridos > 0 && litrosSolicitados > 0) {
        rendimientoCalculado = parseFloat((kmRecorridos / litrosSolicitados).toFixed(2));

        if (rendimientoCalculado < 3.0) {
          alertaRendimiento = true;
          textoAlertaRendimiento = `[TIPO_D] RENDIMIENTO_CRITICO_BAJO (${rendimientoCalculado} km/L con ${kmRecorridos} km recorridos)`;
        } else if (rendimientoCalculado > 25.0) {
          alertaRendimiento = true;
          textoAlertaRendimiento = `[TIPO_D] RENDIMIENTO_IMPOSIBLE_ALTO (${rendimientoCalculado} km/L con ${kmRecorridos} km recorridos)`;
        }
      }
    }

    // Consolidación de Requerimiento de Auditoría
    const requiereRevisionManual = esExcepcion || falsoPositivo || alertaTanque || alertaRendimiento;

    // Construcción de la Justificación Integral
    const alertasExtra = [textoAlertaTanque, textoAlertaRendimiento].filter(Boolean);
    let justificacionFinal = justificacion || '';
    if (alertasExtra.length > 0) {
      justificacionFinal = `${alertasExtra.join(', ')} | ${justificacionFinal}`.trim();
    }

    // 5. Manejo de Evidencias Reales (Guardado de Archivos)
    let rutaEvidenciaFinal = "/uploads/ticket_placeholder.jpg"; 
    let rutaEvidenciaOdometroFinal = null;

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'tickets');
    const uploadDirOdo = join(process.cwd(), 'public', 'uploads', 'odometros');
    
    try {
      await mkdir(uploadDir, { recursive: true });
      await mkdir(uploadDirOdo, { recursive: true });
    } catch (e) {
      // Ignorar si ya existe
    }

    // --- Guardar Ticket ---
    if (evidenciaFile && evidenciaFile.size > 0) {
      const bytes = await evidenciaFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `ticket_${Date.now()}_${evidenciaFile.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, buffer);
      rutaEvidenciaFinal = `/uploads/tickets/${fileName}`;
    } else if (evidenciaBase64) {
      const base64Data = evidenciaBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `ticket_${Date.now()}.jpg`;
      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, buffer);
      rutaEvidenciaFinal = `/uploads/tickets/${fileName}`;
    }

    // --- Guardar Odómetro ---
    if (evidenciaOdometroFile && evidenciaOdometroFile.size > 0) {
      const bytes = await evidenciaOdometroFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `odo_${Date.now()}_${evidenciaOdometroFile.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      const filePath = join(uploadDirOdo, fileName);
      await writeFile(filePath, buffer);
      rutaEvidenciaOdometroFinal = `/uploads/odometros/${fileName}`;
    } else if (evidenciaOdometroBase64) {
      const base64Data = evidenciaOdometroBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `odo_${Date.now()}.jpg`;
      const filePath = join(uploadDirOdo, fileName);
      await writeFile(filePath, buffer);
      rutaEvidenciaOdometroFinal = `/uploads/odometros/${fileName}`;
    }

    // 6. Validación Estricta de Preautorización
    let estadoAprobacion: EstadoAprobacionCombustible = requiereRevisionManual ? 'PENDIENTE_REVISION' : 'APROBADA';

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
          usuarioId: usuarioId,
          kilometraje: kilometrajeNuevo,
          kilometrajeOcr: kilometrajeOcr ? parseInt(kilometrajeOcr) : null,
          litrosCargados: litrosSolicitados,
          litrosOcr: litrosOcr ? parseFloat(litrosOcr) : null,
          costoTotal: costoTotal,
          costoOcr: importeOcr ? parseFloat(importeOcr) : null,
          rutaEvidencia: rutaEvidenciaFinal,
          rutaEvidenciaOdometro: rutaEvidenciaOdometroFinal,
          rendimientoKmL: rendimientoCalculado,
          esExcepcion: requiereRevisionManual,
          justificacion: justificacionFinal || null,
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
// 2. GET: Envía los datos reales al Dashboard y Mesa de Control
// ==========================================
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const take = limit ? parseInt(limit) : 200;

    const registros = await prisma.registroCombustible.findMany({
      orderBy: { fechaCarga: 'desc' },
      take: take,
      include: { 
        vehiculo: true,
        usuario: true
      },
    });

    const serializados = registros.map(r => ({
      ...r,
      id: r.id.toString(),
      fechaCarga: r.fechaCarga ? new Date(r.fechaCarga).toISOString() : null,
      litrosCargados: Number(r.litrosCargados),
      costoTotal: Number(r.costoTotal),
      litrosOcr: r.litrosOcr ? Number(r.litrosOcr) : null,
      costoOcr: r.costoOcr ? Number(r.costoOcr) : null,
      rendimientoKmL: r.rendimientoKmL ? Number(r.rendimientoKmL) : null,
      vehiculo: {
        ...r.vehiculo,
        capacidadTanque: r.vehiculo.capacidadTanque ? Number(r.vehiculo.capacidadTanque) : null,
        limiteMensualLitros: r.vehiculo.limiteMensualLitros ? Number(r.vehiculo.limiteMensualLitros) : null
      },
      usuario: r.usuario ? {
        id: r.usuario.id,
        nombre: r.usuario.nombre,
        usuario: r.usuario.usuario,
        telefono: r.usuario.telefono || 'Sin teléfono',
        rpe: r.usuario.rpe || 'S/RPE',
        email: r.usuario.email
      } : null
    }));

    return NextResponse.json(serializados);
  } catch (error) {
    console.error("Error al consultar recargas:", error);
    return NextResponse.json({ error: 'Error al consultar la base de datos.' }, { status: 500 });
  }
}

// ==========================================
// 3. PATCH: Actualiza el estado (Aprobar/Corregir/Rechazar)
// ==========================================
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, estadoAprobacion, kilometraje, litrosCargados, costoTotal, motivoRechazo } = body;

    if (!id || !estadoAprobacion) {
      return NextResponse.json({ error: 'Faltan datos obligatorios.' }, { status: 400 });
    }

    let bigIntId: bigint;
    try {
      bigIntId = BigInt(id);
    } catch (e) {
      return NextResponse.json({ error: 'Formato de ID inválido.' }, { status: 400 });
    }

    // 1. Obtener el registro actual para conocer su estado previo y vehículo
    const registroActual = await prisma.registroCombustible.findUnique({
      where: { id: bigIntId },
      include: { vehiculo: true }
    });

    if (!registroActual) {
      return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
    }

    const dataToUpdate: any = { estadoAprobacion };

    // ============================================================
    // CASO A: RECHAZO DE LA AUDITORÍA (Fraude / Error Crítico)
    // ============================================================
    if (estadoAprobacion === 'RECHAZADA') {
      const notaRechazo = motivoRechazo 
        ? `[MOTIVO_RECHAZO]: ${motivoRechazo}`
        : `[RECHAZADO_POR_AUDITORIA]`;
      
      dataToUpdate.justificacion = registroActual.justificacion
        ? `${registroActual.justificacion} | ${notaRechazo}`
        : notaRechazo;

      // REVERSIÓN DE ODÓMETRO:
      // Buscamos la última carga legítima APROBADA anterior para restaurar el kilometraje del vehículo
      const ultimaCargaValida = await prisma.registroCombustible.findFirst({
        where: {
          vehiculoId: registroActual.vehiculoId,
          id: { not: bigIntId },
          estadoAprobacion: 'APROBADA'
        },
        orderBy: { fechaCarga: 'desc' }
      });

      const operaciones = [
        prisma.registroCombustible.update({
          where: { id: bigIntId },
          data: dataToUpdate
        })
      ];

      // Si encontramos una carga válida previa y el vehículo tenía el odómetro de este registro rechazado, lo revertimos
      if (ultimaCargaValida && registroActual.vehiculo.kilometrajeActual === registroActual.kilometraje) {
        operaciones.push(
          prisma.vehiculo.update({
            where: { id: registroActual.vehiculoId },
            data: { kilometrajeActual: ultimaCargaValida.kilometraje }
          }) as any
        );
      }

      const [registroActualizado] = await prisma.$transaction(operaciones);

      return NextResponse.json({
        success: true,
        registro: {
          ...registroActualizado,
          id: registroActualizado.id.toString(),
          vehiculoId: registroActualizado.vehiculoId.toString()
        },
        mensaje: 'Registro rechazado exitosamente. Odómetro verificado y restaurado.'
      });
    }

    // ============================================================
    // CASO B: APROBACIÓN / CORRECCIÓN DE LA SECRETARÍA
    // ============================================================
    let huboCorreccion = false;

    if (kilometraje !== undefined && parseInt(kilometraje) !== registroActual.kilometraje) {
      dataToUpdate.kilometraje = parseInt(kilometraje);
      huboCorreccion = true;
    }

    if (litrosCargados !== undefined && parseFloat(litrosCargados) !== Number(registroActual.litrosCargados)) {
      dataToUpdate.litrosCargados = parseFloat(litrosCargados);
      huboCorreccion = true;
    }

    if (costoTotal !== undefined && parseFloat(costoTotal) !== Number(registroActual.costoTotal)) {
      dataToUpdate.costoTotal = parseFloat(costoTotal);
      huboCorreccion = true;
    }

    if (huboCorreccion) {
      const notaCorreccion = '[CORREGIDO_POR_SECRETARIA]';
      dataToUpdate.justificacion = registroActual.justificacion
        ? `${registroActual.justificacion} | ${notaCorreccion}`
        : notaCorreccion;

      // Recalcular rendimiento si se corrigieron km o litros
      const kmFinal = dataToUpdate.kilometraje ?? registroActual.kilometraje;
      const litrosFinal = dataToUpdate.litrosCargados ?? Number(registroActual.litrosCargados);
      
      const cargaPrevia = await prisma.registroCombustible.findFirst({
        where: {
          vehiculoId: registroActual.vehiculoId,
          id: { not: bigIntId },
          estadoAprobacion: 'APROBADA',
          fechaCarga: { lte: registroActual.fechaCarga }
        },
        orderBy: { fechaCarga: 'desc' }
      });

      if (cargaPrevia && kmFinal > cargaPrevia.kilometraje && litrosFinal > 0) {
        dataToUpdate.rendimientoKmL = parseFloat(((kmFinal - cargaPrevia.kilometraje) / litrosFinal).toFixed(2));
      }
    }

    const operacionesAprobar = [
      prisma.registroCombustible.update({
        where: { id: bigIntId },
        data: dataToUpdate
      })
    ];

    // Si se modificó el kilometraje, actualizar el vehículo
    if (dataToUpdate.kilometraje) {
      operacionesAprobar.push(
        prisma.vehiculo.update({
          where: { id: registroActual.vehiculoId },
          data: { kilometrajeActual: dataToUpdate.kilometraje }
        }) as any
      );
    }

    const [registroAprobado] = await prisma.$transaction(operacionesAprobar);

    return NextResponse.json({
      success: true,
      registro: {
        ...registroAprobado,
        id: registroAprobado.id.toString(),
        vehiculoId: registroAprobado.vehiculoId.toString()
      },
      mensaje: huboCorreccion ? 'Registro corregido y aprobado exitosamente.' : 'Registro aprobado.'
    });

  } catch (error) {
    console.error("Error al actualizar la petición:", error);
    return NextResponse.json({ error: 'Error al actualizar en la base de datos.' }, { status: 500 });
  }
}