import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from "@/lib/auth";
import React from 'react';
import Link from 'next/link';
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

  // Redirecciones de seguridad por roles
  if (roleId !== 1) {
    if (roleId === 2) redirect('/guardia/pernocta');
    if (roleId === 3) redirect('/operacion');
    redirect('/');
  }

  const userName = session?.user?.name || session?.user?.usuario || 'Usuario CFE';
  const userRole = session?.user?.rolName || 'OPERATIVO';
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      
      {/* HEADER: mismo lenguaje visual que el footer — cristal esmerilado, borde verde suave y gradiente */}
      <header className="bg-white/80 backdrop-blur-md border-b-4 border-[#007A33]/20 z-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#007A33]/5 to-transparent pointer-events-none"></div>

        <div className="max-w-7xl mx-auto py-4 px-4 flex justify-between items-center relative z-10">
          
          {/* Lado Izquierdo: Logo y Nombre */}
          <div className="flex items-center space-x-4.5">
            <Image 
              src="/cfe_logo.svg"
              alt="Logo CFE" 
              width={100}
              height={100}
              className="h-7 w-auto object-contain" 
            />
            <span className="text-sm border-l-2 border-[#007A33]/20 pl-4 font-bold tracking-wide text-[#007A33]">
              Sistema de Control Vehicular
            </span>
          </div>

          {/* Lado Derecho: Info del Usuario y Controles */}
          <div className="flex items-center space-x-6 text-sm">
            
            <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-500 hover:text-[#007A33] transition-colors font-medium hidden md:flex group">
              <svg className="w-4 h-4 text-slate-400 group-hover:text-[#007A33] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
              Inicio
            </Link>
            
            <div className="hidden md:block w-px h-6 bg-[#007A33]/20"></div>

            {/* Información del Usuario Logueado (Alineación Mejorada) */}
            <div className="flex items-center space-x-3">
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
            </div>

            {/* BOTÓN CERRAR SESIÓN */}
            <div className="ml-2 border-l border-[#007A33]/20 pl-4 flex items-center">
              <LogoutButton />
            </div>
            
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="grow w-full p-4 md:p-8">
        {children}
      </main>

      {/* Footer con borde verde más grueso */}
      <footer className="bg-white/80 backdrop-blur-md border-t-4 border-[#007A33]/20 mt-auto z-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-[#007A33]/5 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 relative z-10">
          
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <p className="font-bold text-[#007A33] text-sm mb-0.5">
              &copy; {currentYear} Comisión Federal de Electricidad
            </p>
            <p className="text-slate-500 font-medium">
              Todos los derechos reservados. Sistema de Control Vehicular.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-6">
            
            <a href="#" className="flex items-center gap-1.5 hover:text-[#007A33] transition-colors group">
              <svg className="w-4 h-4 text-slate-400 group-hover:text-[#007A33] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
              Aviso de Privacidad
            </a>
            
            <a href="mailto:soporte.sistemas@cfe.mx" className="flex items-center gap-1.5 hover:text-[#007A33] transition-colors group">
              <svg className="w-4 h-4 text-slate-400 group-hover:text-[#007A33] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              Soporte Técnico
            </a>
            
            <a href="#" target="_blank" className="flex items-center gap-1.5 hover:text-[#007A33] transition-colors group">
              <svg className="w-4 h-4 text-slate-400 group-hover:text-[#007A33] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
              Manual de Usuario
            </a>

            <span className="hidden md:inline text-[#007A33]/20 font-light text-lg">|</span>
            
            <span className="bg-[#007A33]/10 text-[#007A33] border border-[#007A33]/20 px-2.5 py-1 rounded-md font-mono text-[10px] font-bold tracking-widest shadow-sm">
              V 1.0.0
            </span>
          </div>
        </div>
      </footer>
      
    </div>
  );
}