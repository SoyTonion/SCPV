"use client";

import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { registrarEscaneo, cerrarRondinActivo, type ResultadoEscaneo, type ResultadoCierreRondin } from './actions';

export default function ScannerPernocta() {
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEscaneo | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const [resumenCierre, setResumenCierre] = useState<ResultadoCierreRondin | null>(null);

  const procesarQR = async (token: string) => {
    setProcesando(true);
    const res = await registrarEscaneo(token);
    setResultado(res);
    setProcesando(false);
  };

  useEffect(() => {
    if (!mostrarEscaner) return;

    const scanner = new Html5QrcodeScanner(
      'lector-qr-pernocta',
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
      scanner.clear().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarEscaner]);

  const reiniciar = () => {
    setResultado(null);
    setResumenCierre(null);
  };

  const handleCerrarRondin = async () => {
    if (!confirm('¿Confirmas que terminaste el rondín de esta noche?')) return;
    setCerrando(true);
    const res = await cerrarRondinActivo();
    setResumenCierre(res);
    setCerrando(false);
  };

  const getVariante = (res: Extract<ResultadoEscaneo, { ok: true }>) => {
    if (res.estadoPernocta === false) {
      return {
        icono: '⚠',
        iconoBg: 'bg-orange-100 text-orange-600',
        titulo: 'Vehículo sin Autorización',
        badge: { texto: 'Sin autorización de pernocta', clase: 'bg-orange-100 text-orange-800' },
        motivo: null,
      };
    }
    if (typeof res.estadoPernocta === 'string') {
      return {
        icono: '🛡',
        iconoBg: 'bg-blue-100 text-blue-600',
        titulo: '¡Vehículo Autorizado!',
        badge: { texto: 'Autorización vigente', clase: 'bg-blue-100 text-blue-800' },
        motivo: res.estadoPernocta,
      };
    }
    return {
      icono: '✓',
      iconoBg: 'bg-green-100 text-[#007A33]',
      titulo: '¡Vehículo Registrado!',
      badge: { texto: 'Pernocta en base', clase: 'bg-green-100 text-green-800' },
      motivo: null,
    };
  };

  return (
    <div className="p-4 w-full max-w-md mx-auto">
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 relative overflow-hidden">
        {/* Barra superior verde */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#007A33]" />

        <h1 className="text-xl font-extrabold text-slate-800 mb-1 text-center tracking-tight mt-2">
          Control de Pernocta
        </h1>
        <p className="text-xs text-slate-500 mb-6 text-center font-medium">
          Escanea el código QR del vehículo para registrar su pernocta
        </p>

        {/* Modal de cámara */}
        {mostrarEscaner && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-4 relative">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-[#007A33] text-sm flex items-center gap-1.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm14 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM3 16a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm14 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Enfoca el código QR
                </span>
                <button
                  onClick={() => setMostrarEscaner(false)}
                  className="text-red-500 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                >
                  Cancelar
                </button>
              </div>
              <div id="lector-qr-pernocta" className="w-full overflow-hidden rounded-lg shadow-sm border border-slate-200" />
            </div>
          </div>
        )}

        {/* Estado: procesando */}
        {procesando ? (
          <div className="flex flex-col items-center text-center py-10">
            <div className="w-10 h-10 border-4 border-[#007A33] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Registrando escaneo...</p>
          </div>

        /* Estado: con resultado */
        ) : resultado ? (
          resultado.ok ? (() => {
            const v = getVariante(resultado);
            return (
              <div className="flex flex-col items-center text-center py-4">
                <div className={`w-16 h-16 ${v.iconoBg} rounded-full flex items-center justify-center text-3xl mb-4`}>
                  {v.icono}
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">{v.titulo}</h3>

                <span className={`px-3 py-1 rounded-full text-xs font-bold mb-4 ${v.badge.clase}`}>
                  {v.badge.texto}
                </span>

                <div className="text-sm text-slate-600 space-y-1 mb-4 w-full text-left bg-slate-50 rounded-lg p-3">
                  <p><strong>Económico:</strong> {resultado.vehiculo.economico ?? '—'}</p>
                  <p><strong>Placas:</strong> {resultado.vehiculo.placas ?? '—'}</p>
                  <p><strong>Vehículo:</strong> {resultado.vehiculo.marca} {resultado.vehiculo.submarca}</p>
                  {resultado.vehiculo.departamento && (
                    <p><strong>Departamento:</strong> {resultado.vehiculo.departamento}</p>
                  )}
                </div>

                {v.motivo && (
                  <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-left">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Motivo de autorización:</p>
                    <p className="text-sm text-blue-800">{v.motivo}</p>
                  </div>
                )}

                {resultado.estadoPernocta === false && (
                  <div className="w-full bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-left">
                    <p className="text-xs font-semibold text-orange-700 mb-1">Atención:</p>
                    <p className="text-sm text-orange-800">
                      Este vehículo no está autorizado para pernoctar fuera del parque vehicular. Reporta la situación al supervisor.
                    </p>
                  </div>
                )}

                <button
                  onClick={reiniciar}
                  className="w-full bg-[#007A33] hover:bg-[#005c26] text-white font-semibold rounded-lg p-3 transition-colors"
                >
                  Escanear otro vehículo
                </button>
              </div>
            );
          })() : (
            <div className="flex flex-col items-center text-center py-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4 ${
                !resultado.ok && resultado.duplicado
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-red-100 text-red-600'
              }`}>
                {!resultado.ok && resultado.duplicado ? '⟳' : '✕'}
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                {!resultado.ok && resultado.duplicado ? 'Vehículo ya escaneado' : 'No se pudo registrar'}
              </h3>
              <p className="text-sm text-slate-500 mb-4">{resultado.error}</p>
              {!resultado.ok && resultado.duplicado && (
                <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-left">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Atención:</p>
                  <p className="text-sm text-amber-800">
                    Este vehículo ya fue registrado en el rondín de hoy. No es necesario escanearlo de nuevo.
                  </p>
                </div>
              )}
              <button
                onClick={reiniciar}
                className="w-full bg-[#007A33] hover:bg-[#005c26] text-white font-semibold rounded-lg p-3 transition-colors"
              >
                Escanear otro vehículo
              </button>
            </div>
          )

        /* Estado: esperando */
        ) : resumenCierre ? (
          // Pantalla de resumen tras cerrar el rondín
          resumenCierre.ok ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-3xl mb-4">
                🏁
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">Rondín cerrado</h3>
              <p className="text-sm text-slate-500 mb-4">El rondín de esta noche ha sido registrado.</p>
              <div className="w-full bg-slate-50 rounded-lg p-3 text-sm text-slate-600 space-y-1 text-left mb-6">
                <p><strong>Inicio:</strong> {new Date(resumenCierre.inicio).toLocaleTimeString('es-MX', { timeStyle: 'short' })}</p>
                <p><strong>Fin:</strong> {new Date(resumenCierre.fin).toLocaleTimeString('es-MX', { timeStyle: 'short' })}</p>
                <p><strong>Vehículos escaneados:</strong> {resumenCierre.totalEscaneos}</p>
              </div>
              <button
                onClick={reiniciar}
                className="w-full border border-slate-300 text-slate-600 font-semibold rounded-lg p-3 transition-colors hover:bg-slate-50"
              >
                Nuevo escaneo
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mb-4">✕</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No se pudo cerrar</h3>
              <p className="text-sm text-slate-500 mb-6">{resumenCierre.error}</p>
              <button onClick={reiniciar} className="w-full bg-[#007A33] hover:bg-[#005c26] text-white font-semibold rounded-lg p-3 transition-colors">
                Volver
              </button>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setMostrarEscaner(true)}
              className="w-full border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-[#007A33]/5 hover:border-[#007A33]/50 text-slate-500 hover:text-[#007A33] rounded-xl p-6 flex flex-col items-center justify-center transition-all group"
            >
              <svg className="h-8 w-8 mb-2 text-slate-400 group-hover:text-[#007A33] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span className="text-sm font-semibold">Escanear Código QR</span>
            </button>

            {/* Botón de terminar rondín */}
            <button
              type="button"
              onClick={handleCerrarRondin}
              disabled={cerrando}
              className="w-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl p-3 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {cerrando ? 'Cerrando rondín...' : '🏁 Terminar rondín'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
