'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import {
  TipoPropiedadVehiculo,
  TipoVehiculo,
  TipoCombustible,
  Arrendadora,
} from '@prisma/client'

// 1. Obtener vehículos (con búsqueda opcional)
export async function getVehiculosPernocta(search?: string) {
  try {
    const vehiculos = await prisma.vehiculo.findMany({
      where: search
        ? {
            OR: [
              { economico: { contains: search, mode: 'insensitive' } },
              { placas: { contains: search, mode: 'insensitive' } },
              { responsable: { contains: search, mode: 'insensitive' } },
              { numeroSerie: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        departamento: true,
      },
      orderBy: { creadoEn: 'desc' },
    })

    return { success: true, data: vehiculos }
  } catch (error) {
    console.error('Error al consultar vehículos:', error)
    return { success: false, error: 'No se pudieron cargar los vehículos.' }
  }
}

// 2. Obtener un vehículo por ID (para editar/ver detalle)
export async function getVehiculoById(id: string) {
  try {
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id },
      include: { departamento: true },
    })
    return { success: true, data: vehiculo }
  } catch (error) {
    return { success: false, error: 'Error al consultar el vehículo.' }
  }
}

// 3. Obtener Departamentos para los select de formularios
export async function getDepartamentos() {
  try {
    const departamentos = await prisma.departamento.findMany({
      orderBy: { nombreDepartamento: 'asc' },
    })
    return { success: true, data: departamentos }
  } catch (error) {
    return { success: false, data: [] }
  }
}

// 4. Crear un nuevo Vehículo
export async function createVehiculo(formData: FormData) {
  try {
    const economico = formData.get('economico')?.toString() || null
    const numeroSerie = formData.get('numeroSerie')?.toString() || null
    const tipoPropiedad = (formData.get('tipoPropiedad') as TipoPropiedadVehiculo) || 'PROPIO'
    const placas = formData.get('placas')?.toString() || null
    const marcaVehiculo = formData.get('marcaVehiculo')?.toString() || 'CHEVROLET'
    const submarcaVehiculo = formData.get('submarcaVehiculo')?.toString() || 'AVEO'
    const modelo = formData.get('modelo') ? parseInt(formData.get('modelo')!.toString()) : null
    const tipoVehiculo = (formData.get('tipoVehiculo') as TipoVehiculo) || 'SED'
    const tipoCombustible = (formData.get('tipoCombustible') as TipoCombustible) || 'GASOLINA'
    const arrendadora = (formData.get('arrendadora') as Arrendadora) || 'NA'
    const responsable = formData.get('responsable')?.toString() || 'EDGAR OSWALDO PADILLA LOPEZ'
    const departamentoId = formData.get('departamentoId') ? parseInt(formData.get('departamentoId')!.toString()) : null
    const vehiculoPernocta = formData.get('vehiculoPernocta') === 'on'

    await prisma.vehiculo.create({
      data: {
        economico,
        numeroSerie,
        tipoPropiedad,
        placas,
        marcaVehiculo,
        submarcaVehiculo,
        modelo,
        tipoVehiculo,
        tipoCombustible,
        arrendadora,
        responsable,
        departamentoId,
        vehiculoPernocta,
      },
    })

    revalidatePath('/dashboard/pernocta/vehiculos')
    return { success: true }
  } catch (error) {
    console.error('Error al crear vehículo:', error)
    return { success: false, error: 'No se pudo registrar el vehículo.' }
  }
}

// 5. Actualizar un Vehículo existente
export async function updateVehiculo(id: string, formData: FormData) {
  try {
    const economico = formData.get('economico')?.toString() || null
    const numeroSerie = formData.get('numeroSerie')?.toString() || null
    const tipoPropiedad = (formData.get('tipoPropiedad') as TipoPropiedadVehiculo) || 'PROPIO'
    const placas = formData.get('placas')?.toString() || null
    const marcaVehiculo = formData.get('marcaVehiculo')?.toString() || 'CHEVROLET'
    const submarcaVehiculo = formData.get('submarcaVehiculo')?.toString() || 'AVEO'
    const modelo = formData.get('modelo') ? parseInt(formData.get('modelo')!.toString()) : null
    const tipoVehiculo = (formData.get('tipoVehiculo') as TipoVehiculo) || 'SED'
    const tipoCombustible = (formData.get('tipoCombustible') as TipoCombustible) || 'GASOLINA'
    const arrendadora = (formData.get('arrendadora') as Arrendadora) || 'NA'
    const responsable = formData.get('responsable')?.toString() || ''
    const departamentoId = formData.get('departamentoId') ? parseInt(formData.get('departamentoId')!.toString()) : null
    const vehiculoPernocta = formData.get('vehiculoPernocta') === 'on'

    await prisma.vehiculo.update({
      where: { id },
      data: {
        economico,
        numeroSerie,
        tipoPropiedad,
        placas,
        marcaVehiculo,
        submarcaVehiculo,
        modelo,
        tipoVehiculo,
        tipoCombustible,
        arrendadora,
        responsable,
        departamentoId,
        vehiculoPernocta,
      },
    })

    revalidatePath('/dashboard/pernocta/vehiculos')
    return { success: true }
  } catch (error) {
    console.error('Error al actualizar vehículo:', error)
    return { success: false, error: 'No se pudo actualizar el vehículo.' }
  }
}

// 6. Eliminar un Vehículo
export async function deleteVehiculo(id: string) {
  try {
    await prisma.vehiculo.delete({
      where: { id },
    })

    revalidatePath('/dashboard/pernocta/vehiculos')
    return { success: true }
  } catch (error) {
    console.error('Error al eliminar vehículo:', error)
    return { success: false, error: 'No se pudo eliminar el vehículo. Verifique que no tenga registros vinculados.' }
  }
}

// 7. Toggle del permiso de pernocta
export async function togglePernoctaVehiculo(id: string, nuevoEstado: boolean) {
  try {
    await prisma.vehiculo.update({
      where: { id },
      data: { vehiculoPernocta: nuevoEstado },
    })

    revalidatePath('/dashboard/pernocta/vehiculos')
    return { success: true }
  } catch (error) {
    console.error('Error al actualizar pernocta:', error)
    return { success: false, error: 'No se pudo cambiar el estado de pernocta.' }
  }
}