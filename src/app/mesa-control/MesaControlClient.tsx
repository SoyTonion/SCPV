"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

interface RegistroCombustible {
  id: string;
  vehiculo: { 
    economico: string; 
    placas: string; 
    marcaVehiculo: string; 
    submarcaVehiculo: string;
    capacidadTanque?: number | null;
  };
  usuario: { 
    nombre: string; 
    usuario: string;
    telefono?: string;
    rpe?: string;
    email?: string;
  };
  fechaCarga: string;
  kilometraje: number;
  litrosCargados: number;
  costoTotal: number;
  rutaEvidencia: string;
  rutaEvidenciaOdometro: string | null;
  kilometrajeOcr: number | null;
  litrosOcr: number | null;
  costoOcr: number | null;
  rendimientoKmL: number | null;
  justificacion: string | null;
  estadoAprobacion: 'PENDIENTE_REVISION' | 'APROBADA' | 'RECHAZADA';
}

type TabMesa = 'PENDIENTES' | 'APROBADAS' | 'RECHAZADAS' | 'HISTORIAL';

export default function MesaControlClient() {
  const [todosLosRegistros, setTodosLosRegistros] = useState<RegistroCombustible[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabActiva, setTabActiva] = useState<TabMesa>('PENDIENTES');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  
  // Registro seleccionado para el modal de detalle / auditoría
  const [registroSeleccionado, setRegistroSeleccionado] = useState<RegistroCombustible | null>(null);
  const [esModoEdicion, setEsModoEdicion] = useState(false);
  const [accionEnProceso, setAccionEnProceso] = useState(false);

  // Estados editables por la secretaria
  const [editKilometraje, setEditKilometraje] = useState('');
  const [editLitros, setEditLitros] = useState('');
  const [editCosto, setEditCosto] = useState('');

  // Sub-modal para el Motivo de Rechazo
  const [mostrarModalRechazo, setMostrarModalRechazo] = useState(false);
  const [motivoRechazoTexto, setMotivoRechazoTexto] = useState('');

  // Atajos rápidos para motivo de rechazo
  const motivosPredefinidos = [
    "Foto de odómetro ajena o ilegible (calculadora/pantalla)",
    "Ticket de combustible no coincide con el vehículo",
    "Foto borrosa / no se aprecian litros ni importe",
    "Intento de alteración de volumen o costo",
    "Carga física no justificada / posible huachicol"
  ];

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/combustible?limit=300');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTodosLosRegistros(data);
        }
      }
    } catch (e) {
      console.error("Error al cargar registros:", e);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado por Pestañas
  const registrosPendientes = useMemo(() => {
    return todosLosRegistros.filter(r => r.estadoAprobacion === 'PENDIENTE_REVISION');
  }, [todosLosRegistros]);

  const registrosAprobados = useMemo(() => {
    return todosLosRegistros.filter(r => r.estadoAprobacion === 'APROBADA');
  }, [todosLosRegistros]);

  const registrosRechazados = useMemo(() => {
    return todosLosRegistros.filter(r => r.estadoAprobacion === 'RECHAZADA');
  }, [todosLosRegistros]);

  // Registros de la pestaña activa con filtro de búsqueda
  const registrosMostrados = useMemo(() => {
    let base: RegistroCombustible[] = [];
    if (tabActiva === 'PENDIENTES') base = registrosPendientes;
    else if (tabActiva === 'APROBADAS') base = registrosAprobados;
    else if (tabActiva === 'RECHAZADAS') base = registrosRechazados;
    else base = todosLosRegistros; // HISTORIAL GENERAL

    if (!terminoBusqueda.trim()) return base;

    const term = terminoBusqueda.toLowerCase();
    return base.filter(r => 
      (r.vehiculo.economico && r.vehiculo.economico.toLowerCase().includes(term)) ||
      (r.vehiculo.placas && r.vehiculo.placas.toLowerCase().includes(term)) ||
      (r.usuario.nombre && r.usuario.nombre.toLowerCase().includes(term)) ||
      (r.usuario.rpe && r.usuario.rpe.toLowerCase().includes(term)) ||
      (r.justificacion && r.justificacion.toLowerCase().includes(term))
    );
  }, [tabActiva, terminoBusqueda, registrosPendientes, registrosAprobados, registrosRechazados, todosLosRegistros]);

  // Al abrir el modal
  const abrirModal = (reg: RegistroCombustible, editable: boolean = false) => {
    setRegistroSeleccionado(reg);
    setEsModoEdicion(editable && reg.estadoAprobacion === 'PENDIENTE_REVISION');
    setEditKilometraje(String(reg.kilometraje));
    setEditLitros(String(reg.litrosCargados));
    setEditCosto(String(reg.costoTotal));
    setMostrarModalRechazo(false);
    setMotivoRechazoTexto('');
  };

  const handleAprobar = async () => {
    if (!registroSeleccionado) return;
    setAccionEnProceso(true);
    try {
      const payload: any = { 
        id: registroSeleccionado.id, 
        estadoAprobacion: 'APROBADA',
        kilometraje: editKilometraje,
        litrosCargados: editLitros,
        costoTotal: editCosto
      };

      const res = await fetch('/api/combustible', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchRegistros();
        setRegistroSeleccionado(null);
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Error al aprobar la carga");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    } finally {
      setAccionEnProceso(false);
    }
  };

  const handleConfirmarRechazo = async () => {
    if (!registroSeleccionado) return;
    if (!motivoRechazoTexto.trim()) {
      alert("Por favor selecciona o escribe el motivo del rechazo.");
      return;
    }

    setAccionEnProceso(true);
    try {
      const payload = {
        id: registroSeleccionado.id,
        estadoAprobacion: 'RECHAZADA',
        motivoRechazo: motivoRechazoTexto.trim()
      };

      const res = await fetch('/api/combustible', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchRegistros();
        setMostrarModalRechazo(false);
        setRegistroSeleccionado(null);
        setMotivoRechazoTexto('');
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Error al procesar el rechazo");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    } finally {
      setAccionEnProceso(false);
    }
  };

  // Helper para interpretar etiquetas de justificación
  const obtenerColorAlerta = (justificacion: string | null) => {
    if (!justificacion) return { bg: 'bg-slate-100 border-slate-200 text-slate-700', badge: 'REVISIÓN' };
    if (justificacion.includes('[TIPO_A]')) return { bg: 'bg-red-50 text-red-700 border-red-200', badge: 'ALTERACIÓN (TIPO A)' };
    if (justificacion.includes('[TIPO_B]')) return { bg: 'bg-amber-50 text-amber-700 border-amber-200', badge: 'FOTO ILEGIBLE (TIPO B)' };
    if (justificacion.includes('[TIPO_C]')) return { bg: 'bg-orange-50 text-orange-700 border-orange-200', badge: 'DISCREPANCIA (TIPO C)' };
    if (justificacion.includes('[TIPO_D]')) return { bg: 'bg-purple-50 text-purple-700 border-purple-200', badge: 'ANOMALÍA FÍSICA (TIPO D)' };
    return { bg: 'bg-slate-50 border-slate-200 text-slate-700', badge: 'AUDITORÍA' };
  };

  // Parser integral de alertas y justificaciones para el expediente forense
  const parsearJustificacion = (texto: string | null) => {
    if (!texto) return null;

    const res = {
      alertasFisicas: [] as string[],
      alertasAlteracion: [] as string[],
      alertasIlegible: [] as string[],
      alertasDiscrepancia: [] as string[],
      motivoAjusteManual: null as { categoria?: string; detalle: string } | null,
      motivoRechazo: null as string | null,
      corregidoSecretaria: null as string | null,
      notasExcedente: null as string | null,
      raw: texto
    };

    // 1. Motivo de Rechazo
    const matchRechazo = texto.match(/\[MOTIVO_RECHAZO\]:\s*([^|]+)/i);
    if (matchRechazo) {
      res.motivoRechazo = matchRechazo[1].trim();
    }

    // 2. Corregido por Secretaría
    const matchCorregido = texto.match(/\[CORREGIDO_POR_SECRETARIA\]:\s*([^|]+)/i);
    if (matchCorregido) {
      res.corregidoSecretaria = matchCorregido[1].trim();
    }

    // 3. Motivo de Ajuste Manual
    const matchAjuste = texto.match(/\[MOTIVO_AJUSTE_MANUAL\]:\s*([^|]+)/i);
    if (matchAjuste) {
      const rawAjuste = matchAjuste[1].trim();
      if (rawAjuste.includes(' - ')) {
        const parts = rawAjuste.split(' - ');
        res.motivoAjusteManual = {
          categoria: parts[0].trim(),
          detalle: parts.slice(1).join(' - ').trim()
        };
      } else {
        res.motivoAjusteManual = {
          detalle: rawAjuste
        };
      }
    }

    // 4. Notas de Excedente
    const matchExcedente = texto.match(/(?:Excedente Autorizado|Motivo Excedente|Notas del Chofer):\s*([^|]+)/i);
    if (matchExcedente) {
      const exc = matchExcedente[1].trim();
      if (exc && exc !== 'Ninguna' && !exc.startsWith('[')) {
        res.notasExcedente = exc;
      }
    }

    // 5. Alertas Tipo D (Físicas)
    const regexTipoD = /\[TIPO_D\]\s*([A-Z_]+(?:\s*\([^)]*\))?)/gi;
    let matchD;
    while ((matchD = regexTipoD.exec(texto)) !== null) {
      res.alertasFisicas.push(matchD[1].trim());
    }

    // 6. Alertas Tipo A (Alteración)
    if (texto.includes('ODOMETRO_ALTERADO')) {
      res.alertasAlteracion.push('Odómetro modificado');
    }
    if (texto.includes('TICKET_ALTERADO')) {
      res.alertasAlteracion.push('Ticket modificado');
    }

    // 7. Alertas Tipo B (Ilegible)
    if (texto.includes('ODOMETRO_ILEGIBLE')) {
      res.alertasIlegible.push('Tablero no legible');
    }
    if (texto.includes('TICKET_ILEGIBLE')) {
      res.alertasIlegible.push('Ticket no legible');
    }

    // 8. Alertas Tipo C (Discrepancia)
    if (texto.includes('DISCREPANCIA_VOLUMEN')) {
      res.alertasDiscrepancia.push('Discrepancia de litros');
    }

    return res;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans">
      
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Mesa de Control y Auditoría</h1>
            <span className="bg-[#007A33]/10 text-[#007A33] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              CFE Combustible
            </span>
          </div>
          <p className="text-slate-500 font-medium mt-1">
            Revisión forense de tickets, odómetros, resolución de discrepancias y archivo histórico.
          </p>
        </div>

        {/* Leyenda de Alertas */}
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="text-[11px] font-bold text-slate-600">Tipo A: Alteración</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-[11px] font-bold text-slate-600">Tipo B: Ilegible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span className="text-[11px] font-bold text-slate-600">Tipo C: Discrepancia</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span className="text-[11px] font-bold text-slate-600">Tipo D: Físico</span>
          </div>
        </div>
      </div>

      {/* Barra de Navegación de Pestañas (Tabs) */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6 border-b border-slate-200 pb-2">
        <div className="flex overflow-x-auto gap-2 no-scrollbar">
          
          <button
            onClick={() => setTabActiva('PENDIENTES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              tabActiva === 'PENDIENTES'
                ? 'bg-[#007A33] text-white shadow-md shadow-green-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>🟡 Pendientes de Revisión</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              tabActiva === 'PENDIENTES' ? 'bg-white text-[#007A33]' : 'bg-amber-100 text-amber-800'
            }`}>
              {registrosPendientes.length}
            </span>
          </button>

          <button
            onClick={() => setTabActiva('APROBADAS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              tabActiva === 'APROBADAS'
                ? 'bg-[#007A33] text-white shadow-md shadow-green-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>🟢 Aprobadas / Corregidas</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              tabActiva === 'APROBADAS' ? 'bg-white text-[#007A33]' : 'bg-green-100 text-green-800'
            }`}>
              {registrosAprobados.length}
            </span>
          </button>

          <button
            onClick={() => setTabActiva('RECHAZADAS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              tabActiva === 'RECHAZADAS'
                ? 'bg-[#007A33] text-white shadow-md shadow-green-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>🔴 Rechazadas / Fraude</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              tabActiva === 'RECHAZADAS' ? 'bg-white text-[#007A33]' : 'bg-red-100 text-red-800'
            }`}>
              {registrosRechazados.length}
            </span>
          </button>

          <button
            onClick={() => setTabActiva('HISTORIAL')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              tabActiva === 'HISTORIAL'
                ? 'bg-[#007A33] text-white shadow-md shadow-green-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>🗂️ Historial General Forense</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              tabActiva === 'HISTORIAL' ? 'bg-white text-[#007A33]' : 'bg-slate-200 text-slate-700'
            }`}>
              {todosLosRegistros.length}
            </span>
          </button>

        </div>

        {/* Buscador Rápido */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={terminoBusqueda}
            onChange={e => setTerminoBusqueda(e.target.value)}
            placeholder="Buscar por placa, eco o chofer..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#007A33] shadow-sm"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
      </div>

      {/* Contenido Dinámico por Pestaña */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007A33] mb-4"></div>
          <p className="text-sm font-bold text-slate-500">Cargando registros de auditoría...</p>
        </div>
      ) : registrosMostrados.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-2xl">
            {tabActiva === 'PENDIENTES' ? '✓' : '🔍'}
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            {tabActiva === 'PENDIENTES' ? '¡Bandeja al día!' : 'Sin registros encontrados'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {tabActiva === 'PENDIENTES' 
              ? 'No hay cargas pendientes de revisión en este momento.' 
              : 'No hay registros que coincidan con los filtros o la búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {registrosMostrados.map(reg => {
            const alerta = obtenerColorAlerta(reg.justificacion);
            const esPendiente = reg.estadoAprobacion === 'PENDIENTE_REVISION';
            const esRechazada = reg.estadoAprobacion === 'RECHAZADA';
            const esCorregida = reg.justificacion?.includes('[CORREGIDO_POR_SECRETARIA]');

            // Extraer nota de rechazo si existe
            const matchRechazo = reg.justificacion?.match(/\[MOTIVO_RECHAZO\]:\s*([^|]+)/);
            const notaRechazoExtraida = matchRechazo ? matchRechazo[1].trim() : null;

            return (
              <div key={reg.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                
                {/* Header de la Tarjeta */}
                <div className={`px-4 py-2 border-b text-xs font-black tracking-widest uppercase flex justify-between items-center ${
                  esRechazada ? 'bg-red-50 text-red-700 border-red-200' :
                  esPendiente ? alerta.bg :
                  'bg-green-50 text-[#007A33] border-green-200'
                }`}>
                  <span>
                    {esRechazada ? '🔴 RECHAZADA' :
                     esPendiente ? alerta.badge :
                     esCorregida ? '🟢 APROBADA (CORREGIDA)' : '🟢 APROBADA'}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {reg.fechaCarga ? new Date(reg.fechaCarga).toLocaleDateString('es-MX') : 'S/F'}
                  </span>
                </div>
                
                <div className="p-5 grow flex flex-col">
                  {/* Datos del Vehículo y Montos */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-lg leading-tight">{reg.vehiculo.economico}</h3>
                      <p className="text-xs text-slate-500 font-medium">{reg.vehiculo.placas} • {reg.vehiculo.marcaVehiculo} {reg.vehiculo.submarcaVehiculo}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900 text-xl">{reg.litrosCargados} L</p>
                      <p className="text-xs text-slate-500 font-bold">${reg.costoTotal}</p>
                    </div>
                  </div>

                  {/* Fila de Métricas Operativas */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Kilometraje</span>
                      <span className="font-bold text-slate-800">{reg.kilometraje.toLocaleString()} KM</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Rendimiento</span>
                      <span className={`font-bold ${
                        reg.rendimientoKmL && reg.rendimientoKmL < 3 ? 'text-red-600' : 'text-slate-800'
                      }`}>
                        {reg.rendimientoKmL ? `${reg.rendimientoKmL} km/L` : 'Primer registro'}
                      </span>
                    </div>
                  </div>

                  {/* Si es rechazada, mostrar la nota de rechazo en caja roja */}
                  {esRechazada && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 text-xs text-red-800 font-medium">
                      <span className="font-bold block text-red-900 mb-0.5">⚠️ Motivo de Rechazo:</span>
                      {notaRechazoExtraida || reg.justificacion || 'Sin motivo especificado.'}
                    </div>
                  )}

                  {/* Si es pendiente, mostrar la justificación / notas del chofer formateadas */}
                  {esPendiente && (() => {
                    const parsedCard = parsearJustificacion(reg.justificacion);
                    return (
                      <div className="bg-amber-50/70 rounded-xl p-2.5 border border-amber-200/70 mb-3 text-xs space-y-1">
                        {parsedCard?.alertasFisicas && parsedCard.alertasFisicas.length > 0 && (
                          <div className="text-[10px] font-black text-rose-700 uppercase flex items-center gap-1">
                            <span>🚨</span>
                            <span className="line-clamp-1">{parsedCard.alertasFisicas[0]}</span>
                          </div>
                        )}
                        {parsedCard?.motivoAjusteManual ? (
                          <p className="text-amber-950 font-medium italic line-clamp-2">
                            💬 {parsedCard.motivoAjusteManual.categoria ? `${parsedCard.motivoAjusteManual.categoria}: ` : ''}"{parsedCard.motivoAjusteManual.detalle || parsedCard.motivoAjusteManual.categoria}"
                          </p>
                        ) : (
                          <p className="text-amber-950 font-medium italic line-clamp-2">
                            "{reg.justificacion?.replace(/\[TIPO_[A-D]\] [A-Z_]+(\s*\([^)]*\))?/g, '').replace(/\|/g, '').trim() || 'Sin notas del chofer.'}"
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Ficha del Operador / Chofer */}
                  <div className="flex items-center justify-between mb-4 mt-auto pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#007A33]/10 flex items-center justify-center text-[#007A33] font-bold text-xs uppercase">
                        {reg.usuario.nombre.substring(0, 2)}
                      </div>
                      <div className="text-[11px]">
                        <p className="font-bold text-slate-700 leading-tight">{reg.usuario.nombre}</p>
                        <p className="text-slate-400 text-[10px]">RPE: {reg.usuario.rpe || 'S/RPE'}</p>
                      </div>
                    </div>
                    {reg.usuario.telefono && reg.usuario.telefono !== 'Sin teléfono' && (
                      <a href={`tel:${reg.usuario.telefono}`} className="text-[#007A33] hover:text-[#005c26] text-xs font-bold" title="Llamar">
                        📞 {reg.usuario.telefono}
                      </a>
                    )}
                  </div>

                  {/* Botón de Acción */}
                  <button 
                    onClick={() => abrirModal(reg, esPendiente)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors flex justify-center items-center gap-2 ${
                      esPendiente
                        ? 'bg-[#007A33] text-white hover:bg-[#005c26] shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    {esPendiente ? 'Auditar Evidencias' : 'Ver Expediente Completo'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =======================================================
          MODAL PRINCIPAL DE AUDITORÍA Y EXPEDIENTE
      ======================================================= */}
      {registroSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-800">
                    {esModoEdicion ? 'Auditoría Forense de Evidencias' : 'Expediente Histórico de Carga'}
                  </h2>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                    registroSeleccionado.estadoAprobacion === 'RECHAZADA' ? 'bg-red-100 text-red-800' :
                    registroSeleccionado.estadoAprobacion === 'PENDIENTE_REVISION' ? 'bg-amber-100 text-amber-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {registroSeleccionado.estadoAprobacion}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Eco: <strong className="text-slate-700">{registroSeleccionado.vehiculo.economico}</strong> | 
                  Placas: <strong className="text-slate-700">{registroSeleccionado.vehiculo.placas}</strong> | 
                  Tanque Máx: <strong className="text-slate-700">{registroSeleccionado.vehiculo.capacidadTanque || 'N/D'} L</strong>
                </p>
              </div>
              <button 
                onClick={() => !accionEnProceso && setRegistroSeleccionado(null)} 
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body Modal */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 space-y-6">
              
              {/* Ficha de Contacto Directo con el Operador */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#007A33]/10 text-[#007A33] font-black flex items-center justify-center text-sm">
                    {registroSeleccionado.usuario.nombre.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-800 text-sm">{registroSeleccionado.usuario.nombre}</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      RPE: <strong className="text-slate-700">{registroSeleccionado.usuario.rpe || 'S/RPE'}</strong> • Usuario: @{registroSeleccionado.usuario.usuario}
                    </p>
                  </div>
                </div>
                <div>
                  {registroSeleccionado.usuario.telefono && registroSeleccionado.usuario.telefono !== 'Sin teléfono' ? (
                    <a 
                      href={`tel:${registroSeleccionado.usuario.telefono}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-[#007A33] hover:bg-green-100 border border-green-200 rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                      Llamar para Aclaración: {registroSeleccionado.usuario.telefono}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-medium inline-block">
                      📱 Sin teléfono registrado en perfil
                    </span>
                  )}
                </div>
              </div>

              {/* Comparativa Sutil: Sistema vs Chofer */}
              {registroSeleccionado.justificacion && (() => {
                const parsed = parsearJustificacion(registroSeleccionado.justificacion);
                if (!parsed) return null;

                return (
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                      
                      {/* Lado Izquierdo: Lo que detectó el Sistema / IA */}
                      <div className="space-y-2 pr-0 md:pr-3">
                        <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                          <span>🤖</span>
                          <span>Detectado por el Sistema (IA):</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {parsed.alertasFisicas.map((alerta, idx) => (
                            <span 
                              key={`fis-${idx}`} 
                              className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <span>🚨</span>
                              <span>
                                {alerta.includes('RENDIMIENTO')
                                  ? alerta.replace(/RENDIMIENTO_CRITICO_BAJO\s*/g, 'Rendimiento bajo ')
                                          .replace(/RENDIMIENTO_IMPOSIBLE_ALTO\s*/g, 'Rendimiento alto ')
                                  : alerta.includes('SOBRECARGA')
                                  ? 'Excede capacidad del tanque'
                                  : alerta}
                              </span>
                            </span>
                          ))}

                          {parsed.alertasAlteracion.map((alt, idx) => (
                            <span 
                              key={`alt-${idx}`} 
                              className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <span>✏️</span>
                              <span>{alt}</span>
                            </span>
                          ))}

                          {parsed.alertasIlegible.map((ile, idx) => (
                            <span 
                              key={`ile-${idx}`} 
                              className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <span>🔍</span>
                              <span>{ile}</span>
                            </span>
                          ))}

                          {parsed.alertasDiscrepancia.map((disc, idx) => (
                            <span 
                              key={`disc-${idx}`} 
                              className="px-2.5 py-1 bg-orange-50 text-orange-800 border border-orange-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <span>⚖️</span>
                              <span>{disc}</span>
                            </span>
                          ))}

                          {parsed.alertasFisicas.length === 0 && 
                           parsed.alertasAlteracion.length === 0 && 
                           parsed.alertasIlegible.length === 0 && 
                           parsed.alertasDiscrepancia.length === 0 && (
                            <span className="text-xs text-slate-400 italic">Sin alertas del sistema.</span>
                          )}
                        </div>
                      </div>

                      {/* Lado Derecho: Lo que declaró el Chofer */}
                      <div className="space-y-1.5 pt-3 md:pt-0 pl-0 md:pl-3">
                        <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                          <span>👤</span>
                          <span>Declaración del Chofer / Operador:</span>
                        </div>

                        {parsed.motivoAjusteManual ? (
                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-800">
                            {parsed.motivoAjusteManual.categoria && (
                              <span className="font-bold text-[#007A33] block mb-0.5">
                                {parsed.motivoAjusteManual.categoria}
                              </span>
                            )}
                            <p className="italic text-slate-700">
                              "{parsed.motivoAjusteManual.detalle || parsed.motivoAjusteManual.categoria}"
                            </p>
                          </div>
                        ) : parsed.notasExcedente ? (
                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-800">
                            <span className="font-bold text-slate-600 block mb-0.5">Excedente:</span>
                            <p className="italic text-slate-700">"{parsed.notasExcedente}"</p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic py-1">Sin notas del chofer.</p>
                        )}

                        {parsed.motivoRechazo && (
                          <div className="mt-1 text-xs bg-red-50 border border-red-200 text-red-800 rounded-lg p-2 font-medium">
                            <strong className="text-red-900">Rechazo anterior:</strong> {parsed.motivoRechazo}
                          </div>
                        )}
                        {parsed.corregidoSecretaria && (
                          <div className="mt-1 text-xs bg-green-50 border border-green-200 text-green-800 rounded-lg p-2 font-medium">
                            <strong className="text-green-900">Ajuste auditoría:</strong> {parsed.corregidoSecretaria}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* Cuadrícula Comparativa: Odómetro vs Ticket */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Lado Izquierdo: Odómetro */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <span className="font-extrabold text-sm text-slate-800">1. Tablero / Odómetro</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Lectura Física</span>
                  </div>
                  
                  {/* Cajas de comparación */}
                  <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">IA (PaddleOCR)</p>
                      <p className="font-mono text-sm text-slate-600">
                        {registroSeleccionado.kilometrajeOcr ? `${registroSeleccionado.kilometrajeOcr.toLocaleString()} KM` : 'No detectado'}
                      </p>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-[#007A33] uppercase tracking-widest mb-1">
                        {esModoEdicion ? 'Dato a Guardar' : 'Dato Registrado'}
                      </p>
                      {esModoEdicion ? (
                        <input 
                          type="number" 
                          value={editKilometraje}
                          onChange={e => setEditKilometraje(e.target.value)}
                          className="w-full font-black text-lg text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-[#007A33]"
                        />
                      ) : (
                        <p className="font-black text-lg text-slate-900">{registroSeleccionado.kilometraje.toLocaleString()} KM</p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900 flex-1 flex items-center justify-center min-h-[300px]">
                    {registroSeleccionado.rutaEvidenciaOdometro ? (
                      <div className="relative w-full h-full min-h-[300px] rounded-xl overflow-hidden shadow-inner">
                        <Image 
                          src={registroSeleccionado.rutaEvidenciaOdometro} 
                          alt="Odómetro" 
                          fill 
                          className="object-contain" 
                        />
                      </div>
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center">
                        <svg className="w-12 h-12 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-xs font-semibold">No se adjuntó foto del odómetro</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lado Derecho: Ticket */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <span className="font-extrabold text-sm text-slate-800">2. Ticket de Carga</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Comprobante</span>
                  </div>
                  
                  {/* Cajas de comparación */}
                  <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">IA (PaddleOCR)</p>
                      <p className="font-mono text-sm text-slate-600 mb-1">
                        {registroSeleccionado.litrosOcr ? `${registroSeleccionado.litrosOcr} L` : 'Litros: No detectado'}
                      </p>
                      <p className="font-mono text-sm text-slate-600">
                        {registroSeleccionado.costoOcr ? `$${registroSeleccionado.costoOcr}` : 'Total: No detectado'}
                      </p>
                    </div>
                    <div className="p-3 space-y-1.5">
                      <div>
                        <p className="text-[10px] font-bold text-[#007A33] uppercase tracking-widest mb-0.5">Litros</p>
                        {esModoEdicion ? (
                          <input 
                            type="number" 
                            value={editLitros}
                            onChange={e => setEditLitros(e.target.value)}
                            className="w-full font-black text-lg text-[#007A33] bg-white border border-slate-200 rounded-lg px-2 py-0.5 outline-none focus:border-[#007A33]"
                          />
                        ) : (
                          <p className="font-black text-lg text-[#007A33]">{registroSeleccionado.litrosCargados} L</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Importe Total</p>
                        {esModoEdicion ? (
                          <input 
                            type="number" 
                            value={editCosto}
                            onChange={e => setEditCosto(e.target.value)}
                            className="w-full font-bold text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-0.5 outline-none focus:border-[#007A33]"
                          />
                        ) : (
                          <p className="font-bold text-sm text-slate-800">${registroSeleccionado.costoTotal}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900 flex-1 flex items-center justify-center min-h-[300px]">
                    {registroSeleccionado.rutaEvidencia ? (
                      <div className="relative w-full h-full min-h-[300px] rounded-xl overflow-hidden shadow-inner">
                        <Image 
                          src={registroSeleccionado.rutaEvidencia} 
                          alt="Ticket" 
                          fill 
                          className="object-contain" 
                        />
                      </div>
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center">
                        <svg className="w-12 h-12 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-xs font-semibold">No se adjuntó foto del ticket</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Modal - Acciones */}
            <div className="p-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row gap-4 sm:justify-end items-center">
              {esModoEdicion ? (
                <>
                  <button 
                    onClick={() => setMostrarModalRechazo(true)}
                    disabled={accionEnProceso}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Rechazar (Fraude / Inválido)
                  </button>
                  
                  <button 
                    onClick={handleAprobar}
                    disabled={accionEnProceso}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-[#007A33] hover:bg-[#005c26] disabled:opacity-50 transition-all flex justify-center items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {editKilometraje !== String(registroSeleccionado.kilometraje) || editLitros !== String(registroSeleccionado.litrosCargados) || editCosto !== String(registroSeleccionado.costoTotal)
                      ? 'Guardar Corrección y Aprobar'
                      : 'Aprobar Carga Legítima'}
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setRegistroSeleccionado(null)}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cerrar Expediente
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* =======================================================
          SUB-MODAL: MOTIVO DE RECHAZO OBLIGATORIO
      ======================================================= */}
      {mostrarModalRechazo && registroSeleccionado && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="bg-red-600 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg">Rechazar Registro de Carga</h3>
                <p className="text-xs text-red-100">Vehículo: {registroSeleccionado.vehiculo.economico} ({registroSeleccionado.vehiculo.placas})</p>
              </div>
              <button onClick={() => setMostrarModalRechazo(false)} className="text-white hover:text-red-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Selecciona o escribe el motivo del rechazo. Este registro quedará archivado en la bitácora de auditoría y <strong>se revertirá el kilometraje del vehículo</strong> al último valor legítimo verificado.
              </p>

              {/* Atajos Rápidos */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Motivos Frecuentes</span>
                <div className="flex flex-wrap gap-2">
                  {motivosPredefinidos.map((motivo, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMotivoRechazoTexto(motivo)}
                      className={`text-left text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        motivoRechazoTexto === motivo
                          ? 'bg-red-50 border-red-300 text-red-700 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {motivo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Área de Texto Libre */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Detalle o Motivo Específico:</label>
                <textarea
                  value={motivoRechazoTexto}
                  onChange={e => setMotivoRechazoTexto(e.target.value)}
                  placeholder="Escribe el motivo detallado para el reporte de auditoría..."
                  rows={3}
                  className="w-full p-3 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
                />
              </div>

              {/* Botones de Confirmación */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalRechazo(false)}
                  className="py-3 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarRechazo}
                  disabled={accionEnProceso || !motivoRechazoTexto.trim()}
                  className="py-3 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-md flex justify-center items-center"
                >
                  {accionEnProceso ? 'Procesando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
