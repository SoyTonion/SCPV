"use client";

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { registrarEscaneo, type ResultadoEscaneo } from './actions';

export default function ScannerClient() {
  const [codigoEscaneado, setCodigoEscaneado] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoEscaneo | null>(null);
  const [isPending, startTransition] = useTransition();
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (codigoEscaneado) return;

    const elementId = "reader";
    const html5Qrcode = new Html5Qrcode(elementId);
    html5QrcodeRef.current = html5Qrcode;

    html5Qrcode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => {
        setCodigoEscaneado(decodedText);
        setResultado(null);

        html5Qrcode.stop().then(() => {
          html5Qrcode.clear();
        }).catch((err) => console.error("Error al detener cámara:", err));

        startTransition(async () => {
          const res = await registrarEscaneo(decodedText);
          setResultado(res);
        });
      },
      () => {}
    ).catch((err) => {
      console.error("Error iniciando cámara:", err);
    });

    return () => {
      if (html5QrcodeRef.current?.isScanning) {
        html5QrcodeRef.current.stop().then(() => {
          html5QrcodeRef.current?.clear();
        }).catch((err) => console.debug("Cleanup:", err));
      }
    };
  }, [codigoEscaneado]);

  const reiniciarEscaneo = () => {
    setCodigoEscaneado(null);
    setResultado(null);
  };

  // Determinar variante visual según estadoPernocta
  const getVariante = (res: Extract<ResultadoEscaneo, { ok: true }>) => {
    if (res.estadoPernocta === false) {
      // No aplica pernocta y sin autorización — alerta naranja
      return {
        icono: '⚠',
        iconoBg: 'bg-orange-100 text-orange-600',
        titulo: 'Vehículo sin Autorización',
        badge: { texto: 'Sin autorización de pernocta', clase: 'bg-orange-100 text-orange-800' },
        motivo: null,
      };
    }
    if (typeof res.estadoPernocta === 'string') {
      // Tiene autorización vigente — informativo azul
      return {
        icono: '🛡',
        iconoBg: 'bg-blue-100 text-blue-600',
        titulo: '¡Vehículo Autorizado!',
        badge: { texto: 'Autorización vigente', clase: 'bg-blue-100 text-blue-800' },
        motivo: res.estadoPernocta,
      };
    }
    // Pernocta normal en base — verde
    return {
      icono: '✓',
      iconoBg: 'bg-green-100 text-[#007A33]',
      titulo: '¡Vehículo Registrado!',
      badge: { texto: 'Pernocta en base', clase: 'bg-green-100 text-green-800' },
      motivo: null,
    };
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 mt-4">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md border border-slate-100">

        {/* Estado: esperando escaneo */}
        {!codigoEscaneado ? (
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">
              Control de Pernocta
            </h2>
            <div id="reader" className="w-full rounded-lg overflow-hidden border-2 border-[#007A33]" />
            <p className="text-sm text-slate-500 mt-4 text-center font-medium">
              Apunta la cámara al código QR del vehículo
            </p>
          </div>

        /* Estado: procesando */
        ) : isPending || resultado === null ? (
          <div className="flex flex-col items-center text-center py-10">
            <div className="w-10 h-10 border-4 border-[#007A33] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Registrando escaneo...</p>
          </div>

        /* Estado: éxito */
        ) : resultado.ok ? (() => {
          const v = getVariante(resultado);
          return (
            <div className="flex flex-col items-center text-center py-6">
              <div className={`w-16 h-16 ${v.iconoBg} rounded-full flex items-center justify-center text-3xl mb-4`}>
                {v.icono}
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">{v.titulo}</h3>

              {/* Badge de estado */}
              <span className={`px-3 py-1 rounded-full text-xs font-bold mb-4 ${v.badge.clase}`}>
                {v.badge.texto}
              </span>

              {/* Datos del vehículo */}
              <div className="text-sm text-slate-600 space-y-1 mb-4 w-full text-left bg-slate-50 rounded-lg p-3">
                <p><strong>Económico:</strong> {resultado.vehiculo.economico ?? '—'}</p>
                <p><strong>Placas:</strong> {resultado.vehiculo.placas ?? '—'}</p>
                <p><strong>Vehículo:</strong> {resultado.vehiculo.marca} {resultado.vehiculo.submarca}</p>
                {resultado.vehiculo.departamento && (
                  <p><strong>Departamento:</strong> {resultado.vehiculo.departamento}</p>
                )}
              </div>

              {/* Motivo de autorización (solo si aplica) */}
              {v.motivo && (
                <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-left">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Motivo de autorización:</p>
                  <p className="text-sm text-blue-800">{v.motivo}</p>
                </div>
              )}

              {/* Aviso si no tiene autorización */}
              {resultado.estadoPernocta === false && (
                <div className="w-full bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-left">
                  <p className="text-xs font-semibold text-orange-700 mb-1">Atención:</p>
                  <p className="text-sm text-orange-800">
                    Este vehículo no está autorizado para pernoctar fuera del parque vehicular. Reporta la situación al supervisor.
                  </p>
                </div>
              )}

              <button
                onClick={reiniciarEscaneo}
                className="w-full bg-[#007A33] hover:bg-[#005c26] text-white font-semibold rounded-lg p-3 transition-colors"
              >
                Escanear otro vehículo
              </button>
            </div>
          );
        })() : (

        /* Estado: error */
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mb-4">
              ✕
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">No se pudo registrar</h3>
            <p className="text-sm text-slate-500 mb-6">{resultado.error}</p>
            <button
              onClick={reiniciarEscaneo}
              className="w-full bg-[#007A33] hover:bg-[#005c26] text-white font-semibold rounded-lg p-3 transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
