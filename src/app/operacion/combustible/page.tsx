"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface VehiculoData {
  marcaVehiculo: string;
  submarcaVehiculo: string;
  placas: string;
  economico: string;
  kilometrajeActual: number;
  capacidadTanque: number | null; 
  limiteMensualLitros: number | null;
  litrosConsumidosMes: number;
  // 🆕 [NUEVO CFE] Para leer el historial
  historialReciente?: { id: string, litros: number, estado: string, fecha: string }[];
}

interface ErroresValidacion {
  vehiculo?: string;
  kilometraje?: string;
  litros?: string;
  importe?: string;
  justificacion?: string;
}

interface Toast {
  tipo: 'exito' | 'error' | 'info';
  mensaje: string;
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
  
  const [requiereJustificacion, setRequiereJustificacion] = useState(false);
  const [justificacion, setJustificacion] = useState('');

  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);

  const [errores, setErrores] = useState<ErroresValidacion>({});
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [intentoEnvio, setIntentoEnvio] = useState(false);

  const [fechaActual, setFechaActual] = useState(new Date());

  useEffect(() => {
    const intervalo = setInterval(() => {
      setFechaActual(new Date());
    }, 60000);
    return () => clearInterval(intervalo);
  }, []);

  const fechaFormateada = fechaActual.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const horaFormateada = fechaActual.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const precioPorLitro = useMemo(() => {
    const litrosNum = parseFloat(litros);
    const importeNum = parseFloat(importe);
    if (litrosNum > 0 && importeNum > 0) {
      return (importeNum / litrosNum).toFixed(2);
    }
    return null;
  }, [litros, importe]);

  const progresoMensual = useMemo(() => {
    if (!vehiculoData || !vehiculoData.limiteMensualLitros) return null;
    const consumidos = vehiculoData.litrosConsumidosMes;
    const limite = vehiculoData.limiteMensualLitros;
    
    const porcentaje = Math.min((consumidos / limite) * 100, 100);
    const litrosIntento = parseFloat(litros) || 0;
    const porcentajeProyectado = Math.min(((consumidos + litrosIntento) / limite) * 100, 100);
    
    let estadoTexto = '✅ Estado: Normal';
    let estadoColor = 'text-[#007A33]'; 

    const totalCalculado = consumidos + litrosIntento;

    if (totalCalculado > limite) {
      estadoTexto = '🚨 Límite Excedido';
      estadoColor = 'text-red-500';
    } else if (porcentajeProyectado >= 90) {
      estadoTexto = '⚠️ Nivel Crítico';
      estadoColor = 'text-orange-500';
    } else if (porcentajeProyectado >= 75) {
      estadoTexto = '⚠️ Consumo Alto';
      estadoColor = 'text-yellow-600';
    }

    return {
      porcentaje,
      porcentajeProyectado,
      consumidos,
      limite,
      disponibles: Math.max(limite - consumidos, 0).toFixed(2),
      estadoTexto,
      estadoColor
    };
  }, [vehiculoData, litros]);


  const pasoActual = () => {
    if (!vehiculoData) return 1;
    if (!kilometraje || !litros || !importe) return 2;
    return 3;
  };

  const pasos = [
    { numero: 1, label: 'Vehículo', completado: !!vehiculoData },
    { numero: 2, label: 'Carga', completado: !!(kilometraje && litros && importe) },
    { numero: 3, label: 'Evidencia (opc.)', completado: false },
  ];

  const mostrarToast = useCallback((tipo: Toast['tipo'], mensaje: string) => {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const validarCampos = useCallback((): boolean => {
    const nuevosErrores: ErroresValidacion = {};
    let necesitaExcepcion = false;

    if (!vehiculoData) {
      nuevosErrores.vehiculo = 'Debes escanear el QR del vehículo primero.';
    }

    const numKilometraje = Number(kilometraje);
    if (!kilometraje.trim()) {
      nuevosErrores.kilometraje = 'El kilometraje es requerido.';
    } else if (numKilometraje <= 0) {
      nuevosErrores.kilometraje = 'El kilometraje debe ser mayor a 0.';
    } else if (numKilometraje > 2000000) { 
      nuevosErrores.kilometraje = 'El kilometraje ingresado es irreal (máximo 2,000,000 km).';
    } else if (vehiculoData && numKilometraje <= vehiculoData.kilometrajeActual) {
      nuevosErrores.kilometraje = `Error: Debe ser mayor al último registrado (${vehiculoData.kilometrajeActual} km).`;
    }

    const numLitros = Number(litros);
    if (!litros.trim()) {
      nuevosErrores.litros = 'Los litros son requeridos.';
    } else if (numLitros <= 0) {
      nuevosErrores.litros = 'Los litros deben ser mayores a 0.';
    } else if (vehiculoData) {
      if (vehiculoData.capacidadTanque && numLitros > vehiculoData.capacidadTanque) {
        nuevosErrores.litros = `Error: Supera la capacidad del tanque (${vehiculoData.capacidadTanque} L).`;
      } 
      else if (vehiculoData.limiteMensualLitros) {
        const nuevoTotalMes = vehiculoData.litrosConsumidosMes + numLitros;
        if (nuevoTotalMes > vehiculoData.limiteMensualLitros) {
          necesitaExcepcion = true;
          const litrosDisponibles = vehiculoData.limiteMensualLitros - vehiculoData.litrosConsumidosMes;
          const disponiblesFormateado = litrosDisponibles > 0 ? litrosDisponibles.toFixed(2) : "0";
          if (!justificacion.trim()) {
             nuevosErrores.litros = `Límite excedido. (Disponibles: ${disponiblesFormateado} L). Se requiere justificación.`;
             nuevosErrores.justificacion = 'Debes escribir el motivo de esta carga extraordinaria.';
          }
        }
      }
    }

    setRequiereJustificacion(necesitaExcepcion);

    if (!importe.trim()) {
      nuevosErrores.importe = 'El importe es requerido.';
    } else if (Number(importe) <= 0) {
      nuevosErrores.importe = 'El importe debe ser mayor a 0.';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }, [vehiculoData, kilometraje, litros, importe, justificacion]);

  const limpiarError = (campo: keyof ErroresValidacion) => {
    setErrores(prev => {
      const nuevo = { ...prev };
      delete nuevo[campo];
      return nuevo;
    });
  };

  const handleKilometrajeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKilometraje(e.target.value);
    limpiarError('kilometraje');
  };
  
  const handleLitrosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLitros(e.target.value);
    limpiarError('litros');
    if (vehiculoData && vehiculoData.limiteMensualLitros) {
        const numLitros = Number(e.target.value);
        if (vehiculoData.litrosConsumidosMes + numLitros > vehiculoData.limiteMensualLitros) {
            setRequiereJustificacion(true);
        } else {
            setRequiereJustificacion(false);
            setJustificacion('');
            limpiarError('justificacion');
        }
    }
  };
  
  const handleImporteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImporte(e.target.value);
    limpiarError('importe');
  };

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
          kilometrajeActual: datosVehiculo.kilometrajeActual || 0,
          capacidadTanque: datosVehiculo.capacidadTanque ? parseFloat(datosVehiculo.capacidadTanque) : null,
          limiteMensualLitros: datosVehiculo.limiteMensualLitros ? parseFloat(datosVehiculo.limiteMensualLitros) : null,
          litrosConsumidosMes: datosVehiculo.litrosConsumidosMes || 0,
          // 🆕 [NUEVO CFE] Guardamos el historial
          historialReciente: datosVehiculo.historialReciente || [],
        });
        setVehiculoId(datosVehiculo.id);
        limpiarError('vehiculo');
        mostrarToast('exito', 'Vehículo identificado correctamente.');
      } else {
        setVehiculoData(null);
        setVehiculoId('');
        setErrores(prev => ({ ...prev, vehiculo: 'Código QR inválido o vehículo no encontrado.' }));
        mostrarToast('error', 'Código QR inválido o vehículo no encontrado.');
      }
    } catch (error) {
      console.error("Error al buscar el vehículo:", error);
      setErrores(prev => ({ ...prev, vehiculo: 'Error de conexión con el servidor.' }));
      mostrarToast('error', 'Error de conexión con el servidor.');
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
        () => {}
      );

      return () => {
        scanner.clear().catch(error => console.error("Fallo al limpiar escáner", error));
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarEscaner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntentoEnvio(true);

    if (!validarCampos()) {
      mostrarToast('error', 'Hay errores en el formulario. Revisa los campos marcados.');
      return;
    }

    setMostrarConfirmacion(true);
  };

  const confirmarEnvio = async () => {
    setMostrarConfirmacion(false);
    setLoading(true);

    try {
      const datos = {
        vehiculoId,
        kilometraje,
        litros,
        importe,
        esExcepcion: requiereJustificacion,
        justificacion: requiereJustificacion ? justificacion : null
      };

      const respuesta = await fetch('/api/combustible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });

      if (respuesta.ok) {
        setExito(true);
        mostrarToast('exito', 'Carga de combustible registrada con éxito.');
        setTimeout(() => {
          setExito(false);
          setVehiculoData(null);
          setVehiculoId('');
          setKilometraje('');
          setLitros('');
          setImporte('');
          setJustificacion('');
          setRequiereJustificacion(false);
          setFotoTicket(null);
          setErrores({});
          setIntentoEnvio(false);
        }, 2500);
      } else {
        const errorData = await respuesta.json().catch(() => null);
        console.error('Error en respuesta:', errorData);
        mostrarToast('error', `Error al guardar: ${respuesta.statusText || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error("Error:", error);
      mostrarToast('error', 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const cancelarConfirmacion = () => {
    setMostrarConfirmacion(false);
  };

  return (
    <div className="min-h-screen font-sans relative overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200">
      <div className="absolute inset-0 pointer-events-none">
        <svg className="absolute top-0 left-0 w-full h-64 opacity-30" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#007A33" fillOpacity="0.08" d="M0,192L48,176C96,160,192,128,288,138.7C384,149,480,203,576,208C672,213,768,171,864,160C960,149,1056,171,1152,181.3C1248,192,1344,192,1392,192L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-[#007A33]/5 blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-[#007A33]/5 blur-3xl"></div>
      </div>

      <main className="relative z-10 p-4 w-full max-w-md mx-auto">
        {toast && (
          <div className={`fixed top-4 right-4 left-4 md:left-auto md:w-96 z-[60] p-4 rounded-xl shadow-lg text-white flex items-center gap-3 ${
            toast.tipo === 'exito' ? 'bg-[#007A33]' : toast.tipo === 'error' ? 'bg-red-500' : 'bg-blue-500'
          }`}>
            <span className="text-sm font-medium flex-1">{toast.mensaje}</span>
            <button onClick={() => setToast(null)} className="text-white/80 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <Link href="/operacion" className="flex items-center gap-1 text-xs text-slate-600 hover:text-[#007A33] transition-colors mt-2 mb-4 w-fit">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </Link>

        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#007A33]"></div>

          <h1 className="text-xl font-extrabold text-slate-800 mb-1 text-center tracking-tight mt-2">
            Bitácora de Carga
          </h1>
          <p className="text-xs text-slate-500 mb-3 text-center font-medium">
            Completa los datos y anexa la evidencia
          </p>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-600 bg-slate-50/80 rounded-lg py-2 px-3 mb-4">
            <svg className="w-4 h-4 text-[#007A33]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold">{fechaFormateada}</span>
            <span className="text-slate-400">|</span>
            <span className="font-mono">{horaFormateada}</span>
          </div>

          <div className="flex items-center justify-center mb-6">
            {pasos.map((paso, index) => (
              <React.Fragment key={paso.numero}>
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
                {index < pasos.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${paso.completado ? 'bg-[#007A33]' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {mostrarEscaner && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-sm p-4 relative">
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

          {mostrarConfirmacion && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <h2 className="text-lg font-extrabold text-slate-800 mb-3 text-center">Confirmar Registro</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vehículo:</span>
                    <span className="font-semibold">{vehiculoData?.marcaVehiculo} {vehiculoData?.submarcaVehiculo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kilometraje:</span>
                    <span className="font-semibold">{kilometraje} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Litros:</span>
                    <span className="font-semibold">{litros} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Importe:</span>
                    <span className="font-semibold">${importe}</span>
                  </div>
                  {precioPorLitro && (
                    <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                      <span className="text-slate-500">Precio por litro:</span>
                      <span className="font-semibold">${precioPorLitro}</span>
                    </div>
                  )}
                  {requiereJustificacion && (
                    <div className="flex justify-between border-t border-red-200 bg-red-50 p-2 mt-2 rounded-md">
                      <span className="text-red-700 font-bold">Carga Excedente:</span>
                      <span className="font-semibold text-red-700">Requiere Revisión</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                    <span className="text-slate-500">Fecha y hora:</span>
                    <span className="font-semibold text-right">
                      {fechaFormateada}<br/>{horaFormateada}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={cancelarConfirmacion}
                    className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarEnvio}
                    disabled={loading}
                    className="flex-1 py-2.5 bg-[#007A33] hover:bg-[#005c26] text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando...
                      </>
                    ) : (
                      'Confirmar'
                    )}
                  </button>
                </div>
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
              {/* Paso 1: Identificación */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  1. Identificación
                </label>
                {!vehiculoData ? (
                  <button
                    type="button"
                    onClick={() => setMostrarEscaner(true)}
                    disabled={buscandoQR}
                    className="w-full border-2 border-dashed border-slate-300 bg-slate-50/80 backdrop-blur-sm hover:bg-[#007A33]/5 hover:border-[#007A33]/50 text-slate-500 hover:text-[#007A33] rounded-xl p-5 flex flex-col items-center justify-center transition-all group"
                  >
                    {buscandoQR ? (
                      <svg className="animate-spin h-6 w-6 text-[#007A33] mb-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="h-7 w-7 mb-1.5 text-slate-600 group-hover:text-[#007A33] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    )}
                    <span className="text-sm font-semibold">{buscandoQR ? 'Buscando padrón...' : 'Escanear Código QR'}</span>
                  </button>
                ) : (
                  <div className="space-y-3">
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
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center bg-white border border-[#007A33]/20 shadow-sm rounded-md px-1.5 py-0.5 h-6">
                              <svg className="w-3 h-3 text-slate-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                              </svg>
                              <span className="text-[9px] font-mono font-bold text-slate-700 tracking-wide truncate max-w-[90px]" title={vehiculoData.placas}>
                                {vehiculoData.placas}
                              </span>
                            </div>
                            <div className="flex items-center bg-[#007A33]/10 border border-[#007A33]/20 rounded-md px-1.5 py-0.5 h-6">
                              <svg className="w-3 h-3 text-[#007A33] mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              <span className="text-[9px] font-bold text-[#007A33] uppercase truncate max-w-[110px]" title={`Eco: ${vehiculoData.economico}`}>
                                Eco: {vehiculoData.economico}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVehiculoData(null);
                          setVehiculoId('');
                          setKilometraje('');
                          setLitros('');
                          setImporte('');
                          setMostrarEscaner(true);
                        }}
                        className="text-slate-600 hover:text-red-500 bg-white hover:bg-red-50 p-1.5 rounded-full transition-colors border border-slate-200 shrink-0"
                        title="Cambiar vehículo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* 🆕 [NUEVO CFE] DASHBOARD VISUAL DE LÍMITE MENSUAL */}
                    {progresoMensual && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            Consumo Mensual
                          </span>
                          <span className="text-xs font-extrabold text-slate-800">
                            {progresoMensual.consumidos.toFixed(2)} <span className="text-slate-400 font-medium">/ {progresoMensual.limite} L</span>
                          </span>
                        </div>
                        
                        {/* Barra de Progreso */}
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                          {/* Lo que ya se había consumido */}
                          <div 
                            className="h-full bg-slate-400 transition-all duration-500 ease-out"
                            style={{ width: `${progresoMensual.porcentaje}%` }}
                          />
                          {/* La "proyección" de lo que están tecleando ahorita */}
                          {litros && Number(litros) > 0 && (
                            <div 
                              className={`h-full transition-all duration-500 ease-out ${requiereJustificacion ? 'bg-red-400 animate-pulse' : 'bg-[#007A33]'}`}
                              style={{ width: `${progresoMensual.porcentajeProyectado - progresoMensual.porcentaje}%` }}
                            />
                          )}
                        </div>

                        <div className="flex justify-between items-center mt-2.5">
                          {/* 🆕 Estado dinámico con color */}
                          <span className={`text-[10px] font-bold ${progresoMensual.estadoColor} transition-colors duration-300`}>
                            {progresoMensual.estadoTexto}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Disponibles: {progresoMensual.disponibles} L
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 🆕 [NUEVO CFE] HISTORIAL RECIENTE PARA EL CHOFER */}
                    {vehiculoData.historialReciente && vehiculoData.historialReciente.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm mt-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Últimas 3 Cargas</p>
                        <div className="space-y-1.5">
                          {vehiculoData.historialReciente.map((ticket, i) => (
                            <div key={i} className="flex justify-between items-center text-xs bg-white px-2 py-1.5 rounded-md border border-slate-100">
                              <span className="text-slate-500 font-medium">{ticket.fecha} - <span className="font-bold text-slate-700">{ticket.litros}L</span></span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                ticket.estado === 'APROBADA' ? 'bg-green-100 text-green-700' :
                                ticket.estado === 'RECHAZADA' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {ticket.estado === 'APROBADA' ? '✓ Aprobada' : 
                                 ticket.estado === 'RECHAZADA' ? '✗ Rechazada' : 
                                 '⏳ En Revisión'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {intentoEnvio && errores.vehiculo && (
                  <p className="text-red-500 text-xs mt-1">{errores.vehiculo}</p>
                )}
              </div>

              {/* Paso 2: Datos de Carga */}
              <div className="space-y-4 pt-3 border-t border-slate-200/60">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  2. Detalles del Ticket
                </label>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#007A33] z-10">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    type="number"
                    id="kilometraje"
                    value={kilometraje}
                    onChange={handleKilometrajeChange}
                    required
                    placeholder="Kilometraje actual"
                    className={`w-full border rounded-xl py-2.5 pl-9 pr-10 outline-none focus:border-[#007A33] focus:ring-2 focus:ring-[#007A33]/20 transition-all font-medium text-sm text-slate-700 bg-white/70 backdrop-blur-sm ${
                      errores.kilometraje ? 'border-red-400' : 'border-slate-300'
                    }`}
                  />
                  <span className="absolute right-3 top-3 text-slate-400 text-xs font-bold z-10">KM</span>
                  {intentoEnvio && errores.kilometraje && (
                    <p className="text-red-500 text-xs mt-1">{errores.kilometraje}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#007A33] z-10">
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      id="litros"
                      value={litros}
                      onChange={handleLitrosChange}
                      required
                      placeholder="Litros"
                      className={`w-full border rounded-xl py-2.5 pl-9 pr-3 outline-none focus:border-[#007A33] focus:ring-2 focus:ring-[#007A33]/20 transition-all font-medium text-sm text-slate-700 bg-white/70 backdrop-blur-sm ${
                        errores.litros ? 'border-red-400' : 'border-slate-300'
                      }`}
                    />
                    {intentoEnvio && errores.litros && (
                      <p className="text-red-500 text-xs mt-1 font-semibold">{errores.litros}</p>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#007A33] font-bold text-sm z-10">
                      $
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      id="importe"
                      value={importe}
                      onChange={handleImporteChange}
                      required
                      placeholder="Importe"
                      className={`w-full border rounded-xl py-2.5 pl-7 pr-3 outline-none focus:border-[#007A33] focus:ring-2 focus:ring-[#007A33]/20 transition-all font-medium text-sm text-slate-700 bg-white/70 backdrop-blur-sm ${
                        errores.importe ? 'border-red-400' : 'border-slate-300'
                      }`}
                    />
                    {intentoEnvio && errores.importe && (
                      <p className="text-red-500 text-xs mt-1">{errores.importe}</p>
                    )}
                  </div>
                </div>

                {/* 🆕 [NUEVO CFE] CAJA DE JUSTIFICACIÓN DE EXCEPCIONES */}
                {requiereJustificacion && (
                  <div className="mt-4 p-4 border-2 border-red-200 bg-red-50/80 rounded-xl transition-all animate-in fade-in slide-in-from-top-4">
                    <label className="block text-xs font-bold text-red-700 mb-2 uppercase tracking-wide">
                      ⚠️ Justificación Requerida
                    </label>
                    <p className="text-xs text-red-600 mb-2 font-medium">
                      Estás intentando cargar más litros de los que el vehículo tiene autorizados para este mes. Por normativa de TT, debes detallar el motivo operativo.
                    </p>
                    <textarea
                      value={justificacion}
                      onChange={(e) => {
                        setJustificacion(e.target.value);
                        limpiarError('justificacion');
                      }}
                      placeholder="Ej. Viaje extraordinario a subestación por falla en transformador..."
                      className={`w-full border rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-red-400 transition-all ${
                        errores.justificacion ? 'border-red-500 bg-red-50' : 'border-red-300 bg-white'
                      }`}
                      rows={3}
                    />
                    {intentoEnvio && errores.justificacion && (
                      <p className="text-red-600 text-xs mt-1 font-bold">{errores.justificacion}</p>
                    )}
                  </div>
                )}

                {precioPorLitro && (
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600">
                    <svg className="w-4 h-4 text-[#007A33]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m-6 4h6m-6 4h6m-6 4h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                    </svg>
                    <span>Precio por litro: <strong>${precioPorLitro}</strong></span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200/60">
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  3. Evidencia (opcional)
                </label>
                <div className="mt-1 flex justify-center px-4 pt-4 pb-5 border-2 border-slate-300 border-dashed rounded-xl hover:border-[#007A33] hover:bg-[#007A33]/5 transition-all bg-slate-50/80 backdrop-blur-sm relative group cursor-pointer">
                  <div className="space-y-1.5 text-center">
                    <div className={`mx-auto h-10 w-10 rounded-full flex items-center justify-center ${fotoTicket ? 'bg-green-100 text-[#007A33]' : 'bg-slate-200 text-slate-600 group-hover:bg-[#007A33]/20 group-hover:text-[#007A33]'}`}>
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
                      {fotoTicket ? fotoTicket.name : 'Formatos PNG o JPG (opcional)'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
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
      </main>
    </div>
  );
}