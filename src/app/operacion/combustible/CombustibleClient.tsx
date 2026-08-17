"use client";

import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function CombustibleClient() {

  const [vehiculo, setVehiculo] = useState(''); 
  const [vehiculoId, setVehiculoId] = useState(''); 
  const [buscandoQR, setBuscandoQR] = useState(false); 
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  
  // Estados del Formulario
  const [kilometraje, setKilometraje] = useState('');
  const [litros, setLitros] = useState('');
  const [importe, setImporte] = useState('');
  const [fotoTicket, setFotoTicket] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);

  // 1. SOLUCIÓN: Movemos la función ARRIBA del useEffect para que ya exista cuando la cámara la necesite
  const procesarQRReal = async (qrEscaneado: string) => {
    setBuscandoQR(true);
    try {
      const respuesta = await fetch(`/api/vehiculos/${qrEscaneado}`);
      
      if (respuesta.ok) {
        const datosVehiculo = await respuesta.json();
        const textoMostrar = `${datosVehiculo.marcaVehiculo} ${datosVehiculo.submarcaVehiculo} - Placas: ${datosVehiculo.placas || 'N/A'}`;
        setVehiculo(textoMostrar);
        setVehiculoId(datosVehiculo.id); 
      } else {
        alert("⚠️ Código QR inválido o vehículo no encontrado en el padrón de CFE.");
        setVehiculo('');
        setVehiculoId('');
      }
    } catch (error) {
      console.error("Error al buscar el vehículo:", error);
      alert("Error de conexión con el servidor.");
    } finally {
      setBuscandoQR(false);
    }
  };

  // Efecto para inicializar la cámara cuando mostrarEscaner es true
  useEffect(() => {
    if (mostrarEscaner) {
      const scanner = new Html5QrcodeScanner(
        "lector-qr",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        async (textoEscaneado) => {
          // Si lee un código con éxito:
          scanner.clear(); // Apagamos la cámara
          setMostrarEscaner(false); // Ocultamos la interfaz del escáner
          await procesarQRReal(textoEscaneado); // Mandamos el texto a la base de datos
        },
        // 3. SOLUCIÓN: Quitamos la variable 'errorMessage' que no usábamos
        () => {
          // Los errores de lectura continua se ignoran en silencio
        }
      );

      // Limpieza en caso de que el usuario cierre el componente antes de escanear
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
          importe
        }),
      });

      if (respuesta.ok) {
        setExito(true);
        setTimeout(() => {
          setExito(false);
          setVehiculo('');
          setVehiculoId('');
          setKilometraje('');
          setLitros('');
          setImporte('');
          setFotoTicket(null);
        }, 2000);
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
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100">
        <h1 className="text-xl font-bold text-slate-800 mb-2 text-center">
          Registro de Combustible
        </h1>
        <p className="text-sm text-slate-500 mb-6 text-center">
          Completa los datos de tu recarga y anexa la evidencia.
        </p>

        {/* --- VENTANA DEL ESCÁNER DE CÁMARA --- */}
        {mostrarEscaner && (
          <div className="mb-6 p-2 border-2 border-[#007A33] rounded-lg bg-slate-50">
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="font-bold text-slate-700 text-sm">Escanea el código del vehículo</span>
              <button 
                onClick={() => setMostrarEscaner(false)}
                className="text-red-500 text-sm font-bold hover:underline"
              >
                Cancelar
              </button>
            </div>
            {/* Aquí es donde la librería html5-qrcode inyecta la cámara */}
            <div id="lector-qr" className="w-full overflow-hidden rounded-lg"></div>
          </div>
        )}

        {exito ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex flex-col items-center text-center animate-pulse">
            <div className="w-16 h-16 bg-[#007A33] text-white rounded-full flex items-center justify-center text-3xl mb-4 shadow-lg">
              ✓
            </div>
            <h2 className="text-xl font-bold text-[#007A33]">¡Registro Exitoso!</h2>
            <p className="text-sm text-slate-600 mt-2">La carga de combustible ha sido guardada en el sistema.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={`space-y-5 ${mostrarEscaner ? 'hidden' : 'block'}`}>
            
            {/* Paso 1: Escanear Vehículo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                1. Vehículo (Código QR)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vehiculo}
                  readOnly
                  placeholder="Escanea el vehículo..."
                  required
                  className="w-full border border-slate-300 bg-slate-50 rounded-lg p-3 outline-none text-slate-600 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setMostrarEscaner(true)} // Activa la cámara
                  disabled={buscandoQR}
                  className="bg-slate-800 text-white px-4 rounded-lg flex items-center justify-center hover:bg-slate-700 transition disabled:opacity-50"
                  title="Escanear QR"
                >
                  {buscandoQR ? '...' : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Paso 2: Datos de Carga */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label htmlFor="kilometraje" className="block text-sm font-medium text-slate-700 mb-1">
                  2. Kilometraje Actual
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="kilometraje"
                    value={kilometraje}
                    onChange={(e) => setKilometraje(e.target.value)}
                    required
                    placeholder="Ej. 45000"
                    className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-[#007A33] focus:ring-1 focus:ring-[#007A33]"
                  />
                  <span className="absolute right-4 top-3.5 text-slate-400 text-sm font-medium">km</span>
                </div>
              </div>

              <div>
                <label htmlFor="litros" className="block text-sm font-medium text-slate-700 mb-1">
                  Litros
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="litros"
                  value={litros}
                  onChange={(e) => setLitros(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-[#007A33] focus:ring-1 focus:ring-[#007A33]"
                />
              </div>

              <div>
                <label htmlFor="importe" className="block text-sm font-medium text-slate-700 mb-1">
                  Importe Total
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-500 font-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    id="importe"
                    value={importe}
                    onChange={(e) => setImporte(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-lg p-3 pl-8 outline-none focus:border-[#007A33] focus:ring-1 focus:ring-[#007A33]"
                  />
                </div>
              </div>
            </div>

            {/* Paso 3: Foto del Ticket */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                3. Fotografía del Ticket
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-[#007A33] transition-colors bg-slate-50 relative">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-slate-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-[#007A33] hover:text-[#005c26] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#007A33] px-1">
                      <span>{fotoTicket ? 'Cambiar foto' : 'Tomar o subir foto'}</span>
                      <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="sr-only" 
                        onChange={(e) => {
                          if(e.target.files && e.target.files[0]) {
                            setFotoTicket(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500">
                    {fotoTicket ? fotoTicket.name : 'PNG, JPG hasta 5MB'}
                  </p>
                </div>
              </div>
            </div>

            {/* Botón de Guardar */}
            <button 
              type="submit" 
              disabled={loading || !vehiculoId}
              className="w-full bg-[#007A33] hover:bg-[#005c26] text-white font-bold rounded-lg p-4 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-4 text-lg"
            >
              {loading ? 'Guardando registro...' : 'Guardar Carga'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}