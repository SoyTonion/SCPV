"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

type Vista = 'FRONTAL' | 'TRASERA' | 'LATERAL_IZQUIERDA' | 'LATERAL_DERECHA' | 'INTERIOR';

const LABEL_VISTA: Record<Vista, string> = {
  FRONTAL:           'Frontal',
  TRASERA:           'Trasera',
  LATERAL_IZQUIERDA: 'Lateral Izquierda',
  LATERAL_DERECHA:   'Lateral Derecha',
  INTERIOR:          'Interior',
};

// Mismo marcoConfig que en el módulo de inspección — encuadre idéntico
const marcoConfig: Record<Vista, {
  rect: { x: number; y: number; w: number; h: number };
  instruccion: string;
}> = {
  FRONTAL:           { rect: { x: 5,  y: 8,  w: 90, h: 78 }, instruccion: 'Centra el frente del vehículo' },
  TRASERA:           { rect: { x: 5,  y: 8,  w: 90, h: 78 }, instruccion: 'Centra la parte trasera del vehículo' },
  LATERAL_IZQUIERDA: { rect: { x: 2,  y: 22, w: 96, h: 52 }, instruccion: 'Alinea el costado completo del vehículo' },
  LATERAL_DERECHA:   { rect: { x: 2,  y: 22, w: 96, h: 52 }, instruccion: 'Alinea el costado completo del vehículo' },
  INTERIOR:          { rect: { x: 8,  y: 12, w: 84, h: 72 }, instruccion: 'Enfoca el habitáculo' },
};

// Calcula la región visible del buffer nativo bajo object-cover
function calcularAreaVisible(video: HTMLVideoElement, contenedor: HTMLElement) {
  const vw = video.videoWidth,  vh = video.videoHeight;
  const cw = contenedor.clientWidth, ch = contenedor.clientHeight;
  const escala       = Math.max(cw / vw, ch / vh);
  const anchoVisible = cw / escala;
  const altoVisible  = ch / escala;
  return {
    offsetX:      (vw - anchoVisible) / 2,
    offsetY:      (vh - altoVisible)  / 2,
    anchoVisible,
    altoVisible,
  };
}

type Estado = 'camara' | 'previa' | 'guardando' | 'exito' | 'error';

