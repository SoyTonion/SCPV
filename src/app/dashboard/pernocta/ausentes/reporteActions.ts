'use server'

import { prisma } from '@/lib/prisma'
import { normalizarZona } from '@/lib/zonas'

export type VehiculoReporte = {
  economico: string
  placas: string
  vehiculo: string
  responsable: string
  departamento: string
  zona: string
}

export type DatosReporte = {
  fecha: string
  fechaCorte: string
  totalFlota: number
  escaneados: VehiculoReporte[]
  ausentesAutorizados: (VehiculoReporte & { motivo: string; autorizadoPor: string })[]
  ausentesSinJustificar: VehiculoReporte[]
  rondines: {
    guardia: string
    inicio: string
    fin: string | null
    totalEscaneos: number
  }[]
}

export async function generarDatosReporte(fechaISO?: string): Promise<{ success: true; data: DatosReporte } | { success: false; error: string }> {
  try {
    // Si no se pasa fecha, usa hoy
    const fechaBase = fechaISO ? new Date(fechaISO) : new Date()
    fechaBase.setHours(0, 0, 0, 0)

    const fechaFin = new Date(fechaBase)
    fechaFin.setDate(fechaBase.getDate() + 1)

    const corte = new Date(fechaBase)
    corte.setHours(23, 0, 0, 0) // 11pm

    // 1. Flota que debe pernoctar
    const flotaPernocta = await prisma.vehiculo.findMany({
      where: { vehiculoPernocta: true },
      select: {
        id: true,
        economico: true,
        placas: true,
        marcaVehiculo: true,
        submarcaVehiculo: true,
        responsable: true,
        campoClasificacion: true,
        departamento: { select: { nombreDepartamento: true } },
      },
    })

    // 2. IDs escaneados en el día
    const escaneosDelDia = await prisma.escaneo.findMany({
      where: { fechaHora: { gte: fechaBase, lt: fechaFin } },
      select: { vehiculoId: true },
      distinct: ['vehiculoId'],
    })
    const idsEscaneados = new Set(escaneosDelDia.map(e => e.vehiculoId))

    // 3. Autorizaciones vigentes para ese día
    const autorizaciones = await prisma.autorizacionPernocta.findMany({
      where: {
        fechaInicio: { lte: fechaBase },
        fechaFin: { gte: fechaBase },
      },
      select: {
        vehiculoId: true,
        motivo: true,
        usuario: { select: { nombre: true } },
      },
    })
    const mapaAuth = new Map(autorizaciones.map(a => [a.vehiculoId, a]))

    // 4. Rondines del día
    const rondinesDelDia = await prisma.rondin.findMany({
      where: { fecha: fechaBase },
      include: {
        guardia: { select: { nombre: true } },
        _count: { select: { escaneos: true } },
      },
    })

    // 5. Clasificar vehículos
    const toReporte = (v: typeof flotaPernocta[0]): VehiculoReporte => ({
      economico: v.economico ?? 'S/N',
      placas: v.placas ?? 'S/P',
      vehiculo: `${v.marcaVehiculo} ${v.submarcaVehiculo}`,
      responsable: v.responsable || 'SIN ASIGNAR',
      departamento: v.departamento?.nombreDepartamento ?? 'Sin depto',
      zona: normalizarZona(v.campoClasificacion),
    })

    const escaneados: VehiculoReporte[] = []
    const ausentesAutorizados: (VehiculoReporte & { motivo: string; autorizadoPor: string })[] = []
    const ausentesSinJustificar: VehiculoReporte[] = []

    for (const v of flotaPernocta) {
      if (idsEscaneados.has(v.id)) {
        escaneados.push(toReporte(v))
        continue
      }
      const auth = mapaAuth.get(v.id)
      if (auth) {
        ausentesAutorizados.push({
          ...toReporte(v),
          motivo: auth.motivo ?? 'Sin motivo especificado',
          autorizadoPor: auth.usuario.nombre,
        })
      } else {
        ausentesSinJustificar.push(toReporte(v))
      }
    }

    const fechaLabel = fechaBase.toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    return {
      success: true,
      data: {
        fecha: fechaLabel,
        fechaCorte: corte.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
        totalFlota: flotaPernocta.length,
        escaneados,
        ausentesAutorizados,
        ausentesSinJustificar,
        rondines: rondinesDelDia.map(r => ({
          guardia: r.guardia.nombre,
          inicio: r.inicio.toLocaleString('es-MX', { timeStyle: 'short' }),
          fin: r.fin?.toLocaleString('es-MX', { timeStyle: 'short' }) ?? null,
          totalEscaneos: r._count.escaneos,
        })),
      },
    }
  } catch (error) {
    console.error('Error en generarDatosReporte:', error)
    return { success: false, error: 'No se pudieron obtener los datos para el reporte.' }
  }
}
