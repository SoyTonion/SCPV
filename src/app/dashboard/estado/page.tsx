import Link from 'next/link';
import { Car, Check, CircleAlert, X } from 'lucide-react';

export default function estadoIndex() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-bold text-slate-800">Estado físico del Parque Vehicular</h1>
          <p className="text-slate-500 mt-2">Resumen operativo de inspecciones, alertas y condiciones físicas de los vehículos.</p>
        </header> 

        {/* Contenedor de las 3 tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          
       
          <Link href="/dashboard/estado/vehiculos" className="group block bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-gray-400 transition-all w-57 h-52">
            <div className="h-12 w-12 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center mb-4 text-xl font-bold group-hover:bg-gray-600 group-hover:text-white transition-colors">
              <Car/>
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2"> Vehículos inspeccionados </h2>
            <h3 className="text-2xl text-slate-500 font-bold">137</h3>
          </Link>

       
          <Link href="/dashboard/estado/vehiculos?estado=NORMAL" className="group flex flex-col justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-green-400 transition-all w-57 h-52">
            <div className="h-12 w-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xl font-bold group-hover:bg-green-600 group-hover:text-white transition-colors">
              <Check/>
            </div>
              <h2 className="text-xl font-semibold text-slate-700 mb-1">En buenas condiciones</h2>
              <h3 className="text-2xl font-bold text-slate-500">20  </h3>
          </Link>

          
          <Link href="/estado/vehiculos?estado=ADVERTENCIA" className="group flex flex-col justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-yellow-400 transition-all w-57 h-52">
            <div className="h-12 w-12 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center text-xl font-bold group-hover:bg-yellow-600 group-hover:text-white transition-colors">
              <CircleAlert/>
            </div>
              <h2 className="text-xl font-semibold text-slate-700 mb-1">Requieren atención</h2>
              <h3 className="text-2xl font-bold text-slate-500">20</h3> 
          </Link>

          
          <Link href="/dashboard/estado/vehiculos?estado=CRITICO" className="group flex flex-col justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-red-400 transition-all w-57 h-52">
            <div className="h-12 w-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center text-xl font-bold group-hover:bg-red-600 group-hover:text-white transition-colors">
              <X/>
            </div>
              <h2 className="text-xl font-semibold text-slate-700 mb-1">Críticos</h2>
              <h3 className="text-2xl font-bold text-slate-500">5</h3>
          </Link>

        </div>
      </div>
    </main>
  );
}