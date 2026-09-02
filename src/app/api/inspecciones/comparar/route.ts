import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const COMPARADOR_URL = process.env.COMPARADOR_URL ?? 'http://localhost:5001';

// POST /api/inspecciones/comparar
// Body: multipart/form-data
//   foto       : File   — imagen capturada desde el celular
//   vehiculoId : string — UUID del vehículo
//   vista      : string — VistaVehiculo (FRONTAL, TRASERA, etc.)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const formData = await request.formData();
    const foto       = formData.get('foto')       as File   | null;
    const vehiculoId = formData.get('vehiculoId') as string | null;
    const vista      = formData.get('vista')      as string | null;

    if (!foto || !vehiculoId || !vista) {
      return NextResponse.json({ error: 'foto, vehiculoId y vista son requeridos.' }, { status: 400 });
    }

    // Buscar imagen patrón activa para esa vista
    const patron = await prisma.imagenPatron.findFirst({
      where: { vehiculoId, vista: vista as never, activo: true },
    });

    if (!patron) {
      return NextResponse.json(
        { error: `No hay imagen patrón registrada para la vista ${vista} de este vehículo.` },
        { status: 404 }
      );
    }

    // Reenviar al microservicio Python
    const body = new FormData();
    body.append('foto',         foto);
    body.append('ruta_patron',  patron.rutaImagen);
    body.append('vista',        vista);

    // Reenviar al microservicio Python con timeout generoso (30s — ORB puede tardar en frío)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    let respPython: Response;
    try {
      respPython = await fetch(`${COMPARADOR_URL}/comparar`, {
        method: 'POST',
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!respPython.ok) {
      const err = await respPython.text();
      console.error('Error del comparador:', err);
      return NextResponse.json({ error: 'El comparador de imágenes falló.' }, { status: 502 });
    }

    const resultado = await respPython.json();
    return NextResponse.json({ ...resultado, patronId: patron.id.toString() });

  } catch (error) {
    console.error('Error en /api/inspecciones/comparar:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
