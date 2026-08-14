'use server'

import { prisma } from '@/lib/prisma'

export async function getPernoctaDashboardStats() {
  try {
    // 1. Estado de Autorización de Pernocta (Permitido pernoctar vs No permitido)
    const autorizados = await prisma.vehiculo.count({
      where: { vehiculoPernocta: true },
    })
    const noAutorizados = await prisma.vehiculo.count({
      where: { vehiculoPernocta: false },
    })

    // 2. Conteo por Tipo de Vehículo usando "tipoVehiculo"
    const tiposGroup = await prisma.vehiculo.groupBy({
      by: ['tipoVehiculo'],
      _count: { id: true },
    })

    const colores = ['#00875A', '#3B82F6', '#F97316', '#06B6D4', '#A3E635', '#E11D48']

    const tipos = tiposGroup.map((t, idx) => ({
      tipo: String(t.tipoVehiculo || 'Sin Tipo'),
      total: t._count.id,
      color: colores[idx % colores.length],
    }))

    // 3. Últimos 5 Escaneos / Movimientos de la bitácora
    let ultimosRegistros: any[] = []
    try {
      ultimosRegistros = await prisma.escaneo.findMany({
        take: 5,
        orderBy: { id: 'desc' }, // Carga los más recientes por ID
        include: { vehiculo: true },
      })
    } catch {
  ultimosRegistros = []
    }

    return {
      success: true,
      data: {
        dona: [
          { name: 'Autorizados Pernocta', value: autorizados, color: '#00875A' },
          { name: 'No Autorizados', value: noAutorizados, color: '#E07A5F' },
        ],
        tipos,
        ultimosRegistros,
      },
    }
  } catch (error) {
    console.error('Error al cargar datos del dashboard de pernocta:', error)
    return { success: false, error: 'No se pudieron cargar los datos reales' }
  }
}