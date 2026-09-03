import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  Car, Check, CircleAlert, X, Clock,
  Wrench, CalendarClock, PieChart,
  ChevronRight, FileText, Images,
} from 'lucide-react';

export default async function EstadoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/');

  const [total, normales, advertencias, criticos] = await Promise.all([
    prisma.inspeccionFisica.count(),
    prisma.inspeccionFisica.count({ where: { estadoGeneral: 'NORMAL'      } }),
    prisma.inspeccionFisica.count({ where: { estadoGeneral: 'ADVERTENCIA' } }),
    prisma.inspeccionFisica.count({ where: { estadoGeneral: 'CRITICO'     } }),
  ]);

  const pctCumplimiento = total > 0 ? Math.round((normales / total) * 100) : 0;

  const ultimasInspecciones = await prisma.inspeccionFisica.findMany({
    orderBy: { fechaHora: 'desc' },
    take:    5,
    include: {
      vehiculo:  { select: { marcaVehiculo: true, submarcaVehiculo: true, placas: true, economico: true } },
      inspector: { select: { nombre: true } },
    },
  });

  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);

  const hallazgosFrecuentes = await prisma.hallazgoInspeccion.groupBy({
    by:      ['componente'],
    _count:  { id: true },
    where:   { inspeccion: { fechaHora: { gte: hace30 } } },
    orderBy: { _count: { id: 'desc' } },
    take:    3,
  });

  const vehiculosPendientes = await prisma.vehiculo.findMany({
    where: {
      qrToken:      { not: null },
      inspecciones: { none: { fechaHora: { gte: hace30 } } },
    },
    orderBy: { economico: 'asc' },
    take: 3,
    select: { id: true, economico: true, marcaVehiculo: true, submarcaVehiculo: true },
  });

  const totalVehiculos  = await prisma.vehiculo.count({ where: { qrToken: { not: null } } });
  const pendientesTotal = Math.max(0, totalVehiculos - total);

  const colorEstado = (e: string) => ({
    NORMAL:      'bg-green-100 text-green-700',
    ADVERTENCIA: 'bg-amber-100 text-amber-700',
    CRITICO:     'bg-red-100 text-red-700',
  }[e] ?? 'bg-slate-100 text-slate-600');

  const labelEstado = (e: string) => ({
    NORMAL:      'Buenas condiciones',
    ADVERTENCIA: 'Requiere atención',
    CRITICO:     'Crítico',
  }[e] ?? e);

  const labelComponente = (c: string) =>
    c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const colorHallazgo = (i: number) => [
    'bg-amber-50 border-amber-200 text-amber-800',
    'bg-red-50 border-red-200 text-red-800',
    'bg-blue-50 border-blue-200 text-blue-800',
  ][i] ?? 'bg-slate-50 border-slate-200 text-slate-700';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 relative overflow-hidden">

      {/* Decorativos de fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="absolute top-0 left-0 w-full h-64 opacity-30" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#007A33" fillOpacity="0.08" d="M0,192L48,176C96,160,192,128,288,138.7C384,149,480,203,576,208C672,213,768,171,864,160C960,149,1056,171,1152,181.3C1248,192,1344,192,1392,192L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" />
        </svg>
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-[#007A33]/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-[#007A33]/5 blur-3xl" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 space-y-6">

        {/* Cabecera */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-[#007A33] transition-colors mb-2 inline-block">
              ← Volver al Dashboard Central
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              Estado Físico del Parque Vehicular
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Resumen operativo de inspecciones, alertas y condiciones físicas de los vehículos.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/dashboard/estado/patrones"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur border border-slate-200 hover:border-[#007A33]/50 text-slate-700 hover:text-[#007A33] text-sm font-semibold rounded-xl shadow-sm transition-all">
              <Images size={16} />
              Imágenes Patrón
            </Link>
            <Link href="/dashboard/estado/reportes"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#007A33] hover:bg-[#005f27] text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
              <FileText size={16} />
              Generar Reporte PDF
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/estado/vehiculos"
            className="group bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-[#007A33]/20 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-slate-500">Inspeccionados</p>
              <div className="bg-[#007A33]/10 p-2 rounded-lg text-[#007A33] group-hover:bg-[#007A33] group-hover:text-white transition-colors">
                <Car className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-800">{total}</p>
            <p className="text-xs text-slate-400 mt-1">inspecciones totales</p>
          </Link>

          <Link href="/dashboard/estado/vehiculos?estado=NORMAL"
            className="group bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-[#007A33]/20 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-slate-500">Buenas condiciones</p>
              <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <Check className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-800">{normales}</p>
            <p className="text-xs text-slate-400 mt-1">estado normal</p>
          </Link>

          <Link href="/dashboard/estado/vehiculos?estado=ADVERTENCIA"
            className="group bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-[#007A33]/20 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-slate-500">Requieren atención</p>
              <div className="bg-amber-50 p-2 rounded-lg text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <CircleAlert className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-800">{advertencias}</p>
            <p className="text-xs text-slate-400 mt-1">advertencias activas</p>
          </Link>

          <Link href="/dashboard/estado/vehiculos?estado=CRITICO"
            className={`group bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm hover:shadow-md transition-all ${criticos > 0 ? 'border-2 border-red-300' : 'border border-[#007A33]/20'}`}>
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-slate-500">Críticos</p>
              <div className={`p-2 rounded-lg transition-colors ${criticos > 0 ? 'bg-red-50 text-red-600 group-hover:bg-red-500 group-hover:text-white' : 'bg-slate-100 text-slate-400'}`}>
                <X className="w-5 h-5" />
              </div>
            </div>
            <p className={`text-3xl font-extrabold ${criticos > 0 ? 'text-red-600' : 'text-slate-800'}`}>{criticos}</p>
            <p className="text-xs text-slate-400 mt-1">{criticos > 0 ? 'requieren acción inmediata' : 'sin críticos'}</p>
          </Link>
        </div>

        {/* Paneles principales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Cumplimiento */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-[#007A33]/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <PieChart className="text-[#007A33]" size={20} />
                  Cumplimiento
                </h3>
                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                  Meta: 85%
                </span>
              </div>

              <div className="relative flex items-center justify-center my-4">
                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-100" strokeWidth="3.8" stroke="currentColor" fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-[#007A33]"
                    strokeDasharray={`${pctCumplimiento}, 100`}
                    strokeWidth="3.8" strokeLinecap="round" stroke="currentColor" fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold text-slate-800">{pctCumplimiento}%</span>
                  <span className="text-xs text-slate-500 font-medium">Normales</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-slate-100">
                {[
                  { color: 'bg-[#007A33]', label: 'Normales', val: normales },
                  { color: 'bg-amber-400',  label: 'Advertencia', val: advertencias },
                  { color: 'bg-red-500',    label: 'Crítico', val: criticos },
                  { color: 'bg-slate-200',  label: 'Pendientes', val: `~${pendientesTotal}` },
                ].map(({ color, label, val }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full shrink-0 ${color}`} />
                    <span className="text-slate-600 text-xs">{label} ({val})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Últimas inspecciones */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-[#007A33]/20 lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <Clock className="text-[#007A33]" size={20} />
                Últimas Inspecciones
              </h3>
              <Link href="/dashboard/estado/inspecciones"
                className="text-xs font-semibold text-[#007A33] hover:underline flex items-center gap-1">
                Ver historial <ChevronRight size={14} />
              </Link>
            </div>

            {ultimasInspecciones.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Sin inspecciones registradas aún.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {ultimasInspecciones.map(insp => (
                  <div key={insp.id.toString()}
                    className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-[#007A33]/10 rounded-xl text-[#007A33] shrink-0">
                        <Car size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {insp.vehiculo.marcaVehiculo} {insp.vehiculo.submarcaVehiculo}
                          {insp.vehiculo.placas ? ` (${insp.vehiculo.placas})` : ''}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          Inspector: {insp.inspector.nombre}
                          {insp.vehiculo.economico ? ` · Eco: ${insp.vehiculo.economico}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="text-xs font-medium text-slate-600 block">
                        {new Date(insp.fechaHora).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${colorEstado(insp.estadoGeneral)}`}>
                        {labelEstado(insp.estadoGeneral)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hallazgos frecuentes */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-[#007A33]/20 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <Wrench className="text-amber-500" size={20} />
                Hallazgos Frecuentes
              </h3>
              <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                Últimos 30 días
              </span>
            </div>

            {hallazgosFrecuentes.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Sin hallazgos en los últimos 30 días.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {hallazgosFrecuentes.map((h, i) => (
                  <div key={h.componente} className={`p-4 rounded-xl border ${colorHallazgo(i)}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-extrabold uppercase tracking-wide">{labelComponente(h.componente)}</span>
                      <span className="text-lg font-extrabold">{h._count.id}</span>
                    </div>
                    <p className="text-xs opacity-80">Diferencias detectadas en inspección visual.</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pendientes */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-[#007A33]/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <CalendarClock className="text-blue-500" size={20} />
                Sin inspección reciente
              </h3>
              <span className="text-xs font-bold bg-[#007A33]/10 text-[#007A33] px-2.5 py-1 rounded-full">
                ~{pendientesTotal}
              </span>
            </div>

            {vehiculosPendientes.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Todos los vehículos inspeccionados recientemente.</p>
            ) : (
              <div className="space-y-3">
                {vehiculosPendientes.map(v => (
                  <div key={v.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between hover:border-[#007A33]/20 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {v.marcaVehiculo} {v.submarcaVehiculo}
                        {v.economico ? ` (#${v.economico})` : ''}
                      </p>
                      <p className="text-xs text-slate-500">Sin inspección en los últimos 30 días</p>
                    </div>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0 ml-2">
                      Pendiente
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
