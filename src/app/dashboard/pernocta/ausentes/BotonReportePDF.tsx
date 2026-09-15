'use client'

import { useState } from 'react'
import { generarDatosReporte, type DatosReporte } from './reporteActions'

async function construirPDF(datos: DatosReporte) {
  // Importar dinámicamente para evitar SSR
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const verde = [0, 122, 51] as [number, number, number]
  const verdeSuave = [232, 245, 237] as [number, number, number]
  const grisOscuro = [30, 41, 59] as [number, number, number]
  const grisMedio = [100, 116, 139] as [number, number, number]

  // ── Encabezado ──────────────────────────────────────────────────────────────
  doc.setFillColor(...verde)
  doc.rect(0, 0, W, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('CFE — Comisión Federal de Electricidad', 14, 11)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema de Control y Gestión Vehicular (SCPV)', 14, 17)
  doc.text('Reporte de Control de Pernocta', 14, 23)

  // Fecha en esquina derecha
  doc.setFontSize(9)
  doc.text(`Corte: ${datos.fechaCorte}`, W - 14, 17, { align: 'right' })
  doc.text(datos.fecha, W - 14, 23, { align: 'right' })

  let y = 36

  // ── Resumen ejecutivo ───────────────────────────────────────────────────────
  doc.setTextColor(...grisOscuro)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen Ejecutivo', 14, y)
  y += 6

  const totalOk = datos.escaneados.length + datos.ausentesAutorizados.length
  const pct = datos.totalFlota > 0
    ? Math.round((totalOk / datos.totalFlota) * 100)
    : 0

  // Tarjetas de resumen (4 cajas)
  const cajas = [
    { label: 'Total Flota',       valor: String(datos.totalFlota),                color: [241, 245, 249] as [number, number, number], texto: grisOscuro },
    { label: 'Verificados',       valor: String(datos.escaneados.length),         color: verdeSuave,                                   texto: [5, 100, 40] as [number, number, number] },
    { label: 'Autorizados',       valor: String(datos.ausentesAutorizados.length), color: [219, 234, 254] as [number, number, number], texto: [30, 64, 175] as [number, number, number] },
    { label: 'Sin justificar',    valor: String(datos.ausentesSinJustificar.length), color: datos.ausentesSinJustificar.length > 0 ? [254, 226, 226] as [number, number, number] : [241, 245, 249] as [number, number, number], texto: datos.ausentesSinJustificar.length > 0 ? [153, 27, 27] as [number, number, number] : grisOscuro },
  ]

  const cajaW = (W - 28 - 9) / 4
  cajas.forEach((c, i) => {
    const x = 14 + i * (cajaW + 3)
    doc.setFillColor(...c.color)
    doc.roundedRect(x, y, cajaW, 18, 2, 2, 'F')
    doc.setTextColor(...c.texto)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(c.valor, x + cajaW / 2, y + 10, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(c.label, x + cajaW / 2, y + 15.5, { align: 'center' })
  })
  y += 24

  // Barra de cumplimiento
  doc.setTextColor(...grisMedio)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Cumplimiento del rondín: ${pct}% (${totalOk} de ${datos.totalFlota} vehículos en orden)`, 14, y)
  y += 4

  // Barra visual
  doc.setFillColor(226, 232, 240)
  doc.roundedRect(14, y, W - 28, 4, 1, 1, 'F')
  if (pct > 0) {
    doc.setFillColor(...verde)
    doc.roundedRect(14, y, (W - 28) * pct / 100, 4, 1, 1, 'F')
  }
  y += 10

  // ── Rondines del día ────────────────────────────────────────────────────────
  if (datos.rondines.length > 0) {
    doc.setTextColor(...grisOscuro)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Rondines Realizados', 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Guardia', 'Inicio', 'Fin', 'Vehículos Escaneados', 'Estado']],
      body: datos.rondines.map(r => [
        r.guardia,
        r.inicio,
        r.fin ?? 'Sin cerrar',
        String(r.totalEscaneos),
        r.fin ? 'Cerrado' : 'Abierto',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: verde, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 4: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── Vehículos escaneados ────────────────────────────────────────────────────
  if (datos.escaneados.length > 0) {
    // Nueva página si queda poco espacio
    if (y > 220) { doc.addPage(); y = 20 }

    doc.setTextColor(...grisOscuro)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Vehículos Verificados en el Rondín (${datos.escaneados.length})`, 14, y)
    y += 4

    const bodyEscaneados: any[] = []
    let lastZonaEscaneados: string | null = null
    const sortedEscaneados = [...datos.escaneados].sort((a, b) => a.zona.localeCompare(b.zona) || a.economico.localeCompare(b.economico))

    for (const v of sortedEscaneados) {
      if (v.zona !== lastZonaEscaneados) {
        bodyEscaneados.push([{ content: `Zona: ${v.zona}`, colSpan: 5, styles: { fillColor: [210, 225, 215], fontStyle: 'bold', textColor: [30, 41, 59] } }])
        lastZonaEscaneados = v.zona
      }
      bodyEscaneados.push([v.economico, v.placas, v.vehiculo, v.responsable, v.zona])
    }

    autoTable(doc, {
      startY: y,
      head: [['Económico', 'Placas', 'Vehículo', 'Responsable', 'Zona']],
      body: bodyEscaneados,
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: [5, 100, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── Ausentes autorizados ────────────────────────────────────────────────────
  if (datos.ausentesAutorizados.length > 0) {
    if (y > 220) { doc.addPage(); y = 20 }

    doc.setTextColor(...grisOscuro)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Ausentes con Autorización Vigente (${datos.ausentesAutorizados.length})`, 14, y)
    y += 4

    const bodyAutorizados: any[] = []
    let lastZonaAuth: string | null = null
    const sortedAuth = [...datos.ausentesAutorizados].sort((a, b) => a.zona.localeCompare(b.zona) || a.economico.localeCompare(b.economico))

    for (const v of sortedAuth) {
      if (v.zona !== lastZonaAuth) {
        bodyAutorizados.push([{ content: `Zona: ${v.zona}`, colSpan: 7, styles: { fillColor: [219, 234, 254], fontStyle: 'bold', textColor: [30, 41, 59] } }])
        lastZonaAuth = v.zona
      }
      bodyAutorizados.push([v.economico, v.placas, v.vehiculo, v.responsable, v.motivo, v.autorizadoPor, v.zona])
    }

    autoTable(doc, {
      startY: y,
      head: [['Económico', 'Placas', 'Vehículo', 'Responsable', 'Motivo', 'Autorizado por', 'Zona']],
      body: bodyAutorizados,
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── Sin justificar ──────────────────────────────────────────────────────────
  if (datos.ausentesSinJustificar.length > 0) {
    if (y > 220) { doc.addPage(); y = 20 }

    doc.setTextColor(153, 27, 27)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Vehículos SIN Justificar — REQUIEREN ATENCIÓN (${datos.ausentesSinJustificar.length})`, 14, y)
    y += 4

    const bodySinJustificar: any[] = []
    let lastZonaSinJustificar: string | null = null
    const sortedSinJustificar = [...datos.ausentesSinJustificar].sort((a, b) => a.zona.localeCompare(b.zona) || a.economico.localeCompare(b.economico))

    for (const v of sortedSinJustificar) {
      if (v.zona !== lastZonaSinJustificar) {
        bodySinJustificar.push([{ content: `Zona: ${v.zona}`, colSpan: 6, styles: { fillColor: [254, 226, 226], fontStyle: 'bold', textColor: [30, 41, 59] } }])
        lastZonaSinJustificar = v.zona
      }
      bodySinJustificar.push([v.economico, v.placas, v.vehiculo, v.responsable, v.departamento, v.zona])
    }

    autoTable(doc, {
      startY: y,
      head: [['Económico', 'Placas', 'Vehículo', 'Responsable', 'Departamento', 'Zona']],
      body: bodySinJustificar,
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: [153, 27, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
    })
  }

  // ── Pie de página en todas las páginas ─────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFillColor(241, 245, 249)
    doc.rect(0, pageH - 10, W, 10, 'F')
    doc.setTextColor(...grisMedio)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('CFE — SCPV — Reporte generado automáticamente', 14, pageH - 3.5)
    doc.text(`Página ${i} de ${totalPages}`, W - 14, pageH - 3.5, { align: 'right' })
  }

  return doc
}

export default function BotonReportePDF({ fechaISO }: { fechaISO?: string }) {
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDescargar = async () => {
    setGenerando(true)
    setError(null)

    const res = await generarDatosReporte(fechaISO)
    if (!res.success) {
      setError(res.error)
      setGenerando(false)
      return
    }

    const doc = await construirPDF(res.data)
    const fecha = new Date().toISOString().split('T')[0]
    doc.save(`reporte-pernocta-${fecha}.pdf`)
    setGenerando(false)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDescargar}
        disabled={generando}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#145c2c] hover:bg-[#0f4722] disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
      >
        {generando ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Generando PDF...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descargar Reporte PDF
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
