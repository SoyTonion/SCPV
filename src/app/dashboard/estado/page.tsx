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

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const [total, normales, advertencias, criticos] = await Promise.all([
    prisma.inspeccionFisica.count(),
    prisma.inspeccionFisica.count({ where: { estadoGeneral: 'NORMAL'      } }),
    prisma.inspeccionFisica.count({ where: { estadoGeneral: 'ADVERTENCIA' } }),
    prisma.inspeccionFisica.count({ where: { estadoGeneral: 'CRITICO'     } }),
  ]);

  const pctCumplimiento = total > 0 ? Math.round((normales / total) * 100) : 0;

  // ── Últimas 5 inspecciones ───────────────────────────────────────────────────
  const ultimasInspecciones = await prisma.inspeccionFisica.findMany({
    orderBy: { fechaHora: 'desc' },
    take:    5,
    include: {
      vehiculo:  { select: { marcaVehiculo: true, submarcaVehiculo: true, placas: true, economico: true } },
      inspector: { select: { nombre: true } },
    },
  });

  // ── Hallazgos más frecuentes (últimos 30 días) ───────────────────────────────
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);

  const hallazgosFrecuentes = await prisma.hallazgoInspeccion.groupBy({
    by:      ['componente'],
    _count:  { id: true },
    where:   { inspeccion: { fechaHora: { gte: hace30 } } },
    orderBy: { _count: { id: 'desc' } },
    take:    3,
  });

  // ── Vehículos sin inspección reciente (pendientes) ────────────────────────────
  const vehiculosPendientes = await prisma.vehiculo.findMany({
    where: {
      qrToken:     { not: null },
      inspecciones: {
        none: { fechaHora: { gte: hace30 } },
      },
    },
    orderBy: { economico: 'asc' },
    take: 3,
    select: { id: true, economico: true, marcaVehiculo: true, submarcaVehiculo: true },
  });

  const totalVehiculos = await prisma.vehiculo.count({ where: { qrToken: { not: null } } });
  const pendientesTotal = Math.max(0, totalVehiculos - total);

  // ── Helpers ──────────────────────────────────────────────────────────────────
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
    'bg-amber-50/50 border-amber-200 text-amber-800',
    'bg-red-50/50 border-red-200 text-red-800',
    'bg-blue-50/50 border-blue-200 text-blue-800',
  ][i] ?? 'bg-slate-50 border-slate-200 text-slate-700';

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Cabecera ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-[#007A33] transition-colors mb-2 inline-block">
              ← Volver al Dashboard Central
            </Link>
            <h1 className="text-2xl font-bold text-slate-800">
              Estado físico del Parque Vehicular
            </h1>
            <p className="text-slate-500 text-sm">
              Resumen operativo de inspecciones, alertas y condiciones físicas de los vehículos.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Botón gestión de imágenes patrón */}
            <Link
              href="/dashboard/estado/patrones"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Images size={16} />
              Imágenes Patrón
            </Link>
            <Link
              href="/dashboard/estado/reportes"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#007A33] hover:bg-[#005f27] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <FileText size={16} />
              Generar Reporte PDF
            </Link>
          </div>
        </div>

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/dashboard/estado/vehiculos"
            className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-slate-500 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Inspeccionados</p>
                <p className="text-3xl font-bold text-slate-800">{total}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-slate-600 group-hover:text-white transition-colors">
                <Car size={21} />
              </div>
            </div>
          </Link>

          <Link href="/dashboard/estado/vehiculos?estado=NORMAL"
            className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-green-500 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">En buenas condiciones</p>
                <p className="text-3xl font-bold text-slate-800">{normales}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
                <Check size={21} />
              </div>
            </div>
          </Link>

          <Link href="/dashboard/estado/vehiculos?estado=ADVERTENCIA"
            className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Requieren atención</p>
                <p className="text-3xl font-bold text-slate-800">{advertencias}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <CircleAlert size={21} />
              </div>
            </div>
          </Link>

          <Link href="/dashboard/estado/vehiculos?estado=CRITICO"
            className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-500 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Críticos</p>
                <p className="text-3xl font-bold text-slate-800">{criticos}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
                <X size={21} />
              </div>
            </div>
          </Link>
        </div>

        {/* ── Paneles ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Cumplimiento */}
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
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#007A33]" />
                  <span className="text-slate-600 text-xs">Normales ({normales})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="text-slate-600 text-xs">Advertencia ({advertencias})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-slate-600 text-xs">Crítico ({criticos})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-slate-200" />
                  <span className="text-slate-600 text-xs">Pendientes (~{pendientesTotal})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Últimas inspecciones */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Clock className="text-slate-600" size={20} />
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
                    className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-600 shrink-0">
                        <Car size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
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
                      <span className="text-xs font-medium text-slate-700 block">
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
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="text-amber-500" size={20} />
                Hallazgos Frecuentes
              </h3>
              <span className="text-xs text-slate-500">Últimos 30 días</span>
            </div>

            {hallazgosFrecuentes.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Sin hallazgos en los últimos 30 días.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {hallazgosFrecuentes.map((h, i) => (
                  <div key={h.componente}
                    className={`p-4 rounded-lg border ${colorHallazgo(i)}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold uppercase">{labelComponente(h.componente)}</span>
                      <span className="text-sm font-bold">{h._count.id}</span>
                    </div>
                    <p className="text-xs text-slate-600">Diferencias detectadas en inspección visual.</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pendientes */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarClock className="text-blue-600" size={20} />
                Sin inspección reciente
              </h3>
              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                ~{pendientesTotal} total
              </span>
            </div>

            {vehiculosPendientes.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Todos los vehículos inspeccionados recientemente.</p>
            ) : (
              <div className="space-y-3">
                {vehiculosPendientes.map(v => (
                  <div key={v.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {v.marcaVehiculo} {v.submarcaVehiculo}
                        {v.economico ? ` (#${v.economico})` : ''}
                      </p>
                      <p className="text-xs text-slate-500">Sin inspección en los últimos 30 días</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-600 shrink-0 ml-2">Pendiente</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
