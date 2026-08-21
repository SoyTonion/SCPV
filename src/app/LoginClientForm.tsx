"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { signIn, getSession } from "next-auth/react";

export default function LoginClientForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const router = useRouter(); 
    const currentYear = new Date().getFullYear();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Por favor, ingresa usuario y contraseña.');
            return;
        }

        setLoading(true);

        const res = await signIn("credentials", {
            usuario: username,
            password: password,
            redirect: false, 
        });

        if (res?.error) {
            setError('Usuario o contraseña incorrectos.');
            setLoading(false);
        } else if (res?.ok) {
            const session = await getSession();
            const userRole = session?.user?.rol;

            if (userRole === 1) {
                router.push('/dashboard'); 
            } 
            else if (userRole === 2) {
                router.push('/guardia/pernocta'); 
            } 
            else if (userRole === 3) {
                router.push('/operacion'); 
            } 
            else {
                setError('Error de permisos. Contacte al administrador.');
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-sans relative overflow-hidden bg-linear-to-br from-slate-100 via-white to-slate-200">
            
            {/* Elementos decorativos de fondo */}
            <div className="absolute inset-0 pointer-events-none">
                <svg className="absolute top-0 left-0 w-full h-64 opacity-30" viewBox="0 0 1440 320" preserveAspectRatio="none">
                    <path fill="#007A33" fillOpacity="0.08" d="M0,192L48,176C96,160,192,128,288,138.7C384,149,480,203,576,208C672,213,768,171,864,160C960,149,1056,171,1152,181.3C1248,192,1344,192,1392,192L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
                </svg>
                <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-[#007A33]/5 blur-3xl"></div>
                <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-[#007A33]/5 blur-3xl"></div>
            </div>

            {/* CABECERA */}
            <header className="bg-white/80 backdrop-blur-md border-b-4 border-[#007A33]/20 z-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#007A33]/5 to-transparent pointer-events-none"></div>
                <div className="max-w-7xl mx-auto py-4 px-4 flex items-center relative z-10">
                    <div className="flex items-center space-x-4">
                        <Image 
                            src="/CFE_Logo_Test.svg"
                            alt="Logo CFE" 
                            width={100}
                            height={100}
                            className="h-7 w-auto object-contain" 
                        />
                        <span className="text-sm border-l-2 border-[#007A33]/20 pl-4 font-bold tracking-wide text-[#007A33]">
                            Sistema de Control Vehicular
                        </span>
                    </div>
                </div>
            </header>

            {/* Contenedor Principal */}
            <main className="flex-grow flex items-center justify-center p-4 md:p-8 relative z-10">
                
                {/* Tarjeta Principal con borde verde difuminado */}
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col md:flex-row overflow-hidden border-4 border-[#007A33]/20 backdrop-blur-sm">
                    
                    {/* LADO IZQUIERDO: Información + Espacio para Imagen */}
                    <div className="md:w-1/2 bg-linear-to-br from-slate-50 to-slate-100 p-8 md:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200">
                        <div>
                            <div className="inline-block bg-[#007A33]/10 text-[#007A33] px-3 py-1 rounded-full text-xs font-semibold tracking-wide mb-4 uppercase">
                                Plataforma Operativa
                            </div>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">
                                Control Vehicular
                            </h2>
                            <p className="text-slate-500 mb-6 leading-relaxed text-sm md:text-base">
                                Gestiona los recursos de la flotilla, estado físico, controla las pernoctas y monitorea el rendimiento de combustible de manera eficiente y centralizada.
                            </p>
                        </div>

                        {/* ESPACIO PARA IMAGEN */}
                        <div className="my-6 grow flex items-center justify-center overflow-hidden rounded-2xl">
                            <Image 
                                src="/Vehiculos_login.jpg" 
                                alt="Vehículos Operativos CFE" 
                                width={600}
                                height={400}
                                className="w-full h-full object-cover shadow-sm"
                            />
                        </div>

                        {/* Puntos clave */}
                        <div className="flex gap-5 text-xs font-medium text-slate-500 mt-auto">
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-[#007A33]"></div> Pernoctas
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-[#007A33]"></div> Combustible
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-[#007A33]"></div> Reportes
                            </span>
                        </div>
                    </div>

                    {/* LADO DERECHO: Formulario de Login */}
                    <div className="md:w-1/2 p-8 md:p-14 flex flex-col justify-center bg-white">
                        <div className="w-full max-w-sm mx-auto">
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
                                Iniciar Sesión
                            </h1>
                            <p className="text-slate-500 text-sm mb-8">
                                Ingresa tus credenciales institucionales
                            </p>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100 flex items-center">
                                    <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Input Usuario */}
                                <div>
                                    <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Usuario / No. Nómina
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            id="username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            disabled={loading}
                                            required
                                            placeholder="Ingresa tu usuario"
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#007A33] focus:ring-4 focus:ring-[#007A33]/10 transition-all text-slate-700"
                                        />
                                    </div>
                                </div>

                                {/* Input Contraseña con toggle */}
                                <div>
                                    <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Contraseña
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                            </svg>
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={loading}
                                            required
                                            placeholder="••••••••"
                                            className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#007A33] focus:ring-4 focus:ring-[#007A33]/10 transition-all text-slate-700"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? (
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            ) : (
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full bg-[#007A33] hover:bg-[#00632a] text-white font-semibold rounded-xl py-3.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex justify-center items-center"
                                    >
                                        {loading ? (
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : 'Entrar al Sistema'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer con borde verde más grueso */}
            <footer className="bg-white/80 backdrop-blur-md border-t-4 border-[#007A33]/20 mt-auto z-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-transparent to-[#007A33]/5 pointer-events-none"></div>

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