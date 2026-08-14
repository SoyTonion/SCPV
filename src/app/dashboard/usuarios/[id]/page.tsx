import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getUsuarioById, getRoles } from '../actions'
import FormUsuario from '../FormUsuario'

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const id = Number(resolvedParams.id)

  const { data: usuario } = await getUsuarioById(id)
  const { data: roles = [] } = await getRoles()

  if (!usuario) {
    notFound()
  }

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/usuarios"
          className="text-sm font-medium text-slate-500 hover:text-purple-600 transition-colors mb-2 inline-block"
        >
          ← Volver a Usuarios
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Editar Usuario #{usuario.id}</h1>
        <p className="text-slate-500 text-sm">Modifica los datos del usuario seleccionando los campos correspondientes.</p>
      </div>

      <FormUsuario usuario={usuario} roles={roles} />
    </main>
  )
}