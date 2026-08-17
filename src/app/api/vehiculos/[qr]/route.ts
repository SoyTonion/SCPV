import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ qr: string }> } // <-- Le avisamos a TypeScript que es una Promesa
) {
  try {
    // 1. Extraemos el texto esperando (await) a que los parámetros estén listos
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