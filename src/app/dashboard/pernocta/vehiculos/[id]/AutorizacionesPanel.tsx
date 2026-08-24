'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crearAutorizacionDesdeDetalle, eliminarAutorizacionDesdeDetalle } from './actions'

interface Autorizacion {
  id: string
  fechaInicio: string
  fechaFin: string
  motivo: string
  autorizadoPor: string
  vigente: boolean
}

export default function AutorizacionesPanel({
  vehiculoId,
  autorizaciones: inicial,
}: {
  vehiculoId: string
  autorizaciones: Autorizacion[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setExito(false)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await crearAutorizacionDesdeDetalle(vehiculoId, formData)
      if (!res.success) {
        setError(res.error ?? 'Error desconocido.')
      } else {
        setExito(true)
        setMostrarForm(false)
        ;(e.target as HTMLFormElement).reset()
        router.refresh()
        setTimeout(() => setExito(false), 3000)
      }
    })
  }

  const handleEliminar = (id: string) => {
    if (!confirm('¿Eliminar esta autorización?')) return
    startTransition(async () => {
      await eliminarAutorizacionDesdeDetalle(id, vehiculoId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">

      {/* Cabecera con botón de agregar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800">Autorizaciones de Pernocta</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Periodos en los que este vehículo puede ausentarse del parque
          </p>
        </div>
        <button
          onClick={() => { setMostrarForm(!mostrarForm); setError(null) }}
          className="text-sm font-semibold text-white bg-[#145c2c] hover:bg-[#0f4722] px-3 py-1.5 rounded-lg transition-colors"
        >
          {mostrarForm ? 'Cancelar' : '+ Nueva autorización'}
        </button>
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Fecha inicio <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="fechaInicio"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#145c2c] focus:outline-none focus:ring-1 focus:ring-[#145c2c]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Fecha fin <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="fechaFin"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#145c2c] focus:outline-none focus:ring-1 focus:ring-[#145c2c]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo</label>
            <input
              type="text"
              name="motivo"
              placeholder="Ej. Taller, comisión..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#145c2c] focus:outline-none focus:ring-1 focus:ring-[#145c2c]"
            />
          </div>
          <div className="sm:col-span-3 flex items-center justify-between gap-3">
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="ml-auto bg-[#145c2c] hover:bg-[#0f4722] disabled:opacity-60 text-white font-semibold rounded-lg py-2 px-5 text-sm transition-colors"
            >
              {isPending ? 'Guardando...' : 'Autorizar'}
            </button>
          </div>
        </form>
      )}

      {exito && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          ✓ Autorización registrada correctamente.
        </p>
      )}

      {/* Tabla de autorizaciones */}
      {inicial.length === 0 ? (
        <p className="text-sm text-slate-400 italic text-center py-6">
          Sin autorizaciones registradas para este vehículo.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Periodo</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Autorizado por</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {inicial.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-xs">
                    <div>{a.fechaInicio}</div>
                    <div className="text-slate-400">al {a.fechaFin}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">
                    {a.motivo || <span className="italic text-slate-300">Sin motivo</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{a.autorizadoPor}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      a.vigente ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {a.vigente ? 'Vigente' : 'Vencida'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEliminar(a.id)}
                      disabled={isPending}
                      className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
