'use client'

import { useEffect, useRef } from 'react'

export default function BarraProgreso({
  verificados,
  totalFlota,
}: {
  verificados: number
  totalFlota: number
}) {
  const porcentaje = totalFlota > 0 ? Math.round((verificados / totalFlota) * 100) : 0
  const alertadoRef = useRef(false)

  useEffect(() => {
    if (porcentaje === 100 && !alertadoRef.current) {
      alertadoRef.current = true
      // Pequeño delay para que el render se complete antes del alert
      setTimeout(() => {
        alert(`✅ ¡Rondín completado! Los ${verificados} vehículos de la flota han sido verificados.`)
      }, 300)
    }
  }, [porcentaje, verificados])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
        <span>Progreso del rondín</span>
        <span>{verificados} de {totalFlota} verificados</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all ${porcentaje === 100 ? 'bg-[#007A33]' : 'bg-emerald-500'}`}
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
  )
}
