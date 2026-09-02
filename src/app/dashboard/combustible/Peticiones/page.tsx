"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

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

export default function PeticionesView() {
  const [peticiones, setPeticiones] = useState<RegistroExcepcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [filtroActivo, setFiltroActivo] = useState<'PENDIENTES' | 'HISTORIAL'>('PENDIENTES');

  // Cargamos los datos reutilizando tu API existente
  useEffect(() => {
    const cargarPeticiones = async () => {
      try {
        const res = await fetch('/api/combustible');
        if (res.ok) {
          const data: RegistroExcepcion[] = await res.json();
          // Solo nos interesan los registros que fueron marcados como excepción
          const excepciones = data.filter(reg => reg.esExcepcion);
          setPeticiones(excepciones);
        }
      } catch (error) {
        console.error("Error al cargar peticiones:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarPeticiones();
  }, []);

  // Filtramos visualmente según la pestaña seleccionada
  const peticionesMostradas = useMemo(() => {
    if (filtroActivo === 'PENDIENTES') {
      return peticiones.filter(p => p.estadoAprobacion === 'PENDIENTE_REVISION');
    } else {
      return peticiones.filter(p => p.estadoAprobacion !== 'PENDIENTE_REVISION');
    }
  }, [peticiones, filtroActivo]);

  // Función para aprobar o rechazar
  const cambiarEstado = async (id: string, nuevoEstado: 'APROBADA' | 'RECHAZADA') => {
    setProcesandoId(id);
    try {
      const res = await fetch('/api/combustible', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estadoAprobacion: nuevoEstado }),
      });

      if (res.ok) {
        // Actualizamos el estado local para que la tarjeta desaparezca/cambie sin recargar la página
        setPeticiones(prev => 
          prev.map(p => p.id === id ? { ...p, estadoAprobacion: nuevoEstado } : p)
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

  return (
    <div className="min-h-screen font-sans relative overflow-hidden bg-linear-to-br from-slate-100 via-white to-slate-200">
      {/* Elementos decorativos */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="absolute top-0 left-0 w-full h-64 opacity-30" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#007A33" fillOpacity="0.08" d="M0,192L48,176C96,160,192,128,288,138.7C384,149,480,203,576,208C672,213,768,171,864,160C960,149,1056,171,1152,181.3C1248,192,1344,192,1392,192L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
      </div>

      <main className="relative z-10 max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Enlace para volver */}
        <Link href="/dashboard/combustible" className="flex items-center gap-1 text-xs text-slate-600 hover:text-[#007A33] transition-colors w-fit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Volver al Dashboard
        </Link>

        {/* Encabezado */}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Centro de Peticiones</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Revisión de cargas de combustible extraordinarias o excedentes.</p>
        </div>

        {/* Pestañas (Tabs) */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setFiltroActivo('PENDIENTES')}
            className={`pb-3 px-4 text-sm font-bold transition-all relative ${
              filtroActivo === 'PENDIENTES' ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Pendientes de Revisión
            {filtroActivo === 'PENDIENTES' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-t-md"></span>
            )}
          </button>
          <button
            onClick={() => setFiltroActivo('HISTORIAL')}
            className={`pb-3 px-4 text-sm font-bold transition-all relative ${
              filtroActivo === 'HISTORIAL' ? 'text-[#007A33]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Historial Procesado
            {filtroActivo === 'HISTORIAL' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#007A33] rounded-t-md"></span>
            )}
          </button>
        </div>

        {/* Contenido (Grid de Tarjetas) */}
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
            <h3 className="text-slate-700 font-bold">Todo al día</h3>
            <p className="text-sm text-slate-500 mt-1">No hay peticiones {filtroActivo === 'PENDIENTES' ? 'pendientes por revisar' : 'en el historial'}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {peticionesMostradas.map((pet) => (
              <div key={pet.id} className="bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                {/* Cabecera de la Tarjeta */}
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

                {/* Cuerpo de la Tarjeta */}
                <div className="p-4 grow space-y-4">
                  {/* Detalles Operativos */}
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

                  {/* Justificación Destacada */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 relative">
                    <span className="absolute -top-2.5 left-3 bg-amber-100 border border-amber-200 text-amber-700 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wide">
                      Motivo de Excepción
                    </span>
                    <p className="text-sm text-amber-900 font-medium mt-1 leading-relaxed">
                      &quot;{pet.justificacion || 'No proporcionó justificación.'}&quot;
                    </p>
                  </div>
                </div>

                {/* Acciones (Footer de la Tarjeta) */}
                <div className="p-4 pt-0 mt-auto">
                  {filtroActivo === 'PENDIENTES' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => cambiarEstado(pet.id, 'RECHAZADA')}
                        disabled={procesandoId === pet.id}
                        className="flex-1 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => cambiarEstado(pet.id, 'APROBADA')}
                        disabled={procesandoId === pet.id}
                        className="flex-1 py-2 bg-[#007A33] text-white hover:bg-[#005c26] font-bold rounded-xl text-sm transition-colors disabled:opacity-50 shadow-sm"
                      >
                        {procesandoId === pet.id ? 'Guardando...' : 'Aprobar'}
                      </button>
                    </div>
                  ) : (
                    <div className={`w-full py-2 rounded-xl text-center text-sm font-bold border ${
                      pet.estadoAprobacion === 'APROBADA' 
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
      </main>
    </div>
  );
}