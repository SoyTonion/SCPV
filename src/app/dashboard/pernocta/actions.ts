'use server'

import { revalidatePath } from 'next/cache'
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
    let ultimosRegistros: { id: string; placas: string; fechaHora: string }[] = []
    try {
      const escaneosRaw = await prisma.escaneo.findMany({
        take: 5,
        orderBy: { fechaHora: 'desc' },
        include: { vehiculo: { select: { placas: true } } },
      })

      ultimosRegistros = escaneosRaw.map((e) => ({
        id: e.id.toString(),
        placas: e.vehiculo.placas ?? 'S/P',
        fechaHora: e.fechaHora.toISOString(),
      }))
    } catch {
      ultimosRegistros = []
    }

    // 4. Escaneos de la semana actual agrupados por día
    const hoy = new Date()
    // Lunes de la semana actual
    const lunes = new Date(hoy)
    lunes.setHours(0, 0, 0, 0)
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))

    // Domingo al final de la semana
    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)
    domingo.setHours(23, 59, 59, 999)

    const escaneosSemanales = await prisma.escaneo.findMany({
      where: {
        fechaHora: { gte: lunes, lte: domingo },
      },
      select: { fechaHora: true },
    })

    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const conteosPorDia: Record<string, number> = {
      Lun: 0, Mar: 0, Mié: 0, Jue: 0, Vie: 0, Sáb: 0, Dom: 0,
    }

    for (const escaneo of escaneosSemanales) {
      // getDay() retorna 0=Dom,1=Lun...6=Sáb; convertimos a índice 0=Lun
      const idx = (escaneo.fechaHora.getDay() + 6) % 7
      conteosPorDia[dias[idx]] += 1
    }

    const movimientosSemana = dias.map((day) => ({
      day,
      escaneos: conteosPorDia[day],
    }))

    return {
      success: true,
      data: {
        dona: [
          { name: 'Autorizados Pernocta', value: autorizados, color: '#00875A' },
          { name: 'No Autorizados', value: noAutorizados, color: '#E07A5F' },
        ],
        tipos,
        ultimosRegistros,
        movimientosSemana,
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

    revalidatePath('/dashboard/pernocta/vehiculos/nuevo')
    revalidatePath('/dashboard/pernocta')

    return {
      success: true,
      data: JSON.parse(JSON.stringify(vehiculoActualizado)),
    }
  } catch (error) {
    console.error('Error al actualizar permiso de pernocta:', error)
    return { success: false, error: 'No se pudo actualizar el permiso' }
  }
}