export default function CapturaPatronClient({
  vehiculoId,
  vehiculoLabel,
  vista,
}: {
  vehiculoId:    string;
  vehiculoLabel: string;
  vista:         Vista;
}) {
  const router   = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [estado,    setEstado]    = useState<Estado>('camara');
  const [previaUrl, setPreviaUrl] = useState<string | null>(null);
  const [blobCaptura, setBlobCaptura] = useState<Blob | null>(null);
  const [errorMsg,  setErrorMsg]  = useState('');

  const { rect, instruccion } = marcoConfig[vista];

  // Inicia la cámara trasera
  const iniciarCamara = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setEstado('error');
      setErrorMsg('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  }, []);

  const detenerCamara = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (estado === 'camara') iniciarCamara();
    else detenerCamara();
    return () => detenerCamara();
  }, [estado, iniciarCamara, detenerCamara]);

  // Captura el frame recortado al área del marco — idéntico al módulo de inspección
  const capturar = useCallback(() => {
    const video     = videoRef.current;
    const canvas    = canvasRef.current;
    const contenedor = video?.parentElement as HTMLElement | null;
    if (!video || !canvas || !contenedor) return;

    const vw = video.videoWidth  || 1280;
    const vh = video.videoHeight || 720;

    let cropX: number, cropY: number, cropW: number, cropH: number;
    if (video.videoWidth && video.videoHeight) {
      const { offsetX, offsetY, anchoVisible, altoVisible } = calcularAreaVisible(video, contenedor);
      cropX = Math.round(offsetX + (rect.x / 100) * anchoVisible);
      cropY = Math.round(offsetY + (rect.y / 100) * altoVisible);
      cropW = Math.round((rect.w / 100) * anchoVisible);
      cropH = Math.round((rect.h / 100) * altoVisible);
    } else {
      cropX = Math.round((rect.x / 100) * vw);
      cropY = Math.round((rect.y / 100) * vh);
      cropW = Math.round((rect.w / 100) * vw);
      cropH = Math.round((rect.h / 100) * vh);
    }

    canvas.width  = cropW;
    canvas.height = cropH;
    canvas.getContext('2d')!.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    canvas.toBlob(blob => {
      if (!blob) return;
      setBlobCaptura(blob);
      setPreviaUrl(URL.createObjectURL(blob));
      setEstado('previa');
    }, 'image/jpeg', 0.95);
  }, [rect]);

  // Guarda la captura como imagen patrón
  const guardarPatron = useCallback(async () => {
    if (!blobCaptura) return;
    setEstado('guardando');
    try {
      const form = new FormData();
      form.append('imagen',     blobCaptura, `patron_${vista}.jpg`);
      form.append('vehiculoId', vehiculoId);
      form.append('vista',      vista);

      const res = await fetch('/api/imagenes-patron/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(err.error);
      }
      setEstado('exito');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Error al guardar');
      setEstado('error');
    }
  }, [blobCaptura, vehiculoId, vista]);

  const repetir = () => {
    if (previaUrl) URL.revokeObjectURL(previaUrl);
    setPreviaUrl(null);
    setBlobCaptura(null);
    setEstado('camara');
  };

  // ── PANTALLA DE ÉXITO ──────────────────────────────────────────────────────
  if (estado === 'exito') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 max-w-sm w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#007A33]" />
          <div className="w-16 h-16 bg-[#007A33] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg mt-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-1">¡Imagen patrón guardada!</h2>
          <p className="text-sm text-slate-500 mb-2">{vehiculoLabel}</p>
          <p className="text-xs text-[#007A33] font-bold mb-6">{LABEL_VISTA[vista]}</p>
          <div className="flex gap-3">
            <button
              onClick={repetir}
              className="flex-1 border-2 border-slate-200 hover:border-[#007A33] text-slate-600 font-bold rounded-xl py-3 text-sm transition-colors"
            >
              Tomar otra
            </button>
            <button
              onClick={() => router.push('/dashboard/estado/patrones')}
              className="flex-1 bg-[#007A33] hover:bg-[#005c26] text-white font-bold rounded-xl py-3 text-sm transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PANTALLA DE ERROR ──────────────────────────────────────────────────────
  if (estado === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 max-w-sm w-full text-center">
          <p className="text-red-500 font-bold mb-4">{errorMsg}</p>
          <button
            onClick={repetir}
            className="bg-[#007A33] text-white font-bold rounded-xl px-6 py-3 text-sm"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  // ── PREVIA DE LA CAPTURA ───────────────────────────────────────────────────
  if (estado === 'previa' && previaUrl) {
    return createPortal(
      <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 9999 }}>
        {/* Barra superior */}
        <div
          className="relative z-10 flex items-center justify-between px-4 pb-3 shrink-0 bg-black/60 backdrop-blur-sm"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <button
            onClick={repetir}
            className="flex items-center gap-1.5 text-white/80 text-sm font-semibold bg-white/10 px-3 py-1.5 rounded-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Repetir
          </button>
          <span className="text-white font-extrabold text-sm bg-white/10 px-3 py-1.5 rounded-full">
            {LABEL_VISTA[vista]} — Previa
          </span>
        </div>

        {/* Imagen capturada */}
        <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previaUrl} alt="Previa captura" className="max-w-full max-h-full object-contain" />
        </div>

        {/* Botones */}
        <div
          className="shrink-0 px-4 pt-3 pb-6 bg-black/70 backdrop-blur-sm flex flex-col gap-3"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          <p className="text-white/60 text-xs text-center font-medium">
            Verifica que el vehículo esté bien centrado y sin obstrucciones antes de guardar.
          </p>
          <div className="flex gap-3">
            <button
              onClick={repetir}
              className="flex-1 border border-white/20 text-white/80 font-bold rounded-2xl py-4 text-sm active:scale-95 transition-transform"
            >
              Repetir foto
            </button>
            <button
              onClick={guardarPatron}
              className="flex-1 bg-[#007A33] hover:bg-[#005c26] text-white font-extrabold rounded-2xl py-4 text-sm active:scale-95 transition-transform shadow-xl shadow-[#007A33]/30"
            >
              Guardar como patrón
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ── CÁMARA EN VIVO ─────────────────────────────────────────────────────────
  return createPortal(
    <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 9999 }}>

      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Barra superior */}
      <div
        className="relative z-10 flex items-center justify-between px-4 pb-2 shrink-0"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-white/80 text-sm font-semibold bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
        <div className="text-center">
          <span className="text-white font-extrabold text-sm bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
            {LABEL_VISTA[vista]}
          </span>
        </div>
        <div className="w-16" />{/* spacer */}
      </div>

      {/* Área de video + marcos */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Marco SVG — idéntico al módulo de inspección */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Zona oscurecida fuera del marco */}
          <path
            fillRule="evenodd"
            fill="rgba(0,0,0,0.40)"
            d={`M0,0 H100 V100 H0 Z M${rect.x},${rect.y} H${rect.x+rect.w} V${rect.y+rect.h} H${rect.x} Z`}
          />
          {/* Borde punteado */}
          <rect
            x={rect.x} y={rect.y} width={rect.w} height={rect.h}
            fill="none" stroke="white" strokeWidth="0.4" strokeDasharray="2.5 1.5"
          />
          {/* Esquinas verdes */}
          {([
            [rect.x,          rect.y,          1,  0,  0,  1],
            [rect.x + rect.w, rect.y,         -1,  0,  0,  1],
            [rect.x,          rect.y + rect.h,  1,  0,  0, -1],
            [rect.x + rect.w, rect.y + rect.h, -1,  0,  0, -1],
          ] as number[][]).map(([cx, cy, dx1, , dx2, dy2], i) => (
            <g key={i} stroke="#00E05A" strokeWidth="1.5" strokeLinecap="round">
              <line x1={cx} y1={cy} x2={cx + dx1 * 7} y2={cy} />
              <line x1={cx} y1={cy} x2={cx + dx2 * 7} y2={cy + dy2 * 7} />
            </g>
          ))}
          {/* Instrucción */}
          <text x="50" y="97" textAnchor="middle" fill="white" fontSize="3.2" fontWeight="bold"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))' }}>
            {instruccion}
          </text>
        </svg>

        {/* Indicador de que es modo patrón */}
        <div className="absolute top-3 right-3 bg-[#007A33]/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
          MODO PATRÓN
        </div>
      </div>

      {/* Barra inferior */}
      <div
        className="relative z-10 shrink-0 px-4 pt-3 bg-black/70 backdrop-blur-sm"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <p className="text-white/50 text-[11px] text-center mb-3 font-medium">
          {vehiculoLabel}
        </p>

        {/* Botón de captura */}
        <button
          onClick={capturar}
          className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-white text-slate-800 font-extrabold rounded-2xl py-4 shadow-xl text-sm active:scale-95 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Capturar foto patrón
        </button>
      </div>

    </div>,
    document.body
  );
}
