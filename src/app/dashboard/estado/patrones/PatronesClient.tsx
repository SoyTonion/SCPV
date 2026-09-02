"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Upload, Trash2, ImageOff, RefreshCw, ChevronDown, ChevronUp, Search, Camera } from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Vista = 'FRONTAL' | 'TRASERA' | 'LATERAL_IZQUIERDA' | 'LATERAL_DERECHA' | 'INTERIOR';

const VISTAS: Vista[] = ['FRONTAL', 'TRASERA', 'LATERAL_IZQUIERDA', 'LATERAL_DERECHA', 'INTERIOR'];
const LABEL_VISTA: Record<Vista, string> = {
  FRONTAL:           'Frontal',
  TRASERA:           'Trasera',
  LATERAL_IZQUIERDA: 'Lateral Izquierda',
  LATERAL_DERECHA:   'Lateral Derecha',
  INTERIOR:          'Interior',
};

type ImagenPatron = {
  id:        string;
  vista:     Vista;
  rutaImagen: string;
  creadoEn:  string;
  activo:    boolean;
};

type Vehiculo = {
  id:              string;
  economico:       string | null;
  marcaVehiculo:   string;
  submarcaVehiculo: string;
  placas:          string | null;
  patrones:        ImagenPatron[];
};

// ── Tarjeta de una vista ──────────────────────────────────────────────────────

