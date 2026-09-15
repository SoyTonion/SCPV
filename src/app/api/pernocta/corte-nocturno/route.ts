import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Clave secreta para proteger el endpoint de cron externos
// Agregar CRON_SECRET en .env con cualquier string aleatorio
const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request: Request) {
  try {
    // Verificar autorización si hay clave configurada
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
      }
    }

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const ahora = new Date()
    const horaActual = ahora.getHours()

    // Solo ejecutar entre las 23:00 y 23:59, o si se fuerza con ?force=true
    const url = new URL(request.url)
    const forzar = url.searchParams.get('force') === 'true'

    if (!forzar && horaActual !== 23) {
      return NextResponse.json({
        ok: false,
        mensaje: `Corte solo ejecuta a las 23:00. Hora actual: ${horaActual}:00. Usa ?force=true para forzar.`,
      })
    }

    // Cerrar todos los rondines ABIERTOS de hoy
    const corte = new Date()
    corte.setHours(23, 0, 0, 0)

    const resultado = await prisma.rondin.updateMany({
      where: {
        fecha: hoy,
        estado: 'ABIERTO',
      },
      data: {
        estado: 'CERRADO',
        fin: corte,
      },
    })

    return NextResponse.json({
      ok: true,
      mensaje: `Corte nocturno ejecutado. ${resultado.count} rondín(es) cerrado(s).`,
      rondinsCerrados: resultado.count,
      horaCorte: corte.toLocaleString('es-MX', { timeStyle: 'short' }),
    })

  } catch (error) {
    console.error('Error en corte nocturno:', error)
    return NextResponse.json({ ok: false, error: 'Error interno en el corte nocturno.' }, { status: 500 })
  }
}

// GET para verificar estado (útil para debugging)
export async function GET() {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const abiertos = await prisma.rondin.count({
    where: { fecha: hoy, estado: 'ABIERTO' },
  })

  return NextResponse.json({
    horaActual: new Date().toLocaleString('es-MX', { timeStyle: 'short' }),
    rondindsAbiertosHoy: abiertos,
  })
}
