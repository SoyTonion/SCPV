import { getResumenPernocta } from './actions'
import Link from 'next/link'
import AusentesCliente from './AusentesCliente'

export default async function AusentesPage() {
  const resultado = await getResumenPernocta()

  if (!resultado.success) {
    return (
      <main className="p-8 max-w-7xl mx-auto">
        <p className="text-red-500">{resultado.error}</p>
      </main>
    )
  }

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8">

      {/* Encabezado estático */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#145c2c]">Reporte de Pernocta — Hoy</h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">{resultado.data.fecha}</p>
        </div>
        <Link
          href="/dashboard/pernocta"
          className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          ← Volver al módulo
        </Link>
      </div>

      {/* Contenido dinámico con polling */}
      <AusentesCliente inicial={resultado.data} />

    </main>
  )
}
