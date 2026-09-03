import { getResumenPernocta, type VehiculoAusente } from './actions'
import Link from 'next/link'
import BarraProgreso from './BarraProgreso'

function TarjetaConteo({
  valor,
  label,
  sublabel,
  color,
}: {
  valor: number
  label: string
  sublabel?: string
  color: string
}) {
  return (
    <div className={`rounded-2xl border p-5 bg-white shadow-sm ${color}`}>
      <p className="text-3xl font-bold">{valor}</p>
      <p className="text-sm mt-1 font-medium">{label}</p>
      {sublabel && <p className="text-xs mt-0.5 opacity-70">{sublabel}</p>}
    </div>
  )
}

function TablaVehiculos({
  vehiculos,
  tipo,
}: {
  vehiculos: VehiculoAusente[]
  tipo: 'alerta' | 'autorizado'
}) {
  if (vehiculos.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic py-6 text-center">
        Ninguno — todo en orden.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-3">Económico / Placas</th>
            <th className="px-4 py-3">Vehículo</th>
            <th className="px-4 py-3">Responsable</th>
            <th className="px-4 py-3">Departamento</th>
            {tipo === 'autorizado' && (
              <>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Autorizado por</th>
                <th className="px-4 py-3">Vigente hasta</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {vehiculos.map((v) => (
            <tr
              key={v.id}
              className={`transition-colors ${
                tipo === 'alerta' ? 'hover:bg-red-50/40' : 'hover:bg-blue-50/40'
              }`}
            >
              <td className="px-4 py-3">
                <div className="font-bold text-slate-900">{v.economico}</div>
                <div className="text-xs font-mono text-slate-400">{v.placas}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">{v.vehiculo}</td>
              <td className="px-4 py-3 text-slate-600 text-xs">{v.responsable}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{v.departamento}</td>
              {tipo === 'autorizado' && (
                <>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px]">
                    {v.motivoAutorizacion}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{v.autorizadoPor}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{v.fechaFinAutorizacion}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function AusentesPage() {
  const resultado = await getResumenPernocta()

  if (!resultado.success) {
    return (
      <main className="p-8 max-w-7xl mx-auto">
        <p className="text-red-500">{resultado.error}</p>
      </main>
    )
  }

  const { data } = resultado

  // Vehículos de la flota que sí fueron verificados hoy
  const verificados = data.escaneadosOk
  // Total no escaneados = flota - verificados
  const totalNoEscaneados = data.totalFlota - verificados
  // De esos, cuántos tienen autorización = están bien
  const conAutorizacion = data.ausentesAutorizados.length
  // Sin justificar = los que realmente son alerta
  const sinJustificar = data.ausentesSinJustificar.length

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8">

      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#145c2c]">Reporte de Pernocta — Hoy</h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">{data.fecha}</p>
        </div>
        <Link
          href="/dashboard/pernocta"
          className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          ← Volver al módulo
        </Link>
      </div>

      {/* Aviso si no hay rondín hoy */}
      {!data.rondinActivo && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <span className="text-2xl">🕐</span>
          <div>
            <p className="font-bold text-amber-800">El rondín de hoy aún no ha comenzado</p>
            <p className="text-sm text-amber-700 mt-0.5">
              No se han registrado escaneos por ningún guardia. Los vehículos aparecerán como verificados conforme avance el rondín.
            </p>
          </div>
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TarjetaConteo
          valor={data.totalFlota}
          label="Flota que debe pernoctar"
          sublabel="Con vehiculoPernocta activo"
          color="border-slate-200 text-slate-700"
        />
        <TarjetaConteo
          valor={verificados}
          label="Verificados en el rondín"
          sublabel="Escaneados y confirmados"
          color="border-emerald-200 text-emerald-700"
        />
        <TarjetaConteo
          valor={conAutorizacion}
          label="Ausentes con autorización"
          sublabel="Fuera pero justificados"
          color="border-blue-200 text-blue-700"
        />
        <TarjetaConteo
          valor={sinJustificar}
          label="Sin verificar ni justificar"
          sublabel={data.rondinActivo ? 'Requieren atención' : 'Rondín pendiente'}
          color={
            sinJustificar > 0 && data.rondinActivo
              ? 'border-red-300 text-red-700 bg-red-50'
              : 'border-slate-200 text-slate-400'
          }
        />
      </div>

      {/* Barra de progreso del rondín */}
      {data.rondinActivo && (
        <BarraProgreso verificados={verificados} totalFlota={data.totalFlota} />
      )}

      {/* Banner de alerta solo si hay rondín Y hay sin justificar */}
      {data.rondinActivo && sinJustificar > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold text-red-800">
              {sinJustificar} vehículo{sinJustificar > 1 ? 's' : ''} no verificado{sinJustificar > 1 ? 's' : ''} ni justificado{sinJustificar > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-red-600 mt-0.5">
              No aparecieron en el rondín de hoy y no tienen autorización vigente. Verifica su ubicación o genera una autorización.
            </p>
          </div>
        </div>
      )}

      {/* Sección 1: Sin justificar */}
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-red-500" />
          <div>
            <h2 className="font-bold text-slate-800">No verificados ni justificados</h2>
            <p className="text-xs text-slate-500">
              {data.rondinActivo
                ? 'No fueron escaneados hoy y no tienen autorización vigente'
                : 'El rondín aún no comienza — este listado se actualizará conforme avance'}
            </p>
          </div>
          <span className="ml-auto text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            {sinJustificar}
          </span>
        </div>
        <TablaVehiculos vehiculos={data.ausentesSinJustificar} tipo="alerta" />
      </div>

      {/* Sección 2: Autorizados ausentes */}
      <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-blue-100 flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-blue-500" />
          <div>
            <h2 className="font-bold text-slate-800">Ausentes con autorización vigente</h2>
            <p className="text-xs text-slate-500">
              No fueron escaneados pero tienen permiso registrado — no es una alerta
            </p>
          </div>
          <span className="ml-auto text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
            {conAutorizacion}
          </span>
        </div>
        <TablaVehiculos vehiculos={data.ausentesAutorizados} tipo="autorizado" />
      </div>

      {/* Todo en orden */}
      {data.rondinActivo && totalNoEscaneados === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mb-4">
            ✓
          </div>
          <h3 className="text-xl font-bold text-slate-800">Rondín completado</h3>
          <p className="text-slate-500 text-sm mt-1">
            Los {verificados} vehículos de la flota fueron verificados en el rondín de hoy.
          </p>
        </div>
      )}

    </main>
  )
}
