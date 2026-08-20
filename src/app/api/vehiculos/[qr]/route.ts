import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ qr: string }> }
) {
  try {
    // 1. Verificar que hay una sesión activa
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado.' },
        { status: 401 }
      );
    }

    // 2. Extraemos el texto esperando (await) a que los parámetros estén listos
    const { qr } = await params;
    
    // 2. Buscamos el vehículo en PostgreSQL
    const vehiculo = await prisma.vehiculo.findUnique({
      where: {
        qrToken: qr, // Ahora sí tiene el valor real (ej. CFE-QR-23000147)
      },
    });

    // 3. Si no existe, mandamos un error 404
    if (!vehiculo) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado en el padrón de CFE.' },
        { status: 404 }
      );
    }

    // 4. Si lo encuentra, lo devolvemos completo
    return NextResponse.json(vehiculo);

  } catch (error) {
    console.error("Error en API de vehículos:", error);
    return NextResponse.json(
      { error: 'Ocurrió un error al consultar la base de datos.' },
      { status: 500 }
    );
  }
}