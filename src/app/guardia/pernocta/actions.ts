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

    // 6. Obtener o crear el rondín abierto de hoy para el guardia
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

    // 7. Guardar el registro de escaneo
    await prisma.escaneo.create({
      data: {
        rondinId: rondin.id,
        vehiculoId: vehiculo.id,
        dispositivo: "Escáner Web",
      },
    });

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
    };
  } catch (error) {
    console.error("Error en registrarEscaneo:", error);
    return { ok: false, error: "Error interno al procesar el escaneo en la base de datos." };
  }
}