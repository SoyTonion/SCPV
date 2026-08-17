import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from "@/lib/auth";
import React from 'react';
import LogoutButton from '@/components/ui/LogoutButton';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    const roleId = session?.user?.rol as number;

    if (roleId !== 1 && roleId !== 2) {
      if (roleId === 3) redirect('/operacion/combustible');
      redirect('/');
    }

  const userName = session?.user?.name || session?.user?.usuario || 'Usuario CFE';
  const userRole = session?.user?.rolName || 'OPERATIVO';

  return (
    <div className="flex flex-col flex-grow font-sans">
      
      {/* Barra de Navegación Fija para todo el sistema */}
      <nav className="bg-[#007A33] text-white p-4 shadow-md flex justify-between items-center">
        
        {/* Lado Izquierdo: Logotipo y Nombre del Sistema */}
        <div className="flex items-center space-x-3">
          <span className="font-extrabold text-xl tracking-wider">CFE</span>
          <span className="text-sm border-l border-white/30 pl-3 font-light tracking-wide">
            Módulo de Operaciones
          </span>
        </div>

        {/* Lado Derecho: Info del Usuario y Controles */}
        <div className="flex items-center space-x-6 text-sm">
          
          <div className="hidden md:block w-px h-6 bg-white/20"></div>

          {/* Información del Usuario Logueado */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="font-semibold text-white leading-tight">
                {userName}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-green-200 font-bold mt-0.5">
                {userRole}
              </div>
            </div>
            
            {/* Icono de Perfil */}
            <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
          </div>

          {/* Usamos el componente cliente para cerrar sesión sin pantallas feas */}
          <LogoutButton />
          
        </div>
      </nav>

            {/* Aquí adentro va a renderizar el formulario de gasolina, el escáner o el estado físico */}
        <main className="flex-grow">
            {children}
        </main>
    </div>
);
}