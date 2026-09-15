import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function NotFound() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F8FAFC] text-slate-800 overflow-hidden relative">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#007A33]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#007A33]/5 blur-[100px] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.4] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* =========================================================
          HEADER
      ========================================================= */}
      <header className="relative z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/cfe_logo.svg"
              alt="Logo CFE"
              width={100}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
            <div className="h-10 w-px bg-slate-200" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-[0.15em] text-[#007A33]">
                SCPV
              </span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                Plataforma Operativa
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-100 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            Error de Navegación
          </div>
        </div>
      </header>

      {/* =========================================================
          MAIN - CONTENIDO CENTRAL
      ========================================================= */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-6 z-10">
        <div className="w-full max-w-2xl bg-white/60 backdrop-blur-xl border border-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 md:p-16 text-center transform transition-all duration-500 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] group">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-50 text-red-500 mb-8 shadow-inner relative">
            <div className="absolute inset-0 rounded-2xl bg-red-100 animate-ping opacity-20"></div>
            <AlertCircle className="w-10 h-10 relative z-10" />
          </div>
          
          <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 mb-4 tracking-tighter">
            404
          </h1>
          
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">
            Página no encontrada
          </h2>
          
          <p className="text-slate-500 mb-10 max-w-md mx-auto text-sm md:text-base leading-relaxed">
            La dirección que intentaste visitar no existe, fue movida o no tienes los permisos necesarios para acceder a ella en la infraestructura del sistema.
          </p>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#007A33] text-white text-sm font-semibold transition-all duration-300 hover:bg-[#00652b] hover:shadow-[0_8px_25px_rgba(0,122,51,0.25)] hover:-translate-y-0.5 active:translate-y-0"
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
            Regresar al panel principal
          </Link>
        </div>
      </main>

      {/* =========================================================
          FOOTER
      ========================================================= */}
      <footer className="relative z-20 border-t border-slate-200/50 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-center md:text-left">
            <p className="font-bold text-[#007A33]">
              &copy; {currentYear} Comisión Federal de Electricidad
            </p>
            <p className="text-slate-500 mt-1">
              Sistema de Control Vehicular - Acceso Restringido
            </p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-5 text-slate-500 font-medium">
            <Link href="/privacidad" className="hover:text-[#007A33] transition-colors">
              Aviso de Privacidad
            </Link>
            <a href="mailto:soporte.sistemas@cfe.mx" className="hover:text-[#007A33] transition-colors flex items-center gap-1">
              Soporte Técnico
            </a>
            <span className="text-slate-300 hidden md:inline">|</span>
            <span className="text-[#007A33] font-mono text-[10px] font-bold tracking-widest bg-[#007A33]/10 px-2 py-1 rounded-md border border-[#007A33]/20">
              v1.0.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}