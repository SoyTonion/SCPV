"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getVehiculosPernocta } from '@/app/dashboard/vehiculos/actions';

interface RegistroExcepcion {
  id: string;
  kilometraje: number;
  litrosCargados: number;
  costoTotal: number;
  fechaCarga: string | null;
  esExcepcion: boolean;
  justificacion: string | null;
  estadoAprobacion: 'PENDIENTE_REVISION' | 'APROBADA' | 'RECHAZADA';
  vehiculo: {
    marcaVehiculo: string;
    submarcaVehiculo: string;
    placas: string | null;
    economico: string | null;
  };
}

interface ConfirmacionAccion {
  id: string;
  estado: 'APROBADA' | 'RECHAZADA';
  placas: string;
  economico: string;
}

export default function PeticionesView() {
  const [peticiones, setPeticiones] = useState<RegistroExcepcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // 🆕 Agregamos 'PREAUTORIZACIONES' a los filtros posibles
  const [filtroActivo, setFiltroActivo] = useState<'PENDIENTES' | 'HISTORIAL' | 'PREAUTORIZACIONES'>('PENDIENTES');

  const [confirmacion, setConfirmacion] = useState<ConfirmacionAccion | null>(null);

  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [busquedaFecha, setBusquedaFecha] = useState('');

  // 🆕 Estados para el nuevo formulario de Preautorización
  const [preEco, setPreEco] = useState('');
  const [preLitros, setPreLitros] = useState('');
  const [preMotivo, setPreMotivo] = useState('');
  const [preHoraFin, setPreHoraFin] = useState('23:59');

  const [vehiculosDb, setVehiculosDb] = useState<{ id: string, economico: string | null, placas: string | null, marcaVehiculo: string }[]>([]);

  interface Preautorizacion {
    id: string;
    economico: string;
    litros: number;
    motivo: string;
    fecha: Date;
    estado: 'ACTIVA' | 'USADA' | 'CADUCADA';
    horaFin: string;
  }
  const [preautorizacionesActivas, setPreautorizacionesActivas] = useState<Preautorizacion[]>([]);
  const [toastExito, setToastExito] = useState<string | null>(null);
  const [confirmacionEliminarPre, setConfirmacionEliminarPre] = useState<string | null>(null);

  useEffect(() => {
    const cargarPeticiones = async () => {
      try {
        const res = await fetch('/api/combustible');
        if (res.ok) {
          const data: RegistroExcepcion[] = await res.json();
          const excepciones = data.filter(reg => reg.esExcepcion);
          setPeticiones(excepciones);
        }
      } catch (error) {
        console.error("Error al cargar peticiones:", error);
      } finally {
        setCargando(false);
      }
    };

    const cargarVehiculos = async () => {
      const res = await getVehiculosPernocta();
      if (res.success && res.data) {
        setVehiculosDb(res.data);
      }
    };

    cargarPeticiones();
    cargarVehiculos();
  }, []);

  const peticionesMostradas = useMemo(() => {
    if (filtroActivo === 'PENDIENTES') {
      return peticiones.filter(p => p.estadoAprobacion === 'PENDIENTE_REVISION');
    } else if (filtroActivo === 'HISTORIAL') {
      let historial = peticiones.filter(p => p.estadoAprobacion !== 'PENDIENTE_REVISION');

      if (busquedaTexto.trim() !== '') {
        const termino = busquedaTexto.toLowerCase();
        historial = historial.filter(p =>
          (p.vehiculo.economico?.toLowerCase() || '').includes(termino) ||
          (p.vehiculo.placas?.toLowerCase() || '').includes(termino) ||
          (p.vehiculo.marcaVehiculo.toLowerCase() || '').includes(termino)
        );
      }

      if (busquedaFecha !== '') {
        historial = historial.filter(p => {
          if (!p.fechaCarga) return false;
          return p.fechaCarga.startsWith(busquedaFecha);
        });
      }
      return historial;
    }
    return []; // Para la pestaña de preautorizaciones no usamos esta lista
  }, [peticiones, filtroActivo, busquedaTexto, busquedaFecha]);

  const iniciarCambioEstado = (id: string, nuevoEstado: 'APROBADA' | 'RECHAZADA', placas: string, economico: string) => {
    setConfirmacion({ id, estado: nuevoEstado, placas: placas || 'S/N', economico: economico || 'S/N' });
  };

  const ejecutarCambioEstado = async () => {
    if (!confirmacion) return;

    setProcesandoId(confirmacion.id);
    const idAProcesar = confirmacion.id;
    const nuevoEstado = confirmacion.estado;

    setConfirmacion(null);

    try {
      const res = await fetch('/api/combustible', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idAProcesar, estadoAprobacion: nuevoEstado }),
      });

      if (res.ok) {
        setPeticiones(prev =>
          prev.map(p => p.id === idAProcesar ? { ...p, estadoAprobacion: nuevoEstado } : p)
        );
      } else {
        alert("Error al actualizar el estado.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión al procesar la petición.");
    } finally {
      setProcesandoId(null);
    }
  };

  const limpiarFiltros = () => {
    setBusquedaTexto('');
    setBusquedaFecha('');
  };

  // 🆕 Función simulada para emitir preautorización (luego la conectaremos a tu API)
  const handleCrearPreautorizacion = (e: React.FormEvent) => {
    e.preventDefault();

    const nueva: Preautorizacion = {
      id: Math.random().toString(36).substring(2, 9),
      economico: preEco,
      litros: Number(preLitros),
      motivo: preMotivo,
      fecha: new Date(),
      estado: 'ACTIVA',
      horaFin: preHoraFin
    };

    setPreautorizacionesActivas([nueva, ...preautorizacionesActivas]);

    setPreEco('');
    setPreLitros('');
    setPreMotivo('');
    setPreHoraFin('23:59');

    setToastExito('Preautorización emitida exitosamente.');
    setTimeout(() => setToastExito(null), 3000);
  };

  const cancelarPreautorizacion = (id: string) => {
    setPreautorizacionesActivas(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen font-sans relative overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200">
      {/* Elementos decorativos */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="absolute top-0 left-0 w-full h-64 opacity-30" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#007A33" fillOpacity="0.08" d="M0,192L48,176C96,160,192,128,288,138.7C384,149,480,203,576,208C672,213,768,171,864,160C960,149,1056,171,1152,181.3C1248,192,1344,192,1392,192L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
      </div>

      <main className="relative z-10 max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Enlace para volver */}
        <Link href="/dashboard/combustible" className="flex items-center gap-1 text-xs text-slate-600 hover:text-[#007A33] transition-colors w-fit cursor-pointer">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Volver al Dashboard
        </Link>

        {/* Encabezado */}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Centro de Peticiones</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Gestión operativa de cargas extraordinarias y permisos.</p>
        </div>

        {/* 🆕 Pestañas actualizadas (3 botones) */}
        <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap hide-scrollbar">
          <button
            onClick={() => setFiltroActivo('PENDIENTES')}
            className={`pb-3 px-4 text-sm font-bold transition-all relative cursor-pointer ${filtroActivo === 'PENDIENTES' ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            Pendientes de Revisión
            {filtroActivo === 'PENDIENTES' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-t-md"></span>
            )}
          </button>

          <button
            onClick={() => setFiltroActivo('PREAUTORIZACIONES')}
            className={`pb-3 px-4 text-sm font-bold transition-all relative cursor-pointer ${filtroActivo === 'PREAUTORIZACIONES' ? 'text-[#007A33]' : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            Emitir Preautorización
            {filtroActivo === 'PREAUTORIZACIONES' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#007A33] rounded-t-md"></span>
            )}
          </button>

          <button
            onClick={() => setFiltroActivo('HISTORIAL')}
            className={`pb-3 px-4 text-sm font-bold transition-all relative cursor-pointer ${filtroActivo === 'HISTORIAL' ? 'text-[#007A33]' : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            Historial Procesado
            {filtroActivo === 'HISTORIAL' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#007A33] rounded-t-md"></span>
            )}
          </button>
        </div>

        {/* ---------------------------------------------------------------------- */}
        {/* VISTA: PREAUTORIZACIONES */}
        {/* ---------------------------------------------------------------------- */}
        {filtroActivo === 'PREAUTORIZACIONES' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">

            {/* Columna Izquierda: Formulario (Ahora más ancha) */}
            <div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-[#007A33]/10 p-2.5 rounded-lg text-[#007A33] border border-[#007A33]/20">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Nuevo Permiso</h2>
                    <p className="text-sm text-slate-500">Autorización extraordinaria</p>
                  </div>
                </div>

                <form onSubmit={handleCrearPreautorizacion} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 uppercase">No. Económico o Placas</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                      </div>
                      <input
                        type="text"
                        required
                        list="vehiculos-list"
                        value={preEco}
                        onChange={(e) => setPreEco(e.target.value)}
                        placeholder="Buscar..."
                        className="w-full border border-slate-300 rounded-lg pl-11 pr-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-[#007A33] focus:ring-2 focus:ring-[#007A33]/20 transition-all placeholder-slate-400"
                      />
                      <datalist id="vehiculos-list">
                        {vehiculosDb.map(v => (
                          <option key={v.id} value={v.economico || v.placas || ''}>
                            {v.economico ? `Eco: ${v.economico}` : ''} {v.placas ? `| Placas: ${v.placas}` : ''} | {v.marcaVehiculo}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600 uppercase">Litros</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min="1"
                          value={preLitros}
                          onChange={(e) => setPreLitros(e.target.value)}
                          placeholder="0"
                          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-[#007A33] focus:ring-2 focus:ring-[#007A33]/20 transition-all"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-xs font-semibold text-slate-400">LTS</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600 uppercase">Hora Cierre</label>
                      <div className="relative">
                        <input
                          type="time"
                          required
                          value={preHoraFin}
                          onChange={(e) => setPreHoraFin(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-[#007A33] focus:ring-2 focus:ring-[#007A33]/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 uppercase">Motivo Operativo</label>
                    <textarea
                      required
                      value={preMotivo}
                      onChange={(e) => setPreMotivo(e.target.value)}
                      placeholder="Detalle..."
                      rows={2}
                      className="w-full border border-slate-300 rounded-lg p-3 text-sm font-medium text-slate-700 outline-none focus:border-[#007A33] focus:ring-2 focus:ring-[#007A33]/20 transition-all resize-none"
                    />
                  </div>

                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex gap-2 items-start">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-xs text-amber-900 font-medium leading-tight">
                      Caducará a las <span className="font-bold">{preHoraFin} hrs</span>.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#007A33] text-white font-bold rounded-lg text-sm hover:bg-[#005c26] active:bg-[#00421b] transition-colors shadow-sm cursor-pointer flex justify-center items-center gap-2"
                  >
                    Emitir Preautorización
                  </button>
                </form>
              </div>
            </div>

            {/* Columna Derecha: Lista Activa */}
            <div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-800 text-base">Permisos Activos (Hoy)</h3>
                    <span className="bg-[#007A33]/10 text-[#007A33] text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {preautorizacionesActivas.length} ACTIVOS
                    </span>
                  </div>
                </div>

                {preautorizacionesActivas.length === 0 ? (
                  <div className="p-8 grow flex flex-col items-center justify-center text-center">
                    <div className="bg-slate-100 p-4 rounded-full mb-4 text-slate-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <p className="text-base font-bold text-slate-600">Sin preautorizaciones vigentes</p>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm">Los permisos emitidos aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="p-5 grow overflow-y-auto hide-scrollbar flex flex-col gap-4 max-h-[500px]">
                    {preautorizacionesActivas.map(permiso => (
                      <div key={permiso.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative group hover:border-[#007A33]/30 transition-colors">
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="bg-slate-800 text-white font-bold px-2.5 py-1 rounded-md text-xs tracking-wide shadow-sm">
                              ECO {permiso.economico}
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              Activo
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-base">{permiso.litros} Litros</h4>
                          <p className="text-sm text-slate-600 line-clamp-2">{permiso.motivo}</p>
                          <div className="text-xs text-slate-500 font-medium pt-1">
                            Válido hasta: <span className="font-bold">{permiso.horaFin} hrs</span>
                          </div>
                        </div>

                        <div className="flex justify-end sm:border-l sm:border-slate-100 sm:pl-6 shrink-0">
                          <button
                            onClick={() => setConfirmacionEliminarPre(permiso.id)}
                            className="w-full sm:w-auto p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                            title="Cancelar permiso"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* VISTA: PENDIENTES E HISTORIAL (Lo que ya tenías) */}
        {/* ---------------------------------------------------------------------- */}
        {filtroActivo === 'HISTORIAL' && (
          <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-[#007A33]/20 flex flex-col md:flex-row gap-3 items-center animate-in fade-in slide-in-from-top-2">
            <div className="w-full flex-1 flex items-center bg-slate-50/50 rounded-xl px-4 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#007A33]/20 transition-all border border-transparent focus-within:border-[#007A33]/30">
              <svg className="h-5 w-5 text-slate-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por Eco, Placas o Marca..."
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-sm text-slate-700 placeholder-slate-400 font-medium"
              />
            </div>

            <div className="w-full md:w-auto flex items-center bg-slate-50/50 rounded-xl px-4 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#007A33]/20 transition-all border border-transparent focus-within:border-[#007A33]/30">
              <input
                type="date"
                value={busquedaFecha}
                onChange={(e) => setBusquedaFecha(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-sm text-slate-700 font-medium cursor-pointer"
              />
            </div>

            {(busquedaTexto !== '' || busquedaFecha !== '') && (
              <button
                onClick={limpiarFiltros}
                className="w-full md:w-auto px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                Limpiar
              </button>
            )}
          </div>
        )}

        {/* Solo renderizamos el listado si NO estamos en Preautorizaciones */}
        {filtroActivo !== 'PREAUTORIZACIONES' && (
          <>
            {cargando ? (
              <div className="flex justify-center py-20">
                <svg className="animate-spin h-8 w-8 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : peticionesMostradas.length === 0 ? (
              <div className="bg-white/60 border border-slate-200 border-dashed rounded-2xl p-10 flex flex-col items-center text-center">
                <div className="bg-slate-100 p-3 rounded-full mb-3 text-slate-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-slate-700 font-bold">Sin resultados</h3>
                <p className="text-sm text-slate-500 mt-1">
                  No se encontraron registros que coincidan con la búsqueda en {filtroActivo === 'PENDIENTES' ? 'pendientes' : 'el historial'}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {peticionesMostradas.map((pet) => (
                  <div key={pet.id} className="bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                    <div className="bg-slate-50/80 p-4 border-b border-slate-100 flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehículo</span>
                        <h3 className="text-sm font-extrabold text-slate-800">
                          Eco: {pet.vehiculo.economico || 'N/A'} - {pet.vehiculo.placas}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">{pet.vehiculo.marcaVehiculo} {pet.vehiculo.submarcaVehiculo}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha</span>
                        <p className="text-xs font-semibold text-slate-700">
                          {pet.fechaCarga ? new Date(pet.fechaCarga).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/D'}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 grow space-y-4">
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-500 font-medium">Litros</p>
                          <p className="text-sm font-bold text-[#007A33]">{pet.litrosCargados} L</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-medium">Importe</p>
                          <p className="text-sm font-bold text-slate-800">${pet.costoTotal}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-medium">Odómetro</p>
                          <p className="text-sm font-bold text-slate-800">{pet.kilometraje} km</p>
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 relative">
                        <span className="absolute -top-2.5 left-3 bg-amber-100 border border-amber-200 text-amber-700 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wide">
                          Motivo de Excepción
                        </span>
                        <p className="text-sm text-amber-900 font-medium mt-1 leading-relaxed">
                          &quot;{pet.justificacion || 'No proporcionó justificación.'}&quot;
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-0 mt-auto">
                      {filtroActivo === 'PENDIENTES' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => iniciarCambioEstado(pet.id, 'RECHAZADA', pet.vehiculo.placas || '', pet.vehiculo.economico || '')}
                            disabled={procesandoId === pet.id}
                            className="flex-1 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => iniciarCambioEstado(pet.id, 'APROBADA', pet.vehiculo.placas || '', pet.vehiculo.economico || '')}
                            disabled={procesandoId === pet.id}
                            className="flex-1 py-2 bg-[#007A33] text-white hover:bg-[#005c26] font-bold rounded-xl text-sm transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {procesandoId === pet.id ? 'Guardando...' : 'Aprobar'}
                          </button>
                        </div>
                      ) : (
                        <div className={`w-full py-2 rounded-xl text-center text-sm font-bold border ${pet.estadoAprobacion === 'APROBADA'
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : 'bg-red-50 border-red-200 text-red-700'
                          }`}>
                          {pet.estadoAprobacion === 'APROBADA' ? '✅ Petición Aprobada' : '❌ Petición Rechazada'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL FLOTANTE DE CONFIRMACIÓN */}
      {confirmacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-4 ${confirmacion.estado === 'APROBADA' ? 'bg-[#007A33]/10' : 'bg-red-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${confirmacion.estado === 'APROBADA' ? 'bg-[#007A33]/20 text-[#007A33]' : 'bg-red-100 text-red-600'}`}>
                  {confirmacion.estado === 'APROBADA' ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  )}
                </div>
                <div>
                  <h3 className={`font-extrabold ${confirmacion.estado === 'APROBADA' ? 'text-[#007A33]' : 'text-red-700'}`}>
                    Confirmar Acción
                  </h3>
                  <p className="text-xs font-medium text-slate-600">
                    Eco {confirmacion.economico} - Placas {confirmacion.placas}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 text-sm text-slate-600 font-medium">
              ¿Estás seguro de que deseas <strong>{confirmacion.estado === 'APROBADA' ? 'aprobar' : 'rechazar'}</strong> esta carga de combustible excedente?
              {confirmacion.estado === 'RECHAZADA' && (
                <p className="mt-2 text-xs text-red-500 font-bold bg-red-50 p-2 rounded-lg border border-red-100">
                  ⚠️ Esta acción marcará el registro para un posible descuento vía nómina.
                </p>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button
                onClick={() => setConfirmacion(null)}
                className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarCambioEstado}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl transition-colors shadow-sm cursor-pointer ${confirmacion.estado === 'APROBADA' ? 'bg-[#007A33] hover:bg-[#005c26]' : 'bg-red-600 hover:bg-red-700'
                  }`}
              >
                Sí, {confirmacion.estado === 'APROBADA' ? 'Aprobar' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST DE ÉXITO */}
      {toastExito && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-green-500/20 p-1.5 rounded-full text-green-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className="text-sm font-bold">{toastExito}</p>
        </div>
      )}

      {/* MODAL ELIMINAR PREAUTORIZACION */}
      {confirmacionEliminarPre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-red-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 text-red-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-red-700">Cancelar Permiso</h3>
                  <p className="text-xs font-medium text-slate-600">
                    Acción irreversible
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 text-sm text-slate-600 font-medium">
              ¿Estás seguro de que deseas <strong>cancelar</strong> este permiso activo? El chofer ya no podrá utilizarlo.
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button
                onClick={() => setConfirmacionEliminarPre(null)}
                className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  cancelarPreautorizacion(confirmacionEliminarPre);
                  setConfirmacionEliminarPre(null);
                  setToastExito('Permiso cancelado correctamente.');
                  setTimeout(() => setToastExito(null), 3000);
                }}
                className="flex-1 py-2.5 text-white font-bold rounded-xl transition-colors shadow-sm cursor-pointer bg-red-600 hover:bg-red-700"
              >
                Sí, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}