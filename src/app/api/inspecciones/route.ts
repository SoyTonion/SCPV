import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/inspecciones?limite=20&estado=NORMAL|ADVERTENCIA|CRITICO
// Devuelve inspecciones físicas con datos del vehículo e inspector
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') as 'NORMAL' | 'ADVERTENCIA' | 'CRITICO' | null;
    const limite = Math.min(parseInt(searchParams.get('limite') ?? '20'), 100);

    const inspecciones = await prisma.inspeccionFisica.findMany({
      where: estado ? { estadoGeneral: estado } : undefined,
      orderBy: { fechaHora: 'desc' },
      take: limite,
      include: {
        vehiculo:  { select: { id: true, economico: true, marcaVehiculo: true, submarcaVehiculo: true, placas: true } },
        inspector: { select: { id: true, nombre: true } },
        hallazgos: { select: { id: true, componente: true, tipo: true, confianza: true } },
        _count:    { select: { fotografias: true, hallazgos: true } },
      },
    });

    // KPIs
    const [total, normales, advertencias, criticos] = await Promise.all([
      prisma.inspeccionFisica.count(),
      prisma.inspeccionFisica.count({ where: { estadoGeneral: 'NORMAL'      } }),
      prisma.inspeccionFisica.count({ where: { estadoGeneral: 'ADVERTENCIA' } }),
      prisma.inspeccionFisica.count({ where: { estadoGeneral: 'CRITICO'     } }),
    ]);

    const serializadas = inspecciones.map(i => ({
      ...i,
      id:          i.id.toString(),
      inspectorId: i.inspectorId,
      vehiculoId:  i.vehiculoId,
      puntaje:     i.puntaje ? Number(i.puntaje) : null,
      hallazgos:   i.hallazgos.map(h => ({ ...h, id: h.id.toString(), confianza: Number(h.confianza) })),
    }));

    return NextResponse.json({ inspecciones: serializadas, kpis: { total, normales, advertencias, criticos } });

  } catch (error) {
    console.error('Error al consultar inspecciones:', error);
    return NextResponse.json({ error: 'Error al consultar la base de datos.' }, { status: 500 });
  }
}

// POST /api/inspecciones
// Recibe los datos validados por el operador (Human-in-the-Loop) y genera el resumen IA.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const data = await request.json();
    const { vehiculoId, estadoGeneral, observaciones, fotografias, hallazgos } = data;

    if (!vehiculoId || !estadoGeneral) {
      return NextResponse.json({ error: 'vehiculoId y estadoGeneral son obligatorios.' }, { status: 400 });
    }

    // 1. (IA Ligera) - Generar resumen automático basado en los hallazgos validados
    let resumenIa = 'Inspección validada manualmente sin anomalías graves detectadas.';
    
    if (hallazgos && hallazgos.length > 0) {
      const prompt = `Actúa como un perito vehicular. Genera un resumen ejecutivo de máximo 2 líneas sobre esta inspección de CFE. 
      Estado general dictaminado: ${estadoGeneral}. 
      Hallazgos validados: ${JSON.stringify(hallazgos.map((h: any) => h.componente + ': ' + h.tipo + ' (' + (h.esManual ? 'Reporte Manual' : 'Sugerido por IA') + ')'))}. 
      Observaciones adicionales: ${observaciones || 'Ninguna'}.`;

      // NOTA: Aquí se conectaría la API de OpenAI (gpt-4o-mini) o Gemini (1.5 Flash).
      // Al ser un entorno sin llave de API configurada, hacemos una simulación de IA estática o 
      // dejamos la estructura lista para que agregues el fetch a la API.
      try {
        // Ejemplo de cómo sería el llamado a OpenAI:
        /*
        const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${process.env.OPENAI_API_KEY}\` },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] })
        });
        const aiData = await aiResp.json();
        resumenIa = aiData.choices[0].message.content;
        */
       
        // Simulación de respuesta IA para el flujo actual:
        const anomalos = hallazgos.map((h:any) => h.componente).join(", ");
        resumenIa = `El vehículo presenta un estado ${estadoGeneral}. Se validaron discrepancias físicas en las siguientes áreas: ${anomalos}. ${observaciones ? 'Nota del operador: ' + observaciones : ''}`;
      } catch (aiError) {
        console.error("Error al generar resumen IA:", aiError);
      }
    }

    // 2. Guardar en Base de Datos (Transacción)
    const inspeccion = await prisma.inspeccionFisica.create({
      data: {
        vehiculoId,
        inspectorId: parseInt(session.user.id),
        estadoGeneral,
        observaciones,
        resumenIa,
        procesada: true,
        validada: true, // Indica que el operador ya revisó y aprobó
        fotografias: fotografias ? {
          create: fotografias.map((f: any) => ({
            vista: f.vista,
            rutaImagen: f.rutaImagen
          }))
        } : undefined,
        hallazgos: hallazgos ? {
          create: hallazgos.map((h: any) => ({
            componente: h.componente,
            tipo: h.tipo,
            confianza: h.confianza,
            esManual: h.esManual,
            descripcion: h.descripcion
          }))
        } : undefined
      },
      include: {
        hallazgos: true,
        fotografias: true
      }
    });

    // 3. Serializar BigInt y responder al cliente
    const inspeccionSerializada = {
      ...inspeccion,
      id:          inspeccion.id.toString(),
      hallazgos:   inspeccion.hallazgos.map(h => ({
        ...h,
        id:           h.id.toString(),
        inspeccionId: h.inspeccionId.toString(),
        confianza:    h.confianza ? Number(h.confianza) : null,
        similitud:    h.similitud  ? Number(h.similitud)  : null,
      })),
      fotografias: inspeccion.fotografias.map(f => ({
        ...f,
        id:           f.id.toString(),
        inspeccionId: f.inspeccionId.toString(),
      })),
    };

    return NextResponse.json({ 
      mensaje: 'Inspección guardada y validada exitosamente.', 
      inspeccion: inspeccionSerializada 
    }, { status: 201 });

  } catch (error) {
    console.error('Error al guardar inspección:', error);
    return NextResponse.json({ error: 'Error interno al guardar la inspección.' }, { status: 500 });
  }
}
