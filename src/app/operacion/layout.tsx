"use client";

import React from 'react';
import { signOut } from 'next-auth/react';

export default function OperacionLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Cabecera Móvil para los trabajadores */}
            <header className="bg-[#007A33] text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center">
                    <div className="font-bold text-xl tracking-wider mr-2">CFE</div>
                    <div className="text-xs border-l-2 border-white/30 pl-2">
                        Operación en Campo
                    </div>
                </div>
                
                {/* Botón para cerrar sesión y regresar al Login */}
                <button 
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-sm bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded border border-white/40"
                >
                    Salir
                </button>
            </header>

            {/* Aquí adentro va a renderizar el formulario de gasolina, el escáner o el estado físico */}
            <main className="flex-grow">
                {children}
            </main>
        </div>
    );
}