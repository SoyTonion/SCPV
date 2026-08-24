import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDetalleVehiculo, togglePernoctaDesdeDetalle } from './actions'
import AutorizacionesPanel from './AutorizacionesPanel'

const TIPO_LABELS: Record<string, string> = {
  SED: 'Sedán', PIK: 'Pick-up', CAM: 'Camión', CEE: 'Camioneta', MON: 'Montacargas',
}

export default async function DetalleVehiculoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const resultado = await getDetalleVehiculo(id)

  if (!resultado.success) notFound()

  const v = resultado.data

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-8">

      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#145c2c]">
            {v.economico} — {v.marca} {v.submarca}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {v.placas} · {v.departamento}
          </p>
        </div>
        <Link
          href="/dashboard/pernocta/vehiculos/nuevo"
          className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          ← Volver a vehículos
        </Link>
      </div>

      {/* Tarjeta de datos del vehículo */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-slate-800">Datos del vehículo</h2>

          {/* Toggle de pernocta como form action del servidor */}
          <form
            action={async () => {
              'use server'
              await togglePernoctaDesdeDetalle(v.id, !v.vehiculoPernocta)
            }}
          >
            <button
              type="submit"
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${
                v.vehiculoPernocta
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
                  : 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${v.vehiculoPernocta ? 'bg-emerald-600' : 'bg-rose-600'}`} />
              {v.vehiculoPernocta ? 'Pernocta: Activa' : 'Pernocta: Inactiva'}
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
          {[
            { label: 'Número económico', value: v.economico },
            { label: 'Placas', value: v.placas },
            { label: 'Número de serie', value: v.numeroSerie },
            { label: 'Marca', value: v.marca },
            { label: 'Submarca', value: v.submarca },
            { label: 'Modelo (año)', value: v.modelo?.toString() ?? '—' },
            { label: 'Tipo', value: TIPO_LABELS[v.tipo] ?? v.tipo },
            { label: 'Combustible', value: v.combustible },
            { label: 'Propiedad', value: v.tipoPropiedad },
            { label: 'Arrendadora', value: v.arrendadora },
            { label: 'Responsable', value: v.responsable },
            { label: 'Departamento', value: v.departamento },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
              <p className="font-medium text-slate-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* QR Token y escaneos */}
        <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-between text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Token QR</p>
            <p className="font-mono text-slate-700 mt-0.5">
              {v.qrToken ?? <span className="text-slate-400 italic">Sin QR asignado</span>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total escaneos</p>
            <p className="text-2xl font-bold text-[#145c2c]">{v.totalEscaneos}</p>
          </div>
        </div>
      </div>

      {/* Panel de autorizaciones */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <AutorizacionesPanel vehiculoId={v.id} autorizaciones={v.autorizaciones} />
      </div>

    </main>
  )
}
