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
    const lunes = new Date(hoy)
    lunes.setHours(0, 0, 0, 0)
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))

    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)
    domingo.setHours(23, 59, 59, 999)

    const escaneosSemanales = await prisma.escaneo.findMany({
      where: { fechaHora: { gte: lunes, lte: domingo } },
      select: { fechaHora: true },
    })

    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const conteosPorDia: Record<string, number> = {
      Lun: 0, Mar: 0, Mié: 0, Jue: 0, Vie: 0, Sáb: 0, Dom: 0,
    }

    for (const escaneo of escaneosSemanales) {
      const idx = (escaneo.fechaHora.getDay() + 6) % 7
      conteosPorDia[dias[idx]] += 1
    }

    const movimientosSemana = dias.map((day) => ({
      day,
      escaneos: conteosPorDia[day],
    }))

    // 5. Escaneos de los últimos 30 días agrupados por fecha
    const hace30 = new Date(hoy)
    hace30.setDate(hoy.getDate() - 29)
    hace30.setHours(0, 0, 0, 0)

    const escaneos30dias = await prisma.escaneo.findMany({
      where: { fechaHora: { gte: hace30 } },
      select: { fechaHora: true },
      orderBy: { fechaHora: 'asc' },
    })

    const mapaFechas: Record<string, number> = {}
    for (let i = 0; i < 30; i++) {
      const d = new Date(hace30)
      d.setDate(hace30.getDate() + i)
      mapaFechas[d.toISOString().split('T')[0]] = 0
    }
    for (const e of escaneos30dias) {
      const key = e.fechaHora.toISOString().split('T')[0]
      if (key in mapaFechas) mapaFechas[key] += 1
    }
    const historial30dias = Object.entries(mapaFechas).map(([fecha, escaneos]) => ({
      fecha: new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      escaneos,
    }))

    // 6. Rondines completados por guardia (últimos 30 días)
    const rondinsPorGuardia = await prisma.rondin.groupBy({
      by: ['guardiaId'],
      where: { fecha: { gte: hace30 } },
      _count: { id: true },
    })

    const guardiasIds = rondinsPorGuardia.map(r => r.guardiaId)
    const guardias = guardiasIds.length > 0
      ? await prisma.usuario.findMany({
          where: { id: { in: guardiasIds } },
          select: { id: true, nombre: true },
        })
      : []
    const mapaGuardias = new Map(guardias.map(g => [g.id, g.nombre]))

    const actividadGuardias = rondinsPorGuardia.map(r => ({
      nombre: mapaGuardias.get(r.guardiaId)?.split(' ')[0] ?? `Guardia ${r.guardiaId}`,
      rondines: r._count.id,
    })).sort((a, b) => b.rondines - a.rondines).slice(0, 6)

    // 7. Vehículos por departamento (solo los que aplican pernocta)
    const porDepartamento = await prisma.vehiculo.groupBy({
      by: ['departamentoId'],
      where: { vehiculoPernocta: true, departamentoId: { not: null } },
      _count: { id: true },
    })

    const deptoIds = porDepartamento.map(d => d.departamentoId).filter(Boolean) as number[]
    const deptos = deptoIds.length > 0
      ? await prisma.departamento.findMany({
          where: { id: { in: deptoIds } },
          select: { id: true, nombreDepartamento: true },
        })
      : []
    const mapaDeptos = new Map(deptos.map(d => [d.id, d.nombreDepartamento]))

    const coloresDeptos = ['#007A33', '#3B82F6', '#F97316', '#06B6D4', '#8B5CF6', '#E11D48', '#84CC16', '#F59E0B']
    const vehiculosPorDepto = porDepartamento
      .map((d, idx) => ({
        nombre: mapaDeptos.get(d.departamentoId!)?.replace('DISTRIBUCIÓN', 'DIST.').replace('COMERCIAL', 'COM.') ?? 'Sin depto',
        total: d._count.id,
        color: coloresDeptos[idx % coloresDeptos.length],
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

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
        historial30dias,
        actividadGuardias,
        vehiculosPorDepto,
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

// ============================================================
// CAMBIAR PERNOCTA A TODOS LOS VEHÍCULOS
// ============================================================
export async function togglePernoctaTodos(nuevoEstado: boolean) {
  try {
    await prisma.vehiculo.updateMany({
      data: { vehiculoPernocta: nuevoEstado },
    })
    revalidatePath('/dashboard/pernocta/vehiculos/nuevo')
    revalidatePath('/dashboard/pernocta')
    return { success: true }
  } catch (error) {
    console.error('Error en togglePernoctaTodos:', error)
    return { success: false, error: 'No se pudo actualizar.' }
  }
}
