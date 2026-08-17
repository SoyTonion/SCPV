import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from "@/lib/auth";
import ScannerClient from './ScannerClient'; // Importamos la parte del cliente

export default async function ScannerPernoctaPage() {
  const session = await getServerSession(authOptions);
  const roleId = session?.user?.rol as number;

  // Validación de seguridad en el servidor
  if (roleId !== 1 && roleId !== 2) {
    if (roleId === 3) redirect('/operacion/combustible');
    redirect('/');
  }

  // Si pasa la validación, mostramos el escáner
  return <ScannerClient />;
}