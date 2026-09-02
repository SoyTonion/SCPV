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
    
    // 3. Buscamos el vehículo en PostgreSQL y le "pegamos" sus últimos 3 tickets
    const vehiculo = await prisma.vehiculo.findUnique({
      where: {
        qrToken: qr,
      },
      include: {
        registrosCombustible: {
          orderBy: { fechaCarga: 'desc' }, // Los ordenamos del más nuevo al más viejo
          take: 3, // Solo traemos los últimos 3 para no saturar el celular
        }
      }
    });

    // 4. Si no existe, mandamos un error 404
    if (!vehiculo) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado en el padrón de CFE.' },
        { status: 404 }
      );
    }

    // 5. Calcular cuántos litros se ha gastado este mes
    const fechaInicioMes = new Date();
    fechaInicioMes.setDate(1); // Día 1 del mes actual
    fechaInicioMes.setHours(0, 0, 0, 0);

    const cargasDelMes = await prisma.registroCombustible.aggregate({
      _sum: {
        litrosCargados: true,
      },
      where: {
        vehiculoId: vehiculo.id,
        fechaCarga: {
          gte: fechaInicioMes, // Mayor o igual al día 1
        },
        estadoAprobacion: 'APROBADA' // Solo sumamos las que pasaron bien
      },
    });

    // Convertimos la suma a un número normal (si no hay cargas, es 0)
    const litrosConsumidosMes = cargasDelMes._sum.litrosCargados ? Number(cargasDelMes._sum.litrosCargados) : 0;

    // 6. Devolvemos el vehículo formateando los Decimales a Números Reales y BigInt a Texto
    const { registrosCombustible, ...datosVehiculo } = vehiculo;

    return NextResponse.json({
      ...datosVehiculo,
      id: datosVehiculo.id.toString(), // 👈 AQUÍ SE ARREGLA EL ERROR DEL BIGINT
      capacidadTanque: datosVehiculo.capacidadTanque ? Number(datosVehiculo.capacidadTanque) : null,
      limiteMensualLitros: datosVehiculo.limiteMensualLitros ? Number(datosVehiculo.limiteMensualLitros) : null,
      litrosConsumidosMes: litrosConsumidosMes,
      // Empaquetamos el historial para que la pantalla del celular lo pueda leer fácil
      historialReciente: registrosCombustible.map(r => ({
        id: r.id.toString(),
        litros: Number(r.litrosCargados),
        estado: r.estadoAprobacion,
        fecha: r.fechaCarga ? new Date(r.fechaCarga).toLocaleDateString('es-MX') : 'S/F'
      }))
    });

  } catch (error) {
    console.error("Error en API de vehículos:", error);
    return NextResponse.json(
      { error: 'Ocurrió un error al consultar la base de datos.' },
      { status: 500 }
    );
  }
}