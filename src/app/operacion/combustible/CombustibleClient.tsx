"use client";

import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface VehiculoData {
  marcaVehiculo: string;
  submarcaVehiculo: string;
  placas: string;
  economico: string;
}

export default function CombustibleClient() {
  const [vehiculoData, setVehiculoData] = useState<VehiculoData | null>(null);
  const [vehiculoId, setVehiculoId] = useState('');
  const [buscandoQR, setBuscandoQR] = useState(false);
  const [mostrarEscaner, setMostrarEscaner] = useState(false);

  const [kilometraje, setKilometraje] = useState('');
  const [litros, setLitros] = useState('');
  const [importe, setImporte] = useState('');
  const [fotoTicket, setFotoTicket] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);

  // Función para determinar el paso actual del stepper
  const pasoActual = () => {
    if (!vehiculoData) return 1;
    if (!kilometraje || !litros || !importe) return 2;
    if (!fotoTicket) return 3;
    return 4; // todos completados
  };

  const pasos = [
    { numero: 1, label: 'Vehículo', completado: !!vehiculoData },
    { numero: 2, label: 'Carga', completado: !!(kilometraje && litros && importe) },
    { numero: 3, label: 'Evidencia', completado: !!fotoTicket },
  ];

  const procesarQRReal = async (qrEscaneado: string) => {
    setBuscandoQR(true);
    try {
      const respuesta = await fetch(`/api/vehiculos/${qrEscaneado}`);
      if (respuesta.ok) {
        const datosVehiculo = await respuesta.json();
        setVehiculoData({
          marcaVehiculo: datosVehiculo.marcaVehiculo,
          submarcaVehiculo: datosVehiculo.submarcaVehiculo,
          placas: datosVehiculo.placas || 'S/N',
          economico: datosVehiculo.economico || 'S/N',
        });
        setVehiculoId(datosVehiculo.id);
      } else {
        alert("⚠️ Código QR inválido o vehículo no encontrado en el padrón de CFE.");
        setVehiculoData(null);
        setVehiculoId('');
      }
    } catch (error) {
      console.error("Error al buscar el vehículo:", error);
      alert("Error de conexión con el servidor.");
    } finally {
      setBuscandoQR(false);
    }
  };

  useEffect(() => {
    if (mostrarEscaner) {
      const scanner = new Html5QrcodeScanner(
        "lector-qr",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        async (textoEscaneado) => {
          scanner.clear();
          setMostrarEscaner(false);
          await procesarQRReal(textoEscaneado);
        },
        () => {
          // Errores de lectura ignorados
        }
      );

      return () => {
        scanner.clear().catch(error => console.error("Fallo al limpiar escáner", error));
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarEscaner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const respuesta = await fetch('/api/combustible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculoId,
          kilometraje,
          litros,
          importe,
        }),
      });

      if (respuesta.ok) {
        setExito(true);
        setTimeout(() => {
          setExito(false);
          setVehiculoData(null);
          setVehiculoId('');
          setKilometraje('');
          setLitros('');
          setImporte('');
          setFotoTicket(null);
        }, 2500);
      } else {
        alert("Hubo un error al intentar guardar el registro.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 w-full max-w-md mx-auto">
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 relative overflow-hidden">
        {/* Decoración superior sutil */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#007A33]"></div>

        <h1 className="text-xl font-extrabold text-slate-800 mb-1 text-center tracking-tight mt-2">
          Bitácora de Carga
        </h1>
        <p className="text-xs text-slate-500 mb-5 text-center font-medium">
          Completa los datos y anexa la evidencia
        </p>

        {/* ----- STEPPER DE PROGRESO (MEJORA #2) ----- */}
        <div className="flex items-center justify-center mb-6">
          {pasos.map((paso, index) => (
            <React.Fragment key={paso.numero}>
              {/* Círculo del paso */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    paso.completado
                      ? 'bg-[#007A33] text-white'
                      : pasoActual() === paso.numero
                      ? 'bg-[#007A33]/20 text-[#007A33] border-2 border-[#007A33]'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {paso.completado ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    paso.numero
                  )}
                </div>
                <span className="text-[10px] font-semibold text-slate-600 mt-1">{paso.label}</span>
              </div>
              {/* Línea conectora */}
              {index < pasos.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    paso.completado ? 'bg-[#007A33]' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ----- MODAL DEL ESCÁNER (MEJORA #1) ----- */}
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
              <div id="lector-qr" className="w-full overflow-hidden rounded-lg shadow-sm border border-slate-200 bg-black"></div>
            </div>
          </div>
        )}

        {exito ? (
          <div className="bg-[#007A33]/5 border border-[#007A33]/20 rounded-xl p-6 flex flex-col items-center text-center animate-pulse my-6">
            <div className="w-12 h-12 bg-[#007A33] text-white rounded-full flex items-center justify-center text-xl mb-3 shadow-md ring-4 ring-[#007A33]/10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-extrabold text-[#007A33]">¡Registro Exitoso!</h2>
            <p className="text-xs text-slate-600 mt-1 font-medium">La carga de combustible se guardó en el sistema.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Paso 1: Escanear Vehículo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                1. Identificación
              </label>

              {!vehiculoData ? (
                <button
                  type="button"
                  onClick={() => setMostrarEscaner(true)}
                  disabled={buscandoQR}
                  className="w-full border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-[#007A33]/5 hover:border-[#007A33]/50 text-slate-500 hover:text-[#007A33] rounded-xl p-5 flex flex-col items-center justify-center transition-all group"
                >
                  {buscandoQR ? (
                    <svg className="animate-spin h-6 w-6 text-[#007A33] mb-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-7 w-7 mb-1.5 text-slate-400 group-hover:text-[#007A33] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  )}
                  <span className="text-sm font-semibold">{buscandoQR ? 'Buscando padrón...' : 'Escanear Código QR'}</span>
                </button>
              ) : (
                <div className="bg-[#007A33]/5 border border-[#007A33]/20 rounded-xl p-3.5 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3 w-full">
                    <div className="bg-white p-2 rounded-full shadow-sm text-[#007A33] border border-[#007A33]/10 shrink-0">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                      </svg>
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      <p className="font-extrabold text-slate-800 text-sm leading-tight truncate">
                        {vehiculoData.marcaVehiculo} {vehiculoData.submarcaVehiculo}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white border border-[#007A33]/20 shadow-sm rounded-md px-1.5 py-0.5">
                          <svg className="w-3 h-3 text-slate-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                          <span className="text-[10px] font-mono font-bold text-slate-700 tracking-wide">{vehiculoData.placas}</span>
                        </div>
                        <div className="flex items-center bg-[#007A33]/10 border border-[#007A33]/20 rounded-md px-1.5 py-0.5">
                          <svg className="w-3 h-3 text-[#007A33] mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span className="text-[10px] font-bold text-[#007A33] uppercase">Eco: {vehiculoData.economico}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVehiculoData(null);
                      setVehiculoId('');
                      setMostrarEscaner(true);
                    }}
                    className="text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 p-1.5 rounded-full transition-colors border border-slate-200 shrink-0"
                    title="Cambiar vehículo"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Paso 2: Datos de Carga */}
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                2. Detalles del Ticket
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <input
                  type="number"
                  id="kilometraje"
                  value={kilometraje}
                  onChange={(e) => setKilometraje(e.target.value)}
                  required
                  placeholder="Kilometraje actual"
                  className="w-full border border-slate-300 rounded-xl py-2.5 pl-9 pr-10 outline-none focus:border-[#007A33] focus:ring-2 focus:ring-[#007A33]/20 transition-all font-medium text-sm text-slate-700"
                />
                <span className="absolute right-3 top-3 text-slate-400 text-xs font-bold">KM</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    id="litros"
                    value={litros}
                    onChange={(e) => setLitros(e.target.value)}
                    required
                    placeholder="Litros"
                    className="w-full border border-slate-300 rounded-xl py-2.5 pl-9 pr-3 outline-none focus:border-[#007A33] focus:ring-2 focus:ring-[#007A33]/20 transition-all font-medium text-sm text-slate-700"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#007A33] font-bold text-sm">
                    $
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    id="importe"
                    value={importe}
                    onChange={(e) => setImporte(e.target.value)}
                    required
                    placeholder="Importe"
                    className="w-full border border-slate-300 rounded-xl py-2.5 pl-7 pr-3 outline-none focus:border-[#007A33] focus:ring-2 focus:ring-[#007A33]/20 transition-all font-medium text-sm text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Paso 3: Foto del Ticket */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                3. Evidencia
              </label>
              <div className="mt-1 flex justify-center px-4 pt-4 pb-5 border-2 border-slate-300 border-dashed rounded-xl hover:border-[#007A33] hover:bg-[#007A33]/5 transition-all bg-slate-50 relative group cursor-pointer">
                <div className="space-y-1.5 text-center">
                  <div className={`mx-auto h-10 w-10 rounded-full flex items-center justify-center ${fotoTicket ? 'bg-green-100 text-[#007A33]' : 'bg-slate-200 text-slate-500 group-hover:bg-[#007A33]/20 group-hover:text-[#007A33]'}`}>
                    {fotoTicket ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex text-xs text-slate-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-bold text-[#007A33] hover:text-[#005c26] focus-within:outline-none px-1">
                      <span>{fotoTicket ? 'Cambiar fotografía' : 'Tomar o subir foto'}</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setFotoTicket(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {fotoTicket ? fotoTicket.name : 'Formatos PNG o JPG'}
                  </p>
                </div>
              </div>
            </div>

            {/* Botón de Guardar */}
            <button
              type="submit"
              disabled={loading || !vehiculoId}
              className="w-full bg-[#007A33] hover:bg-[#005c26] text-white font-bold rounded-xl py-3.5 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed mt-4 text-sm flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Guardar Carga
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}