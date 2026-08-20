import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from "@/lib/auth";
import LoginClientForm from './LoginClientForm';

export default async function LoginPage() {
    const session = await getServerSession(authOptions);

    // Si hay sesión, redirigimos según el rol
    if (session) {
        const roleId = session.user?.rol as number;
        if (roleId === 1) redirect('/dashboard');
        if (roleId === 2) redirect('/guardia/pernocta');
        if (roleId === 3) redirect('/operacion');
    }

    // Si NO hay sesión, renderizamos el formulario interactivo
    return <LoginClientForm />;
}