import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from "@/lib/auth";
import Link from 'next/link'
import { getVehiculosPernocta, deleteVehiculo } from './actions'


const ROLES_PERMITIDOS = [ 1 ];

const session = await getServerSession(authOptions);

  if (!session) redirect('/');
  if (!ROLES_PERMITIDOS.includes(Number(session.user.rol))) redirect('/operacion');

export default async function VehiculosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
    const session = await getServerSession(authOptions);
  
    if (!session) redirect('/');
    if (!ROLES_PERMITIDOS.includes(Number(session.user.rol))) redirect('/operacion');

  const query = (await searchParams)?.q || ''
  const { data: vehiculos = [] } = await getVehiculosPernocta(query)

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Navegación */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-500 hover:text-[#145c2c] transition-colors mb-2 inline-block"
          >
            ← Volver al Dashboard Central
          </Link>
          <h1 className="text-2xl font-bold text-[#145c2c]">Gestión de Vehículos</h1>
          <p className="text-slate-500 text-sm">
            Catálogo general del parque vehicular.
          </p>
        </div>

        <Link
          href="/dashboard/vehiculos/nuevo"
          className="bg-[#145c2c] hover:bg-[#0f4621] text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors text-center inline-flex items-center justify-center gap-2"
        >
          <span>+</span> Nuevo Vehículo
        </Link>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <form method="GET" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Buscar por económico, placas, serie o responsable..."
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

      {/* Tabla de Resultados */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-4">Económico / Placas</th>
                <th className="p-4">Vehículo</th>
                <th className="p-4">Responsable</th>
                <th className="p-4">Departamento</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {vehiculos?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No se encontraron vehículos registrados.
                  </td>
                </tr>
              ) : (
                vehiculos?.map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{v.economico || 'S/N'}</div>
                      <div className="text-xs text-slate-400 font-mono">{v.placas || 'Sin placas'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{v.marcaVehiculo} {v.submarcaVehiculo}</div>
                      <div className="text-xs text-slate-400">{v.modelo || 'N/A'} • {v.tipoVehiculo}</div>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {v.responsable}
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-md font-medium inline-block">
                        {v.departamento?.nombreDepartamento || 'Sin Depto'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-3">
                      <Link
                        href={`/dashboard/vehiculos/${v.id}`}
                        className="text-xs font-semibold text-[#145c2c] hover:underline"
                      >
                        Editar
                      </Link>
                      <form
                        action={async () => {
                          'use server'
                          await deleteVehiculo(v.id)
                        }}
                        className="inline-block"
                      >
                        <button
                          type="submit"
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </form>
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