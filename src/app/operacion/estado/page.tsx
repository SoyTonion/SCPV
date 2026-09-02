"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Html5QrcodeScanner } from 'html5-qrcode';

type VehiculoData = {
  id: string;
  economico: string | null;
  marcaVehiculo: string;
  submarcaVehiculo: string;
  placas: string | null;
};

type Vista = 'FRONTAL' | 'TRASERA' | 'LATERAL_IZQUIERDA' | 'LATERAL_DERECHA' | 'INTERIOR';

type ResultadoComparacion = {
  similitud:   number;
  estado:      'NORMAL' | 'ADVERTENCIA' | 'CRITICO';
  hallazgos:   { componente: string; tipo: string; confianza: number }[];
  imagen_diff: string;
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

// ── MARCOS SVG ───────────────────────────────────────────────────────────────
// Las proporciones de cada rect reflejan la forma real del vehículo en cada ángulo,
// basadas en las fotos patrón disponibles (Silverado cabina sencilla).
// El canvas de captura recorta exactamente esta región antes de enviar a OpenCV.
const marcoConfig: Record<Vista, { rect: { x: number; y: number; w: number; h: number }; instruccion: string }> = {
  // Frontal: casi cuadrado, el vehículo llena de lado a lado
  FRONTAL: {
    rect: { x: 5, y: 8, w: 90, h: 78 },
    instruccion: 'Centra el frente del vehículo',
  },
  // Trasera: igual que frontal
  TRASERA: {
    rect: { x: 5, y: 8, w: 90, h: 78 },
    instruccion: 'Centra la parte trasera del vehículo',
  },
  // Lateral: muy ancho y bajo — el costado es un rectángulo apaisado
  LATERAL_IZQUIERDA: {
    rect: { x: 2, y: 22, w: 96, h: 52 },
    instruccion: 'Alinea el costado completo del vehículo',
  },
  LATERAL_DERECHA: {
    rect: { x: 2, y: 22, w: 96, h: 52 },
    instruccion: 'Alinea el costado completo del vehículo',
  },
  // Interior: cuadrado, habitáculo desde la puerta
  INTERIOR: {
    rect: { x: 8, y: 12, w: 84, h: 72 },
    instruccion: 'Enfoca el habitáculo',
  },
};

// ── OVERLAY DE PATRÓN RECORTADO ──────────────────────────────────────────────
// Dibuja la imagen patrón del vehículo adaptada para que cubra completamente
// el área de captura (marco) manteniendo sus proporciones.
function OverlayPatron({ src, vista }: { src: string; vista: Vista }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { rect } = marcoConfig[vista];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Dimensiones dinámicas del canvas en pantalla
      const cw = canvas.offsetWidth || 640;
      const ch = canvas.offsetHeight || 480;

      canvas.width = cw;
      canvas.height = ch;
      ctx.clearRect(0, 0, cw, ch);

      // 1. Calcular en píxeles la ubicación y tamaño del marco sobre la pantalla
      const destX = (rect.x / 100) * cw;
      const destY = (rect.y / 100) * ch;
      const destW = (rect.w / 100) * cw;
      const destH = (rect.h / 100) * ch;

      // 2. Proporción aspect-ratio ("object-cover") para que la imagen
      // llene el rectángulo del marco sin distorsionarse ni dejar bordes.
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const rectRatio = destW / destH;

      let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;

      if (imgRatio > rectRatio) {
        // La imagen es más ancha que el marco: recortamos los lados sobrantes
        srcW = img.naturalHeight * rectRatio;
        srcX = (img.naturalWidth - srcW) / 2;
      } else {
        // La imagen es más alta que el marco: recortamos arriba y abajo
        srcH = img.naturalWidth / rectRatio;
        srcY = (img.naturalHeight - srcH) / 2;
      }

      ctx.globalAlpha = 0.40; // Opacidad de la guía de referencia
      
      // 3. Dibujar únicamente la imagen ajustada EXACTAMENTE dentro de las coordenadas del marco
      ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
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

// ── PANTALLA DE RESULTADO ────────────────────────────────────────────────────
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

  const colorEstado = {
    NORMAL:      { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  badge: 'bg-green-100 text-green-800'  },
    ADVERTENCIA: { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-800'  },
    CRITICO:     { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-800'      },
  }[resultado.estado];

  return (
    <div className="p-4 w-full max-w-md mx-auto">
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#007A33]" />

        <h1 className="text-xl font-extrabold text-slate-800 mb-1 text-center tracking-tight mt-2">
          Resultado — {label}
        </h1>
        <p className="text-xs text-slate-500 mb-5 text-center font-medium">
          {vehiculo.marcaVehiculo} {vehiculo.submarcaVehiculo} · {vehiculo.placas ?? 'S/P'}
        </p>

        {/* Estado + similitud */}
        <div className={`rounded-xl p-4 mb-5 border ${colorEstado.bg} ${colorEstado.border}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-extrabold ${colorEstado.text}`}>{resultado.estado}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorEstado.badge}`}>
              {pct}% similitud
            </span>
          </div>
          {/* Barra de progreso */}
          <div className="w-full bg-white/70 rounded-full h-2.5 border border-slate-200">
            <div
              className={`h-2.5 rounded-full transition-all ${
                resultado.estado === 'NORMAL' ? 'bg-green-500' :
                resultado.estado === 'ADVERTENCIA' ? 'bg-amber-400' : 'bg-red-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Debug info — visible para ajustar umbrales en pruebas */}
        {resultado.debug && (
          <div className="mb-5 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Debug de comparación</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-slate-600">
              {resultado.debug.score_histograma !== undefined && (<>
                <span className="text-slate-400">Histograma HSV</span>
                <span>{Math.round(resultado.debug.score_histograma * 100)}%</span>
              </>)}
              {resultado.debug.score_matches !== undefined && (<>
                <span className="text-slate-400">Matches SIFT</span>
                <span>{Math.round(resultado.debug.score_matches * 100)}%</span>
              </>)}
              {resultado.debug.score_bordes !== undefined && (<>
                <span className="text-slate-400">Bordes Canny</span>
                <span>{Math.round(resultado.debug.score_bordes * 100)}%</span>
              </>)}
              {resultado.debug.score_ssim !== undefined && (<>
                <span className="text-slate-400">SSIM interior</span>
                <span>{Math.round(resultado.debug.score_ssim * 100)}%</span>
              </>)}
              <span className="col-span-2 border-t border-slate-200 my-1" />
              <span>Alineación</span>
              <span className={resultado.debug.alineacion_ok ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                {resultado.debug.alineacion_ok ? '✓ OK' : `✗ ${resultado.debug.motivo}`}
              </span>
              <span>Matches / Inliers</span>
              <span>{resultado.debug.matches_orb} / {resultado.debug.inliers}</span>
              <span>Error reproyección</span>
              <span>{resultado.debug.reproj_error_px >= 0 ? `${resultado.debug.reproj_error_px} px` : '—'}</span>
              {resultado.debug.cobertura_mascara !== undefined && (<>
                <span>Cobertura máscara</span>
                <span className={resultado.debug.cobertura_mascara < 0.15 ? 'text-red-500 font-bold' : ''}>
                  {Math.round(resultado.debug.cobertura_mascara * 100)}%
                </span>
              </>)}
            </div>
          </div>
        )}

        {/* Imagen de diferencias */}
        {resultado.imagen_diff && (
          <div className="mb-5">
            <p className="text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Mapa de diferencias</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${resultado.imagen_diff}`}
              alt="Mapa de diferencias"
              className="w-full rounded-xl border border-slate-200 shadow-sm"
            />
          </div>
        )}

        {/* Hallazgos */}
        {resultado.hallazgos.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
              Hallazgos detectados ({resultado.hallazgos.length})
            </p>
            <div className="space-y-2">
              {resultado.hallazgos.map((h, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-xs font-bold text-slate-700">{h.componente}</span>
                    <span className="text-[10px] text-slate-400 ml-2">{h.tipo}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    {Math.round(h.confianza * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={onNuevaCaptura}
            className="flex-1 border-2 border-slate-200 hover:border-[#007A33] text-slate-600 hover:text-[#007A33] font-bold rounded-xl py-3 text-sm transition-colors"
          >
            Volver a capturar
          </button>
          <button
            onClick={onSiguiente}
            className="flex-1 bg-[#007A33] hover:bg-[#005c26] text-white font-bold rounded-xl py-3 text-sm transition-colors shadow-md"
          >
            Siguiente ángulo
          </button>
        </div>
      </div>
    </div>
  );
}

// Calcula qué región del buffer nativo del video (video.videoWidth/videoHeight)
// es la que realmente se ve en pantalla bajo `object-cover`.
//
// object-cover escala el video para llenar el contenedor y recorta el excedente
// desde el centro. Si el video nativo (ej. 1920x1080) y el contenedor en pantalla
// (ej. un celular en vertical) tienen aspect ratios distintos, una parte del
// buffer queda fuera de vista. El marco/silueta que el usuario alinea vive en
// coordenadas de PANTALLA (0-100%), así que para recortar el frame correcto hay
// que mapear ese porcentaje a la región visible del buffer — no al buffer completo.
function calcularAreaVisible(video: HTMLVideoElement, contenedor: HTMLElement) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cw = contenedor.clientWidth;
  const ch = contenedor.clientHeight;

  const escala        = Math.max(cw / vw, ch / vh);
  const anchoVisible   = cw / escala;
  const altoVisible    = ch / escala;
  const offsetX        = (vw - anchoVisible) / 2;
  const offsetY        = (vh - altoVisible) / 2;

  return { offsetX, offsetY, anchoVisible, altoVisible };
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
    if (fase === 'camara') iniciarCamara();
    else detenerCamara();
    return () => detenerCamara();
  }, [fase, iniciarCamara, detenerCamara]);

  // Captura el área del marco del video y la envía a la API.
  // Solo se recorta la región dentro del marco, ignorando el fondo.
  const capturarYEnviar = useCallback(async () => {
    if (!videoRef.current || !vehiculo) return;
    setEnviando(true);

    try {
      const video = videoRef.current;
      const contenedor = video.parentElement as HTMLElement | null;

      // Convertir las coordenadas del marco (0-100, relativas a lo que se VE en
      // pantalla) a píxeles del buffer nativo del video, tomando en cuenta el
      // recorte que hace `object-cover` cuando el aspect ratio de la cámara no
      // coincide con el del contenedor. Si por alguna razón no hay contenedor
      // (no debería pasar), caemos al cálculo simple como último recurso.
      const { rect } = marcoConfig[vistaActiva];
      let cropX: number, cropY: number, cropW: number, cropH: number;

      if (contenedor && video.videoWidth && video.videoHeight) {
        const { offsetX, offsetY, anchoVisible, altoVisible } = calcularAreaVisible(video, contenedor);
        cropX = Math.round(offsetX + (rect.x / 100) * anchoVisible);
        cropY = Math.round(offsetY + (rect.y / 100) * altoVisible);
        cropW = Math.round((rect.w / 100) * anchoVisible);
        cropH = Math.round((rect.h / 100) * altoVisible);
      } else {
        const vw = video.videoWidth  || 1280;
        const vh = video.videoHeight || 720;
        cropX = Math.round((rect.x / 100) * vw);
        cropY = Math.round((rect.y / 100) * vh);
        cropW = Math.round((rect.w / 100) * vw);
        cropH = Math.round((rect.h / 100) * vh);
      }

      // Canvas del tamaño exacto del recorte
      const canvas = canvasRef.current ?? document.createElement('canvas');
      canvas.width  = cropW;
      canvas.height = cropH;
      // Dibujar solo la región del marco — el fondo queda fuera
      canvas.getContext('2d')!.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob falló')), 'image/jpeg', 0.92)
      );

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
        <div className="relative flex-1 overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

          {/* Overlay: recorte exacto de la zona que el canvas capturará.
              El operador debe llenar este encuadre con el vehículo real. */}
          {patrones[vistaActiva]
            ? <OverlayPatron src={patrones[vistaActiva]!} vista={vistaActiva} />
            : null
          }

          {/* Esquinas guía siempre visibles para delimitar el área de captura */}
          {(() => {
            const { rect: { x, y, w, h } } = marcoConfig[vistaActiva];
            return (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Oscurecer zona fuera del marco */}
                <path fillRule="evenodd" fill="rgba(0,0,0,0.35)"
                  d={`M0,0 H100 V100 H0 Z M${x},${y} H${x+w} V${y+h} H${x} Z`} />
                {/* Esquinas verdes */}
                {([[x,y,1,0,0,1],[x+w,y,-1,0,0,1],[x,y+h,1,0,0,-1],[x+w,y+h,-1,0,0,-1]] as number[][]).map(([cx,cy,dx1,,dx2,dy2],i) => (
                  <g key={i} stroke="#00E05A" strokeWidth="1.5" strokeLinecap="round">
                    <line x1={cx} y1={cy} x2={cx+dx1*7} y2={cy} />
                    <line x1={cx} y1={cy} x2={cx+dx2*7} y2={cy+dy2*7} />
                  </g>
                ))}
                {/* Instrucción */}
                <text x="50" y="97" textAnchor="middle" fill="white" fontSize="3.2" fontWeight="bold"
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
                  {marcoConfig[vistaActiva].instruccion}
                </text>
              </svg>
            );
          })()}

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