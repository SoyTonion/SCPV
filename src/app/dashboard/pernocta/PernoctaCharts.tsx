'use client'
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from "@/lib/auth";
import Link from 'next/link'
import { Truck, History } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts'

const ROLES_PERMITIDOS = [ 1 ];

const session = await getServerSession(authOptions);

  if (!session) redirect('/');
  if (!ROLES_PERMITIDOS.includes(Number(session.user.rol))) redirect('/operacion');
  
interface PernoctaChartsProps {
  donaData: { name: string; value: number; color: string }[]
  movimientosData: { day: string; entradas: number; salidas: number }[]
  tiposData: { tipo: string; total: number; color: string }[]
  ultimosRegistros: any[]
}

export default function PernoctaCharts({
  donaData,
  movimientosData,
  tiposData,
  ultimosRegistros,
}: PernoctaChartsProps) {
  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Título de Sección */}
      <div>
        <h1 className="text-2xl font-bold text-[#145c2c]">Módulo de Control de Pernocta</h1>
        <p className="text-slate-500 text-sm">Selecciona la sección que deseas administrar</p>
      </div>

      {/* Tarjetas Principales estilo Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta Vehículos */}
        <Link
          href="/dashboard/pernocta/vehiculos"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d5c33] via-[#15803d] to-[#22c55e] p-6 text-white shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl"
        >
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
              <Truck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Vehículos</h2>
              <p className="text-emerald-100 text-sm mt-1">
                Gestión Integral y Control de Pernocta Vehicular
              </p>
            </div>
          </div>
        </Link>

        {/* Tarjeta Historial */}
        <Link
          href="/dashboard/pernocta/historial"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#60a5fa] p-6 text-white shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl"
        >
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
              <History className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Historial</h2>
              <p className="text-blue-100 text-sm mt-1">
                Registro Completo y Bitácora de Movimientos
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Grid de Gráficas y Métricas con Datos Reales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Estado Actual de la Flota (Dona) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base">Estado Actual de la Flota (Pernocta)</h3>
          
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donaData}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-center gap-6 text-xs font-semibold text-slate-600">
            {donaData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: d.color }} />
                {d.name}: <strong className="text-slate-800">{d.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Resumen de Movimientos Semanales (Líneas) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base">Resumen de Movimientos Semanales (Historial)</h3>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={movimientosData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="entradas" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="salidas" stroke="#F97316" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-center gap-6 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#3B82F6]" /> Entradas
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#F97316]" /> Salidas
            </div>
          </div>
        </div>

        {/* 3. Vehículos por Tipo (Barras) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base">Vehículos por Tipo</h3>
          
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tiposData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="tipo" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {tiposData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Últimos Registros (Tabla rápida) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base">Últimos Registros Reales</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-2.5">Vehículo / Placa</th>
                  <th className="p-2.5">Fecha/Hora</th>
                  <th className="p-2.5">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ultimosRegistros.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-400">
                      Sin movimientos recientes.
                    </td>
                  </tr>
                ) : (
                  ultimosRegistros.map((item: any, i: number) => (
                    <tr key={item.id || i} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-semibold">
                        {item.vehiculo?.placa || item.vehiculoId || item.vehiculo_id || 'N/A'}
                      </td>
                      <td className="p-2.5 text-slate-400">
                        {item.creadoEn ? new Date(item.creadoEn).toLocaleString() : 'Reciente'}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                          item.tipoAccion === 'ENTRADA' || item.tipo === 'ENTRADA'
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {item.tipoAccion || item.tipo || 'Registro'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  )
}