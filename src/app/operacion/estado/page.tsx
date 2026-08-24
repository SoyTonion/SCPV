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

const vistas: { label: string; vista: Vista }[] = [
  { label: 'Frontal',           vista: 'FRONTAL'           },
  { label: 'Trasera',           vista: 'TRASERA'           },
  { label: 'Lateral Izquierda', vista: 'LATERAL_IZQUIERDA' },
  { label: 'Lateral Derecha',   vista: 'LATERAL_DERECHA'   },
  { label: 'Interior',          vista: 'INTERIOR'          },
];

// ── MARCOS DE REFERENCIA SVG ─────────────────────────────────────────────────
// Cada marco es un rectángulo centrado sobre el video.
// Las dimensiones están expresadas como porcentaje del contenedor (viewBox 100×100).
// La idea es que el operador alinee el vehículo dentro del rectángulo antes de capturar.

const marcoConfig: Record<Vista, {
  rect: { x: number; y: number; w: number; h: number };
  instruccion: string;
}> = {
  // Todos los marcos son más anchos que altos — celular en vertical, vehículo entra de frente
  FRONTAL: {
    rect: { x: 6, y: 20, w: 88, h: 60 },
    instruccion: 'Centra el frente del vehículo dentro del marco',
  },
  TRASERA: {
    rect: { x: 6, y: 20, w: 88, h: 60 },
    instruccion: 'Centra la parte trasera del vehículo dentro del marco',
  },
  // Lateral: aún más ancho para capturar todo el largo del costado
  LATERAL_IZQUIERDA: {
    rect: { x: 4, y: 25, w: 92, h: 50 },
    instruccion: 'Alinea el costado completo del vehículo',
  },
  LATERAL_DERECHA: {
    rect: { x: 4, y: 25, w: 92, h: 50 },
    instruccion: 'Alinea el costado completo del vehículo',
  },
  // Interior: algo más cuadrado, habitáculo desde la puerta
  INTERIOR: {
    rect: { x: 8, y: 18, w: 84, h: 64 },
    instruccion: 'Enfoca el habitáculo desde la puerta del conductor',
  },
};

