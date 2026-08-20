import Link from 'next/link';
import { Fuel, ScanEye, ChevronRight } from 'lucide-react';

const modulos = [
  {
    href: '/operacion/combustible',
    titulo: 'Combustible',
    descripcion: 'Registra cargas escaneando el QR del vehículo y capturando el ticket.',
    icono: <Fuel className="h-7 w-7" />,
  },
  {
    href: '/operacion/estado',
    titulo: 'Estado Físico',
    descripcion: 'Inspecciona el vehículo fotografiando cada ángulo y detectando daños.',
    icono: <ScanEye className="h-7 w-7" />,
  },
];

export default function OperacionPage() {
  return (
    <div className="p-4 w-full max-w-md mx-auto">
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 relative overflow-hidden">
        {/* Barra superior verde — mismo que los demás módulos */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#007A33]" />

        <h1 className="text-xl font-extrabold text-slate-800 mb-1 text-center tracking-tight mt-2">
          Módulo de Operaciones
        </h1>
        <p className="text-xs text-slate-500 mb-6 text-center font-medium">
          Selecciona el módulo que deseas usar
        </p>

        <div className="flex flex-col gap-3">
          {modulos.map(({ href, titulo, descripcion, icono }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 border-2 border-slate-200 hover:border-[#007A33] hover:bg-[#007A33]/5 rounded-xl p-4 transition-all group active:scale-95"
            >
              {/* Ícono */}
              <div className="shrink-0 w-12 h-12 bg-slate-100 group-hover:bg-[#007A33]/10 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#007A33] transition-colors">
                {icono}
              </div>

              {/* Texto */}
              <div className="flex flex-col justify-center min-w-0">
                <span className="font-extrabold text-slate-800 text-sm leading-tight">{titulo}</span>
                <span className="text-xs text-slate-500 mt-0.5 leading-snug">{descripcion}</span>
              </div>

              {/* Chevron */}
              <div className="ml-auto shrink-0 text-slate-300 group-hover:text-[#007A33] transition-colors">
                <ChevronRight className="h-5 w-5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
