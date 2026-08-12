"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Herramienta de Next.js para navegar entre páginas
    const router = useRouter(); 

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Por favor, ingresa usuario y contraseña.');
            return;
        }

        setLoading(true);

        // TODO: Aquí irá tu API real en el futuro.
        // Por ahora, simulamos que carga por 1 segundo y te manda al dashboard
        // para que tú y tu equipo puedan probar la navegación sin que marque error.
        setTimeout(() => {
            setLoading(false);
            router.push('/dashboard'); 
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Cabecera Institucional CFE */}
            <header className="bg-[#007A33] text-white p-4 shadow-md">
                <div className="max-w-7xl mx-auto flex items-center">
                    <div className="font-bold text-2xl tracking-wider mr-2">CFE</div>
                    <div className="text-sm border-l-2 border-white/30 pl-2">
                        Comisión Federal de Electricidad®
                    </div>
                </div>
            </header>

            {/* Contenedor Principal */}
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-100">
                    <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                        Control Vehicular
                    </h1>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
                                Usuario / No. Nómina
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                                required
                                className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#007A33] focus:ring-1 focus:ring-[#007A33] transition-all"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                required
                                className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#007A33] focus:ring-1 focus:ring-[#007A33] transition-all"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-[#007A33] hover:bg-[#005c26] text-white font-semibold rounded-lg p-3 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? 'Verificando...' : 'Iniciar Sesión'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}