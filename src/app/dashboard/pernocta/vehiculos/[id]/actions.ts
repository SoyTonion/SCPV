'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============================================================
// OBTENER DETALLE DEL VEHÍCULO + SUS AUTORIZACIONES
// ============================================================
export async function getDetalleVehiculo(id: string) {
  try {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id },
      include: {
        departamento: { select: { nombreDepartamento: true } },
        autorizaciones: {
          orderBy: { creadoEn: 'desc' },
          take: 20,
          include: { usuario: { select: { nombre: true } } },
        },
        _count: { select: { escaneos: true } },
      },
    })

    if (!vehiculo) return { success: false as const, error: 'Vehículo no encontrado.' }

    return {
      success: true as const,
      data: {
        id: vehiculo.id,
        economico: vehiculo.economico ?? '—',
        placas: vehiculo.placas ?? '—',
        numeroSerie: vehiculo.numeroSerie ?? '—',
        marca: vehiculo.marcaVehiculo,
        submarca: vehiculo.submarcaVehiculo,
        modelo: vehiculo.modelo ?? null,
        tipo: vehiculo.tipoVehiculo,
        combustible: vehiculo.tipoCombustible,
        tipoPropiedad: vehiculo.tipoPropiedad,
        arrendadora: vehiculo.arrendadora,
        responsable: vehiculo.responsable,
        departamento: vehiculo.departamento?.nombreDepartamento ?? 'Sin asignar',
        vehiculoPernocta: vehiculo.vehiculoPernocta,
        qrToken: vehiculo.qrToken ?? null,
        totalEscaneos: vehiculo._count.escaneos,
        autorizaciones: vehiculo.autorizaciones.map((a) => ({
          id: a.id.toString(),
          fechaInicio: a.fechaInicio.toISOString().split('T')[0],
          fechaFin: a.fechaFin.toISOString().split('T')[0],
          motivo: a.motivo ?? '',
          autorizadoPor: a.usuario.nombre,
          vigente: a.fechaFin >= hoy,
        })),
      },
    }
  } catch (error) {
    console.error('Error en getDetalleVehiculo:', error)
    return { success: false as const, error: 'Error al cargar el vehículo.' }
  }
}

// ============================================================
// TOGGLE PERNOCTA (desde detalle)
// ============================================================
export async function togglePernoctaDesdeDetalle(id: string, nuevoEstado: boolean) {
  try {
    await prisma.vehiculo.update({
      where: { id },
      data: { vehiculoPernocta: nuevoEstado },
    })
    revalidatePath(`/dashboard/pernocta/vehiculos/${id}`)
    revalidatePath('/dashboard/pernocta/vehiculos/nuevo')
    revalidatePath('/dashboard/pernocta')
    return { success: true }
  } catch (error) {
    console.error('Error en togglePernoctaDesdeDetalle:', error)
    return { success: false, error: 'No se pudo actualizar.' }
  }
}

// ============================================================
// CREAR AUTORIZACIÓN (desde detalle del vehículo)
// ============================================================
export async function crearAutorizacionDesdeDetalle(vehiculoId: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return { success: false, error: 'No hay sesión activa.' }

    const adminId = parseInt(session.user.id, 10)
    if (isNaN(adminId)) return { success: false, error: 'No se pudo identificar al usuario.' }

    const fechaInicio = formData.get('fechaInicio') as string
    const fechaFin = formData.get('fechaFin') as string
    const motivo = formData.get('motivo') as string

    if (!fechaInicio || !fechaFin) return { success: false, error: 'Las fechas son obligatorias.' }

    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    inicio.setHours(0, 0, 0, 0)
    fin.setHours(0, 0, 0, 0)

    if (fin < inicio) return { success: false, error: 'La fecha fin no puede ser anterior a la de inicio.' }

    await prisma.autorizacionPernocta.create({
      data: {
        vehiculoId,
        fechaInicio: inicio,
        fechaFin: fin,
        motivo: motivo || null,
        autorizadoPor: adminId,
      },
    })

    revalidatePath(`/dashboard/pernocta/vehiculos/${vehiculoId}`)
    return { success: true }
  } catch (error) {
    console.error('Error en crearAutorizacionDesdeDetalle:', error)
    return { success: false, error: 'Error interno al guardar.' }
  }
}

// ============================================================
// ELIMINAR AUTORIZACIÓN (desde detalle del vehículo)
// ============================================================
export async function eliminarAutorizacionDesdeDetalle(autorizacionId: string, vehiculoId: string) {
  try {
    await prisma.autorizacionPernocta.delete({
      where: { id: BigInt(autorizacionId) },
    })
    revalidatePath(`/dashboard/pernocta/vehiculos/${vehiculoId}`)
    return { success: true }
  } catch (error) {
    console.error('Error en eliminarAutorizacionDesdeDetalle:', error)
    return { success: false, error: 'No se pudo eliminar.' }
  }
}
