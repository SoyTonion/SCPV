'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getVehiculosConMetricas, togglePermisoPernocta } from '../../actions'

export default function TablaVehiculosPernocta() {
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [actualizandoId, setActualizandoId] = useState<string | null>(null)

  const cargarVehiculos = async (query = '') => {
    setCargando(true)
    const res = await getVehiculosConMetricas(query)
    if (res.success && res.data) {
      setVehiculos(res.data)
    }
    setCargando(false)
  }

  useEffect(() => {
    cargarVehiculos(busqueda)
  }, [busqueda])

  // Cambiar el permiso de pernocta
  const handleTogglePernocta = async (id: string, estadoActual: boolean) => {
    setActualizandoId(id)
    const nuevoEstado = !estadoActual

    // Actualización optimista en interfaz
    setVehiculos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, vehiculoPernocta: nuevoEstado } : v))
    )

    const res = await togglePermisoPernocta(id, nuevoEstado)
    if (!res.success) {
      // Revertir si hubo error
      setVehiculos((prev) =>
        prev.map((v) => (v.id === id ? { ...v, vehiculoPernocta: estadoActual } : v))
      )
      alert('Error al actualizar el estado de pernocta')
    }
    setActualizandoId(null)
  }

  return (
    <div className="p-6 space-y-4">
      {/* Buscador y Contador */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Buscar por eco, placa, marca o responsable..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <span className="text-xs font-medium text-slate-500">
          Total: {vehiculos.length} vehículos
        </span>
      </div>

      {/* Tabla limpia */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="p-4">Económico / Placas</th>
              <th className="p-4">Vehículo</th>
              <th className="p-4">Responsable / Depto</th>
              <th className="p-4 text-center">¿Pernocta?</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {cargando ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Cargando vehículos...
                </td>
              </tr>
            ) : vehiculos.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  No se encontraron vehículos.
                </td>
              </tr>
            ) : (
              vehiculos.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Económico / Placas */}
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{v.economico || 'S/N'}</div>
                    <div className="text-xs text-slate-400 font-mono">
                      {v.placas || 'Sin placas'}
                    </div>
                  </td>

                  {/* Vehículo */}
                  <td className="p-4">
                    <div className="font-medium">
                      {v.marcaVehiculo} {v.submarcaVehiculo}
                    </div>
                    <div className="text-xs text-slate-400">
                      {v.modelo || 'N/A'} • {v.tipoVehiculo}
                    </div>
                  </td>

                  {/* Responsable / Depto */}
                  <td className="p-4">
                    <div className="text-slate-700 font-medium">{v.responsable}</div>
                    <span className="text-[11px] text-slate-500">
                      {v.departamento?.nombreDepartamento || 'Sin depto'}
                    </span>
                  </td>

                  {/* Switch interactivo de Pernocta */}
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleTogglePernocta(v.id, v.vehiculoPernocta)}
                      disabled={actualizandoId === v.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        v.vehiculoPernocta
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      } ${actualizandoId === v.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          v.vehiculoPernocta ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      />
                      {v.vehiculoPernocta ? 'Permitido' : 'No Permitido'}
                    </button>
                  </td>

                  {/* Acciones */}
                  <td className="p-4 text-right">
                    <Link
                      href={`/dashboard/pernocta/vehiculos/${v.id}`}
                      className="text-xs font-semibold text-[#145c2c] hover:underline"
                    >
                      Ver detalles
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}