"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Html5QrcodeScanner } from 'html5-qrcode';

import { marcoConfig, capturarFotoEstandar, obtenerMarco43, INSTRUCCION_VISTA, Vista } from '@/lib/inspeccion-config';

type VehiculoData = {
  id: string;
  economico: string | null;
  marcaVehiculo: string;
  submarcaVehiculo: string;
  placas: string | null;
};

type ResultadoComparacion = {
  similitud:      number;
  estado:         'NORMAL' | 'ADVERTENCIA' | 'CRITICO';
  hallazgos:      { componente: string; tipo: string; confianza: number; esManual?: boolean }[];
  componentes?:   { componente: string; label: string; estado: string; ssim: number; confianza: number }[];
  imagen_patron:  string;  // base64 JPEG — patrón con ROIs dibujados
  imagen_captura: string;  // base64 JPEG — captura con ROIs dibujados
  debug?: {
    alineacion_ok:       boolean;
    motivo:              string;
    matches_orb:         number;
    inliers:             number;
    reproj_error_px:     number;
    cobertura_mascara?:  number;
    score_histograma?:   number;
    score_matches?:      number;
    score_bordes?:       number;
    score_ssim?:         number;
  };
};

// Mapa de rutas de imagen patrón por vista — se carga al identificar el vehículo
type PatronesMap = Partial<Record<Vista, string>>;

const vistas: { label: string; vista: Vista }[] = [
  { label: 'Frontal',           vista: 'FRONTAL'           },
  { label: 'Trasera',           vista: 'TRASERA'           },
  { label: 'Lateral Izquierda', vista: 'LATERAL_IZQUIERDA' },
  { label: 'Lateral Derecha',   vista: 'LATERAL_DERECHA'   },
  { label: 'Interior',          vista: 'INTERIOR'          },
];

// ── OVERLAY DE PATRÓN DE REFERENCIA ──────────────────────────────────────────
// Dibuja la imagen patrón de referencia adaptada exactamente al marco de captura
// NUNCA recorta laterales ni extremos del vehículo (faros, espejos y defensas visibles).
function OverlayPatron({
  src,
  vista,
  rect,
}: {
  src: string;
  vista: Vista;
  rect: { x: number; y: number; w: number; h: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const cw = canvas.offsetWidth || 640;
      const ch = canvas.offsetHeight || 480;

      canvas.width = cw;
      canvas.height = ch;
      ctx.clearRect(0, 0, cw, ch);

      const destX = (rect.x / 100) * cw;
      const destY = (rect.y / 100) * ch;
      const destW = (rect.w / 100) * cw;
      const destH = (rect.h / 100) * ch;

      const imgRatio = img.naturalWidth / img.naturalHeight;
      const rectRatio = destW / destH;

      // NUNCA recortar la imagen de referencia: usar contain adaptativo
      // para mostrar el 100% del vehículo (incluyendo espejos y faros).
      let drawW = destW;
      let drawH = destH;
      let drawX = destX;
      let drawY = destY;

      if (Math.abs(imgRatio - rectRatio) > 0.01) {
        if (imgRatio > rectRatio) {
          // Si la imagen es más ancha que el marco, ajustamos el alto para no cortar laterales
          drawH = destW / imgRatio;
          drawY = destY + (destH - drawH) / 2;
        } else {
          // Si es más alta, ajustamos el ancho para no cortar arriba/abajo
          drawW = destH * imgRatio;
          drawX = destX + (destW - drawW) / 2;
        }
      }

      ctx.globalAlpha = 0.45;
      // Dibujar la imagen completa (sin descartar ningún píxel original)
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, drawX, drawY, drawW, drawH);
    };
    img.src = src;
  }, [src, vista, rect]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: 'luminosity' }}
    />
  );
}

