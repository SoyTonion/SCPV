'use server'

import { prisma } from '@/lib/prisma'

// ============================================================
// DASHBOARD DE PERNOCTA (ESTADÍSTICAS)
// ============================================================
export async function getPernoctaDashboardStats() {
  try {
    // 1. Estado de Autorización de Pernocta
    const autorizados = await prisma.vehiculo.count({
      where: { vehiculoPernocta: true },
    })
    const noAutorizados = await prisma.vehiculo.count({
      where: { vehiculoPernocta: false },
    })

    // 2. Conteo por Tipo de Vehículo
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

    // 3. Últimos 5 Escaneos de la bitácora
    let ultimosRegistros: any[] = []
    try {
      const escaneosRaw = await prisma.escaneo.findMany({
        take: 5,
        orderBy: { id: 'desc' },
        include: { vehiculo: true },
      })

      ultimosRegistros = JSON.parse(JSON.stringify(escaneosRaw))
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

// ============================================================
// OBTENER VEHÍCULOS PARA LA TABLA
// ============================================================
export async function getVehiculosConMetricas(query: string = '') {
  try {
    const vehiculos = await prisma.vehiculo.findMany({
      where: {
        OR: [
          { economico: { contains: query, mode: 'insensitive' } },
          { placas: { contains: query, mode: 'insensitive' } },
          { responsable: { contains: query, mode: 'insensitive' } },
          { marcaVehiculo: { contains: query, mode: 'insensitive' } },
          { submarcaVehiculo: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { creadoEn: 'desc' },
      include: {
        departamento: {
          select: {
            nombreDepartamento: true,
          },
        },
      },
    })

    return {
      success: true,
      data: JSON.parse(JSON.stringify(vehiculos)),
    }
  } catch (error) {
    console.error('Error al obtener vehículos:', error)
    return {
      success: false,
      error: 'No se pudo obtener el listado de vehículos.',
      data: [],
    }
  }
}

// ============================================================
// TOGGLE DE PERMISO DE PERNOCTA
// ============================================================
export async function togglePermisoPernocta(vehiculoId: string, nuevoEstado: boolean) {
  try {
    const vehiculoActualizado = await prisma.vehiculo.update({
      where: { id: vehiculoId },
      data: { vehiculoPernocta: nuevoEstado },
    })

    return {
      success: true,
      data: JSON.parse(JSON.stringify(vehiculoActualizado)),
    }
  } catch (error) {
    console.error('Error al actualizar permiso de pernocta:', error)
    return { success: false, error: 'No se pudo actualizar el permiso' }
  }
}