"use client";

import React from 'react';
import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  const handleLogout = async () => {
    // Esto cierra la sesión y te redirige inmediatamente al login ("/")
    await signOut({ callbackUrl: '/' });
  };

  return (
    <button 
      onClick={handleLogout}
      className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors font-semibold text-sm shadow-sm outline-none w-full"
    >
      <svg className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
      </svg>
      <span className="hidden sm:inline">Cerrar Sesión</span>
    </button>
  );
}