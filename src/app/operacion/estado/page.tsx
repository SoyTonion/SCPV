"use client";

import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

// Tipo que describe los datos básicos del vehículo que retorna la API
type VehiculoData = {
  id: string;
  economico: string | null;
  marcaVehiculo: string;
  submarcaVehiculo: string;
  placas: string | null;
};

export default function EstadoPage() {

  // Fase del flujo: "escaner" → muestra el QR | "menu" → muestra el menú de inspección
  const [fase, setFase] = useState<'escaner' | 'menu'>('escaner');

  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [buscandoQR, setBuscandoQR]         = useState(false);
  const [vehiculo, setVehiculo]             = useState<VehiculoData | null>(null);

  // Busca el vehículo por qr_token en la API existente
  const procesarQR = async (token: string) => {
    setBuscandoQR(true);
    try {
      const res = await fetch(`/api/vehiculos/${token}`);
      if (res.ok) {
        const data: VehiculoData = await res.json();
        setVehiculo(data);
        // Una vez identificado el vehículo pasamos al menú de inspección
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

  // Inicializa la cámara cuando el usuario la activa
  useEffect(() => {
    if (!mostrarEscaner) return;

    const scanner = new Html5QrcodeScanner(
      'lector-qr-estado',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      async (texto) => {
        scanner.clear();
        setMostrarEscaner(false);
        await procesarQR(texto);
      },
      () => { /* errores de lectura continua se ignoran */ }
    );

    return () => {
      scanner.clear().catch(err => console.error('Fallo al limpiar escáner', err));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarEscaner]);

  // ── FASE 1: ESCANER QR ───────────────────────────────────────────────────────
  if (fase === 'escaner') {
    return (
      <div className="p-4 w-full max-w-md mx-auto">
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100">

          <h1 className="text-xl font-bold text-slate-800 mb-2 text-center">
            Inspección de Estado Físico
          </h1>
          <p className="text-sm text-slate-500 mb-6 text-center">
            Escanea el código QR del vehículo para comenzar.
          </p>

          {/* Ventana de la cámara */}
          {mostrarEscaner && (
            <div className="mb-6 p-2 border-2 border-[#007A33] rounded-lg bg-slate-50">
              <div className="flex justify-between items-center mb-2 px-2">
                <span className="font-bold text-slate-700 text-sm">
                  Apunta al código QR del vehículo
                </span>
                <button
                  onClick={() => setMostrarEscaner(false)}
                  className="text-red-500 text-sm font-bold hover:underline"
                >
                  Cancelar
                </button>
              </div>
              {/* html5-qrcode inyecta la cámara aquí */}
              <div id="lector-qr-estado" className="w-full overflow-hidden rounded-lg" />
            </div>
          )}

          {/* Botón para abrir el escáner */}
          {!mostrarEscaner && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setMostrarEscaner(true)}
                disabled={buscandoQR}
                title="Escanear QR"
                className="bg-slate-800 text-white px-6 py-3 rounded-xl flex items-center gap-3 hover:bg-slate-700 transition disabled:opacity-50 text-sm font-medium"
              >
                {buscandoQR ? (
                  'Buscando...'
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Escanear vehículo
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── FASE 2: MENÚ DE INSPECCIÓN (placeholder hasta integrar OpenCV) ────────────
  return (
    <div className="p-4 w-full max-w-md mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100">

        {/* Cabecera con datos del vehículo identificado */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#007A33] rounded-full flex items-center justify-center text-white text-lg font-bold">
            ✓
          </div>
          <div>
            <p className="font-bold text-slate-800">
              {vehiculo?.marcaVehiculo} {vehiculo?.submarcaVehiculo}
            </p>
            <p className="text-xs text-slate-500">
              Placas: {vehiculo?.placas ?? 'S/P'} · Eco: {vehiculo?.economico ?? '—'}
            </p>
          </div>
          {/* Botón para volver a escanear otro vehículo */}
          <button
            onClick={() => { setVehiculo(null); setFase('escaner'); }}
            className="ml-auto text-xs text-slate-400 hover:text-red-500 underline"
          >
            Cambiar
          </button>
        </div>

        <h2 className="text-lg font-bold text-slate-700 mb-4 text-center">
          Selecciona el ángulo a inspeccionar
        </h2>

        {/* Cuadrícula de ángulos — cada botón lanzará la captura de foto + análisis OpenCV */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Frontal',           icon: '⬆️', vista: 'FRONTAL'           },
            { label: 'Trasera',           icon: '⬇️', vista: 'TRASERA'           },
            { label: 'Lateral Izquierda', icon: '⬅️', vista: 'LATERAL_IZQUIERDA' },
            { label: 'Lateral Derecha',   icon: '➡️', vista: 'LATERAL_DERECHA'   },
            { label: 'Interior',          icon: '🪟', vista: 'INTERIOR'          },
          ].map(({ label, icon, vista }) => (
            <button
              key={vista}
              // TODO: navegar a la pantalla de captura/análisis de esa vista
              onClick={() => alert(`Próximamente: captura ${label}`)}
              className={`
                flex flex-col items-center justify-center gap-2
                border-2 border-slate-200 hover:border-[#007A33]
                rounded-xl p-4 transition-colors
                ${vista === 'INTERIOR' ? 'col-span-2' : ''}
              `}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-sm font-medium text-slate-700">{label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
