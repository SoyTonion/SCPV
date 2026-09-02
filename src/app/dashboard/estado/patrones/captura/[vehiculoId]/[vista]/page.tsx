import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CapturaPatronClient from './CapturaPatronClient';

const VISTAS_VALIDAS = ['FRONTAL', 'TRASERA', 'LATERAL_IZQUIERDA', 'LATERAL_DERECHA', 'INTERIOR'];

export default async function CapturaPatronPage({
  params,
}: {
  params: Promise<{ vehiculoId: string; vista: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/');

  const { vehiculoId, vista } = await params;

  if (!VISTAS_VALIDAS.includes(vista)) notFound();

  const vehiculo = await prisma.vehiculo.findUnique({
    where:  { id: vehiculoId },
    select: { id: true, economico: true, marcaVehiculo: true, submarcaVehiculo: true, placas: true },
  });

  if (!vehiculo) notFound();

  const label = `${vehiculo.marcaVehiculo} ${vehiculo.submarcaVehiculo}${vehiculo.placas ? ` · ${vehiculo.placas}` : ''}`;

  return (
    <CapturaPatronClient
      vehiculoId={vehiculo.id}
      vehiculoLabel={label}
      vista={vista as 'FRONTAL' | 'TRASERA' | 'LATERAL_IZQUIERDA' | 'LATERAL_DERECHA' | 'INTERIOR'}
    />
  );
}
