"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function HistorialFiltros() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busqueda, setBusqueda] = useState(searchParams.get("q") ?? "");

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (busqueda.trim()) {
      router.push(`/dashboard/pernocta/historial?q=${encodeURIComponent(busqueda.trim())}`);
    } else {
      router.push(`/dashboard/pernocta/historial`);
    }
  };

  return (
    <form onSubmit={handleBuscar} className="flex gap-2 mb-6">
      <input
        type="text"
        placeholder="Buscar por placas o número económico..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="px-4 py-2 border border-slate-300 rounded-lg w-full max-w-md focus:outline-none focus:ring-2 focus:ring-[#007A33]"
      />
      <button
        type="submit"
        className="bg-[#007A33] hover:bg-[#005c26] text-white font-medium px-4 py-2 rounded-lg transition-colors"
      >
        Buscar
      </button>
      {searchParams.get("q") && (
        <button
          type="button"
          onClick={() => {
            setBusqueda("");
            router.push(`/dashboard/pernocta/historial`);
          }}
          className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg transition-colors"
        >
          Limpiar
        </button>
      )}
    </form>
  );
}