import Link from 'next/link';
import { Fuel, ScanEye, ChevronRight } from 'lucide-react';

const modulos = [
  {
    href: '/operacion/combustible',
    titulo: 'Combustible',
    descripcion: 'Registra cargas de combustible escaneando el QR del vehículo y capturando el ticket.',
    icono: <Fuel className="h-8 w-8" />,
  },
  {
    href: '/operacion/estado',
    titulo: 'Estado Físico',
    descripcion: 'Inspecciona el estado del vehículo fotografiando cada ángulo y detectando daños.',
    icono: <ScanEye className="h-8 w-8" />,
  },
];

export default function OperacionPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start p-6 pt-12">

      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Operación</h1>
        <p className="text-sm text-slate-500 mb-8">Selecciona el módulo que deseas usar.</p>

        <div className="flex flex-col gap-4">
          {modulos.map(({ href, titulo, descripcion, icono }) => (
            <Link
              key={href}
              href={href}
              className="flex items-start gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm active:scale-95 transition-transform hover:border-[#007A33]"
            >
              {/* Ícono */}
              <div className="shrink-0 w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-[#007A33]">
                {icono}
              </div>

              {/* Texto */}
              <div className="flex flex-col justify-center">
                <span className="font-bold text-slate-800 text-base">{titulo}</span>
                <span className="text-sm text-slate-500 mt-0.5 leading-snug">{descripcion}</span>
              </div>

              {/* Chevron */}
              <div className="ml-auto self-center text-slate-300">
                <ChevronRight className="h-5 w-5" />
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
