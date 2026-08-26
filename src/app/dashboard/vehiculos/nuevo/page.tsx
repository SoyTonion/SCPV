import Link from 'next/link'
import FormVehiculo from '../formVehiculo'
import { getDepartamentos } from '@/app/dashboard/vehiculos/actions'

export default async function NuevoVehiculoPage() {
  const { data: departamentos = [] } = await getDepartamentos()

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/vehiculos"
          className="text-sm font-medium text-slate-500 hover:text-[#145c2c] transition-colors mb-2 inline-block"
        >
          ← Volver a Vehículos
        </Link>
        <h1 className="text-2xl font-bold text-[#145c2c]">Registrar Nuevo Vehículo</h1>
        <p className="text-slate-500 text-sm">Ingresa los datos correspondientes para agregar una nueva unidad al catálogo.</p>
      </div>

      <FormVehiculo departamentos={departamentos} />
    </main>
  )
}