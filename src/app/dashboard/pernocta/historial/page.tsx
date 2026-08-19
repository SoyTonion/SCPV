import React from "react";
import { obtenerHistorialEscaneos } from "./actions";
import HistorialFiltros from "./HistorialFiltros";

export default async function HistorialPernoctaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const escaneos = await obtenerHistorialEscaneos(q);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Historial de Escaneos de Pernocta</h1>
          <p className="text-slate-500 text-sm">
            Registro diario de rondines realizados por el personal de vigilancia.
          </p>
        </div>
      </div>

      <HistorialFiltros />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Fecha y Hora</th>
                <th className="px-6 py-4">Económico</th>
                <th className="px-6 py-4">Placas</th>
                <th className="px-6 py-4">Vehículo</th>
                <th className="px-6 py-4">Departamento</th>
                <th className="px-6 py-4">Guardia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {escaneos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No se encontraron escaneos registrados.
                  </td>
                </tr>
              ) : (
                escaneos.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {new Date(item.fechaHora).toLocaleString("es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#007A33]">
                      {item.vehiculo.economico ?? "—"}
                    </td>
                    <td className="px-6 py-4 font-mono">{item.vehiculo.placas ?? "—"}</td>
                    <td className="px-6 py-4">
                      {item.vehiculo.marca} {item.vehiculo.submarca}
                    </td>
                    <td className="px-6 py-4">{item.vehiculo.departamento}</td>
                    <td className="px-6 py-4">{item.guardia.nombre}</td>
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