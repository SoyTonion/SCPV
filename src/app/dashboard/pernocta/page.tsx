import { getPernoctaDashboardStats } from './actions'
import { getResumenPernocta } from './ausentes/actions'
import PernoctaCharts from './PernoctaCharts'

export default async function PernoctaPage() {
  // Ambas queries en paralelo
  const [{ data }, resumen] = await Promise.all([
    getPernoctaDashboardStats(),
    getResumenPernocta(),
  ])

  const ausentesSinJustificar = resumen.success
    ? resumen.data.ausentesSinJustificar.length
    : 0

  // Datos fallback por si la base aún no tiene registros suficientes
  const donaData = data?.dona || [
    { name: 'Pernoctando (En Base)', value: 0, color: '#00875A' },
    { name: 'En Tránsito/Fuera', value: 0, color: '#E07A5F' },
  ]

  const movimientosSemana = data?.movimientosSemana || [
    { day: 'Lun', escaneos: 0 },
    { day: 'Mar', escaneos: 0 },
    { day: 'Mié', escaneos: 0 },
    { day: 'Jue', escaneos: 0 },
    { day: 'Vie', escaneos: 0 },
    { day: 'Sáb', escaneos: 0 },
    { day: 'Dom', escaneos: 0 },
  ]

  const tiposData = data?.tipos || []
  const ultimosRegistros = data?.ultimosRegistros || []

  return (
    <PernoctaCharts
      donaData={donaData}
      movimientosData={movimientosSemana}
      tiposData={tiposData}
      ultimosRegistros={ultimosRegistros}
      ausentesSinJustificar={ausentesSinJustificar}
    />
  )
}