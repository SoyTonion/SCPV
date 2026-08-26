import { getAutorizaciones } from './actions'
import AutorizacionesClient from './AutorizacionesClient'
import Link from 'next/link'

export default async function AutorizacionesPage() {
  const { data: autorizaciones } = await getAutorizaciones()

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#145c2c]">Autorizaciones de Pernocta</h1>
          <p className="text-slate-500 text-sm mt-1">
            Registra vehículos autorizados para pernoctar fuera del parque vehicular en un rango de fechas.
          </p>
        </div>
        <Link
          href="/dashboard/pernocta"
          className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          ← Volver al módulo
        </Link>
      </div>

      <AutorizacionesClient autorizaciones={autorizaciones ?? []} />
    </main>
  )
}
