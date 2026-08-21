import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from "@/lib/auth";
import React from 'react';
import Image from 'next/image';
import LogoutButton from '@/components/ui/LogoutButton';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const roleId = session?.user?.rol as number;

  // Lógica de seguridad original intacta (Admin y Guardia permitidos)
  if (roleId !== 1 && roleId !== 2) {
    if (roleId === 3) redirect('/operacion');
    redirect('/');
  }

  const userName = session?.user?.name || session?.user?.usuario || 'Usuario CFE';
  const userRole = session?.user?.rolName || 'OPERATIVO';

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      
      {/* HEADER: Diseño minimalista e institucional (Unificado con el resto del sistema) */}
      <header className="bg-white/80 backdrop-blur-md border-b-4 border-[#007A33]/20 z-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#007A33]/5 to-transparent pointer-events-none"></div>

        <div className="max-w-7xl mx-auto py-4 px-4 flex justify-between items-center relative z-10">
          
          {/* Lado Izquierdo: Logo y Nombre del Módulo */}
          <div className="flex items-center space-x-4.5">
            <Image 
              src="/cfe_logo.svg"
              alt="Logo CFE" 
              width={100}
              height={100}
              className="h-7 w-auto object-contain" 
            />
            <span className="text-sm border-l-2 border-[#007A33]/20 pl-4 font-bold tracking-wide text-[#007A33] leading-tight">
              Módulo de <br className="sm:hidden" />Guardia
            </span>
          </div>

          {/* Lado Derecho: Info del Usuario y Controles */}
          <div className="flex items-center space-x-3 text-sm">
            
            {/* Información del Usuario Logueado (Se alinea perfecto y se oculta en celular) */}
            <div className="hidden sm:flex flex-col items-end justify-center">
              <div className="font-bold text-[#007A33] leading-none mb-1.5">
                {userName}
              </div>
              <span className="bg-[#007A33]/10 text-[#007A33] border border-[#007A33]/20 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold tracking-widest shadow-sm leading-none">
                {userRole}
              </span>
            </div>
            
            {/* Icono de Perfil */}
            <div className="w-9 h-9 rounded-full bg-[#007A33]/10 border border-[#007A33]/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#007A33]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>

            {/* BOTÓN CERRAR SESIÓN */}
            <div className="ml-1 sm:ml-2 border-l border-[#007A33]/20 pl-2 sm:pl-4 flex items-center">
              <LogoutButton />
            </div>
            
          </div>
        </div>
      </header>

      {/* Aquí adentro va a renderizar el formulario, el escáner o el estado físico */}
      <main className="grow w-full">
        {children}
      </main>
      
    </div>
  );
}