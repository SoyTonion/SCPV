'use client'

import { useEffect, useRef, useState } from 'react'

export default function BarraProgreso({
  verificados,
  totalFlota,
}: {
  verificados: number
  totalFlota: number
}) {
  const porcentaje = totalFlota > 0 ? Math.round((verificados / totalFlota) * 100) : 0
  const alertadoRef = useRef(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastSaliendo, setToastSaliendo] = useState(false)

  const cerrarToast = () => {
    setToastSaliendo(true)
    setTimeout(() => {
      setToastVisible(false)
      setToastSaliendo(false)
    }, 300)
  }

  useEffect(() => {
    if (porcentaje === 100 && !alertadoRef.current) {
      alertadoRef.current = true
      setTimeout(() => {
        setToastVisible(true)
        // Auto-dismiss a los 6 segundos
        setTimeout(cerrarToast, 6000)
      }, 400)
    }
  }, [porcentaje])

  return (
    <>
      {/* Barra de progreso */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
          <span>Progreso del rondín</span>
          <span>{verificados} de {totalFlota} verificados</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${
              porcentaje === 100 ? 'bg-[#007A33]' : 'bg-emerald-500'
            }`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0%</span>
          <span className={`font-medium ${porcentaje === 100 ? 'text-[#007A33]' : 'text-emerald-600'}`}>
            {porcentaje}% completado
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* Toast estilo macOS */}
      {toastVisible && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-4 w-80 transition-all duration-300 ${
            toastSaliendo
              ? 'opacity-0 translate-y-3 scale-95'
              : 'opacity-100 translate-y-0 scale-100'
          }`}
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.08)' }}
        >
          {/* Ícono */}
          <div className="shrink-0 w-10 h-10 rounded-xl bg-[#007A33] flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 leading-tight">Rondín completado</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">
              Los {verificados} vehículos de la flota han sido verificados esta noche.
            </p>

            {/* Barra de progreso del toast (auto-dismiss) */}
            <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
              <div
                className="h-1 bg-[#007A33] rounded-full"
                style={{
                  animation: 'shrink 6s linear forwards',
                }}
              />
            </div>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={cerrarToast}
            className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors mt-0.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <style>{`
            @keyframes shrink {
              from { width: 100%; }
              to   { width: 0%;   }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
