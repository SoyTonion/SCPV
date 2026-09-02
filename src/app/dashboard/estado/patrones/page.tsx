import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, Images } from 'lucide-react';
import PatronesClient from './PatronesClient';

export default async function PatronesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/');

  // Cargar todos los vehículos con sus imágenes patrón activas
  const vehiculos = await prisma.vehiculo.findMany({
    where:   { qrToken: { not: null } },
    orderBy: [{ marcaVehiculo: 'asc' }, { economico: 'asc' }],
    select: {
      id:              true,
      economico:       true,
      marcaVehiculo:   true,
      submarcaVehiculo: true,
      placas:          true,
      imagenesPatron: {
        where:   { activo: true },
        orderBy: { creadoEn: 'desc' },
        select:  { id: true, vista: true, rutaImagen: true, creadoEn: true, activo: true },
      },
    },
  });

  // Serializar BigInt e ISO date
  const datos = vehiculos.map(v => ({
    ...v,
    imagenesPatron: v.imagenesPatron.map(i => ({
      ...i,
      id:       i.id.toString(),
      creadoEn: i.creadoEn.toISOString(),
    })),
  }));

  // Renombrar imagenesPatron → patrones para el cliente
  const vehiculosCliente = datos.map(({ imagenesPatron, ...rest }) => ({
    ...rest,
    patrones: imagenesPatron,
  }));

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Cabecera */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard/estado"
              className="text-sm font-medium text-slate-500 hover:text-[#007A33] transition-colors mb-2 inline-flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Volver a Estado Físico
            </Link>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Images size={24} className="text-[#007A33]" />
              Gestión de Imágenes Patrón
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Administra las fotografías de referencia por vehículo y ángulo para el sistema de inspección visual.
            </p>
          </div>
        </div>

        {/* Componente interactivo */}
        <PatronesClient vehiculosIniciales={vehiculosCliente} />

      </div>
    </main>
  );
}
