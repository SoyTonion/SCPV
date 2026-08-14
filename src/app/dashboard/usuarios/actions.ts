'use server'

import { prisma } from '@/lib/prisma'

export async function getUsuarios(query?: string) {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: query
        ? {
            OR: [
              { nombre: { contains: query, mode: 'insensitive' } },
              { usuario: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        rol: true, // Si en tu schema de Prisma tienes la relación con Rol
      },
      orderBy: {
        id: 'asc',
      },
    })

    return { success: true, data: usuarios }
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return { success: false, error: 'No se pudieron cargar los usuarios' }
  }
}