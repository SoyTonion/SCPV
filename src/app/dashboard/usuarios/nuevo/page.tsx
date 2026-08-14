import Link from 'next/link'
import { getRoles } from '../actions'
import FormUsuario from '../FormUsuario'

export default async function NuevoUsuarioPage() {
  const { data: roles = [] } = await getRoles()

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/usuarios"
          className="text-sm font-medium text-slate-500 hover:text-purple-600 transition-colors mb-2 inline-block"
        >
          ← Volver a Usuarios
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Registrar Nuevo Usuario</h1>
        <p className="text-slate-500 text-sm">Ingresa los datos para dar de alta un nuevo usuario en el sistema.</p>
      </div>

      <FormUsuario roles={roles} />
    </main>
  )
}