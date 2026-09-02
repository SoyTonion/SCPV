import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { VistaVehiculo } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// POST /api/imagenes-patron/upload
// multipart/form-data: imagen (File), vehiculoId (string), vista (VistaVehiculo)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const formData  = await request.formData();
    const imagen    = formData.get('imagen')    as File   | null;
    const vehiculoId = formData.get('vehiculoId') as string | null;
    const vista      = formData.get('vista')      as string | null;

    if (!imagen || !vehiculoId || !vista) {
      return NextResponse.json({ error: 'imagen, vehiculoId y vista son requeridos.' }, { status: 400 });
    }

    if (!Object.values(VistaVehiculo).includes(vista as VistaVehiculo)) {
      return NextResponse.json({ error: `Vista inválida: ${vista}` }, { status: 400 });
    }

    // Verificar que el vehículo existe
    const vehiculo = await prisma.vehiculo.findUnique({ where: { id: vehiculoId } });
    if (!vehiculo) return NextResponse.json({ error: 'Vehículo no encontrado.' }, { status: 404 });

    // Guardar archivo en public/uploads/patrones/
    const ext      = imagen.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const nombre   = `${vehiculo.economico ?? vehiculoId}_${vista}.${ext}`;
    const dirAbs   = path.join(process.cwd(), 'public', 'uploads', 'patrones');
    const rutaAbs  = path.join(dirAbs, nombre);
    const rutaWeb  = `/uploads/patrones/${nombre}`;

    await mkdir(dirAbs, { recursive: true });
    const buffer = Buffer.from(await imagen.arrayBuffer());
    await writeFile(rutaAbs, buffer);

    // Desactivar imagen patrón anterior de esa vista
    await prisma.imagenPatron.updateMany({
      where: { vehiculoId, vista: vista as VistaVehiculo, activo: true },
      data:  { activo: false },
    });

    // Registrar la nueva
    const nueva = await prisma.imagenPatron.create({
      data: {
        vehiculoId,
        vista:     vista as VistaVehiculo,
        rutaImagen: rutaWeb,
        activo:    true,
        creadoPor: session.user.id ? Number(session.user.id) : null,
      },
    });

    return NextResponse.json({ ...nueva, id: nueva.id.toString() }, { status: 201 });

  } catch (error) {
    console.error('Error en upload de imagen patrón:', error);
    return NextResponse.json({ error: 'Error al guardar la imagen.' }, { status: 500 });
  }
}
