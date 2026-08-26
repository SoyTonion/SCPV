'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createUsuario, updateUsuario } from './actions'

// Ajustamos la interfaz para que acepte tanto nombreRol como nombre
interface Rol {
  id: number
  nombreRol?: string
  nombre?: string
}

interface FormUsuarioProps {
  usuario?: any
  roles: Rol[]
}

export default function FormUsuario({ usuario, roles }: FormUsuarioProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const isEditing = !!usuario

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const formData = new FormData(e.currentTarget)

    let res
    if (isEditing) {
      res = await updateUsuario(usuario.id, formData)
    } else {
      res = await createUsuario(formData)
    }

    setLoading(false)

    if (res.success) {
      router.push('/dashboard/usuarios')
      router.refresh()
    } else {
      setErrorMsg(res.error || 'Ocurrió un error al procesar la solicitud.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 max-w-2xl mx-auto">
      {errorMsg && (
        <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm border border-rose-200">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Completo</label>
          <input
            type="text"
            name="nombre"
            defaultValue={usuario?.nombre || ''}
            placeholder="Ej: Juan Pérez"
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
          />
        </div>

        {/* Usuario */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre de Usuario (Username)</label>
          <input
            type="text"
            name="usuario"
            defaultValue={usuario?.usuario || ''}
            placeholder="Ej: jperez"
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
          />
        </div>

        {/* Rol */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Rol de Acceso</label>
          <select
            name="rolId"
            defaultValue={usuario?.rolId || usuario?.rol_id || (roles[0]?.id ?? '')}
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombreRol || r.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico</label>
          <input
            type="email"
            name="email"
            defaultValue={usuario?.email || ''}
            placeholder="usuario@cfe.gob.mx"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono</label>
          <input
            type="text"
            name="telefono"
            defaultValue={usuario?.telefono || ''}
            placeholder="Ej: 6561234567"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
          />
        </div>

        {/* Contraseña */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            {isEditing ? 'Nueva Contraseña (Dejar en blanco para mantener la actual)' : 'Contraseña'}
          </label>
          <input
            type="password"
            name="password"
            required={!isEditing}
            placeholder="••••••••"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
          />
        </div>
      </div>

      {/* Checkbox Activo */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <input
          type="checkbox"
          id="activo"
          name="activo"
          defaultChecked={usuario ? usuario.activo : true}
          className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-700"
        />
        <label htmlFor="activo" className="text-sm font-medium text-slate-700 cursor-pointer">
          Usuario Activo en el Sistema
        </label>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Usuario'}
        </button>
      </div>
    </form>
  )
}