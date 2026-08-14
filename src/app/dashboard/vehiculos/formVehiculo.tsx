'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createVehiculo, updateVehiculo } from '@/app/dashboard/vehiculos/actions'

interface Departamento {
  id: number
  nombreDepartamento: string
}

interface FormVehiculoProps {
  vehiculo?: any
  departamentos: Departamento[]
}

export default function FormVehiculo({ vehiculo, departamentos }: FormVehiculoProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const isEditing = !!vehiculo

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const formData = new FormData(e.currentTarget)

    let res
    if (isEditing) {
      res = await updateVehiculo(vehiculo.id, formData)
    } else {
      res = await createVehiculo(formData)
    }

    setLoading(false)

    if (res.success) {
      router.push('/dashboard/vehiculos')
      router.refresh()
    } else {
      setErrorMsg(res.error || 'Ocurrió un error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 max-w-4xl mx-auto">
      {errorMsg && (
        <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm border border-rose-200">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Económico */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Económico</label>
          <input
            type="text"
            name="economico"
            defaultValue={vehiculo?.economico || ''}
            placeholder="Ej: CFE-001"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#145c2c]"
          />
        </div>

        {/* Placas */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Placas</label>
          <input
            type="text"
            name="placas"
            defaultValue={vehiculo?.placas || ''}
            placeholder="Ej: ABC-123-A"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#145c2c]"
          />
        </div>

        {/* Número de Serie */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Número de Serie (VIN)</label>
          <input
            type="text"
            name="numeroSerie"
            defaultValue={vehiculo?.numeroSerie || ''}
            placeholder="Ej: 3G1BC5SM..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#145c2c]"
          />
        </div>

        {/* Marca */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Marca</label>
          <input
            type="text"
            name="marcaVehiculo"
            defaultValue={vehiculo?.marcaVehiculo || 'CHEVROLET'}
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#145c2c]"
          />
        </div>

        {/* Submarca */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Submarca / Modelo Nombre</label>
          <input
            type="text"
            name="submarcaVehiculo"
            defaultValue={vehiculo?.submarcaVehiculo || 'AVEO'}
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#145c2c]"
          />
        </div>

        {/* Año Modelo */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Año Modelo</label>
          <input
            type="number"
            name="modelo"
            defaultValue={vehiculo?.modelo || new Date().getFullYear()}
            placeholder="2024"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#145c2c]"
          />
        </div>

        {/* Tipo Vehículo */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Vehículo</label>
          <select
            name="tipoVehiculo"
            defaultValue={vehiculo?.tipoVehiculo || 'SED'}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#145c2c]"
          >
            <option value="SED">Sedán (SED)</option>
            <option value="PIK">Pick Up (PIK)</option>
            <option value="CAM">Camión / Camioneta (CAM)</option>
            <option value="CEE">Chasis /Especial (CEE)</option>
            <option value="MON">Montacargas / Otro (MON)</option>
          </select>
        </div>

        {/* Tipo Propiedad */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Propiedad</label>
          <select
            name="tipoPropiedad"
            defaultValue={vehiculo?.tipoPropiedad || 'PROPIO'}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#145c2c]"
          >
            <option value="PROPIO">PROPIO</option>
            <option value="ARRENDADO">ARRENDADO</option>
          </select>
        </div>

        {/* Arrendadora */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Arrendadora</label>
          <select
            name="arrendadora"
            defaultValue={vehiculo?.arrendadora || 'NA'}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#145c2c]"
          >
            <option value="NA">N/A</option>
            <option value="JETVAN">JETVAN</option>
            <option value="LUMO">LUMO</option>
          </select>
        </div>

        {/* Tipo Combustible */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Combustible</label>
          <select
            name="tipoCombustible"
            defaultValue={vehiculo?.tipoCombustible || 'GASOLINA'}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#145c2c]"
          >
            <option value="GASOLINA">GASOLINA</option>
            <option value="DIESEL">DIESEL</option>
          </select>
        </div>

        {/* Responsable */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Responsable Asignado</label>
          <input
            type="text"
            name="responsable"
            defaultValue={vehiculo?.responsable || ''}
            placeholder="Nombre completo del responsable"
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#145c2c]"
          />
        </div>

        {/* Departamento */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Departamento</label>
          <select
            name="departamentoId"
            defaultValue={vehiculo?.departamentoId || ''}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#145c2c]"
          >
            <option value="">-- Seleccionar Departamento --</option>
            {departamentos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombreDepartamento}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Permiso de Pernocta */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <input
          type="checkbox"
          id="vehiculoPernocta"
          name="vehiculoPernocta"
          defaultChecked={vehiculo ? vehiculo.vehiculoPernocta : true}
          className="w-4 h-4 text-[#145c2c] rounded focus:ring-[#145c2c]"
        />
        <label htmlFor="vehiculoPernocta" className="text-sm font-medium text-slate-700 cursor-pointer">
          Autorizado para Pernocta en instalaciones
        </label>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-[#145c2c] hover:bg-[#0f4621] text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Vehículo'}
        </button>
      </div>
    </form>
  )
}