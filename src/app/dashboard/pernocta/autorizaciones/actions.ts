'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============================================================
// LISTAR AUTORIZACIONES
// ============================================================
export async function getAutorizaciones() {
  try {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const autorizaciones = await prisma.autorizacionPernocta.findMany({
      orderBy: { creadoEn: 'desc' },
      take: 100,
      include: {
        vehiculo: {
          select: {
            economico: true,
            placas: true,
            marcaVehiculo: true,
            submarcaVehiculo: true,
          },
        },
        usuario: {
          select: { nombre: true },
        },
      },
    })

    return {
      success: true,
      data: autorizaciones.map((a) => ({
        id: a.id.toString(),
        vehiculoId: a.vehiculoId,
        economico: a.vehiculo.economico ?? '—',
        placas: a.vehiculo.placas ?? '—',
        vehiculo: `${a.vehiculo.marcaVehiculo} ${a.vehiculo.submarcaVehiculo}`,
        fechaInicio: a.fechaInicio.toISOString().split('T')[0],
        fechaFin: a.fechaFin.toISOString().split('T')[0],
        motivo: a.motivo ?? '',
        autorizadoPor: a.usuario.nombre,
        vigente: a.fechaFin >= hoy,
      })),
    }
  } catch (error) {
    console.error('Error al obtener autorizaciones:', error)
    return { success: false, error: 'No se pudieron cargar las autorizaciones.', data: [] }
  }
}

// ============================================================
// CREAR AUTORIZACIÓN
// ============================================================
export async function crearAutorizacion(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: 'No hay sesión activa.' }
    }

    const adminId = parseInt(session.user.id, 10)
    if (isNaN(adminId)) {
      return { success: false, error: 'No se pudo identificar al usuario.' }
    }

    const vehiculoId = formData.get('vehiculoId') as string
    const fechaInicio = formData.get('fechaInicio') as string
    const fechaFin = formData.get('fechaFin') as string
    const motivo = formData.get('motivo') as string

    if (!vehiculoId || !fechaInicio || !fechaFin) {
      return { success: false, error: 'Vehículo y fechas son obligatorios.' }
    }

    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    inicio.setHours(0, 0, 0, 0)
    fin.setHours(0, 0, 0, 0)

    if (fin < inicio) {
      return { success: false, error: 'La fecha de fin no puede ser anterior a la de inicio.' }
    }

    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id: vehiculoId },
      select: { id: true },
    })
    if (!vehiculo) {
      return { success: false, error: 'Vehículo no encontrado.' }
    }

    await prisma.autorizacionPernocta.create({
      data: {
        vehiculoId,
        fechaInicio: inicio,
        fechaFin: fin,
        motivo: motivo || null,
        autorizadoPor: adminId,
      },
    })

    revalidatePath('/dashboard/pernocta/autorizaciones')
    return { success: true }
  } catch (error) {
    console.error('Error al crear autorización:', error)
    return { success: false, error: 'Error interno al guardar la autorización.' }
  }
}

// ============================================================
// ELIMINAR AUTORIZACIÓN
// ============================================================
export async function eliminarAutorizacion(id: string) {
  try {
    await prisma.autorizacionPernocta.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/dashboard/pernocta/autorizaciones')
    return { success: true }
  } catch (error) {
    console.error('Error al eliminar autorización:', error)
    return { success: false, error: 'No se pudo eliminar la autorización.' }
  }
}

// ============================================================
// BUSCAR VEHÍCULOS (para el selector del formulario)
// ============================================================
export async function buscarVehiculos(query: string) {
  try {
    const vehiculos = await prisma.vehiculo.findMany({
      where: {
        OR: [
          { economico: { contains: query, mode: 'insensitive' } },
          { placas: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        economico: true,
        placas: true,
        marcaVehiculo: true,
        submarcaVehiculo: true,
      },
      take: 20,
      orderBy: { economico: 'asc' },
    })
    return { success: true, data: vehiculos }
  } catch (error) {
    console.error('Error al buscar vehículos:', error)
    return { success: false, data: [] }
  }
}
