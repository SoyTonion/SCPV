import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(request: Request) {
  try {
    // 1. Recibimos los datos que mandó el celular
    const body = await request.json();
    const { vehiculoId, kilometraje, litros, importe } = body;

    // NOTA: Subir imágenes reales requiere configurar un servicio en la nube
    // Por ahora, para que tu anteproyecto funcione, guardaremos una ruta de texto simulada.
    const rutaFalsaEvidencia = "/uploads/ticket_" + Date.now() + ".jpg";

    // 2. Guardamos en PostgreSQL
   const nuevoRegistro = await prisma.registroCombustible.create({
      data: {
        vehiculoId: vehiculoId,
        usuarioId: 1, 
        kilometraje: parseInt(kilometraje),
        litrosCargados: parseFloat(litros),
        costoTotal: parseFloat(importe),
        rutaEvidencia: rutaFalsaEvidencia,
      }
    });

    // 3. Convertimos el BigInt a String para que JSON no se asuste
    const registroSerializado = {
      ...nuevoRegistro,
      id: nuevoRegistro.id.toString(), // <-- ¡Aquí está la magia!
      // Si a futuro agregas otros BigInt, los conviertes igual
    };

    // Devolvemos el registro ya convertido
    return NextResponse.json({ success: true, registro: registroSerializado }, { status: 201 });

  } catch (error) {
    console.error("Error al guardar la recarga de combustible:", error);
    return NextResponse.json(
      { error: 'Ocurrió un error al guardar en la base de datos.' },
      { status: 500 }
    );
  }
}