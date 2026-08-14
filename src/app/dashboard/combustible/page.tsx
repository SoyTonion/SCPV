import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from "@/lib/auth";
import Link from 'next/link'

const ROLES_PERMITIDOS = [ 1 ];

export default async function App() {
  const session = await getServerSession(authOptions);
    
      if (!session) redirect('/');
      if (!ROLES_PERMITIDOS.includes(Number(session.user.rol))) redirect('/operacion');

  return (
    <h1>cositas de ivan alv</h1>
  );
}
