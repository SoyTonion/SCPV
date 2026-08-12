import React from 'react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Barra de Navegación Fija para todo el sistema */}
      <nav className="bg-[#007A33] text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-xl tracking-wider">CFE</span>
          <span className="text-sm border-l border-white/30 pl-3">
            Sistema Integral Vehicular
          </span>
        </div>
        
        <div className="flex items-center space-x-4 text-sm">
          <Link href="/dashboard" className="hover:text-green-200 transition-colors">
            Inicio
          </Link>
          <Link href="/" className="bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 transition-colors">
            Cerrar Sesión
          </Link>
        </div>
      </nav>

      {/* Aquí es donde Next.js va a inyectar tus pantallas dinámicas (el page.tsx) */}
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
}