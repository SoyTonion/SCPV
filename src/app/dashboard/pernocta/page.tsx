import { getPernoctaDashboardStats } from './actions'
import PernoctaCharts from './PernoctaCharts'

export default async function PernoctaPage() {
  const { data } = await getPernoctaDashboardStats()

  // Datos fallback por si la base aún no tiene registros suficientes
  const donaData = data?.dona || [
    { name: 'Pernoctando (En Base)', value: 0, color: '#00875A' },
    { name: 'En Tránsito/Fuera', value: 0, color: '#E07A5F' },
  ]

  const movimientosSemana = [
    { day: 'Lun', entradas: 0, salidas: 0 },
    { day: 'Mar', entradas: 0, salidas: 0 },
    { day: 'Mié', entradas: 0, salidas: 0 },
    { day: 'Jue', entradas: 0, salidas: 0 },
    { day: 'Vie', entradas: 0, salidas: 0 },
    { day: 'Sáb', entradas: 0, salidas: 0 },
    { day: 'Dom', entradas: 0, salidas: 0 },
  ]

  const tiposData = data?.tipos || []
  const ultimosRegistros = data?.ultimosRegistros || []

  return (
    <PernoctaCharts
      donaData={donaData}
      movimientosData={movimientosSemana}
      tiposData={tiposData}
      ultimosRegistros={ultimosRegistros}
    />
  )
}