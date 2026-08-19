import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from "@/lib/auth";
import LoginClientForm from '@/app/LoginClientForm'; // O '../../LoginClientForm' si no usas alias @

export default async function LoginPage() {
    const session = await getServerSession(authOptions);

    // Si hay sesión activa, redirigimos según el rol
    if (session) {
        const roleId = session.user?.rol as number;
        if (roleId === 1) redirect('/dashboard');
        if (roleId === 2) redirect('/guardia/pernocta');
        if (roleId === 3) redirect('/operacion/combustible');
    }

    // Si NO hay sesión, mostramos el formulario
    return <LoginClientForm />;
}