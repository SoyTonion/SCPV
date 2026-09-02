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
