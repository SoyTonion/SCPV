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
      orderBy: {
        fechaHora: "desc",
      },
      include: {
        vehiculo: {
          include: {
            departamento: true,
          },
        },
        rondin: {
          include: {
            guardia: true,
          },
        },
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
      guardia: {
        nombre: escaneo.rondin.guardia.nombre,
      },
    }));
  } catch (error) {
    console.error("Error al obtener historial de escaneos:", error);
    return [];
  }
}