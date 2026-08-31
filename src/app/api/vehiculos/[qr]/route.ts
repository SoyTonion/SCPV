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
    
    // 3. Buscamos el vehículo en PostgreSQL
    const vehiculo = await prisma.vehiculo.findUnique({
      where: {
        qrToken: qr,
      },
    });

    // 4. Si no existe, mandamos un error 404
    if (!vehiculo) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado en el padrón de CFE.' },
        { status: 404 }
      );
    }

    // 🆕 [NUEVO CFE] 5. Calcular cuántos litros se ha gastado este mes
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

    // 6. Devolvemos el vehículo formateando los Decimales a Números Reales
    return NextResponse.json({
      ...vehiculo,
      capacidadTanque: vehiculo.capacidadTanque ? Number(vehiculo.capacidadTanque) : null,
      limiteMensualLitros: vehiculo.limiteMensualLitros ? Number(vehiculo.limiteMensualLitros) : null,
      litrosConsumidosMes: litrosConsumidosMes
    });

  } catch (error) {
    console.error("Error en API de vehículos:", error);
    return NextResponse.json(
      { error: 'Ocurrió un error al consultar la base de datos.' },
      { status: 500 }
    );
  }
}