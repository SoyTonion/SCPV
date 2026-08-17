"use client";

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from "@/lib/auth";
import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
// import { useRouter } from 'next/navigation'; // Lo usarán después para redirigir

export default async function ScannerPernoctaPage() {
    const session = await getServerSession(authOptions);
    const roleId = session?.user?.rol as number;
  
    if (roleId !== 2) {
      if (roleId === 3) redirect('/operacion/combustible');
      redirect('/');
    }

  const [codigoEscaneado, setCodigoEscaneado] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (codigoEscaneado) return;

    let isMounted = true;

    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true, // ¡Excelente para los guardias en la noche!
      },
      false
    );

    scannerRef.current = scanner;

    const onScanSuccess = (decodedText: string) => {
      if (!isMounted) return;

      setCodigoEscaneado(decodedText);

      scanner.clear().catch((error) => {
        console.error('Error al limpiar scanner:', error);
      });
    };

    const onScanFailure = () => {
      // Ignorar fallos continuos mientras busca el QR
    };

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      isMounted = false;
      scanner.clear().catch((error) => {
        console.debug('Cleanup scanner:', error);
      });
      scannerRef.current = null;
    };
  }, [codigoEscaneado]);

  const reiniciarEscaneo = () => {
    setCodigoEscaneado(null);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 mt-4">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md border border-slate-100">
        
        {!codigoEscaneado ? (
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">
              Control de Pernocta
            </h2>
            {/* El div donde html5-qrcode inyecta la cámara */}
            <div id="reader" className="w-full rounded-lg overflow-hidden border-2 border-[#007A33]"></div>
            <p className="text-sm text-slate-500 mt-4 text-center font-medium">
              Apunta la cámara al código QR del vehículo
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 bg-green-100 text-[#007A33] rounded-full flex items-center justify-center text-3xl mb-4">
              ✓
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">¡Vehículo Detectado!</h3>
            <p className="text-sm text-slate-500 mb-1">Código QR / Token:</p>
            <p className="text-lg font-mono bg-slate-100 px-4 py-2 rounded-md border border-slate-200 mb-6">
              {codigoEscaneado}
            </p>

            <button 
              onClick={reiniciarEscaneo} 
              className="w-full bg-[#007A33] hover:bg-[#005c26] text-white font-semibold rounded-lg p-3 transition-colors"
            >
              Escanear otro vehículo
            </button>
            
            {/* TODO: Botón para Registrar Pernocta y mandar a la BD */}
          </div>
        )}

      </div>
    </div>
  );
}