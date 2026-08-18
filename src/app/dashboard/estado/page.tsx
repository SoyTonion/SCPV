import Link from 'next/link';
import { 
  Car, 
  Check, 
  CircleAlert, 
  X, 
  Clock, 
  Wrench, 
  CalendarClock, 
  PieChart, 
  ChevronRight,
  FileText
} from 'lucide-react';

const ROLES_PERMITIDOS = [1];

export default async function estadoIndex() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Cabecera con botón de Generar Reporte PDF */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-500 hover:text-[#007A33] transition-colors mb-2 inline-block"
            >
              ← Volver al Dashboard Central
            </Link>

            <h1 className="text-2xl font-bold text-slate-800">
              Estado físico del Parque Vehicular
            </h1>

            <p className="text-slate-500 text-sm">
              Resumen operativo de inspecciones, alertas y condiciones físicas
              de los vehículos.
            </p>
          </div>

          {/* Botón de Generar Reporte PDF */}
          <div className="flex items-center shrink-0">
            <Link
              href="/dashboard/estado/reportes"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#007A33] hover:bg-[#005f27] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <FileText size={18} />
              Generar Reporte PDF
            </Link>
          </div>
        </div>

        {/* Tarjetas de indicadores KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Vehículos inspeccionados */}
          <Link
            href="/dashboard/estado/vehiculos"
            className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-slate-500 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  Vehículos inspeccionados
                </p>

                <p className="text-3xl font-bold text-slate-800">
                  137
                </p>
              </div>

              <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-slate-600 group-hover:text-white transition-colors">
                <Car size={21} />
              </div>
            </div>
          </Link>

          {/* Buenas condiciones */}
          <Link
            href="/dashboard/estado/vehiculos?estado=NORMAL"
            className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-green-500 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  En buenas condiciones
                </p>

                <p className="text-3xl font-bold text-slate-800">
                  20
                </p>
              </div>

              <div className="h-10 w-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
                <Check size={21} />
              </div>
            </div>
          </Link>

          {/* Requieren atención */}
          <Link
            href="/dashboard/estado/vehiculos?estado=ADVERTENCIA"
            className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  Requieren atención
                </p>

                <p className="text-3xl font-bold text-slate-800">
                  20
                </p>
              </div>

              <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <CircleAlert size={21} />
              </div>
            </div>
          </Link>

          {/* Críticos */}
          <Link
            href="/dashboard/estado/vehiculos?estado=CRITICO"
            className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-500 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  Críticos
                </p>

                <p className="text-3xl font-bold text-slate-800">
                  5
                </p>
              </div>

              <div className="h-10 w-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
                <X size={21} />
              </div>
            </div>
          </Link>

        </div>

        {/* Sección de Paneles Principales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 📊 Cumplimiento de Inspecciones */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <PieChart className="text-[#007A33]" size={20} />
                  Cumplimiento
                </h3>
                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                  Meta: 85%
                </span>
              </div>

              {/* Gráfica de Dona SVG */}
              <div className="relative flex items-center justify-center my-4">
                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 36 36">
                  {/* Círculo base (Faltantes / Pendientes) */}
                  <path
                    className="text-slate-100"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Círculo de progreso (75% Realizadas) */}
                  <path
                    className="text-[#007A33]"
                    strokeDasharray="75, 100"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                {/* Texto Central */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold text-slate-800">75%</span>
                  <span className="text-xs text-slate-500 font-medium">Avance Total</span>
                </div>
              </div>

              {/* Leyendas */}
              <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#007A33]"></span>
                  <span className="text-slate-600 text-xs">Realizadas (137)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-slate-200"></span>
                  <span className="text-slate-600 text-xs">Pendientes (45)</span>
                </div>
              </div>
            </div>
          </div>

          {/* ⏱️ Última Inspección */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="text-slate-600" size={20} />
                  Últimas Inspecciones Registradas
                </h3>
                <Link 
                  href="/dashboard/estado/inspecciones" 
                  className="text-xs font-semibold text-[#007A33] hover:underline flex items-center gap-1"
                >
                  Ver historial <ChevronRight size={14} />
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {/* Ítem 1 */}
                <div className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                      <Car size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Toyota Hilux (Placas: GZX-452-A)</p>
                      <p className="text-xs text-slate-500">Inspector: Carlos Mendoza • Económico: #104</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-700 block">Hoy, 10:30 AM</span>
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                      Buenas condiciones
                    </span>
                  </div>
                </div>

                {/* Ítem 2 */}
                <div className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                      <Car size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Nissan NP300 (Placas: FL-8912-B)</p>
                      <p className="text-xs text-slate-500">Inspector: Ana Rivas • Económico: #082</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-700 block">Ayer, 04:15 PM</span>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                      Requiere atención
                    </span>
                  </div>
                </div>

                {/* Ítem 3 */}
                <div className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                      <Car size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Ford F-150 (Placas: UK-331-C)</p>
                      <p className="text-xs text-slate-500">Inspector: Juan Pérez • Económico: #015</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-700 block">16/Ago/2026, 02:00 PM</span>
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                      Crítico
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 🔧 Incidencias Detectadas */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="text-amber-500" size={20} />
                Incidencias Frecuentes Detectadas
              </h3>
              <span className="text-xs text-slate-500">Últimos 30 días</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-amber-800 uppercase">Frenos y Llantas</span>
                  <span className="text-sm font-bold text-amber-700">12</span>
                </div>
                <p className="text-xs text-slate-600">Desgaste excesivo de balatas o neumáticos con baja presión.</p>
              </div>

              <div className="p-4 bg-red-50/50 rounded-lg border border-red-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-red-800 uppercase">Fugas de Fluido</span>
                  <span className="text-sm font-bold text-red-700">5</span>
                </div>
                <p className="text-xs text-slate-600">Fugas menores de aceite de motor y refrigerante.</p>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-blue-800 uppercase">Luces / Eléctrico</span>
                  <span className="text-sm font-bold text-blue-700">8</span>
                </div>
                <p className="text-xs text-slate-600">Faros fundidos o fallas en luces de freno traseras.</p>
              </div>
            </div>
          </div>

          {/* 📸 Inspecciones Pendientes / Programadas */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarClock className="text-blue-600" size={20} />
                Próximas Pendientes
              </h3>
              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                45 total
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">Chevrolet S10 (#044)</p>
                  <p className="text-xs text-slate-500">Mantenimiento preventivo mensual</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-amber-600 block">Mañana</span>
                  <span className="text-[10px] text-slate-400">09:00 AM</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">International 4300 (#002)</p>
                  <p className="text-xs text-slate-500">Inspección de seguridad de ruta</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-600 block">20/Ago/2026</span>
                  <span className="text-[10px] text-slate-400">11:30 AM</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">Nissan March (#019)</p>
                  <p className="text-xs text-slate-500">Revisión física periódica</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-600 block">21/Ago/2026</span>
                  <span className="text-[10px] text-slate-400">08:00 AM</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}