function TarjetaVista({
  vehiculoId, vista, imagen, onCambio,
}: {
  vehiculoId: string;
  vista:      Vista;
  imagen:     ImagenPatron | null;
  onCambio:   () => void;
}) {
  const [subiendo,  setSubiendo]  = useState(false);
  const [borrando,  setBorrando]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const subir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    try {
      const form = new FormData();
      form.append('imagen',     file);
      form.append('vehiculoId', vehiculoId);
      form.append('vista',      vista);
      const res = await fetch('/api/imagenes-patron/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al subir');
      onCambio();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const borrar = async () => {
    if (!imagen) return;
    if (!confirm(`¿Eliminar la imagen patrón "${LABEL_VISTA[vista]}"? Esta acción no se puede deshacer.`)) return;
    setBorrando(true);
    try {
      const res = await fetch(`/api/imagenes-patron/${imagen.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al eliminar');
      onCambio();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar imagen');
    } finally {
      setBorrando(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col">
      {/* Imagen o placeholder */}
      <div className="relative aspect-video bg-slate-100 flex items-center justify-center">
        {imagen ? (
          <Image
            src={imagen.rutaImagen}
            alt={LABEL_VISTA[vista]}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-300">
            <ImageOff size={28} />
            <span className="text-xs">Sin imagen</span>
          </div>
        )}

        <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          imagen ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
        }`}>
          {imagen ? 'Registrada' : 'Pendiente'}
        </span>
      </div>

      {/* Footer */}
      <div className="p-2.5 flex flex-col gap-2">
        <div>
          <p className="text-xs font-bold text-slate-700">{LABEL_VISTA[vista]}</p>
          {imagen && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              {new Date(imagen.creadoEn).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Botón capturar con cámara — abre la pantalla de captura con el mismo encuadre */}
          <a
            href={`/dashboard/estado/patrones/captura/${vehiculoId}/${vista}`}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            title="Capturar con cámara"
          >
            <Camera size={12} />
            Capturar
          </a>

          {/* Botón subir archivo */}
          <label
            className={`flex items-center justify-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
              subiendo
                ? 'bg-slate-200 text-slate-400 cursor-wait'
                : 'bg-[#007A33] hover:bg-[#005c26] text-white'
            }`}
            title="Subir archivo"
          >
            {subiendo ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={subir}
              disabled={subiendo}
            />
          </label>

          {/* Botón borrar */}
          {imagen && (
            <button
              onClick={borrar}
              disabled={borrando}
              title="Eliminar"
              className="flex items-center justify-center p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {borrando ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Fila de vehículo expandible ───────────────────────────────────────────────

function FilaVehiculo({ vehiculo }: { vehiculo: Vehiculo }) {
  const [expandido, setExpandido]   = useState(false);
  const [patrones,  setPatrones]    = useState<ImagenPatron[]>(vehiculo.patrones);
  const [cargando,  setCargando]    = useState(false);

  const recargarPatrones = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/imagenes-patron?vehiculoId=${vehiculo.id}`);
      if (res.ok) setPatrones(await res.json());
    } finally {
      setCargando(false);
    }
  }, [vehiculo.id]);

  const completadas = VISTAS.filter(v => patrones.some(p => p.vista === v)).length;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Cabecera del vehículo */}
      <button
        onClick={() => setExpandido(e => !e)}
        className="w-full flex items-center gap-4 px-4 py-3.5 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        {/* Progreso visual */}
        <div className="shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-extrabold
          border-[#007A33] text-[#007A33]">
          {completadas}/{VISTAS.length}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">
            {vehiculo.marcaVehiculo} {vehiculo.submarcaVehiculo}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {vehiculo.placas ?? 'S/P'}
            </span>
            <span className="text-[10px] text-slate-400">·</span>
            <span className="text-[10px] text-slate-500">
              Eco: {vehiculo.economico ?? '—'}
            </span>
            {/* Mini barra de progreso */}
            <div className="flex-1 max-w-20 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#007A33] rounded-full transition-all"
                style={{ width: `${(completadas / VISTAS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {cargando
          ? <RefreshCw size={16} className="text-slate-400 animate-spin shrink-0" />
          : expandido
            ? <ChevronUp size={16} className="text-slate-400 shrink-0" />
            : <ChevronDown size={16} className="text-slate-400 shrink-0" />
        }
      </button>

      {/* Grid de vistas */}
      {expandido && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {VISTAS.map(vista => (
            <TarjetaVista
              key={vista}
              vehiculoId={vehiculo.id}
              vista={vista}
              imagen={patrones.find(p => p.vista === vista) ?? null}
              onCambio={recargarPatrones}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PatronesClient({ vehiculosIniciales }: { vehiculosIniciales: Vehiculo[] }) {
  const [vehiculos, setVehiculos]   = useState<Vehiculo[]>(vehiculosIniciales);
  const [busqueda, setBusqueda]     = useState('');
  const [filtro,   setFiltro]       = useState<'todos' | 'completos' | 'incompletos'>('todos');

  const filtrados = vehiculos.filter(v => {
    const texto = busqueda.toLowerCase();
    const coincide = (
      v.economico?.toLowerCase().includes(texto) ||
      v.placas?.toLowerCase().includes(texto) ||
      v.marcaVehiculo.toLowerCase().includes(texto) ||
      v.submarcaVehiculo.toLowerCase().includes(texto)
    );
    if (!coincide) return false;

    const completadas = VISTAS.filter(vista => v.patrones.some(p => p.vista === vista)).length;
    if (filtro === 'completos')   return completadas === VISTAS.length;
    if (filtro === 'incompletos') return completadas < VISTAS.length;
    return true;
  });

  const stats = {
    total:       vehiculos.length,
    completos:   vehiculos.filter(v => VISTAS.every(vista => v.patrones.some(p => p.vista === vista))).length,
    incompletos: vehiculos.filter(v => !VISTAS.every(vista => v.patrones.some(p => p.vista === vista))).length,
  };

  return (
    <div className="space-y-5">

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total vehículos', valor: stats.total,       color: 'border-l-slate-500' },
          { label: 'Con patrones completos', valor: stats.completos,   color: 'border-l-green-500' },
          { label: 'Con patrones incompletos', valor: stats.incompletos, color: 'border-l-amber-500' },
        ].map(({ label, valor, color }) => (
          <div key={label} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${color} px-4 py-3 shadow-sm`}>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-2xl font-extrabold text-slate-800">{valor}</p>
          </div>
        ))}
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por económico, placas o marca..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-[#007A33] focus:ring-2 focus:ring-[#007A33]/20 bg-white"
          />
        </div>
        <div className="flex gap-2">
          {(['todos', 'completos', 'incompletos'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors capitalize ${
                filtro === f
                  ? 'bg-[#007A33] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-[#007A33]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de vehículos */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-12 flex flex-col items-center text-slate-400 gap-2">
          <ImageOff size={32} />
          <p className="text-sm font-medium">No se encontraron vehículos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(v => <FilaVehiculo key={v.id} vehiculo={v} />)}
        </div>
      )}
    </div>
  );
}
