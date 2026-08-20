'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { crearAutorizacion, eliminarAutorizacion, buscarVehiculos } from './actions'

interface Autorizacion {
  id: string
  vehiculoId: string
  economico: string
  placas: string
  vehiculo: string
  fechaInicio: string
  fechaFin: string
  motivo: string
  autorizadoPor: string
  vigente: boolean
}

interface VehiculoOpcion {
  id: string
  economico: string | null
  placas: string | null
  marcaVehiculo: string
  submarcaVehiculo: string
}

export default function AutorizacionesClient({
  autorizaciones: inicial,
}: {
  autorizaciones: Autorizacion[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  // Búsqueda de vehículo
  const [busqueda, setBusqueda] = useState('')
  const [opciones, setOpciones] = useState<VehiculoOpcion[]>([])
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<VehiculoOpcion | null>(null)
  const [mostrarDropdown, setMostrarDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMostrarDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Buscar vehículos con debounce
  useEffect(() => {
    if (busqueda.length < 2) {
      setOpciones([])
      setMostrarDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      const res = await buscarVehiculos(busqueda)
      if (res.success && res.data) {
        setOpciones(res.data as VehiculoOpcion[])
        setMostrarDropdown(true)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [busqueda])

  const seleccionarVehiculo = (v: VehiculoOpcion) => {
    setVehiculoSeleccionado(v)
    setBusqueda(`${v.economico ?? ''} — ${v.placas ?? ''} (${v.marcaVehiculo} ${v.submarcaVehiculo})`)
    setMostrarDropdown(false)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setExito(false)

    if (!vehiculoSeleccionado) {
      setError('Selecciona un vehículo de la lista.')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('vehiculoId', vehiculoSeleccionado.id)

    startTransition(async () => {
      const res = await crearAutorizacion(formData)
      if (!res.success) {
        setError(res.error ?? 'Error desconocido.')
      } else {
        setExito(true)
        setVehiculoSeleccionado(null)
        setBusqueda('')
        ;(e.target as HTMLFormElement).reset()
        router.refresh()
        setTimeout(() => setExito(false), 3000)
      }
    })
  }

  const handleEliminar = (id: string) => {
    if (!confirm('¿Eliminar esta autorización?')) return
    startTransition(async () => {
      await eliminarAutorizacion(id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      {/* Formulario de nueva autorización */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-5">Nueva Autorización</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Buscador de vehículo */}
          <div className="lg:col-span-2 relative" ref={dropdownRef}>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Vehículo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setVehiculoSeleccionado(null)
              }}
              placeholder="Buscar por económico o placas..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#145c2c] focus:outline-none focus:ring-1 focus:ring-[#145c2c]"
              autoComplete="off"
            />
            {mostrarDropdown && opciones.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                {opciones.map((v) => (
                  <li
                    key={v.id}
                    onClick={() => seleccionarVehiculo(v)}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-emerald-50 hover:text-[#145c2c]"
                  >
                    <span className="font-bold">{v.economico ?? 'S/N'}</span>
                    <span className="text-slate-400 ml-2">{v.placas ?? 'S/P'}</span>
                    <span className="text-slate-500 ml-2 text-xs">{v.marcaVehiculo} {v.submarcaVehiculo}</span>
                  </li>
                ))}
              </ul>
            )}
            {mostrarDropdown && opciones.length === 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow p-3 text-sm text-slate-400">
                Sin resultados para "{busqueda}"
              </div>
            )}
          </div>

          {/* Fecha inicio */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Fecha Inicio <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="fechaInicio"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#145c2c] focus:outline-none focus:ring-1 focus:ring-[#145c2c]"
            />
          </div>

          {/* Fecha fin */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Fecha Fin <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="fechaFin"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#145c2c] focus:outline-none focus:ring-1 focus:ring-[#145c2c]"
            />
          </div>

          {/* Motivo */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Motivo (opcional)
            </label>
            <input
              type="text"
              name="motivo"
              placeholder="Ej. Comisión de trabajo, mantenimiento externo..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#145c2c] focus:outline-none focus:ring-1 focus:ring-[#145c2c]"
            />
          </div>

          {/* Botón */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#145c2c] hover:bg-[#0f4722] disabled:opacity-60 text-white font-semibold rounded-lg py-2 px-4 text-sm transition-colors"
            >
              {isPending ? 'Guardando...' : 'Autorizar'}
            </button>
          </div>

        </form>

        {/* Mensajes de estado */}
        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {exito && (
          <p className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            ✓ Autorización registrada correctamente.
          </p>
        )}
      </div>

      {/* Tabla de autorizaciones */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Autorizaciones Registradas</h2>
          <span className="text-xs text-slate-400">{inicial.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs">
              <tr>
                <th className="p-4">Vehículo</th>
                <th className="p-4">Periodo</th>
                <th className="p-4">Motivo</th>
                <th className="p-4">Autorizado por</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {inicial.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Sin autorizaciones registradas.
                  </td>
                </tr>
              ) : (
                inicial.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{a.economico}</div>
                      <div className="text-xs text-slate-400 font-mono">{a.placas}</div>
                      <div className="text-xs text-slate-500">{a.vehiculo}</div>
                    </td>
                    <td className="p-4 text-xs">
                      <div>{a.fechaInicio}</div>
                      <div className="text-slate-400">al {a.fechaFin}</div>
                    </td>
                    <td className="p-4 text-xs text-slate-500 max-w-[180px] truncate">
                      {a.motivo || <span className="italic text-slate-300">Sin motivo</span>}
                    </td>
                    <td className="p-4 text-xs text-slate-600">{a.autorizadoPor}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-[11px] font-bold ${
                          a.vigente
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {a.vigente ? 'Vigente' : 'Vencida'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleEliminar(a.id)}
                        disabled={isPending}
                        className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
