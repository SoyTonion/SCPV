"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ResultadoEscaneo =
  | {
      ok: true;
      vehiculo: {
        id: string;
        economico: string | null;
        placas: string | null;
        marca: string;
        submarca: string;
        departamento: string | null;
      };
      // null = vehículo aplica pernocta normal en base
      // string = tiene autorización vigente fuera de base (motivo)
      // false = NO aplica pernocta y NO tiene autorización
      estadoPernocta: string | null | false;
    }
  | { ok: false; error: string };

export async function registrarEscaneo(qrToken: string): Promise<ResultadoEscaneo> {
  try {
    // 1. Validar la sesión de NextAuth
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { ok: false, error: "No hay una sesión activa." };
    }

    const userAny = session.user as any;
    let guardiaId: number | null = null;

    // 2. Extraer el ID o buscar por usuario / nombre en la DB
    if (userAny.id) {
      guardiaId = parseInt(userAny.id, 10);
    } else {
      const condiciones = [];
      if (userAny.usuario) condiciones.push({ usuario: String(userAny.usuario) });
      if (userAny.name) condiciones.push({ nombre: String(userAny.name) });

      if (condiciones.length > 0) {
        const usuarioDb = await prisma.usuario.findFirst({
          where: { OR: condiciones },
        });
        if (usuarioDb) guardiaId = usuarioDb.id;
      }
    }

    if (!guardiaId || isNaN(guardiaId)) {
      return { ok: false, error: "No se pudo identificar al guardia en la base de datos." };
    }

    // 3. Limpiar y decodificar el token del QR
    const tokenLimpio = decodeURIComponent(qrToken).trim();

    // 4. Buscar el vehículo en PostgreSQL
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { qrToken: tokenLimpio },
      include: { departamento: true },
    });

    if (!vehiculo) {
      return { ok: false, error: `Vehículo no encontrado con el código (${tokenLimpio}).` };
    }

    // 5. Normalizar la fecha a medianoche para el rondín del día
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // 6. Verificar si tiene una autorización de pernocta vigente para hoy
    const autorizacion = await prisma.autorizacionPernocta.findFirst({
      where: {
        vehiculoId: vehiculo.id,
        fechaInicio: { lte: hoy },
        fechaFin: { gte: hoy },
      },
      select: { motivo: true },
    });

    // 7. Cerrar rondines ABIERTOS de días anteriores para este guardia
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);

    await prisma.rondin.updateMany({
      where: {
        guardiaId,
        estado: "ABIERTO",
        fecha: { lt: hoy },
      },
      data: {
        estado: "CERRADO",
        fin: ayer, // fin aproximado: medianoche del día anterior
      },
    });

    // 8. Obtener o crear el rondín abierto de hoy para el guardia
    let rondin = await prisma.rondin.findFirst({
      where: {
        guardiaId,
        estado: "ABIERTO",
        fecha: hoy,
      },
    });

    if (!rondin) {
      rondin = await prisma.rondin.create({
        data: {
          guardiaId,
          fecha: hoy,
          estado: "ABIERTO",
        },
      });
    }

    // 8. Guardar el registro de escaneo
    await prisma.escaneo.create({
      data: {
        rondinId: rondin.id,
        vehiculoId: vehiculo.id,
        dispositivo: "Escáner Web",
      },
    });

    // 9. Determinar el estado de pernocta para informar al guardia:
    //    - null  → aplica pernocta normal, todo en orden
    //    - string → tiene autorización vigente (se incluye el motivo)
    //    - false → NO aplica pernocta y NO tiene autorización (posible incidencia)
    let estadoPernocta: string | null | false;

    if (autorizacion) {
      // Tiene autorización vigente — puede estar fuera del parque
      estadoPernocta = autorizacion.motivo ?? "Autorizado sin motivo especificado";
    } else if (vehiculo.vehiculoPernocta) {
      // Aplica pernocta normal, se espera que esté en base
      estadoPernocta = null;
    } else {
      // No aplica pernocta y no tiene autorización
      estadoPernocta = false;
    }

    return {
      ok: true,
      vehiculo: {
        id: vehiculo.id,
        economico: vehiculo.economico,
        placas: vehiculo.placas,
        marca: vehiculo.marcaVehiculo,
        submarca: vehiculo.submarcaVehiculo,
        departamento: vehiculo.departamento?.nombreDepartamento ?? null,
      },
      estadoPernocta,
    };
  } catch (error) {
    console.error("Error en registrarEscaneo:", error);
    return { ok: false, error: "Error interno al procesar el escaneo en la base de datos." };
  }
}

// ============================================================
// CERRAR RONDÍN ACTIVO DEL GUARDIA (cierre manual)
// ============================================================
export type ResultadoCierreRondin =
  | { ok: true; totalEscaneos: number; inicio: string; fin: string }
  | { ok: false; error: string };

export async function cerrarRondinActivo(): Promise<ResultadoCierreRondin> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { ok: false, error: "No hay sesión activa." };

    const guardiaId = parseInt((session.user as any).id, 10);
    if (isNaN(guardiaId)) return { ok: false, error: "No se pudo identificar al guardia." };

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const rondin = await prisma.rondin.findFirst({
      where: { guardiaId, estado: "ABIERTO", fecha: hoy },
      include: { _count: { select: { escaneos: true } } },
    });

    if (!rondin) return { ok: false, error: "No hay un rondín activo para cerrar hoy." };

    const ahora = new Date();

    await prisma.rondin.update({
      where: { id: rondin.id },
      data: { estado: "CERRADO", fin: ahora },
    });

    return {
      ok: true,
      totalEscaneos: rondin._count.escaneos,
      inicio: rondin.inicio.toISOString(),
      fin: ahora.toISOString(),
    };
  } catch (error) {
    console.error("Error en cerrarRondinActivo:", error);
    return { ok: false, error: "Error interno al cerrar el rondín." };
  }
}
