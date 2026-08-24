import React from "react";
import { obtenerHistorialEscaneos, obtenerRondines } from "./actions";
import HistorialFiltros from "./HistorialFiltros";
import Link from "next/link";

function formatHora(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function duracion(inicio: string, fin: string | null): string {
  if (!fin) return "En curso";
  const ms = new Date(fin).getTime() - new Date(inicio).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}min` : `${hrs}h`;
}

export default async function HistorialPernoctaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const [escaneos, rondines] = await Promise.all([
    obtenerHistorialEscaneos(q),
    obtenerRondines(),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#145c2c]">Historial de Pernocta</h1>
          <p className="text-slate-500 text-sm">
            Registro de rondines y escaneos realizados por el personal de vigilancia.
          </p>
        </div>
        <Link
          href="/dashboard/pernocta"
          className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors mt-2 md:mt-0"
        >
          ← Volver al módulo
        </Link>
      </div>

      {/* ── SECCIÓN 1: RONDINES ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800">Rondines</h2>
            <p className="text-xs text-slate-400 mt-0.5">Inicio, fin y duración de cada rondín</p>
          </div>
          <span className="text-xs text-slate-400">{rondines.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Guardia</th>
                <th className="px-5 py-3">Inicio</th>
                <th className="px-5 py-3">Fin</th>
                <th className="px-5 py-3">Duración</th>
                <th className="px-5 py-3 text-center">Escaneos</th>
                <th className="px-5 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rondines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No hay rondines registrados.
                  </td>
                </tr>
              ) : (
                rondines.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {new Date(r.fecha).toLocaleDateString("es-MX", {
                        weekday: "short", year: "numeric", month: "short", day: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3">{r.guardia}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">
                      {formatHora(r.inicio)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">
                      {r.fin ? formatHora(r.fin) : (
                        <span className="text-amber-600 font-semibold">En curso</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {duracion(r.inicio, r.fin)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="font-bold text-[#007A33]">{r.totalEscaneos}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        r.estado === "CERRADO"
                          ? "bg-slate-100 text-slate-500"
                          : r.estado === "ABIERTO"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-600"
                      }`}>
                        {r.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECCIÓN 2: ESCANEOS INDIVIDUALES ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800">Escaneos</h2>
            <p className="text-xs text-slate-400 mt-0.5">Últimos 50 registros individuales</p>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-slate-100">
          <HistorialFiltros />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-5 py-3">Fecha y Hora</th>
                <th className="px-5 py-3">Económico</th>
                <th className="px-5 py-3">Placas</th>
                <th className="px-5 py-3">Vehículo</th>
                <th className="px-5 py-3">Departamento</th>
                <th className="px-5 py-3">Guardia</th>
                <th className="px-5 py-3">Inicio rondín</th>
                <th className="px-5 py-3">Fin rondín</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {escaneos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    No se encontraron escaneos registrados.
                  </td>
                </tr>
              ) : (
                escaneos.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {new Date(item.fechaHora).toLocaleString("es-MX", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-5 py-3 font-semibold text-[#007A33]">
                      {item.vehiculo.economico ?? "—"}
                    </td>
                    <td className="px-5 py-3 font-mono">{item.vehiculo.placas ?? "—"}</td>
                    <td className="px-5 py-3">
                      {item.vehiculo.marca} {item.vehiculo.submarca}
                    </td>
                    <td className="px-5 py-3">{item.vehiculo.departamento}</td>
                    <td className="px-5 py-3">{item.guardia.nombre}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {formatHora(item.rondin.inicio)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {item.rondin.fin ? formatHora(item.rondin.fin) : (
                        <span className="text-amber-600 font-semibold text-xs">En curso</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
