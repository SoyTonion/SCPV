'use client'
import Link from 'next/link'
import { Truck, History, ShieldCheck, AlertTriangle, ScanLine, Car, CheckCircle2, Clock } from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from 'recharts'

interface PernoctaChartsProps {
  donaData: { name: string; value: number; color: string }[]
  movimientosData: { day: string; escaneos: number }[]
  tiposData: { tipo: string; total: number; color: string }[]
  ultimosRegistros: { id: string; placas: string; fechaHora: string }[]
  ausentesSinJustificar: number
}

export default function PernoctaCharts({
  donaData,
  movimientosData,
  tiposData,
  ultimosRegistros,
  ausentesSinJustificar,
}: PernoctaChartsProps) {
  const totalFlota = donaData.reduce((s, d) => s + d.value, 0)
  const autorizados = donaData.find(d => d.name === 'Autorizados Pernocta')?.value ?? 0
  const totalEscaneosHoy = movimientosData.find(
    d => d.day === ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date().getDay()]
  )?.escaneos ?? 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 relative overflow-hidden">

      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="absolute top-0 left-0 w-full h-64 opacity-30" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#007A33" fillOpacity="0.08" d="M0,192L48,176C96,160,192,128,288,138.7C384,149,480,203,576,208C672,213,768,171,864,160C960,149,1056,171,1152,181.3C1248,192,1344,192,1392,192L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" />
        </svg>
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-[#007A33]/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-[#007A33]/5 blur-3xl" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 space-y-6">

        {/* Título */}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Control de Pernocta</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Monitoreo nocturno del parque vehicular — escaneos, ausentes y autorizaciones.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-[#007A33]/20 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-slate-500">Flota Pernocta</p>
              <div className="bg-[#007A33]/10 p-2 rounded-lg text-[#007A33]">
                <Car className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-800">{totalFlota}</p>
            <p className="text-xs text-slate-400 mt-1">vehículos registrados</p>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-[#007A33]/20 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-slate-500">Autorizados</p>
              <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-800">{autorizados}</p>
            <p className="text-xs text-slate-400 mt-1">con pernocta activa</p>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-[#007A33]/20 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-slate-500">Escaneos Hoy</p>
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                <ScanLine className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-800">{totalEscaneosHoy}</p>
            <p className="text-xs text-slate-400 mt-1">registros del rondín</p>
          </div>

          <div className={`bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border hover:shadow-md transition-shadow ${ausentesSinJustificar > 0 ? 'border-red-300' : 'border-[#007A33]/20'}`}>
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-slate-500">Sin Justificar</p>
              <div className={`p-2 rounded-lg ${ausentesSinJustificar > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className={`text-3xl font-extrabold ${ausentesSinJustificar > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {ausentesSinJustificar}
            </p>
            <p className="text-xs text-slate-400 mt-1">{ausentesSinJustificar > 0 ? 'requieren atención' : 'todo en orden'}</p>
          </div>
        </div>

        {/* Tarjetas de navegación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Link href="/dashboard/pernocta/vehiculos/nuevo"
            className="group bg-white/80 backdrop-blur-md border border-[#007A33]/20 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#007A33]/50 transition-all flex items-center gap-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#007A33]/10 text-[#007A33] group-hover:bg-[#007A33] group-hover:text-white transition-colors shrink-0">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Vehículos</p>
              <p className="text-xs text-slate-400 mt-0.5">Permisos de pernocta</p>
            </div>
          </Link>

          <Link href="/dashboard/pernocta/historial"
            className="group bg-white/80 backdrop-blur-md border border-[#007A33]/20 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#007A33]/50 transition-all flex items-center gap-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#007A33]/10 text-[#007A33] group-hover:bg-[#007A33] group-hover:text-white transition-colors shrink-0">
              <History className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Historial</p>
              <p className="text-xs text-slate-400 mt-0.5">Bitácora de rondines</p>
            </div>
          </Link>

          <Link href="/dashboard/pernocta/autorizaciones"
            className="group bg-white/80 backdrop-blur-md border border-[#007A33]/20 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#007A33]/50 transition-all flex items-center gap-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#007A33]/10 text-[#007A33] group-hover:bg-[#007A33] group-hover:text-white transition-colors shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Autorizaciones</p>
              <p className="text-xs text-slate-400 mt-0.5">Permisos de ausencia</p>
            </div>
          </Link>

          <Link href="/dashboard/pernocta/ausentes"
            className={`group bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 ${ausentesSinJustificar > 0 ? 'border-2 border-red-300 hover:border-red-400' : 'border border-[#007A33]/20 hover:border-[#007A33]/50'}`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 transition-colors relative ${ausentesSinJustificar > 0 ? 'bg-red-100 text-red-600 group-hover:bg-red-500 group-hover:text-white' : 'bg-[#007A33]/10 text-[#007A33] group-hover:bg-[#007A33] group-hover:text-white'}`}>
              <AlertTriangle className="h-6 w-6" />
              {ausentesSinJustificar > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {ausentesSinJustificar}
                </span>
              )}
            </div>
            <div>
              <p className="font-bold text-slate-800">Ausentes</p>
              <p className={`text-xs mt-0.5 ${ausentesSinJustificar > 0 ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                {ausentesSinJustificar > 0 ? `${ausentesSinJustificar} sin justificar` : 'Todo en orden'}
              </p>
            </div>
          </Link>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Escaneos semanales — ocupa 2 columnas */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-[#007A33]/20">
            <div className="mb-4">
              <h2 className="text-lg font-extrabold text-slate-800">Escaneos de la Semana</h2>
              <p className="text-xs text-slate-500 font-medium">Vehículos registrados por noche</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={movimientosData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Line type="monotone" dataKey="escaneos" stroke="#007A33" strokeWidth={3} dot={{ r: 4, fill: '#007A33' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Últimos escaneos */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-[#007A33]/20 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#007A33]" />
                Últimos Escaneos
              </h2>
            </div>
            <div className="grow overflow-y-auto p-4 space-y-2">
              {ultimosRegistros.length === 0 ? (
                <p className="text-sm text-slate-400 text-center mt-8">Sin escaneos recientes.</p>
              ) : (
                ultimosRegistros.map((item, i) => (
                  <div key={item.id || i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-[#007A33]/10">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#007A33]/10 text-[#007A33] rounded-lg p-1.5">
                        <ScanLine className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 font-mono">{item.placas}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(item.fechaHora).toLocaleString('es-MX', { timeStyle: 'short', dateStyle: 'short' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Dona + Barras por tipo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-[#007A33]/20">
            <h2 className="text-lg font-extrabold text-slate-800 mb-4">Estado de la Flota</h2>
            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donaData} innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                    {donaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 text-xs font-semibold text-slate-600 mt-2">
              {donaData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: d.color }} />
                  {d.name}: <strong className="text-slate-800">{d.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-[#007A33]/20">
            <h2 className="text-lg font-extrabold text-slate-800 mb-4">Vehículos por Tipo</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tiposData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="tipo" stroke="#94A3B8" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {tiposData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </main>
    </div>
  )
}
