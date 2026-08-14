import Link from 'next/link'
import { getUsuarios } from './actions'

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const query = (await searchParams)?.q || ''
  const { data: usuarios = [] } = await getUsuarios(query)

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-500 hover:text-[#145c2c] transition-colors mb-2 inline-block"
          >
            ← Volver al Dashboard Central
          </Link>
          <h1 className="text-2xl font-bold text-[#145c2c]">Gestión de Usuarios</h1>
          <p className="text-slate-500 text-sm">
            Listado de usuarios registrados en el sistema.
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <form method="GET" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre, usuario o correo..."
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#145c2c] text-sm text-slate-800 placeholder-slate-400"
          />
          <button
            type="submit"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Nombre / Usuario</th>
                <th className="p-4">Teléfono / Email</th>
                <th className="p-4">Rol</th>
                <th className="p-4 text-center">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {usuarios?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No se encontraron usuarios registrados.
                  </td>
                </tr>
              ) : (
                usuarios?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono text-slate-400">{u.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{u.nombre}</div>
                      <div className="text-xs text-slate-400 font-mono">@{u.usuario}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-700">{u.email || 'Sin correo'}</div>
                      <div className="text-xs text-slate-400">{u.telefono || 'Sin teléfono'}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2.5 py-1 rounded-md font-medium inline-block">
                        {u.rol?.nombre || `Rol ID: ${u.rolId || u.rol_id}`}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${
                          u.activo
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {u.activo ? '● Activo' : '○ Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}