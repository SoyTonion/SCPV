export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white border-t border-slate-200 mt-auto z-10">
            <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
                
                {/* Lado Izquierdo: Copyright */}
                <div className="mb-4 md:mb-0 text-center md:text-left">
                    <p className="font-medium text-slate-600">
                        &copy; {currentYear} Comisión Federal de Electricidad.
                    </p>
                    <p className="mt-1">
                        Todos los derechos reservados. Sistema de Control Vehicular.
                    </p>
                </div>

                {/* Lado Derecho: Enlaces y Versión */}
                <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
                    <a 
                        href="/aviso-privacidad" 
                        className="hover:text-[#007A33] transition-colors"
                    >
                        Aviso de Privacidad
                    </a>
                    
                    <a 
                        href="mailto:soporte.sistemas@cfe.mx" 
                        className="hover:text-[#007A33] transition-colors"
                    >
                        Soporte Técnico
                    </a>
                    
                    <a 
                        href="/manual-usuario.pdf" 
                        target="_blank" 
                        className="hover:text-[#007A33] transition-colors"
                    >
                        Manual de Usuario
                    </a>

                    {/* Versión del sistema (Separador visual en escritorio) */}
                    <span className="hidden md:inline text-slate-300">|</span>
                    
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono text-[10px]">
                        v1.0.0
                    </span>
                </div>
                
            </div>
        </footer>
    );
}