// ── SLIDER DE COMPARACIÓN PATRÓN / CAPTURA ───────────────────────────────────
function SliderComparacion({ patron, captura }: { patron: string; captura: string }) {
  const [pos, setPos]         = useState(50);   // 0–100 %
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const actualizar = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  }, []);

  // Mouse
  const onMouseDown = (e: React.MouseEvent) => { setDragging(true); actualizar(e.clientX); };
  const onMouseMove = useCallback((e: MouseEvent) => { if (dragging) actualizar(e.clientX); }, [dragging, actualizar]);
  const onMouseUp   = useCallback(() => setDragging(false), []);

  // Touch
  const onTouchStart = (e: React.TouchEvent) => { setDragging(true); actualizar(e.touches[0].clientX); };
  const onTouchMove  = useCallback((e: TouchEvent) => { if (dragging) actualizar(e.touches[0].clientX); }, [dragging, actualizar]);
  const onTouchEnd   = useCallback(() => setDragging(false), []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend',  onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend',  onTouchEnd);
    };
  }, [onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm select-none cursor-col-resize bg-slate-950"
      style={{ aspectRatio: '4/3' }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Imagen captura — capa base completa */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/jpeg;base64,${captura}`}
        alt="Captura"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        draggable={false}
      />

      {/* Imagen patrón — recortada limpiamente con clip-path según la posición del slider */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/jpeg;base64,${patron}`}
        alt="Patrón"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />

      {/* Línea divisora */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)] pointer-events-none"
        style={{ left: `${pos}%` }}
      />

      {/* Handle circular */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-slate-300 flex items-center justify-center pointer-events-none"
        style={{ left: `${pos}%` }}
      >
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l-3 3 3 3M16 9l3 3-3 3" />
        </svg>
      </div>

      {/* Labels */}
      <span className="absolute top-2 left-2 text-[10px] font-extrabold text-white bg-[#007A33]/90 px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none shadow">
        PATRÓN
      </span>
      <span className="absolute top-2 right-2 text-[10px] font-extrabold text-white bg-slate-800/90 px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none shadow">
        CAPTURA
      </span>
    </div>
  );
}
function PantallaResultado({
  resultado, vista, vehiculo, onNuevaCaptura, onSiguiente,
}: {
  resultado: ResultadoComparacion;
  vista: Vista;
  vehiculo: VehiculoData;
  onNuevaCaptura: () => void;
  onSiguiente: () => void;
}) {
  const pct   = Math.round(resultado.similitud * 100);
  const label = vistas.find(v => v.vista === vista)?.label ?? vista;

  const [hallazgos,     setHallazgos]     = useState(resultado.hallazgos.map(h => ({ ...h, esManual: h.esManual ?? false })));
  const [observaciones, setObservaciones] = useState('');
  const [guardando,     setGuardando]     = useState(false);
  const [mostrarForm,   setMostrarForm]   = useState(false);
  const [nComponente,   setNComponente]   = useState('PUERTA');
  const [nTipo,         setNTipo]         = useState('DETERIORADO');
  const [guardadoOk,    setGuardadoOk]    = useState(false);

  const COMPONENTES = ['LOGO_FRONTAL','LOGO_TRASERO','CALCOMANIA','NUMERO_ECONOMICO',
    'FARO_IZQUIERDO','FARO_DERECHO','ESPEJO_IZQUIERDO','ESPEJO_DERECHO','DEFENSA','PUERTA','OTRO'];
  const TIPOS = ['AUSENTE','BORROSO','DETERIORADO','DEFORMADO','DIFERENCIA_VISUAL','BAJA_SIMILITUD','OTRO'];

  // Labels legibles para componentes
  const labelComp: Record<string, string> = {
    LOGO_FRONTAL:'Logo Frontal', LOGO_TRASERO:'Logo Trasero', CALCOMANIA:'Calcomanía',
    NUMERO_ECONOMICO:'No. Económico', FARO_IZQUIERDO:'Faro Izq.', FARO_DERECHO:'Faro Der.',
    ESPEJO_IZQUIERDO:'Espejo Izq.', ESPEJO_DERECHO:'Espejo Der.',
    DEFENSA:'Defensa', PUERTA:'Puerta', OTRO:'Otro',
  };
  const labelTipo: Record<string, string> = {
    AUSENTE:'Ausente', BORROSO:'Borroso', DETERIORADO:'Deteriorado',
    DEFORMADO:'Deformado', DIFERENCIA_VISUAL:'Dif. Visual',
    BAJA_SIMILITUD:'Baja Similitud', OTRO:'Otro',
  };

  const colorTipo = (tipo: string) => {
    const map: Record<string, string> = {
      AUSENTE:           'bg-red-100    text-red-800    border-red-300',
      DEFORMADO:         'bg-red-100    text-red-800    border-red-300',
      BORROSO:           'bg-amber-100  text-amber-800  border-amber-300',
      DETERIORADO:       'bg-amber-100  text-amber-800  border-amber-300',
      DIFERENCIA_VISUAL: 'bg-slate-100  text-slate-700  border-slate-300',
      BAJA_SIMILITUD:    'bg-slate-100  text-slate-700  border-slate-300',
    };
    return map[tipo] ?? 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const colorEstado = {
    NORMAL:      { wrap: 'bg-[#007A33]/5  border-[#007A33]/30', text: 'text-[#007A33]',  badge: 'bg-[#007A33]/10  text-[#007A33]' },
    ADVERTENCIA: { wrap: 'bg-amber-50     border-amber-200',    text: 'text-amber-700',  badge: 'bg-amber-100    text-amber-800' },
    CRITICO:     { wrap: 'bg-red-50       border-red-200',      text: 'text-red-700',    badge: 'bg-red-100      text-red-800' },
  }[resultado.estado];

  const eliminarHallazgo = (i: number) => setHallazgos(p => p.filter((_, j) => j !== i));

  const agregarHallazgo = () => {
    setHallazgos(p => [...p, { componente: nComponente, tipo: nTipo, confianza: 1, esManual: true }]);
    setMostrarForm(false);
  };

  const guardarYValidar = async () => {
    setGuardando(true);
    try {
      const estadoFinal = hallazgos.length === 0
        ? 'NORMAL'
        : resultado.estado === 'NORMAL' ? 'ADVERTENCIA' : resultado.estado;

      const res = await fetch('/api/inspecciones', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculoId:    vehiculo.id,
          estadoGeneral: estadoFinal,
          observaciones,
          fotografias: [{ vista, rutaImagen: 'ruta/procesada.jpg' }],
          hallazgos,
        }),
      });
      if (!res.ok) throw new Error('Fallo al guardar');
      setGuardadoOk(true);
      setTimeout(() => { setGuardadoOk(false); onSiguiente(); }, 1800);
    } catch (err) {
      console.error(err);
      alert('Error al intentar guardar la validación.');
    } finally {
      setGuardando(false);
    }
  };

  // ── ESTADO: guardado exitoso ────────────────────────────────────────────────
  if (guardadoOk) {
    return (
      <div className="p-4 w-full max-w-md mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#007A33]" />
          <div className="w-14 h-14 mt-4 mb-4 rounded-full bg-[#007A33] flex items-center justify-center shadow-lg ring-4 ring-[#007A33]/10">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-extrabold text-slate-800">Inspección guardada</p>
          <p className="text-xs text-slate-500 mt-1">Validada por el inspector</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 w-full max-w-md mx-auto pb-8">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#007A33]" />

        {/* Cabecera */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <h1 className="text-lg font-extrabold text-slate-800 text-center tracking-tight">
            Validación — {label}
          </h1>
          <p className="text-xs text-slate-500 text-center mt-0.5">
            {vehiculo.marcaVehiculo} {vehiculo.submarcaVehiculo} · {vehiculo.placas ?? 'S/P'}
          </p>
        </div>

        <div className="p-5 space-y-5">

          {/* Badge de estado IA */}
          <div className={`rounded-xl px-4 py-3 border flex items-center justify-between ${colorEstado.wrap}`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-extrabold uppercase tracking-wide ${colorEstado.text}`}>
                {resultado.estado}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">— Sugerencia IA</span>
            </div>
            <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${colorEstado.badge}`}>
              {pct}%
            </span>
          </div>

          {/* Slider de comparación patrón / captura */}
          {resultado.imagen_patron && resultado.imagen_captura && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Comparación — arrastra para ver patrón vs captura
              </p>
              <SliderComparacion
                patron={resultado.imagen_patron}
                captura={resultado.imagen_captura}
              />
            </div>
          )}

          {/* Debug compacto (scores individuales) */}
          {resultado.debug && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-3 py-2.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                {[
                  ['Histograma HSV',  resultado.debug.score_histograma],
                  ['Matches SIFT',    resultado.debug.score_matches],
                  ['Bordes Canny',    resultado.debug.score_bordes],
                  ['SSIM interior',   resultado.debug.score_ssim],
                ].filter(([, v]) => v !== undefined).map(([k, v]) => (
                  <React.Fragment key={k as string}>
                    <span className="text-slate-400">{k as string}</span>
                    <span className="font-mono font-bold text-slate-600">
                      {Math.round((v as number) * 100)}%
                    </span>
                  </React.Fragment>
                ))}
              </div>
              {resultado.debug.cobertura_mascara !== undefined && (
                <p className={`text-[10px] font-mono mt-1.5 pt-1.5 border-t border-slate-200 ${
                  resultado.debug.cobertura_mascara < 0.25 ? 'text-amber-600' : 'text-slate-400'
                }`}>
                  Cobertura máscara: {Math.round(resultado.debug.cobertura_mascara * 100)}%
                  {resultado.debug.cobertura_mascara < 0.25 ? ' · foto más cercana mejora la precisión' : ''}
                </p>
              )}
            </div>
          )}

          {/* Hallazgos editables */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Hallazgos ({hallazgos.length})
              </p>
              <button
                onClick={() => setMostrarForm(v => !v)}
                className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                  mostrarForm
                    ? 'bg-slate-200 text-slate-600'
                    : 'bg-[#007A33]/10 text-[#007A33] hover:bg-[#007A33]/20'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                    d={mostrarForm ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'} />
                </svg>
                {mostrarForm ? 'Cancelar' : 'Añadir'}
              </button>
            </div>

            {/* Formulario inline para hallazgo manual */}
            {mostrarForm && (
              <div className="mb-3 p-3 border border-[#007A33]/20 bg-[#007A33]/5 rounded-xl flex flex-col gap-2">
                <select
                  value={nComponente}
                  onChange={e => setNComponente(e.target.value)}
                  className="text-xs p-2 rounded-lg border border-slate-300 bg-white outline-none focus:border-[#007A33] focus:ring-1 focus:ring-[#007A33]"
                >
                  {COMPONENTES.map(c => (
                    <option key={c} value={c}>{labelComp[c] ?? c}</option>
                  ))}
                </select>
                <select
                  value={nTipo}
                  onChange={e => setNTipo(e.target.value)}
                  className="text-xs p-2 rounded-lg border border-slate-300 bg-white outline-none focus:border-[#007A33] focus:ring-1 focus:ring-[#007A33]"
                >
                  {TIPOS.map(t => (
                    <option key={t} value={t}>{labelTipo[t] ?? t}</option>
                  ))}
                </select>
                <button
                  onClick={agregarHallazgo}
                  className="bg-[#007A33] hover:bg-[#005c26] text-white text-xs font-bold py-2 rounded-lg transition-colors"
                >
                  Confirmar hallazgo
                </button>
              </div>
            )}

            {/* Lista de hallazgos */}
            <div className="space-y-2">
              {hallazgos.length === 0 ? (
                <div className="flex flex-col items-center py-4 text-slate-400 gap-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-medium">Sin daños registrados</p>
                </div>
              ) : (
                hallazgos.map((h, i) => (
                  <div key={i}
                    className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {labelComp[h.componente] ?? h.componente}
                      </span>
                      <span className={`shrink-0 text-[10px] font-bold border px-1.5 py-0.5 rounded-full ${colorTipo(h.tipo)}`}>
                        {labelTipo[h.tipo] ?? h.tipo}
                      </span>
                      {h.esManual && (
                        <span className="shrink-0 text-[9px] font-bold text-[#007A33] bg-[#007A33]/10 px-1.5 py-0.5 rounded-full">
                          Manual
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => eliminarHallazgo(i)}
                      className="shrink-0 ml-2 p-1 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Eliminar hallazgo"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <p className="text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Observaciones del inspector
            </p>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Nota adicional (opcional)..."
              className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-[#007A33] focus:border-[#007A33] outline-none h-20 resize-none transition-colors"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onNuevaCaptura}
              disabled={guardando}
              className="flex-1 border-2 border-slate-200 hover:border-[#007A33] text-slate-600 hover:text-[#007A33] font-bold rounded-xl py-3.5 text-sm transition-colors disabled:opacity-50"
            >
              Re-capturar
            </button>
            <button
              onClick={guardarYValidar}
              disabled={guardando}
              className="flex-1 bg-[#007A33] hover:bg-[#005c26] disabled:bg-slate-400 text-white font-extrabold rounded-xl py-3.5 text-sm transition-colors shadow-md flex items-center justify-center gap-2"
            >
              {guardando ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </>
              ) : 'Validar y Guardar'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function EstadoPage() {

  const [fase, setFase]           = useState<'escaner' | 'menu' | 'camara' | 'resultado'>('escaner');
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [buscandoQR, setBuscandoQR]         = useState(false);
  const [vehiculo, setVehiculo]             = useState<VehiculoData | null>(null);
  const [patrones, setPatrones]             = useState<PatronesMap>({});
  const [vistaActiva, setVistaActiva]       = useState<Vista>('FRONTAL');
  const [enviando, setEnviando]             = useState(false);
  const [resultado, setResultado]           = useState<ResultadoComparacion | null>(null);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Canvas oculto para capturar el frame del video
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contenedorCamaraRef = useRef<HTMLDivElement>(null);
  const [marcoRect, setMarcoRect] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 4, y: 25, w: 92, h: 50,
  });

  const actualizarMarco = useCallback(() => {
    if (!contenedorCamaraRef.current) return;
    const { clientWidth, clientHeight } = contenedorCamaraRef.current;
    if (clientWidth > 0 && clientHeight > 0) {
      setMarcoRect(obtenerMarco43(clientWidth, clientHeight));
    }
  }, []);

  // ResizeObserver sobre el contenedor del video — se dispara en cualquier cambio
  // de tamaño del elemento, incluyendo rotación de dispositivo, split-screen y
  // cambios de barra de dirección en Safari iOS. Más fiable que window 'resize'
  // que en móvil puede llegar antes de que el layout termine de recalcularse.
  useEffect(() => {
    if (fase !== 'camara') return;
    const el = contenedorCamaraRef.current;
    if (!el) return;

    // Calcular inmediatamente al montar
    actualizarMarco();

    const observer = new ResizeObserver(() => {
      // Usar requestAnimationFrame para leer el tamaño después de que el
      // navegador termine el layout, evitando lecturas intermedias incorrectas
      requestAnimationFrame(actualizarMarco);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [fase, actualizarMarco]);

  const iniciarCamara = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  }, []);

  const detenerCamara = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (fase === 'camara') {
      iniciarCamara();
      const t = setTimeout(actualizarMarco, 60);
      window.addEventListener('resize', actualizarMarco);
      return () => {
        clearTimeout(t);
        window.removeEventListener('resize', actualizarMarco);
        detenerCamara();
      };
    } else {
      detenerCamara();
    }
  }, [fase, iniciarCamara, detenerCamara, actualizarMarco]);

  // Captura el área del marco del video con resolución estándar fija 1280×960 (4:3) y la envía a la API.
  const capturarYEnviar = useCallback(async () => {
    if (!videoRef.current || !vehiculo) return;
    setEnviando(true);

    try {
      const video = videoRef.current;
      const contenedor = contenedorCamaraRef.current;

      const blob = await capturarFotoEstandar(video, contenedor, marcoRect, canvasRef.current);

      const form = new FormData();
      form.append('foto',       blob, 'captura.jpg');
      form.append('vehiculoId', vehiculo.id);
      form.append('vista',      vistaActiva);

      const resp = await fetch('/api/inspecciones/comparar', { method: 'POST', body: form });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Error desconocido' }));
        alert(err.error ?? 'Error al comparar la imagen.');
        return;
      }

      const data: ResultadoComparacion = await resp.json();
      setResultado(data);
      setFase('resultado');

    } catch (err) {
      console.error(err);
      alert('Error al procesar la captura.');
    } finally {
      setEnviando(false);
    }
  }, [vehiculo, vistaActiva]);

  // ── QR scanner ──────────────────────────────────────────────────────────────
  const procesarQR = async (token: string) => {
    setBuscandoQR(true);
    try {
      const res = await fetch(`/api/vehiculos/${token}`);
      if (!res.ok) { alert('⚠️ Código QR inválido o vehículo no encontrado.'); return; }
      const data: VehiculoData = await res.json();
      setVehiculo(data);

      // Cargar imágenes patrón del vehículo para el overlay de la cámara
      const resPatrones = await fetch(`/api/imagenes-patron?vehiculoId=${data.id}`);
      if (resPatrones.ok) {
        const lista: { vista: Vista; rutaImagen: string }[] = await resPatrones.json();
        const map: PatronesMap = {};
        lista.forEach(p => { map[p.vista] = p.rutaImagen; });
        setPatrones(map);
      }

      setFase('menu');
    } catch { alert('Error de conexión con el servidor.'); }
    finally { setBuscandoQR(false); }
  };

  useEffect(() => {
    if (!mostrarEscaner) return;
    const scanner = new Html5QrcodeScanner('lector-qr-estado', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render(async (texto) => { scanner.clear(); setMostrarEscaner(false); await procesarQR(texto); }, () => {});
    return () => { scanner.clear().catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarEscaner]);

  // ── FASE RESULTADO ───────────────────────────────────────────────────────────
  if (fase === 'resultado' && resultado && vehiculo) {
    return (
      <PantallaResultado
        resultado={resultado}
        vista={vistaActiva}
        vehiculo={vehiculo}
        onNuevaCaptura={() => { setResultado(null); setFase('camara'); }}
        onSiguiente={() => { setResultado(null); setFase('menu'); }}
      />
    );
  }

  // ── FASE CÁMARA ──────────────────────────────────────────────────────────────
  if (fase === 'camara') {
    const labelActiva = vistas.find(v => v.vista === vistaActiva)?.label ?? '';

    return createPortal(
      <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 9999 }}>

        {/* Canvas oculto para captura de frame */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Barra superior */}
        <div className="relative z-10 flex items-center justify-between px-4 pb-2 shrink-0"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <button onClick={() => setFase('menu')}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-semibold bg-black/30 hover:bg-black/50 px-3 py-1.5 rounded-full transition-all backdrop-blur-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <span className="text-white font-extrabold text-sm bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm tracking-wide">
            {labelActiva}
          </span>
        </div>

        {/* Área del video + overlay de imagen patrón */}
        <div ref={contenedorCamaraRef} className="relative flex-1 overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

          {/* Overlay: referencia exacta de la imagen patrón completa sin recortes */}
          {patrones[vistaActiva]
            ? <OverlayPatron src={patrones[vistaActiva]!} vista={vistaActiva} rect={marcoRect} />
            : null
          }

          {/* Esquinas guía siempre visibles para delimitar el área de captura con aspect-ratio 4:3 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Oscurecer zona fuera del marco */}
            <path fillRule="evenodd" fill="rgba(0,0,0,0.38)"
              d={`M0,0 H100 V100 H0 Z M${marcoRect.x},${marcoRect.y} H${marcoRect.x + marcoRect.w} V${marcoRect.y + marcoRect.h} H${marcoRect.x} Z`} />
            {/* Esquinas verdes guía */}
            {([[marcoRect.x, marcoRect.y, 1, 0, 0, 1],
               [marcoRect.x + marcoRect.w, marcoRect.y, -1, 0, 0, 1],
               [marcoRect.x, marcoRect.y + marcoRect.h, 1, 0, 0, -1],
               [marcoRect.x + marcoRect.w, marcoRect.y + marcoRect.h, -1, 0, 0, -1]] as number[][]).map(([cx, cy, dx1, , dx2, dy2], i) => (
              <g key={i} stroke="#00E05A" strokeWidth="1.5" strokeLinecap="round">
                <line x1={cx} y1={cy} x2={cx + dx1 * 7} y2={cy} />
                <line x1={cx} y1={cy} x2={cx + dx2 * 7} y2={cy + dy2 * 7} />
              </g>
            ))}
            {/* Instrucción */}
            <text x="50" y="97" textAnchor="middle" fill="white" fontSize="3.2" fontWeight="bold"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
              {INSTRUCCION_VISTA[vistaActiva]}
            </text>
          </svg>

          {/* Overlay de "enviando" */}
          {enviando && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
              <svg className="animate-spin h-10 w-10 text-white mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-white font-bold text-sm">Analizando imagen...</p>
            </div>
          )}
        </div>

        {/* Barra inferior */}
        <div className="relative z-10 shrink-0 px-4 pt-3 bg-black/70 backdrop-blur-sm"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>

          {/* Selector de vista */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide snap-x snap-mandatory">
            {vistas.map(({ label, vista }) => (
              <button key={vista} onClick={() => setVistaActiva(vista)}
                className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  vistaActiva === vista
                    ? 'bg-[#007A33] text-white shadow-lg'
                    : 'bg-white/10 text-white/70 active:bg-white/20'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Botón de captura */}
          <button
            onClick={capturarYEnviar}
            disabled={enviando}
            className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-white text-slate-800 font-extrabold rounded-2xl py-4 shadow-xl text-sm active:scale-95 transition-transform disabled:opacity-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {enviando ? 'Analizando...' : 'Capturar y analizar'}
          </button>
        </div>

      </div>,
      document.body
    );
  }

  // ── FASE ESCANER QR ──────────────────────────────────────────────────────────
  if (fase === 'escaner') {
    return (
      <div className="p-4 w-full max-w-md mx-auto">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#007A33]" />
          <Link href="/operacion" className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#007A33] transition-colors mt-2 mb-4 w-fit">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </Link>
          <h1 className="text-xl font-extrabold text-slate-800 mb-1 text-center tracking-tight">
            Inspección de Estado Físico
          </h1>
          <p className="text-xs text-slate-500 mb-6 text-center font-medium">
            Escanea el código QR del vehículo para comenzar
          </p>

          {mostrarEscaner && createPortal(
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-[#007A33] text-sm">Enfoca el código QR</span>
                  <button onClick={() => setMostrarEscaner(false)} className="text-red-500 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded-md">Cancelar</button>
                </div>
                <div id="lector-qr-estado" className="w-full overflow-hidden rounded-lg shadow-sm border border-slate-200" />
              </div>
            </div>,
            document.body
          )}

          <button type="button" onClick={() => setMostrarEscaner(true)} disabled={buscandoQR}
            className="w-full border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-[#007A33]/5 hover:border-[#007A33]/50 text-slate-500 hover:text-[#007A33] rounded-xl p-6 flex flex-col items-center justify-center transition-all group">
            {buscandoQR
              ? <svg className="animate-spin h-7 w-7 text-[#007A33] mb-1.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              : <svg className="h-8 w-8 mb-2 text-slate-400 group-hover:text-[#007A33] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            }
            <span className="text-sm font-semibold">{buscandoQR ? 'Buscando vehículo...' : 'Escanear Código QR'}</span>
          </button>
        </div>
      </div>
    );
  }

  // ── FASE MENÚ DE INSPECCIÓN ──────────────────────────────────────────────────
  return (
    <div className="p-4 w-full max-w-md mx-auto">
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#007A33]" />
        <Link href="/operacion" className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#007A33] transition-colors mt-2 mb-4 w-fit">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </Link>
        <h1 className="text-xl font-extrabold text-slate-800 mb-1 text-center tracking-tight">
          Inspección de Estado Físico
        </h1>
        <p className="text-xs text-slate-500 mb-5 text-center font-medium">Selecciona el ángulo a fotografiar</p>

        {/* Tarjeta del vehículo */}
        <div className="bg-[#007A33]/5 border border-[#007A33]/20 rounded-xl p-3.5 flex justify-between items-center shadow-sm mb-5">
          <div className="flex items-center gap-3 w-full">
            <div className="bg-white p-2 rounded-full shadow-sm text-[#007A33] border border-[#007A33]/10 shrink-0">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
              </svg>
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <p className="font-extrabold text-slate-800 text-sm leading-tight truncate">
                {vehiculo?.marcaVehiculo} {vehiculo?.submarcaVehiculo}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border border-[#007A33]/20 shadow-sm rounded-md px-1.5 py-0.5">
                  <span className="text-[10px] font-mono font-bold text-slate-700">{vehiculo?.placas ?? 'S/P'}</span>
                </div>
                <div className="flex items-center bg-[#007A33]/10 border border-[#007A33]/20 rounded-md px-1.5 py-0.5">
                  <span className="text-[10px] font-bold text-[#007A33] uppercase">Eco: {vehiculo?.economico ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => { setVehiculo(null); setFase('escaner'); }}
            className="text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 p-1.5 rounded-full transition-colors border border-slate-200 shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cuadrícula de ángulos */}
        <div className="grid grid-cols-2 gap-3">
          {vistas.map(({ label, vista }) => (
            <button key={vista} onClick={() => { setVistaActiva(vista); setFase('camara'); }}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-slate-200 hover:border-[#007A33] hover:bg-[#007A33]/5 rounded-xl p-4 transition-colors text-slate-600 hover:text-[#007A33] ${vista === 'INTERIOR' ? 'col-span-2' : ''}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}