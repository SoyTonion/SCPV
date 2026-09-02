"use client";
import Link from 'next/link';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Interfaz actualizada según tu esquema real
interface Registro {
  id: string;
  kilometraje: number;
  litrosCargados: number;
  costoTotal: number;
  fechaCarga: string | null;
  estadoAprobacion: 'PENDIENTE_REVISION' | 'APROBADA' | 'RECHAZADA'; // 🆕 Añadido para el polling
  vehiculo: {
    marcaVehiculo: string;
    submarcaVehiculo: string;
    placas: string | null;
    economico: string | null;
    capacidadTanque?: string | null;
  };
}

export default function CombustibleDashboard() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [periodo, setPeriodo] = useState('mesActual');
  
  // 🆕 Estado para el numerito de notificaciones
  const [peticionesPendientes, setPeticionesPendientes] = useState(0);

  useEffect(() => {
    // 🆕 Función modificada para permitir cargas "silenciosas" (sin spinner)
    const cargarDatos = async (silencioso = false) => {
      if (!silencioso) setCargando(true);
      try {
        const res = await fetch('/api/combustible');
        if (res.ok) {
          const data: Registro[] = await res.json();
          setRegistros(data);

          // 🆕 Contamos cuántas peticiones están pendientes
          const pendientes = data.filter(reg => reg.estadoAprobacion === 'PENDIENTE_REVISION').length;
          setPeticionesPendientes(pendientes);
        }
      } catch (error) {
        console.error("Error al cargar los datos:", error);
      } finally {
        if (!silencioso) setCargando(false);
      }
    };
    
    // Carga inicial al entrar
    cargarDatos();

    // 🆕 SMART POLLING: Recarga datos cada 15 segundos SOLO si la pestaña está activa
    const intervalo = setInterval(() => {
      if (!document.hidden) {
        cargarDatos(true); // true = recarga silenciosa en segundo plano
      }
    }, 15000);

    return () => clearInterval(intervalo);
  }, []);

  const registrosFiltrados = useMemo(() => {
    const ahora = new Date();
    const hace7Dias = new Date(ahora);
    hace7Dias.setDate(ahora.getDate() - 7);
    const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0);

    return registros.filter(reg => {
      const fecha = reg.fechaCarga ? new Date(reg.fechaCarga) : null;
      const busqueda = `${reg.vehiculo.placas || ''} ${reg.vehiculo.economico || ''} ${reg.vehiculo.marcaVehiculo} ${reg.vehiculo.submarcaVehiculo}`.toLowerCase();
      const cumpleBusqueda = busqueda.includes(terminoBusqueda.toLowerCase());
      const cumplePeriodo = (() => {
        if (!fecha) return false;
        if (periodo === 'ultimos7') return fecha >= hace7Dias;
        if (periodo === 'mesActual') return fecha >= inicioMesActual;
        if (periodo === 'mesAnterior') return fecha >= inicioMesAnterior && fecha <= finMesAnterior;
        return true;
      })();
      return cumpleBusqueda && cumplePeriodo;
    });
  }, [registros, terminoBusqueda, periodo]);

  const totalLitros = registrosFiltrados.reduce((sum, reg) => sum + Number(reg.litrosCargados), 0);
  const totalGasto = registrosFiltrados.reduce((sum, reg) => sum + Number(reg.costoTotal), 0);
  const vehiculosActivos = useMemo(() => {
    const set = new Set(registrosFiltrados.map(reg => reg.vehiculo.economico || reg.vehiculo.placas));
    return set.size;
  }, [registrosFiltrados]);

  const rendimientoGlobal = useMemo(() => {
    const porVehiculo = new Map<string, Registro[]>();
    registrosFiltrados.forEach(reg => {
      const clave = reg.vehiculo.economico || reg.vehiculo.placas || reg.id;
      if (!porVehiculo.has(clave)) porVehiculo.set(clave, []);
      porVehiculo.get(clave)!.push(reg);
    });

    let totalKm = 0;
    let totalLitrosRend = 0;
    porVehiculo.forEach(registrosVehiculo => {
      const ordenados = registrosVehiculo
        .filter(r => r.kilometraje && r.litrosCargados)
        .sort((a, b) => new Date(a.fechaCarga!).getTime() - new Date(b.fechaCarga!).getTime());
      if (ordenados.length >= 2) {
        const ultimo = ordenados[ordenados.length - 1];
        const anterior = ordenados[ordenados.length - 2];
        const km = Number(ultimo.kilometraje) - Number(anterior.kilometraje);
        const litros = Number(ultimo.litrosCargados);
        if (km > 0 && litros > 0) {
          totalKm += km;
          totalLitrosRend += litros;
        }
      }
    });
    return totalLitrosRend > 0 ? totalKm / totalLitrosRend : null;
  }, [registrosFiltrados]);

  const datosConsumoReal = useMemo(() => {
    const mapa = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const dia = fecha.toLocaleDateString('es-MX', { weekday: 'short' });
      mapa.set(dia, 0);
    }
    registrosFiltrados.forEach(reg => {
      if (reg.fechaCarga) {
        const fecha = new Date(reg.fechaCarga);
        const dia = fecha.toLocaleDateString('es-MX', { weekday: 'short' });
        if (mapa.has(dia)) {
          mapa.set(dia, (mapa.get(dia) || 0) + Number(reg.litrosCargados));
        }
      }
    });
    return Array.from(mapa, ([dia, litros]) => ({ dia, litros }));
  }, [registrosFiltrados]);

  const promedioLitrosDia = useMemo(() => {
    if (datosConsumoReal.length === 0) return 0;
    const total = datosConsumoReal.reduce((sum, d) => sum + d.litros, 0);
    return total / datosConsumoReal.length;
  }, [datosConsumoReal]);

  const anomalias = useMemo(() => {
    const lista: { vehiculo: string; motivo: string }[] = [];
    const porVehiculo = new Map<string, Registro[]>();
    registrosFiltrados.forEach(reg => {
      const clave = reg.vehiculo.economico || reg.vehiculo.placas || reg.id;
      if (!porVehiculo.has(clave)) porVehiculo.set(clave, []);
      porVehiculo.get(clave)!.push(reg);
    });

    porVehiculo.forEach(registrosVehiculo => {
      const ordenados = registrosVehiculo
        .filter(r => r.fechaCarga)
        .sort((a, b) => new Date(a.fechaCarga!).getTime() - new Date(b.fechaCarga!).getTime());
      if (ordenados.length >= 2) {
        const ultimo = ordenados[ordenados.length - 1];
        const anterior = ordenados[ordenados.length - 2];
        if (Number(ultimo.kilometraje) <= Number(anterior.kilometraje)) {
          lista.push({
            vehiculo: `Eco: ${ultimo.vehiculo.economico || 'N/A'} - ${ultimo.vehiculo.placas}`,
            motivo: 'Kilometraje no mayor al registro anterior',
          });
        }
        if (ultimo.vehiculo.capacidadTanque) {
          const capacidad = Number(ultimo.vehiculo.capacidadTanque);
          if (Number(ultimo.litrosCargados) > capacidad) {
            lista.push({
              vehiculo: `Eco: ${ultimo.vehiculo.economico || 'N/A'} - ${ultimo.vehiculo.placas}`,
              motivo: `Carga superior a la capacidad del tanque (${ultimo.litrosCargados}L > ${capacidad}L)`,
            });
          }
        }
        const km = Number(ultimo.kilometraje) - Number(anterior.kilometraje);
        const litros = Number(ultimo.litrosCargados);
        if (km > 0 && litros > 0) {
          const rend = km / litros;
          if (rend < 5 || rend > 20) {
            lista.push({
              vehiculo: `Eco: ${ultimo.vehiculo.economico || 'N/A'} - ${ultimo.vehiculo.placas}`,
              motivo: `Rendimiento anormal: ${rend.toFixed(2)} km/l`,
            });
          }
        }
      }
    });
    return lista;
  }, [registrosFiltrados]);

  const topMenosEficientes = useMemo(() => {
    const rendimientos: { nombre: string; rendimiento: number }[] = [];
    const porVehiculo = new Map<string, Registro[]>();
    registrosFiltrados.forEach(reg => {
      const clave = reg.vehiculo.economico || reg.vehiculo.placas || reg.id;
      if (!porVehiculo.has(clave)) porVehiculo.set(clave, []);
      porVehiculo.get(clave)!.push(reg);
    });
    porVehiculo.forEach(registrosVehiculo => {
      const ordenados = registrosVehiculo
        .filter(r => r.kilometraje && r.litrosCargados)
        .sort((a, b) => new Date(a.fechaCarga!).getTime() - new Date(b.fechaCarga!).getTime());
      if (ordenados.length >= 2) {
        const ultimo = ordenados[ordenados.length - 1];
        const anterior = ordenados[ordenados.length - 2];
        const km = Number(ultimo.kilometraje) - Number(anterior.kilometraje);
        const litros = Number(ultimo.litrosCargados);
        if (km > 0 && litros > 0) {
          rendimientos.push({
            nombre: `Eco ${ultimo.vehiculo.economico || 'N/A'} ${ultimo.vehiculo.marcaVehiculo} ${ultimo.vehiculo.submarcaVehiculo}`,
            rendimiento: km / litros,
          });
        }
      }
    });
    return rendimientos.sort((a, b) => a.rendimiento - b.rendimiento).slice(0, 5);
  }, [registrosFiltrados]);

  const resumenEjecutivo = useMemo(() => {
    const frases: string[] = [];
    if (rendimientoGlobal !== null) {
      frases.push(`Rendimiento promedio global: ${rendimientoGlobal.toFixed(1)} km/l.`);
    }
    if (anomalias.length > 0) {
      frases.push(`Se detectaron ${anomalias.length} anomalías operativas.`);
    }
    if (topMenosEficientes.length > 0) {
      frases.push(`El vehículo menos eficiente es ${topMenosEficientes[0].nombre} con ${topMenosEficientes[0].rendimiento.toFixed(1)} km/l.`);
    }
    return frases;
  }, [rendimientoGlobal, anomalias, topMenosEficientes]);

  // Función para exportar a CSV
  const exportarCSV = () => {
    if (registrosFiltrados.length === 0) return;

    const encabezados = [
      'Marca', 'Submarca', 'Placas', 'Económico', 'Fecha', 'Kilometraje', 'Litros', 'Costo',
    ];

    const filas = registrosFiltrados.map(reg => [
      reg.vehiculo.marcaVehiculo,
      reg.vehiculo.submarcaVehiculo,
      reg.vehiculo.placas || '',
      reg.vehiculo.economico || '',
      reg.fechaCarga ? new Date(reg.fechaCarga).toLocaleDateString('es-MX') : '',
      reg.kilometraje,
      reg.litrosCargados,
      reg.costoTotal,
    ]);

    const contenido = [
      encabezados.join(','),
      ...filas.map(fila => fila.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.setAttribute('download', `registros_combustible_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen font-sans relative overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="absolute top-0 left-0 w-full h-64 opacity-30" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#007A33" fillOpacity="0.08" d="M0,192L48,176C96,160,192,128,288,138.7C384,149,480,203,576,208C672,213,768,171,864,160C960,149,1056,171,1152,181.3C1248,192,1344,192,1392,192L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-[#007A33]/5 blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-[#007A33]/5 blur-3xl"></div>
      </div>

      {/* Contenido principal */}
      <main className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Título y botones de acción */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Análisis de Flotilla</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Monitoreo de rendimiento, consumo y alertas operativas.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* 🆕 BOTÓN DE PETICIONES CON NOTIFICACIÓN EN TIEMPO REAL */}
            <Link
              href="/dashboard/combustible/Peticiones"
              className="relative inline-flex items-center justify-center gap-2 bg-white/80 backdrop-blur-md border border-amber-400/50 text-amber-700 font-bold rounded-xl py-2.5 px-4 shadow-sm hover:bg-amber-50 transition-all group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Revisar Peticiones
              
              {/* Solo muestra el circulito rojo si hay más de 0 peticiones pendientes */}
              {peticionesPendientes > 0 && (
                <span className="absolute -top-2 -right-2 flex items-center justify-center h-5 w-5 bg-red-500 border-2 border-white rounded-full text-[10px] font-black text-white shadow-sm animate-in zoom-in">
                  {peticionesPendientes}
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-50 z-[-1]"></span>
                </span>
              )}
            </Link>

            <button
              onClick={exportarCSV}
              disabled={registrosFiltrados.length === 0}
              className="inline-flex items-center justify-center gap-2 bg-white/80 backdrop-blur-md border border-[#007A33]/30 text-[#007A33] font-bold rounded-xl py-2.5 px-4 shadow-sm hover:bg-[#007A33]/5 hover:border-[#007A33]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Resumen ejecutivo */}
        {resumenEjecutivo.length > 0 && (
          <div className="bg-[#007A33]/5 backdrop-blur-md border border-[#007A33]/30 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
            <div className="bg-[#007A33]/20 p-2 rounded-full shrink-0">
              <svg className="w-6 h-6 text-[#007A33]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#007A33]">Resumen Ejecutivo</h3>
              <ul className="mt-1 space-y-1">
                {resumenEjecutivo.map((frase, idx) => (
                  <li key={idx} className="text-sm text-[#007A33]/80">• {frase}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Banner de alertas */}
        {anomalias.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 backdrop-blur-md border border-[#007A33]/20 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
            <div className="bg-amber-100 p-2 rounded-full shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-800">Atención Requerida</h3>
              <p className="text-sm text-amber-700 mt-0.5">
                Se detectaron <strong>{anomalias.length} anomalías</strong> en el periodo seleccionado.
                {anomalias.slice(0, 3).map((anom, idx) => (
                  <span key={idx} className="block mt-1">
                    • {anom.vehiculo}: {anom.motivo}
                  </span>
                ))}
              </p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-[#007A33]/20 flex flex-col md:flex-row gap-2 items-center justify-between">
          <div className="w-full md:w-1/2 flex items-center bg-slate-50/50 rounded-xl px-4 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#007A33]/20 transition-all border border-transparent focus-within:border-[#007A33]/30">
            <svg className="h-5 w-5 text-slate-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por placa, económico o modelo..."
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm text-slate-700 placeholder-slate-400 font-medium"
            />
          </div>
          <div className="w-full md:w-auto">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full md:w-auto border border-[#007A33]/30 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#007A33]/20 cursor-pointer transition-colors"
            >
              <option value="mesActual">Mes actual</option>
              <option value="mesAnterior">Mes anterior</option>
              <option value="ultimos7">Últimos 7 días</option>
            </select>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-[#007A33]/20 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-slate-500">Volumen Cargado</p>
              <div className="bg-[#007A33]/10 p-2 rounded-lg text-[#007A33]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-800">
              {cargando ? '...' : totalLitros.toLocaleString()} <span className="text-sm font-semibold text-slate-400">Lts</span>
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-[#007A33]/20 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-slate-500">Gasto Operativo</p>
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-800">
              <span className="text-xl">$</span>{cargando ? '...' : totalGasto.toLocaleString()} <span className="text-sm font-semibold text-slate-400">MXN</span>
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-[#007A33]/20 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-slate-500">Rendimiento Promedio</p>
              <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-800">
              {rendimientoGlobal ? rendimientoGlobal.toFixed(1) : 'N/D'} <span className="text-sm font-semibold text-slate-400">km/l</span>
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-[#007A33]/20 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-slate-500">Flotilla Activa</p>
              <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-800">
              {cargando ? '...' : vehiculosActivos} <span className="text-sm font-semibold text-slate-400">Unidades</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfica */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-[#007A33]/20">
            <div className="mb-6">
              <h2 className="text-lg font-extrabold text-slate-800">Consumo Diario</h2>
              <p className="text-xs text-slate-500 font-medium">Litros cargados en los últimos 7 días (según filtros)</p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={datosConsumoReal}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                  />
                  <Bar dataKey="litros" name="Litros Reales" fill="#007A33" radius={[6, 6, 0, 0]} maxBarSize={50} />
                  <Line type="monotone" dataKey={() => promedioLitrosDia} name="Promedio" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 5 menos eficientes */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-[#007A33]/20 overflow-hidden flex flex-col h-[400px]">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-extrabold text-slate-800">Top 5 Menos Eficientes</h2>
              <p className="text-xs text-slate-500 font-medium">Vehículos con peor rendimiento (km/l)</p>
            </div>
            <div className="grow overflow-y-auto p-4">
              {topMenosEficientes.length === 0 ? (
                <p className="text-sm text-slate-500 mt-10 text-center">No hay datos suficientes para calcular rendimiento.</p>
              ) : (
                <div className="space-y-3">
                  {topMenosEficientes.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-[#007A33]/10">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold bg-red-100 text-red-600 w-6 h-6 rounded-full flex items-center justify-center">{index + 1}</span>
                        <span className="text-sm font-semibold text-slate-700 truncate max-w-[150px]">{item.nombre}</span>
                      </div>
                      <span className="text-sm font-extrabold text-red-600">{item.rendimiento.toFixed(1)} km/l</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de últimas operaciones filtradas */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-[#007A33]/20 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-extrabold text-slate-800">Últimas Operaciones</h2>
            <p className="text-xs text-slate-500 font-medium">Registros filtrados según tu selección</p>
          </div>
          <div className="overflow-x-auto">
            {cargando ? (
              <div className="flex justify-center items-center py-10">
                <svg className="animate-spin h-8 w-8 text-[#007A33]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : registrosFiltrados.length === 0 ? (
              <p className="text-center text-sm font-medium text-slate-500 py-10">No hay registros con los filtros seleccionados.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="py-3 px-4 text-left font-bold">Vehículo</th>
                    <th className="py-3 px-4 text-left font-bold">Placa / Eco</th>
                    <th className="py-3 px-4 text-left font-bold">Fecha</th>
                    <th className="py-3 px-4 text-left font-bold">Litros</th>
                    <th className="py-3 px-4 text-left font-bold">Costo</th>
                    <th className="py-3 px-4 text-left font-bold">Rendimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registrosFiltrados.map(reg => (
                    <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {reg.vehiculo.marcaVehiculo} {reg.vehiculo.submarcaVehiculo}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {reg.vehiculo.economico || reg.vehiculo.placas || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {reg.fechaCarga ? new Date(reg.fechaCarga).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin fecha'}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#007A33]">{reg.litrosCargados} L</td>
                      <td className="py-3 px-4 font-bold text-slate-700">${reg.costoTotal}</td>
                      <td className="py-3 px-4 text-slate-500">{reg.kilometraje ? `${reg.kilometraje} km` : 'N/D'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}