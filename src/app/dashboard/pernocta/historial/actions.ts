"use server";

import { prisma } from "@/lib/prisma";

export async function obtenerHistorialEscaneos(filtro?: string) {
  try {
    const escaneos = await prisma.escaneo.findMany({
      where: filtro
        ? {
            OR: [
              { vehiculo: { economico: { contains: filtro, mode: "insensitive" } } },
              { vehiculo: { placas: { contains: filtro, mode: "insensitive" } } },
            ],
          }
        : undefined,
      take: 50,
      orderBy: { fechaHora: "desc" },
      include: {
        vehiculo: { include: { departamento: true } },
        rondin: { include: { guardia: true } },
      },
    });

    return escaneos.map((escaneo) => ({
      id: escaneo.id.toString(),
      fechaHora: escaneo.fechaHora.toISOString(),
      dispositivo: escaneo.dispositivo,
      vehiculo: {
        economico: escaneo.vehiculo.economico,
        placas: escaneo.vehiculo.placas,
        marca: escaneo.vehiculo.marcaVehiculo,
        submarca: escaneo.vehiculo.submarcaVehiculo,
        departamento: escaneo.vehiculo.departamento?.nombreDepartamento ?? "Sin Asignar",
      },
      guardia: { nombre: escaneo.rondin.guardia.nombre },
      rondin: {
        id: escaneo.rondin.id.toString(),
        inicio: escaneo.rondin.inicio.toISOString(),
        fin: escaneo.rondin.fin?.toISOString() ?? null,
        estado: escaneo.rondin.estado,
      },
    }));
  } catch (error) {
    console.error("Error al obtener historial de escaneos:", error);
    return [];
  }
}

export async function obtenerRondines(filtro?: string) {
  try {
    const rondines = await prisma.rondin.findMany({
      where: filtro
        ? {
            guardia: {
              nombre: { contains: filtro, mode: "insensitive" },
            },
          }
        : undefined,
      take: 30,
      orderBy: { fecha: "desc" },
      include: {
        guardia: { select: { nombre: true } },
        _count: { select: { escaneos: true } },
      },
    });

    return rondines.map((r) => ({
      id: r.id.toString(),
      fecha: r.fecha.toISOString().split("T")[0],
      inicio: r.inicio.toISOString(),
      fin: r.fin?.toISOString() ?? null,
      estado: r.estado,
      guardia: r.guardia.nombre,
      totalEscaneos: r._count.escaneos,
    }));
  } catch (error) {
    console.error("Error al obtener rondines:", error);
    return [];
  }
}