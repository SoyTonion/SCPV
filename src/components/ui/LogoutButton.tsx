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
      className="bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 hover:shadow-sm transition-all border border-white/10 font-medium flex items-center gap-2 text-white"
    >
      <span className="hidden sm:inline">Cerrar Sesión</span>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
      </svg>
    </button>
  );
}