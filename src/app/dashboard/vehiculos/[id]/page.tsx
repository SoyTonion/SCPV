import Link from 'next/link'
import { notFound } from 'next/navigation'
import FormVehiculo from '../formVehiculo'
import { getVehiculoById, getDepartamentos } from '../actions'

export default async function EditarVehiculoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [{ data: vehiculo }, { data: departamentos = [] }] = await Promise.all([
    getVehiculoById(id),
    getDepartamentos(),
  ])

  if (!vehiculo) {
    notFound()
  }

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/pernocta/vehiculos"
          className="text-sm font-medium text-slate-500 hover:text-[#145c2c] transition-colors mb-2 inline-block"
        >
          ← Volver a Vehículos
        </Link>
        <h1 className="text-2xl font-bold text-[#145c2c]">Editar Vehículo</h1>
        <p className="text-slate-500 text-sm">Modifica la información de la unidad {vehiculo.economico || vehiculo.placas}.</p>
      </div>

      <FormVehiculo vehiculo={vehiculo} departamentos={departamentos} />
    </main>
  )
}