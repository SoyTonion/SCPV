import Link from 'next/link';

export default function DashboardCentral() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-bold text-slate-800">Sistema Integral CFE</h1>
          <p className="text-slate-500 mt-2">Selecciona un módulo para comenzar</p>
        </header>

        {/* Contenedor de las 3 tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
       
          <Link href="dashboard/pernocta" className="group block bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all">
            <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 text-xl font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
              P
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">Control de Pernocta</h2>
            <p className="text-sm text-slate-500">Registro de entradas, salidas y escaneo de códigos QR de los vehículos.</p>
          </Link>

       
          <Link href="dashboard/combustible" className="group block bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:green-border-400 transition-all">
            <div className="h-12 w-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4 text-xl font-bold group-hover:bg-green-600 group-hover:text-white transition-colors">
              C
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">Combustible</h2>
            <p className="text-sm text-slate-500">Gestión de cargas, kilometraje y control de gastos por vehículo.</p>
          </Link>

          
          <Link href="dashboard/estado" className="group block bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-400 transition-all">
            <div className="h-12 w-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-4 text-xl font-bold group-hover:bg-orange-600 group-hover:text-white transition-colors">
              E
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">Estado Físico</h2>
            <p className="text-sm text-slate-500">Inspecciones físicas, logotipos y reportes de condiciones del vehículo.</p>
          </Link>

        </div>
      </div>
    </main>
  );
}