// Dibuja el marco como SVG superpuesto sobre el video.
// La zona exterior al rectángulo queda oscurecida para guiar la vista.
function MarcoReferencia({ vista }: { vista: Vista }) {
  const { rect, instruccion } = marcoConfig[vista];
  const { x, y, w, h } = rect;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Máscara oscura fuera del marco */}
      <path
        fillRule="evenodd"
        fill="rgba(0,0,0,0.45)"
        d={`M0,0 H100 V100 H0 Z M${x},${y} H${x + w} V${y + h} H${x} Z`}
      />

      {/* Borde del marco */}
      <rect
        x={x} y={y} width={w} height={h}
        fill="none"
        stroke="white"
        strokeWidth="0.5"
        strokeDasharray="3 2"
      />

      {/* Esquinas pronunciadas para mejor referencia visual */}
      {[
        [x,     y,      1, 0,  0, 1 ],  // top-left
        [x + w, y,     -1, 0,  0, 1 ],  // top-right
        [x,     y + h,  1, 0,  0,-1],   // bottom-left
        [x + w, y + h, -1, 0,  0,-1],   // bottom-right
      ].map(([cx, cy, dx1, dy1, dx2, dy2], i) => (
        <g key={i} stroke="#00E05A" strokeWidth="1.2" strokeLinecap="round">
          <line x1={cx} y1={cy} x2={cx + dx1 * 6} y2={cy + dy1 * 6} />
          <line x1={cx} y1={cy} x2={cx + dx2 * 6} y2={cy + dy2 * 6} />
        </g>
      ))}

      {/* Texto de instrucción en la parte inferior */}
      <text
        x="50" y="96"
        textAnchor="middle"
        fill="white"
        fontSize="3.2"
        fontWeight="bold"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
      >
        {instruccion}
      </text>
    </svg>
  );
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function EstadoPage() {

  const [fase, setFase] = useState<'escaner' | 'menu' | 'camara'>('escaner');
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [buscandoQR, setBuscandoQR]         = useState(false);
  const [vehiculo, setVehiculo]             = useState<VehiculoData | null>(null);
  const [vistaActiva, setVistaActiva]       = useState<Vista>('FRONTAL');

  // refs de la cámara
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Abre la cámara trasera al entrar en fase 'camara'
  const iniciarCamara = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      alert('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  }, []);

  // Detiene el stream al salir de la fase cámara
  const detenerCamara = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (fase === 'camara') iniciarCamara();
    else detenerCamara();
    return () => detenerCamara();
  }, [fase, iniciarCamara, detenerCamara]);

  // ── QR scanner ──────────────────────────────────────────────────────────────
  const procesarQR = async (token: string) => {
    setBuscandoQR(true);
    try {
      const res = await fetch(`/api/vehiculos/${token}`);
      if (res.ok) {
        const data: VehiculoData = await res.json();
        setVehiculo(data);
        setFase('menu');
      } else {
        alert('⚠️ Código QR inválido o vehículo no encontrado.');
      }
    } catch {
      alert('Error de conexión con el servidor.');
    } finally {
      setBuscandoQR(false);
    }
  };

  useEffect(() => {
    if (!mostrarEscaner) return;
    const scanner = new Html5QrcodeScanner(
      'lector-qr-estado',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    scanner.render(
      async (texto) => { scanner.clear(); setMostrarEscaner(false); await procesarQR(texto); },
      () => {}
    );
    return () => { scanner.clear().catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarEscaner]);

  // ── FASE CÁMARA ──────────────────────────────────────────────────────────────
  if (fase === 'camara') {
    const labelActiva = vistas.find(v => v.vista === vistaActiva)?.label ?? '';

    return createPortal(
      <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 9999 }}>

        {/* Barra superior — siempre visible encima del video */}
        <div
          className="relative z-10 flex items-center justify-between px-4 pb-2 shrink-0"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <button
            onClick={() => setFase('menu')}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-semibold bg-black/30 hover:bg-black/50 px-3 py-1.5 rounded-full transition-all backdrop-blur-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <span className="text-white font-extrabold text-sm bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm tracking-wide">
            {labelActiva}
          </span>
        </div>

        {/* Área del video + marco — ocupa el espacio disponible entre barras */}
        <div className="relative flex-1 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Marco SVG confinado a esta zona, no cubre los botones */}
          <MarcoReferencia vista={vistaActiva} />
        </div>

        {/* Barra inferior — siempre visible debajo del video */}
        <div
          className="relative z-10 shrink-0 px-4 pt-3 bg-black/70 backdrop-blur-sm"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          {/* Selector de vista con scroll horizontal */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide snap-x snap-mandatory">
            {vistas.map(({ label, vista }) => (
              <button
                key={vista}
                onClick={() => setVistaActiva(vista)}
                className={`
                  shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-bold transition-all
                  ${vistaActiva === vista
                    ? 'bg-[#007A33] text-white shadow-lg shadow-[#007A33]/40'
                    : 'bg-white/10 text-white/70 active:bg-white/20 active:text-white'}
                `}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Botón de captura */}
          <button
            onClick={() => {
              // TODO: capturar frame del video y guardar / enviar
              alert(`Captura de vista ${labelActiva} — próximamente`);
            }}
            className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-white text-slate-800 font-extrabold rounded-2xl py-4 shadow-xl text-sm active:scale-95 transition-transform"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Capturar foto
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
                  <span className="font-bold text-[#007A33] text-sm flex items-center gap-1.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm14 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM3 16a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm14 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    Enfoca el código QR
                  </span>
                  <button onClick={() => setMostrarEscaner(false)} className="text-red-500 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded-md transition-colors">
                    Cancelar
                  </button>
                </div>
                <div id="lector-qr-estado" className="w-full overflow-hidden rounded-lg shadow-sm border border-slate-200" />
              </div>
            </div>,
            document.body
          )}

          <button
            type="button"
            onClick={() => setMostrarEscaner(true)}
            disabled={buscandoQR}
            className="w-full border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-[#007A33]/5 hover:border-[#007A33]/50 text-slate-500 hover:text-[#007A33] rounded-xl p-6 flex flex-col items-center justify-center transition-all group"
          >
            {buscandoQR ? (
              <svg className="animate-spin h-7 w-7 text-[#007A33] mb-1.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="h-8 w-8 mb-2 text-slate-400 group-hover:text-[#007A33] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            )}
            <span className="text-sm font-semibold">
              {buscandoQR ? 'Buscando vehículo...' : 'Escanear Código QR'}
            </span>
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
        <p className="text-xs text-slate-500 mb-5 text-center font-medium">
          Selecciona el ángulo a fotografiar
        </p>

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
                  <svg className="w-3 h-3 text-slate-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  <span className="text-[10px] font-mono font-bold text-slate-700 tracking-wide">{vehiculo?.placas ?? 'S/P'}</span>
                </div>
                <div className="flex items-center bg-[#007A33]/10 border border-[#007A33]/20 rounded-md px-1.5 py-0.5">
                  <svg className="w-3 h-3 text-[#007A33] mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-[10px] font-bold text-[#007A33] uppercase">Eco: {vehiculo?.economico ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setVehiculo(null); setFase('escaner'); }}
            className="text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 p-1.5 rounded-full transition-colors border border-slate-200 shrink-0"
            title="Cambiar vehículo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cuadrícula de ángulos — al pulsar abre la cámara con esa vista */}
        <div className="grid grid-cols-2 gap-3">
          {vistas.map(({ label, vista }) => (
            <button
              key={vista}
              onClick={() => { setVistaActiva(vista); setFase('camara'); }}
              className={`
                flex flex-col items-center justify-center gap-2
                border-2 border-slate-200 hover:border-[#007A33] hover:bg-[#007A33]/5
                rounded-xl p-4 transition-colors text-slate-600 hover:text-[#007A33]
                ${vista === 'INTERIOR' ? 'col-span-2' : ''}
              `}
            >
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
