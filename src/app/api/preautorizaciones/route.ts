import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const preautorizaciones = await prisma.preautorizacionCombustible.findMany({
      where: { estado: 'ACTIVA' },
      include: {
        vehiculo: {
          select: { economico: true, placas: true, marcaVehiculo: true, submarcaVehiculo: true }
        }
      },
      orderBy: { creadoEn: 'desc' }
    });
    
    return NextResponse.json(preautorizaciones);
  } catch (error) {
    console.error("Error fetching preautorizaciones:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { vehiculoId, litros, motivo, horaFin, creadoPor } = data;

    if (!vehiculoId || !litros || !motivo || !horaFin) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const horaFinDate = new Date(horaFin); // Acepta string completo datetime-local (ISO-like)

    const nueva = await prisma.preautorizacionCombustible.create({
      data: {
        vehiculoId,
        litros: Number(litros),
        motivo,
        horaFin: horaFinDate,
        // En una app real, el creadoPor vendría de la sesión.
        // Aquí pasaremos 1 como fallback si no se recibe un ID válido.
        creadoPor: creadoPor || 1, 
      }
    });

    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    console.error("Error creating preautorizacion:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
