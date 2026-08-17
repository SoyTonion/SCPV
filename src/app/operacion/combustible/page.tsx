import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from "@/lib/auth";
import CombustibleClient from './CombustibleClient'; // Importamos la parte del cliente

export default async function RegistroCombustiblePage() {
    const session = await getServerSession(authOptions);
    const roleId = session?.user?.rol as number;

    if (roleId !== 1 && roleId !== 3) {
      if (roleId === 2) redirect('/guardia/pernocta');
      redirect('/');
    }

    return <CombustibleClient />;
}