import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { VistaVehiculo } from '@prisma/client';

// GET /api/imagenes-patron?vehiculoId=xxx
// Devuelve todas las imágenes patrón activas de un vehículo
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const vehiculoId = searchParams.get('vehiculoId');
    if (!vehiculoId) return NextResponse.json({ error: 'vehiculoId requerido.' }, { status: 400 });

    const imagenes = await prisma.imagenPatron.findMany({
      where: { vehiculoId, activo: true },
      orderBy: { creadoEn: 'desc' },
    });

    const serializadas = imagenes.map(i => ({ ...i, id: i.id.toString() }));
    return NextResponse.json(serializadas);

  } catch (error) {
    console.error('Error al consultar imágenes patrón:', error);
    return NextResponse.json({ error: 'Error al consultar la base de datos.' }, { status: 500 });
  }
}

// POST /api/imagenes-patron
// Registra una nueva imagen patrón en la BD (la imagen ya debe estar en /public/uploads/patrones/)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const body = await request.json();
    const { vehiculoId, vista, rutaImagen, hashImagen } = body;

    if (!vehiculoId || !vista || !rutaImagen) {
      return NextResponse.json({ error: 'vehiculoId, vista y rutaImagen son requeridos.' }, { status: 400 });
    }

    if (!Object.values(VistaVehiculo).includes(vista)) {
      return NextResponse.json({ error: `Vista inválida. Valores aceptados: ${Object.values(VistaVehiculo).join(', ')}` }, { status: 400 });
    }

    // Desactivar la imagen patrón anterior de esa vista para este vehículo
    await prisma.imagenPatron.updateMany({
      where: { vehiculoId, vista, activo: true },
      data: { activo: false },
    });

    const nueva = await prisma.imagenPatron.create({
      data: {
        vehiculoId,
        vista,
        rutaImagen,
        hashImagen: hashImagen ?? null,
        activo: true,
        creadoPor: session.user.id ? Number(session.user.id) : null,
      },
    });

    return NextResponse.json({ ...nueva, id: nueva.id.toString() }, { status: 201 });

  } catch (error) {
    console.error('Error al crear imagen patrón:', error);
    return NextResponse.json({ error: 'Error al guardar en la base de datos.' }, { status: 500 });
  }
}
