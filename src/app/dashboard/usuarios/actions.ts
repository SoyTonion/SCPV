'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

// Obtener todos los usuarios (con filtro de búsqueda opcional)
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
        rol: true,
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

// Obtener lista de roles para los selects
export async function getRoles() {
  try {
    const roles = await prisma.rol.findMany({
      orderBy: { id: 'asc' },
    })
    return { success: true, data: roles }
  } catch (error) {
    console.error('Error al obtener roles:', error)
    return { success: false, data: [] }
  }
}

// Obtener usuario único por ID para edición
export async function getUsuarioById(id: number) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: { rol: true },
    })
    return { success: true, data: usuario }
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error)
    return { success: false, error: 'Usuario no encontrado' }
  }
}

// Crear un nuevo usuario
export async function createUsuario(formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const usuarioStr = formData.get('usuario') as string
    const email = formData.get('email') as string
    const telefono = formData.get('telefono') as string
    const password = formData.get('password') as string
    const rolId = Number(formData.get('rolId'))
    const activo = formData.get('activo') === 'on'

    if (!nombre || !usuarioStr || !password || !rolId) {
      return { success: false, error: 'Los campos Nombre, Usuario, Contraseña y Rol son obligatorios.' }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.usuario.create({
      data: {
        nombre,
        usuario: usuarioStr,
        email: email || null,
        telefono: telefono || null,
        passwordHash: hashedPassword,
        rolId,
        activo,
      },
    })

    revalidatePath('/dashboard/usuarios')
    return { success: true }
  } catch (error: any) {
    console.error('Error al crear usuario:', error)
    if (error?.code === 'P2002') {
      return { success: false, error: 'El nombre de usuario o correo ya está registrado.' }
    }
    return { success: false, error: 'No se pudo registrar el usuario' }
  }
}

// Actualizar usuario existente
export async function updateUsuario(id: number, formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const usuarioStr = formData.get('usuario') as string
    const email = formData.get('email') as string
    const telefono = formData.get('telefono') as string
    const password = formData.get('password') as string
    const rolId = Number(formData.get('rolId'))
    const activo = formData.get('activo') === 'on'

    const dataToUpdate: any = {
      nombre,
      usuario: usuarioStr,
      email: email || null,
      telefono: telefono || null,
      rolId,
      activo,
    }

    // Solo actualizar la contraseña si el usuario escribió una nueva
    if (password && password.trim() !== '') {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10)
    }

    await prisma.usuario.update({
      where: { id },
      data: dataToUpdate,
    })

    revalidatePath('/dashboard/usuarios')
    return { success: true }
  } catch (error: any) {
    console.error('Error al actualizar usuario:', error)
    return { success: false, error: 'No se pudo actualizar el usuario' }
  }
}

// Eliminar usuario
export async function deleteUsuario(id: number) {
  try {
    await prisma.usuario.delete({
      where: { id },
    })

    revalidatePath('/dashboard/usuarios')
    return { success: true }
  } catch (error) {
    console.error('Error al eliminar usuario:', error)
    return { success: false, error: 'No se pudo eliminar el usuario. Puede tener registros vinculados.' }
  }
}