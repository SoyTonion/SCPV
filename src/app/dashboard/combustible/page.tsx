"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// Interfaz para tipar correctamente los registros que vienen de la API
interface Registro {
  id: string;
  litrosCargados: number;
  costoTotal: number;
  fechaCarga: string | null;
  vehiculo: {
    marcaVehiculo: string;
    submarcaVehiculo: string;
    placas: string | null;
    economico: string | null;
  };
}

// Datos simulados para la gráfica (se pueden hacer dinámicos después)
const datosConsumo = [
  { dia: 'Lun', litros: 120 },
  { dia: 'Mar', litros: 85 },
  { dia: 'Mié', litros: 150 },
  { dia: 'Jue', litros: 90 },
  { dia: 'Vie', litros: 200 },
  { dia: 'Sáb', litros: 45 },
  { dia: 'Dom', litros: 0 },
];

export default function CombustibleDashboard() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const res = await fetch('/api/combustible');
        if (res.ok) {
          const data = await res.json();
          setRegistros(data);
        }
      } catch (error) {
        console.error("Error al cargar los datos:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, []);

  // Cálculos matemáticos en tiempo real para las tarjetas (KPIs)
  const totalLitrosReal = registros.reduce((suma, reg) => suma + Number(reg.litrosCargados), 0);
  const totalGastoReal = registros.reduce((suma, reg) => suma + Number(reg.costoTotal), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel de Combustible</h1>
          <p className="text-slate-500 text-sm">Resumen de consumo y rendimiento del parque vehicular.</p>
        </div>
        <button className="bg-[#007A33] hover:bg-[#005c26] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap">
          Descargar Reporte PDF
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-1/2 flex items-center bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus-within:ring-1 focus-within:ring-[#007A33] focus-within:border-[#007A33] transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Buscar por placa, modelo o No. Económico..." 
            className="bg-transparent border-none outline-none w-full text-sm text-slate-700 placeholder-slate-400"
          />
        </div>
        
        <div className="w-full md:w-auto flex gap-3">
          <select className="w-full md:w-auto border border-slate-300 bg-white text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#007A33] focus:border-[#007A33]">
            <option>Todos los departamentos</option>
            <option>Distribución</option>
            <option>Transmisión</option>
            <option>Suministro Básico</option>
          </select>
          
          <select className="w-full md:w-auto border border-slate-300 bg-white text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#007A33] focus:border-[#007A33]">
            <option>Últimos 7 días</option>
            <option>Este mes</option>
            <option>Mes anterior</option>
            <option>Año actual</option>
          </select>
        </div>
      </div>

      {/* Tarjetas de Indicadores (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-[#007A33] relative overflow-hidden">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Litros</p>
          <p className="text-3xl font-bold text-slate-800">
            {cargando ? '...' : totalLitrosReal.toLocaleString()} <span className="text-sm font-normal text-slate-500">L</span>
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
          <p className="text-sm font-medium text-slate-500 mb-1">Gasto Acumulado</p>
          <p className="text-3xl font-bold text-slate-800">
            <span className="text-xl">$</span>{cargando ? '...' : totalGastoReal.toLocaleString()} <span className="text-sm font-normal text-slate-500">MXN</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500 relative">
          <div className="absolute top-4 right-4 h-3 w-3 bg-amber-500 rounded-full animate-pulse"></div>
          <p className="text-sm font-medium text-slate-500 mb-1">Rendimiento Global</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-slate-800">11.2 <span className="text-sm font-normal text-slate-500">km/l</span></p>
            <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded mb-1">-0.5 vs mes pasado</span>
          </div>
        </div>
      </div>

      {/* Contenedor de la Gráfica y la Tabla */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sección de la Gráfica */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Consumo de los últimos 7 días</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosConsumo}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="litros" fill="#007A33" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sección de la Tabla Pequeña (Cargas Recientes Reales) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">Cargas Recientes</h2>
            <span className="text-xs font-medium text-[#007A33] cursor-pointer hover:underline">Ver todas</span>
          </div>
          
          <div className="grow overflow-auto pr-1 h-72">
            <div className="space-y-4">
              {cargando ? (
                <p className="text-center text-sm text-slate-500 mt-10">Cargando registros reales...</p>
              ) : registros.length === 0 ? (
                <p className="text-center text-sm text-slate-500 mt-10">Aún no hay cargas registradas.</p>
              ) : (
                registros.map((registro) => (
                  <div key={registro.id} className="p-3 border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer rounded-lg flex flex-col gap-1 shadow-sm">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm text-slate-800">
                        {registro.vehiculo.marcaVehiculo} {registro.vehiculo.submarcaVehiculo}
                      </span>
                      <span className="text-xs font-bold bg-green-100 text-[#007A33] px-2 py-0.5 rounded-full border border-green-200">
                        {registro.litrosCargados} L
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      Placas: {registro.vehiculo.placas || registro.vehiculo.economico || 'S/N'}
                    </span>
                    <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-200">
                      <span className="text-xs text-slate-400">
                        {registro.fechaCarga 
                          ? new Date(registro.fechaCarga).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' }) 
                          : 'Sin fecha'}
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        ${registro.costoTotal}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}