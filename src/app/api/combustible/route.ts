import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ==========================================
// 1. POST: Recibe y guarda datos del celular
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vehiculoId, kilometraje, litros, importe } = body;

    const rutaFalsaEvidencia = "/uploads/ticket_" + Date.now() + ".jpg";

    const nuevoRegistro = await prisma.registroCombustible.create({
      data: {
        vehiculoId: vehiculoId,
        usuarioId: 1, 
        kilometraje: parseInt(kilometraje),
        litrosCargados: parseFloat(litros),
        costoTotal: parseFloat(importe),
        rutaEvidencia: rutaFalsaEvidencia,
        // Prisma se encargará de la fecha si es @default(now()) en tu esquema
      }
    });

    const registroSerializado = {
      ...nuevoRegistro,
      id: nuevoRegistro.id.toString(),
    };

    return NextResponse.json({ success: true, registro: registroSerializado }, { status: 201 });

  } catch (error) {
    console.error("Error al guardar la recarga de combustible:", error);
    return NextResponse.json(
      { error: 'Ocurrió un error al guardar en la base de datos.' },
      { status: 500 }
    );
  }
}

// ==========================================
// 2. GET: Envía los datos reales al Dashboard
// ==========================================
export async function GET() {
  try {
    // Ordenamos por 'fechaCarga' como está definido en tu schema.prisma
    const registros = await prisma.registroCombustible.findMany({
      orderBy: { fechaCarga: 'desc' },
      include: { vehiculo: true },
    });

    // Serializamos BigInts y fechas
    const serializados = registros.map(r => ({
      ...r,
      id: r.id.toString(),
      fechaCarga: r.fechaCarga ? new Date(r.fechaCarga).toISOString() : null,
    }));

    return NextResponse.json(serializados);
  } catch (error) {
    console.error("Error al consultar recargas:", error);
    return NextResponse.json({ error: 'Error al consultar la base de datos.' }, { status: 500 });
  }
}