import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from "@/lib/auth";
import Link from 'next/link';

const ROLES_PERMITIDOS = [ 1 ];

export default async function PernoctaIndex() {
    const session = await getServerSession(authOptions);
  
    if (!session) redirect('/');
    if (!ROLES_PERMITIDOS.includes(Number(session.user.rol))) redirect('/operacion');

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#145c2c]">Módulo de Control de Pernocta</h1>
        <p className="text-slate-500 mt-1">Selecciona la sección que deseas administrar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Tarjeta de Vehículos */}
        <Link 
          href="/dashboard/pernocta/vehiculos" 
          className="group bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#145c2c] transition-all"
        >
          <div className="w-12 h-12 bg-green-100 text-[#145c2c] rounded-lg flex items-center justify-center font-bold text-xl mb-4 group-hover:bg-[#145c2c] group-hover:text-white transition-colors">
            V
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Vehículos</h2>
          <p className="text-sm text-slate-500">Catálogo general, altas, ediciones y control de pernocta vehicular.</p>
        </Link>

        {/* Tarjeta de Usuarios */}
        <Link 
          href="/dashboard/pernocta/usuarios" 
          className="group bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#145c2c] transition-all"
        >
          <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-xl mb-4 group-hover:bg-blue-700 group-hover:text-white transition-colors">
            U
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Usuarios</h2>
          <p className="text-sm text-slate-500">Gestión de cuentas y personal autorizado dentro del sistema.</p>
        </Link>

        {/* Tarjeta de Historial */}
        <Link 
          href="/dashboard/pernocta/historial" 
          className="group bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#145c2c] transition-all"
        >
          <div className="w-12 h-12 bg-orange-100 text-orange-700 rounded-lg flex items-center justify-center font-bold text-xl mb-4 group-hover:bg-orange-700 group-hover:text-white transition-colors">
            H
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Historial</h2>
          <p className="text-sm text-slate-500">Bitácora de registros y escaneos de códigos QR realizados en caseta.</p>
        </Link>

      </div>
    </main>
  );
}