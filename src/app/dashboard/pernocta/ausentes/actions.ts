'use server'

import { prisma } from '@/lib/prisma'

export type VehiculoAusente = {
  id: string
  economico: string
  placas: string
  vehiculo: string
  departamento: string
  responsable: string
  // solo para autorizados
  motivoAutorizacion?: string
  autorizadoPor?: string
  fechaFinAutorizacion?: string
}

export type ResumenPernocta = {
  fecha: string
  totalFlota: number                       // vehículos con vehiculoPernocta: true
  escaneados: number                       // de esos, cuántos tuvieron escaneo hoy
  rondinActivo: boolean                    // si hubo al menos un rondín hoy
  ausentesAutorizados: VehiculoAusente[]   // no escaneados pero con autorización vigente
  ausentesSinJustificar: VehiculoAusente[] // no escaneados y sin ninguna autorización
  escaneadosOk: number                     // escaneados que SÍ están en la flota pernocta
}

export async function getResumenPernocta(): Promise<{ success: true; data: ResumenPernocta } | { success: false; error: string }> {
  try {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const manana = new Date(hoy)
    manana.setDate(hoy.getDate() + 1)

    // 1. Todos los vehículos que aplican pernocta
    const flotaPernocta = await prisma.vehiculo.findMany({
      where: { vehiculoPernocta: true },
      select: {
        id: true,
        economico: true,
        placas: true,
        marcaVehiculo: true,
        submarcaVehiculo: true,
        responsable: true,
        departamento: { select: { nombreDepartamento: true } },
      },
    })

    // 2. IDs de vehículos que tuvieron al menos un escaneo hoy
    const escaneosHoy = await prisma.escaneo.findMany({
      where: {
        fechaHora: { gte: hoy, lt: manana },
      },
      select: { vehiculoId: true },
      distinct: ['vehiculoId'],
    })
    const idsEscaneados = new Set(escaneosHoy.map((e) => e.vehiculoId))

    // 2b. Verificar si hubo algún rondín abierto o cerrado hoy
    const rondinHoy = await prisma.rondin.findFirst({
      where: { fecha: hoy },
      select: { id: true },
    })

    // 3. Autorizaciones vigentes para hoy
    const autorizacionesVigentes = await prisma.autorizacionPernocta.findMany({
      where: {
        fechaInicio: { lte: hoy },
        fechaFin: { gte: hoy },
      },
      select: {
        vehiculoId: true,
        motivo: true,
        fechaFin: true,
        usuario: { select: { nombre: true } },
      },
    })
    const mapaAutorizaciones = new Map(
      autorizacionesVigentes.map((a) => [a.vehiculoId, a])
    )

    // 4. Clasificar vehículos ausentes
    const ausentesAutorizados: VehiculoAusente[] = []
    const ausentesSinJustificar: VehiculoAusente[] = []

    for (const v of flotaPernocta) {
      if (idsEscaneados.has(v.id)) continue // fue escaneado hoy, ok

      const base: VehiculoAusente = {
        id: v.id,
        economico: v.economico ?? 'S/N',
        placas: v.placas ?? 'S/P',
        vehiculo: `${v.marcaVehiculo} ${v.submarcaVehiculo}`,
        departamento: v.departamento?.nombreDepartamento ?? 'Sin depto',
        responsable: v.responsable,
      }

      const auth = mapaAutorizaciones.get(v.id)
      if (auth) {
        ausentesAutorizados.push({
          ...base,
          motivoAutorizacion: auth.motivo ?? 'Sin motivo especificado',
          autorizadoPor: auth.usuario.nombre,
          fechaFinAutorizacion: auth.fechaFin.toISOString().split('T')[0],
        })
      } else {
        ausentesSinJustificar.push(base)
      }
    }

    // contar cuántos de los escaneados hoy pertenecen a la flota pernocta
    const escaneadosOk = [...idsEscaneados].filter(id =>
      flotaPernocta.some(v => v.id === id)
    ).length

    return {
      success: true,
      data: {
        fecha: hoy.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        totalFlota: flotaPernocta.length,
        escaneados: idsEscaneados.size,
        rondinActivo: !!rondinHoy,
        escaneadosOk,
        ausentesAutorizados,
        ausentesSinJustificar,
      },
    }
  } catch (error) {
    console.error('Error en getResumenPernocta:', error)
    return { success: false, error: 'No se pudo calcular el resumen de pernocta.' }
  }
}
