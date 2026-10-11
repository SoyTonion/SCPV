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
  historialReciente?: { id: string, litros: number, estado: string, fecha: string }[];
  preautorizacionActiva?: { id: string, litros: number, horaFin: string } | null;
}

interface Toast {
  tipo: 'exito' | 'error' | 'info';
  mensaje: string;
}

type FaseOperacion = 'IDENTIFICACION' | 'SOLICITUD' | 'ESPERANDO_APROBACION' | 'CARGA_Y_COMPROBACION' | 'FINALIZADO';

const PLANTILLAS_MOTIVO_AJUSTE = [
  '🤖 IA no detectó texto / reflejo',
  '🧾 Ticket arrugado o desgastado',
  '📸 Tablero oscuro / reflejo en odómetro',
  '🪙 Corrección de centavos o decimales',
  '⛽ Lectura manual en bomba',
  '✍️ Otro motivo'
];

export default function CombustibleClient() {
  const [fase, setFase] = useState<FaseOperacion>('IDENTIFICACION');
  const [toast, setToast] = useState<Toast | null>(null);

  // Datos del Vehículo
  const [vehiculoData, setVehiculoData] = useState<VehiculoData | null>(null);
  const [vehiculoId, setVehiculoId] = useState('');
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [buscandoQR, setBuscandoQR] = useState(false);

  // Fase de Solicitud (Antes de Cargar)
  const [litrosSolicitados, setLitrosSolicitados] = useState('');
  const [requiereJustificacion, setRequiereJustificacion] = useState(false);
  const [justificacion, setJustificacion] = useState('');

  // Fase de Comprobación (Después de Cargar - Evidencia OCR)
  const [fotoTicket, setFotoTicket] = useState<File | null>(null);
  const [fotoOdometro, setFotoOdometro] = useState<File | null>(null);
  const [procesandoTicket, setProcesandoTicket] = useState(false);
  const [procesandoOdometro, setProcesandoOdometro] = useState(false);
  const [capturaManualTicket, setCapturaManualTicket] = useState(false);
  const [capturaManualOdometro, setCapturaManualOdometro] = useState(false);
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);

  // Motivo / Nota de ajuste o captura manual
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [notaAjustePersonalizada, setNotaAjustePersonalizada] = useState('');

  // Datos extraídos por la IA (o manuales)
  const [litrosExtraidos, setLitrosExtraidos] = useState('');
  const [importeExtraido, setImporteExtraido] = useState('');
  const [kilometrajeExtraido, setKilometrajeExtraido] = useState('');

  // Valores originales tal cual los extrajo la IA (para auditoría)
  const [ocrLitros, setOcrLitros] = useState('');
  const [ocrImporte, setOcrImporte] = useState('');
  const [ocrOdometro, setOcrOdometro] = useState('');

  // Estados generales
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const [fechaActual, setFechaActual] = useState(new Date());

  useEffect(() => {
    const intervalo = setInterval(() => {
      setFechaActual(new Date());
    }, 60000);
    return () => clearInterval(intervalo);
  }, []);

  const mostrarToast = useCallback((tipo: Toast['tipo'], mensaje: string) => {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const limpiarError = (campo: string) => {
    setErrores(prev => {
      const nuevo = { ...prev };
      delete nuevo[campo];
      return nuevo;
    });
  };

  const progresoMensual = useMemo(() => {
    if (!vehiculoData || !vehiculoData.limiteMensualLitros) return null;
    const consumidos = vehiculoData.litrosConsumidosMes;
    const limite = vehiculoData.limiteMensualLitros;

    const porcentaje = Math.min((consumidos / limite) * 100, 100);
    const litrosIntento = parseFloat(litrosSolicitados) || 0;
    const porcentajeProyectado = Math.min(((consumidos + litrosIntento) / limite) * 100, 100);

    let estadoColor = 'text-[#007A33]';
    if (consumidos + litrosIntento > limite) estadoColor = 'text-red-500';

    return {
      porcentaje,
      porcentajeProyectado,
      consumidos,
      limite,
      disponibles: Math.max(limite - consumidos, 0).toFixed(2),
      estadoColor
    };
  }, [vehiculoData, litrosSolicitados]);

  // ==========================================
  // FASE 1: Identificación (Escáner QR)
  // ==========================================
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
          limiteMensualLitros: datosVehiculo.preautorizacionActiva ?
            ((datosVehiculo.limiteMensualLitros ? parseFloat(datosVehiculo.limiteMensualLitros) : 0) + parseFloat(datosVehiculo.preautorizacionActiva.litros)) :
            (datosVehiculo.limiteMensualLitros ? parseFloat(datosVehiculo.limiteMensualLitros) : null),
          litrosConsumidosMes: datosVehiculo.litrosConsumidosMes || 0,
          historialReciente: datosVehiculo.historialReciente || [],
          preautorizacionActiva: datosVehiculo.preautorizacionActiva || null,
        });
        setVehiculoId(datosVehiculo.id);
        limpiarError('vehiculo');
        setFase('SOLICITUD'); // Avanzamos a fase 2
        mostrarToast('exito', 'Vehículo identificado. Solicita el combustible.');
      } else {
        mostrarToast('error', 'Código QR inválido o vehículo no encontrado.');
      }
    } catch (error) {
      console.error(error);
      mostrarToast('error', 'Error de conexión con el servidor.');
    } finally {
      setBuscandoQR(false);
    }
  };

  useEffect(() => {
    if (mostrarEscaner && fase === 'IDENTIFICACION') {
      const scanner = new Html5QrcodeScanner("lector-qr", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render(
        async (textoEscaneado) => {
          scanner.clear();
          setMostrarEscaner(false);
          await procesarQRReal(textoEscaneado);
        },
        () => { }
      );
      return () => { scanner.clear().catch(e => console.error(e)); };
    }
  }, [mostrarEscaner, fase]);

  // ==========================================
  // FASE 2: Solicitud de Combustible
  // ==========================================
  const handleLitrosSolicitados = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLitrosSolicitados(val);
    limpiarError('litrosSolicitados');

    if (vehiculoData && vehiculoData.limiteMensualLitros) {
      const numLitros = parseFloat(val) || 0;
      if (vehiculoData.litrosConsumidosMes + numLitros > vehiculoData.limiteMensualLitros) {
        setRequiereJustificacion(true);
      } else {
        setRequiereJustificacion(false);
        setJustificacion('');
        limpiarError('justificacion');
      }
    }
  };

  const enviarSolicitud = () => {
    const num = parseFloat(litrosSolicitados);
    if (!num || num <= 0) {
      setErrores({ litrosSolicitados: 'Ingresa una cantidad válida' });
      return;
    }
    if (vehiculoData && vehiculoData.capacidadTanque && num > vehiculoData.capacidadTanque) {
      setErrores({ litrosSolicitados: `La cantidad (${num} L) no puede superar la capacidad del tanque (${vehiculoData.capacidadTanque} L).` });
      return;
    }
    if (requiereJustificacion && !justificacion.trim()) {
      setErrores({ justificacion: 'Debes escribir el motivo del excedente' });
      return;
    }

    if (requiereJustificacion) {
      // Si se pasa del límite, lo mandamos a "Esperando Aprobación" del Administrador
      setFase('ESPERANDO_APROBACION');

      // Simulación de que el Admin lo aprueba en 4 segundos para la Demo
      setTimeout(() => {
        setFase('CARGA_Y_COMPROBACION');
        mostrarToast('exito', 'El Administrador ha APROBADO la solicitud extraordinaria.');
      }, 4000);
    } else {
      // Si está dentro del límite, pasa directo
      setFase('CARGA_Y_COMPROBACION');
    }
  };

  // Comprobación de si hubo ajuste manual o falta de lectura IA
  const huboAjusteManual = useMemo(() => {
    if (capturaManualTicket || capturaManualOdometro) return true;
    if (ocrLitros && litrosExtraidos && litrosExtraidos !== ocrLitros) return true;
    if (ocrImporte && importeExtraido && importeExtraido !== ocrImporte) return true;
    if (ocrOdometro && kilometrajeExtraido && kilometrajeExtraido !== ocrOdometro) return true;
    if (!ocrLitros && litrosExtraidos) return true;
    if (!ocrOdometro && kilometrajeExtraido) return true;
    return false;
  }, [capturaManualTicket, capturaManualOdometro, ocrLitros, litrosExtraidos, ocrImporte, importeExtraido, ocrOdometro, kilometrajeExtraido]);

  // ==========================================
  // FASE 3/4: Comprobación (Carga y OCR)
  // ==========================================
  const simularOCRTicket = async (file: File) => {
    setProcesandoTicket(true);
    setFotoTicket(file);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/ocr-ticket', {
        method: 'POST',
        body: formData
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.exito && (data.litros || data.total)) {
        if (data.litros) {
          setLitrosExtraidos(String(data.litros));
          setOcrLitros(String(data.litros));
        }
        if (data.total) {
          setImporteExtraido(String(data.total));
          setOcrImporte(String(data.total));
        }
        limpiarError('ticket');

        if (!data.litros || !data.total) {
          mostrarToast('info', 'Lectura parcial de IA: Falta ' + (!data.litros ? 'litros' : 'importe') + '. Favor de verificar que la foto sea legible y rellenar los campos manualmente abajo.');
          setCapturaManualTicket(true);
        } else {
          mostrarToast('exito', 'Ticket leído exitosamente por IA.');
        }
      } else {
        mostrarToast('info', data?.mensaje || 'No se detectaron datos en el ticket. Favor de asegurarse de tomar una foto nítida y legible del ticket y rellenar los campos manualmente abajo.');
        setCapturaManualTicket(true);
      }
    } catch (e) {
      console.error(e);
      mostrarToast('info', 'No se pudo conectar con el escáner de IA. Favor de asegurar foto legible y rellenar los campos manualmente abajo.');
      setCapturaManualTicket(true);
    } finally {
      setProcesandoTicket(false);
    }
  };

  const simularOCROdometro = async (file: File) => {
    setProcesandoOdometro(true);
    setFotoOdometro(file);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/ocr-odometro', {
        method: 'POST',
        body: formData
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.exito && data?.odometro) {
        setKilometrajeExtraido(String(data.odometro));
        setOcrOdometro(String(data.odometro));
        limpiarError('odometro');
        mostrarToast('exito', 'Kilometraje extraído con IA.');
      } else {
        mostrarToast('info', data?.mensaje || 'No se detectó el kilometraje en el tablero. Favor de verificar que la foto sea legible y capturar el kilometraje manualmente abajo.');
        setCapturaManualOdometro(true);
      }
    } catch (e) {
      console.error(e);
      mostrarToast('info', 'No se pudo conectar con el escáner de IA. Favor de verificar foto legible y capturar odómetro manualmente abajo.');
      setCapturaManualOdometro(true);
    } finally {
      setProcesandoOdometro(false);
    }
  };

  const finalizarComprobacion = async () => {
    setMostrarModalConfirmacion(false);

    let etiquetasAlerta: string[] = [];

    // Evaluar Ticket
    if (ocrLitros === '' || ocrImporte === '') etiquetasAlerta.push('[TIPO_B] TICKET_ILEGIBLE');
    else if (litrosExtraidos !== ocrLitros || importeExtraido !== ocrImporte) etiquetasAlerta.push('[TIPO_A] TICKET_ALTERADO');

    // Evaluar Odómetro
    if (ocrOdometro === '') etiquetasAlerta.push('[TIPO_B] ODOMETRO_ILEGIBLE');
    else if (kilometrajeExtraido !== ocrOdometro) etiquetasAlerta.push('[TIPO_A] ODOMETRO_ALTERADO');

    // Evaluar Discrepancia Operativa (Paso 1 vs Paso 3)
    if (parseFloat(litrosExtraidos) !== parseFloat(litrosSolicitados)) etiquetasAlerta.push('[TIPO_C] DISCREPANCIA_VOLUMEN');

    const falsoPositivo = etiquetasAlerta.length > 0;

    // Si hubo ajuste manual o falta de lectura IA, adjuntar nota explicativa
    const notaExplicativa = [motivoAjuste, notaAjustePersonalizada.trim()].filter(Boolean).join(' - ');
    const fragmentoAjuste = huboAjusteManual
      ? `[MOTIVO_AJUSTE_MANUAL]: ${notaExplicativa || 'Captura manual por el operador (sin notas)'}`
      : '';

    const partesJustificacion: string[] = [];
    if (etiquetasAlerta.length > 0) partesJustificacion.push(etiquetasAlerta.join(', '));
    if (fragmentoAjuste) partesJustificacion.push(fragmentoAjuste);
    if (justificacion) partesJustificacion.push(`Excedente Autorizado: ${justificacion}`);

    const justificacionFinal = partesJustificacion.join(' | ');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('vehiculoId', vehiculoId);
      formData.append('kilometraje', kilometrajeExtraido);
      if (ocrOdometro) formData.append('kilometrajeOcr', ocrOdometro);

      formData.append('litros', litrosExtraidos);
      if (ocrLitros) formData.append('litrosOcr', ocrLitros);

      formData.append('importe', importeExtraido);
      if (ocrImporte) formData.append('importeOcr', ocrImporte);
      formData.append('esExcepcion', String(requiereJustificacion));
      formData.append('falsoPositivo', String(falsoPositivo || huboAjusteManual)); // Para la bandeja de auditoría

      if (justificacionFinal) formData.append('justificacion', justificacionFinal);
      if (fotoTicket) formData.append('evidencia', fotoTicket);
      if (fotoOdometro) formData.append('evidenciaOdometro', fotoOdometro);

      const respuesta = await fetch('/api/combustible', {
        method: 'POST',
        body: formData,
      });

      if (respuesta.ok) {
        setFase('FINALIZADO');
      } else {
        const errorData = await respuesta.json().catch(() => null);
        mostrarToast('error', errorData?.error || 'Error al guardar en base de datos.');
      }
    } catch (error) {
      mostrarToast('error', 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-sans relative overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200">
      <div className="absolute inset-0 pointer-events-none">
        <svg className="absolute top-0 left-0 w-full h-64 opacity-30" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#007A33" fillOpacity="0.08" d="M0,192L48,176C96,160,192,128,288,138.7C384,149,480,203,576,208C672,213,768,171,864,160C960,149,1056,171,1152,181.3C1248,192,1344,192,1392,192L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
      </div>

      <main className="relative z-10 p-4 w-full max-w-md mx-auto">
        {toast && (
          <div className={`fixed top-4 right-4 left-4 z-[60] p-4 rounded-xl shadow-lg text-white flex items-center gap-3 ${toast.tipo === 'exito' ? 'bg-[#007A33]' : 'bg-red-500'}`}>
            <span className="text-sm font-medium flex-1">{toast.mensaje}</span>
            <button onClick={() => setToast(null)}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        )}

        <Link href="/operacion" className="flex items-center gap-1 text-xs text-slate-600 hover:text-[#007A33] mt-2 mb-4">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          Volver
        </Link>

        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-lg border border-slate-200 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-2 ${fase === 'CARGA_Y_COMPROBACION' || fase === 'FINALIZADO' ? 'bg-green-500' : 'bg-[#007A33]'}`}></div>

          {/* Stepper Superior */}
          <div className="flex justify-between items-center mb-6 mt-3 px-2">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${(fase === 'IDENTIFICACION' && num === 1) || (fase === 'SOLICITUD' && num === 2) || (fase === 'CARGA_Y_COMPROBACION' && num === 3)
                  ? 'bg-[#007A33] text-white ring-2 ring-[#007A33]/30 ring-offset-2'
                  : num < (fase === 'CARGA_Y_COMPROBACION' || fase === 'FINALIZADO' ? 4 : fase === 'SOLICITUD' ? 2 : 1)
                    ? 'bg-green-100 text-[#007A33]'
                    : 'bg-slate-200 text-slate-400'
                  }`}>
                  {num}
                </div>
                {num < 3 && <div className="w-8 h-0.5 mx-1 bg-slate-200"></div>}
              </div>
            ))}
          </div>

          {/* =========================================
              PANTALLA 1: IDENTIFICACIÓN
          ========================================= */}
          {fase === 'IDENTIFICACION' && (
            <div className="animate-in fade-in zoom-in-95">
              <h1 className="text-xl font-extrabold text-slate-800 text-center mb-1">Identificar Vehículo</h1>
              <p className="text-xs text-slate-500 text-center mb-6">Paso 1: Autorización Pre-Carga</p>

              {!mostrarEscaner ? (
                <button
                  onClick={() => setMostrarEscaner(true)}
                  className="w-full border-2 border-dashed border-[#007A33]/50 bg-[#007A33]/5 text-[#007A33] rounded-xl p-8 flex flex-col items-center justify-center hover:bg-[#007A33]/10 transition-colors"
                >
                  <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                  <span className="font-bold">Escanear QR del Vehículo</span>
                </button>
              ) : (
                <div className="rounded-xl overflow-hidden shadow-inner border border-slate-200">
                  <div id="lector-qr" className="w-full bg-black"></div>
                  <button onClick={() => setMostrarEscaner(false)} className="w-full py-2 bg-red-50 text-red-600 font-bold text-xs uppercase tracking-wider">Cancelar</button>
                </div>
              )}
            </div>
          )}

          {/* =========================================
              PANTALLA 2: SOLICITUD
          ========================================= */}
          {fase === 'SOLICITUD' && vehiculoData && (
            <div className="animate-in slide-in-from-right">
              <h1 className="text-xl font-extrabold text-slate-800 text-center mb-1">Solicitar Autorización</h1>
              <p className="text-xs text-slate-500 text-center mb-4">Paso 2: ¿Cuántos litros requieres?</p>

              <div className="bg-[#007A33]/5 border border-[#007A33]/20 p-3 rounded-xl mb-4 flex justify-between items-center">
                <div>
                  <p className="font-extrabold text-slate-800 text-sm">{vehiculoData.marcaVehiculo} {vehiculoData.submarcaVehiculo}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Eco: {vehiculoData.economico} | Placas: {vehiculoData.placas}</p>
                </div>
                <button onClick={() => setFase('IDENTIFICACION')} className="text-red-500 bg-red-50 p-2 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>

              {progresoMensual && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-600">Límite Mensual</span>
                    <span className={progresoMensual.estadoColor}>{progresoMensual.consumidos.toFixed(1)} / {progresoMensual.limite} L</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full flex overflow-hidden">
                    <div className="bg-slate-400 h-full" style={{ width: `${progresoMensual.porcentaje}%` }} />
                    <div className={`h-full ${requiereJustificacion ? 'bg-red-500 animate-pulse' : 'bg-[#007A33]'}`} style={{ width: `${progresoMensual.porcentajeProyectado - progresoMensual.porcentaje}%` }} />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Litros a cargar:</label>
                  <div className="relative">
                    <input
                      type="number" value={litrosSolicitados} onChange={handleLitrosSolicitados}
                      className="w-full text-2xl font-black text-center py-4 rounded-xl border-2 border-slate-200 outline-none focus:border-[#007A33] transition-colors"
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-5 font-bold text-slate-400">LTS</span>
                  </div>
                  {errores.litrosSolicitados && <p className="text-red-500 text-xs font-bold mt-1 text-center">{errores.litrosSolicitados}</p>}
                </div>

                {requiereJustificacion && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl animate-in zoom-in">
                    <p className="text-xs font-bold text-red-700 mb-1">⚠️ Límite Excedido. Requiere Aprobación del Admin.</p>
                    <textarea
                      value={justificacion} onChange={e => { setJustificacion(e.target.value); limpiarError('justificacion') }}
                      placeholder="Escribe el motivo operativo..." rows={2}
                      className="w-full p-2 text-sm border border-red-300 rounded-lg outline-none focus:ring-2 focus:ring-red-400"
                    />
                    {errores.justificacion && <p className="text-red-600 text-[10px] font-bold mt-1">{errores.justificacion}</p>}
                  </div>
                )}

                <button onClick={enviarSolicitud} className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-slate-900 flex justify-center items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  Solicitar Autorización
                </button>
              </div>
            </div>
          )}

          {/* =========================================
              PANTALLA 3: ESPERANDO APROBACIÓN
          ========================================= */}
          {fase === 'ESPERANDO_APROBACION' && (
            <div className="py-10 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-amber-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center border-4 border-white shadow-xl relative z-10">
                  <svg className="w-10 h-10 text-amber-500 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 mb-2">Esperando Aprobación</h2>
              <p className="text-sm text-slate-500 font-medium px-4">
                La solicitud de excedente fue enviada al <strong>Administrador del Parque Vehicular</strong>. <br /><br />
                Por favor, no cargues combustible hasta que la pantalla cambie a verde.
              </p>
              {/* Botón Mágico Solo Para la Demo */}
              <button onClick={() => { setFase('CARGA_Y_COMPROBACION'); mostrarToast('exito', 'Aprobación Forzada para Demo'); }} className="mt-8 text-[10px] text-slate-400 border border-slate-200 px-2 py-1 rounded-md">Simular Aprobación (Demo)</button>
            </div>
          )}

          {/* =========================================
              PANTALLA 4: COMPROBACIÓN POST-CARGA
          ========================================= */}
          {fase === 'CARGA_Y_COMPROBACION' && (
            <div className="animate-in slide-in-from-right">
              <div className="bg-green-500 text-white p-3 rounded-xl mb-5 shadow-lg shadow-green-500/20 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-20 transform rotate-12 scale-150"><svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg></div>
                <h1 className="text-lg font-black uppercase tracking-widest relative z-10">Autorizado</h1>
                <p className="text-sm font-medium relative z-10">Puedes despachar <strong>{litrosSolicitados} Litros</strong>.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Comprobación: Sube las Evidencias</h3>
                  <div className="grid grid-cols-2 gap-3">

                    {/* Botón OCR Ticket */}
                    <div className={`relative border-2 ${fotoTicket ? 'border-[#007A33] bg-green-50' : 'border-dashed border-slate-300 bg-slate-50'} rounded-xl p-4 flex flex-col items-center text-center transition-all`}>
                      {procesandoTicket ? (
                        <>
                          <svg className="animate-spin h-6 w-6 text-[#007A33] mb-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          <span className="text-[10px] font-bold text-[#007A33]">Extrayendo...</span>
                        </>
                      ) : (
                        <>
                          <label className="absolute inset-0 cursor-pointer z-10"><input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && simularOCRTicket(e.target.files[0])} /></label>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${fotoTicket ? 'bg-[#007A33] text-white' : 'bg-slate-200 text-slate-500'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                          <span className="text-xs font-bold text-slate-800">{fotoTicket ? 'Ticket OK' : 'Foto Ticket'}</span>
                        </>
                      )}
                    </div>

                    {/* Botón OCR Odómetro */}
                    <div className={`relative border-2 ${fotoOdometro ? 'border-[#007A33] bg-green-50' : 'border-dashed border-slate-300 bg-slate-50'} rounded-xl p-4 flex flex-col items-center text-center transition-all`}>
                      {procesandoOdometro ? (
                        <>
                          <svg className="animate-spin h-6 w-6 text-[#007A33] mb-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          <span className="text-[10px] font-bold text-[#007A33]">Extrayendo...</span>
                        </>
                      ) : (
                        <>
                          <label className="absolute inset-0 cursor-pointer z-10"><input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && simularOCROdometro(e.target.files[0])} /></label>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${fotoOdometro ? 'bg-[#007A33] text-white' : 'bg-slate-200 text-slate-500'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                          <span className="text-xs font-bold text-slate-800">{fotoOdometro ? 'Tablero OK' : 'Foto Odómetro'}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Datos de la Operación</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="flex justify-between items-center">
                        <p className="text-[9px] text-slate-400">LITROS (TICKET)</p>
                        {fotoTicket && <button onClick={() => setCapturaManualTicket(!capturaManualTicket)} className="text-[9px] text-[#007A33] font-bold uppercase underline">¿Corregir?</button>}
                      </div>
                      {capturaManualTicket ? <input type="number" value={litrosExtraidos} onChange={e => setLitrosExtraidos(e.target.value)} className="w-full border rounded px-1 py-0.5 text-xs font-bold" /> : <p className="font-bold text-sm text-slate-800">{litrosExtraidos || '--'}</p>}
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <p className="text-[9px] text-slate-400">IMPORTE</p>
                        {fotoTicket && <button onClick={() => setCapturaManualTicket(!capturaManualTicket)} className="text-[9px] text-[#007A33] font-bold uppercase underline">¿Corregir?</button>}
                      </div>
                      {capturaManualTicket ? <input type="number" value={importeExtraido} onChange={e => setImporteExtraido(e.target.value)} className="w-full border rounded px-1 py-0.5 text-xs font-bold" /> : <p className="font-bold text-sm text-slate-800">${importeExtraido || '--'}</p>}
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <p className="text-[9px] text-slate-400">KILOMETRAJE</p>
                        {fotoOdometro && <button onClick={() => setCapturaManualOdometro(!capturaManualOdometro)} className="text-[9px] text-[#007A33] font-bold uppercase underline">¿Corregir?</button>}
                      </div>
                      {capturaManualOdometro ? (
                        <input
                          type="number"
                          value={kilometrajeExtraido}
                          onChange={e => setKilometrajeExtraido(e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-xs font-bold"
                          placeholder={`> ${vehiculoData?.kilometrajeActual || 0}`}
                        />
                      ) : (
                        <p className="font-bold text-sm text-slate-800">{kilometrajeExtraido || '--'}</p>
                      )}
                      {vehiculoData && (
                        <span className="text-[8px] text-slate-400 block mt-0.5">Actual: {vehiculoData.kilometrajeActual} KM</span>
                      )}
                    </div>
                  </div>
                  {/* Alerta si hay discrepancia */}
                  {(litrosExtraidos && parseFloat(litrosExtraidos) !== parseFloat(litrosSolicitados)) && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 p-2 rounded flex gap-2 items-start">
                      <span className="text-amber-500 text-xs">⚠️</span>
                      <p className="text-[10px] text-amber-800 font-medium">Los litros del ticket ({litrosExtraidos}) no coinciden con la autorización ({litrosSolicitados}). Esto generará una notificación para la Secretaria.</p>
                    </div>
                  )}

                  {/* Banner y selector de motivo de ajuste si el operador editó o ingresó a mano */}
                  {(capturaManualTicket || capturaManualOdometro || (ocrLitros && litrosExtraidos !== ocrLitros) || (ocrOdometro && kilometrajeExtraido !== ocrOdometro)) && (
                    <div className="mt-3 p-3 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2.5 animate-in fade-in">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-600 text-sm mt-0.5">ℹ️</span>
                        <div>
                          <p className="text-xs font-bold text-amber-900">
                            Captura / Corrección Manual Activada
                          </p>
                          <p className="text-[11px] text-amber-800 leading-snug">
                            Si el sistema fallo favor de aun asi volver a tomar las fotos físicas y que estas sean <strong>nítidas y legibles</strong>. La Mesa de Control auditará tus fotos contra los valores capturados.
                          </p>
                        </div>
                      </div>

                      {/* Plantillas de Motivo */}
                      <div className="pt-1 border-t border-amber-200/70">
                        <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                          ¿Por qué se modificó o capturó a mano? (Selecciona una opción):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {PLANTILLAS_MOTIVO_AJUSTE.map((plantilla) => (
                            <button
                              key={plantilla}
                              type="button"
                              onClick={() => setMotivoAjuste(plantilla)}
                              className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all text-left ${motivoAjuste === plantilla
                                ? 'bg-[#007A33] text-white font-bold shadow-sm ring-1 ring-green-600'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                              {plantilla}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={notaAjustePersonalizada}
                          onChange={(e) => setNotaAjustePersonalizada(e.target.value)}
                          placeholder={motivoAjuste ? `Detalle adicional de "${motivoAjuste}" (opcional)...` : "Escribe una nota o selecciona una opción de arriba..."}
                          className="mt-2 w-full text-xs p-2 bg-white border border-amber-300 rounded-lg outline-none focus:ring-1 focus:ring-[#007A33] text-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (!litrosExtraidos || !kilometrajeExtraido || !importeExtraido) {
                      mostrarToast('error', 'Faltan datos. Completa la lectura con IA o ingresa los datos manualmente.');
                      return;
                    }
                    const kmNum = parseFloat(kilometrajeExtraido);
                    if (vehiculoData && kmNum <= (vehiculoData.kilometrajeActual || 0)) {
                      mostrarToast('error', `El kilometraje (${kmNum}) no puede ser menor o igual al actual registrado (${vehiculoData.kilometrajeActual} KM).`);
                      return;
                    }
                    const litrosNum = parseFloat(litrosExtraidos);
                    if (vehiculoData && vehiculoData.capacidadTanque && litrosNum > vehiculoData.capacidadTanque * 1.10) {
                      mostrarToast('error', `Los litros del ticket (${litrosNum} L) exceden la capacidad del tanque del vehículo (${vehiculoData.capacidadTanque} L).`);
                      return;
                    }
                    setMostrarModalConfirmacion(true);
                  }}
                  disabled={loading || !fotoTicket || !fotoOdometro}
                  className="w-full bg-[#007A33] hover:bg-[#005c26] disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md flex justify-center items-center gap-2"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* =========================================
              MODAL DE CONFIRMACIÓN FINAL
          ========================================= */}
          {mostrarModalConfirmacion && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 max-h-[92vh] flex flex-col">
                <div className="bg-[#007A33] px-4 py-3 text-white text-center">
                  <h3 className="font-black text-lg">Confirmar Registro</h3>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-2">Resumen de la Operación</p>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2 text-sm">
                      <span className="text-slate-600">Vehículo:</span>
                      <span className="font-bold text-slate-800">{vehiculoData?.economico} ({vehiculoData?.placas})</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2 text-sm">
                      <span className="text-slate-600">Autorización previa:</span>
                      <span className="font-bold text-[#007A33]">{litrosSolicitados} LTS</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2 text-sm">
                      <span className="text-slate-600">Litros comprobados:</span>
                      <span className={`font-bold ${parseFloat(litrosExtraidos) !== parseFloat(litrosSolicitados) ? 'text-amber-500' : 'text-slate-800'}`}>{litrosExtraidos || '--'} LTS</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2 text-sm">
                      <span className="text-slate-600">Importe total:</span>
                      <span className="font-bold text-slate-800">${importeExtraido || '--'}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Kilometraje:</span>
                      <span className="font-bold text-slate-800">{kilometrajeExtraido || '--'} KM</span>
                    </div>
                  </div>

                  {/* Sección de justificación / motivo de captura manual si aplica */}
                  {huboAjusteManual && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left space-y-2">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                        <span>ℹ️</span>
                        <span>Nota de Justificación a Mesa de Control</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-snug">
                        Esta nota acompañará tus fotos para que un auditor(a) valide tu captura manual:
                      </p>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1">
                          {PLANTILLAS_MOTIVO_AJUSTE.map((plantilla) => (
                            <button
                              key={plantilla}
                              type="button"
                              onClick={() => setMotivoAjuste(plantilla)}
                              className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${motivoAjuste === plantilla
                                ? 'bg-[#007A33] text-white font-bold'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                              {plantilla}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={notaAjustePersonalizada}
                          onChange={e => setNotaAjustePersonalizada(e.target.value)}
                          placeholder={motivoAjuste ? `Detalles adicionales: ${motivoAjuste}` : "Escribe brevemente por qué cambiaste los datos..."}
                          className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg outline-none focus:ring-1 focus:ring-[#007A33] text-slate-800"
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-center text-slate-500 italic">
                    Declaro que los datos ingresados son correctos y coinciden con mis comprobantes físicos. Las fotos serán auditadas por la Secretaría.
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setMostrarModalConfirmacion(false)}
                      className="py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={finalizarComprobacion}
                      disabled={loading}
                      className="py-3 rounded-xl font-bold text-white bg-[#007A33] hover:bg-[#005c26] transition-colors flex justify-center items-center shadow-md"
                    >
                      {loading ? 'Enviando...' : 'Sí, Confirmar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================
              PANTALLA 5: FINALIZADO
          ========================================= */}
          {fase === 'FINALIZADO' && (
            <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95">
              <div className="w-16 h-16 bg-[#007A33] text-white rounded-full flex items-center justify-center text-3xl mb-4 shadow-lg ring-4 ring-green-100">✓</div>
              <h2 className="text-xl font-extrabold text-[#007A33] mb-1">Carga Registrada</h2>
              <p className="text-sm text-slate-600 font-medium px-4 mb-6">
                El comprobante y los datos se subieron exitosamente al sistema.
              </p>
              <button onClick={() => {
                setFase('IDENTIFICACION'); setVehiculoData(null); setLitrosSolicitados(''); setFotoTicket(null); setFotoOdometro(null); setLitrosExtraidos(''); setImporteExtraido(''); setKilometrajeExtraido(''); setRequiereJustificacion(false); setCapturaManualTicket(false); setCapturaManualOdometro(false); setMotivoAjuste(''); setNotaAjustePersonalizada('');
              }} className="px-6 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                Registrar otro vehículo
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}