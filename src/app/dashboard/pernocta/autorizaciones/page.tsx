import { getAutorizaciones } from './actions'
import AutorizacionesClient from './AutorizacionesClient'

export default async function AutorizacionesPage() {
  const { data: autorizaciones } = await getAutorizaciones()

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#145c2c]">Autorizaciones de Pernocta</h1>
        <p className="text-slate-500 text-sm mt-1">
          Registra vehículos autorizados para pernoctar fuera del parque vehicular en un rango de fechas.
        </p>
      </div>

      <AutorizacionesClient autorizaciones={autorizaciones ?? []} />
    </main>
  )
}
