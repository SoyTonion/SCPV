import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';

// DELETE /api/imagenes-patron/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const { id } = await params;
    const idBigInt = BigInt(id);

    const imagen = await prisma.imagenPatron.findUnique({ where: { id: idBigInt } });
    if (!imagen) return NextResponse.json({ error: 'Imagen no encontrada.' }, { status: 404 });

    // 1. Eliminar de la Base de Datos directamente en lugar de actualizar `activo: false`
    await prisma.imagenPatron.delete({
      where: { id: idBigInt },
    });

    // 2. Eliminar archivo físico del disco
    try {
      const rutaLimpia = imagen.rutaImagen.startsWith('/') 
        ? imagen.rutaImagen.slice(1) 
        : imagen.rutaImagen;

      const rutaAbs = path.join(process.cwd(), 'public', rutaLimpia);
      await unlink(rutaAbs);
    } catch {
      // El archivo físico puede no existir — continuar limpiamente
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Error al eliminar imagen patrón:', error);
    return NextResponse.json({ error: 'Error al eliminar la imagen.' }, { status: 500 });
  }
}