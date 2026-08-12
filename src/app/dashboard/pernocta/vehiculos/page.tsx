"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const OPCIONES = {
  tipo_propiedad: ['PROPIO', 'ARRENDADO'],
  marca_vehiculo: ['CHEVROLET','DODGE','FORD','FOTON','FREIGHTLINER','INTERNATIONAL','MAQSA','MG','NISSAN','RENAULT','STERLING','VOLKSWAGEN','VOLVO'],
  submarca_vehiculo: ['4200','4300','500','AVEO','CHASIS CABINA','D21 CS','F-150 CREW CAB','F-150 CREW CAB 4X4','F-450','F150','F250 CS','F350','FRONTIER','FRONTIER 4X4','JETTA','L7500','LOGAN','M235K','MG','MV607 SBA 4X2 2 EPA','MV607 SBA 4X2 EPA','RAM 1500','RAM 2500 CS','RAM 4000','RAM 4000 CS','RANGER','S10 MAX','SILVERADO 1500','SILVERADO 3500','SILVERADO 4X2','SILVERADO 4X2 CABINA SENCILLA','SILVERADO 4X4 CABINA SENCILLA','SILVERADO 4X4 DOBLE CABINA','SILVERADO DOBLE CABINA','TUNLAND DC','VHD64B'],
  tipo_vehiculo: ['SED','PIK','CAM','CEE','MON'],
  tipo_combustible: ['GASOLINA','DIESEL'],
  arrendadora: ['JETVAN','LUMO','N/A'],
  campo_clasificacion: ['|','ADMINISTRACION/ ALMACEN','CCC','CCD','COMERCIAL BERMEJILLO','COMERCIAL CEBALLOS','COMERCIAL CENTRO','COMERCIAL CUENCAMÉ','COMERCIAL LERDO','COMERCIAL NAZAS','COMERCIAL PEDREGAL','COMERCIAL RODEO','COMERCIAL TLAHUALILO','COMERCIAL ZONA','DISTRIBUCIÓN BERMEJILLO','DISTRIBUCIÓN CUENCAME','DISTRIBUCIÓN MTTO.','DISTRIBUCIÓN OPERACIÓN','DISTRIBUCIÓN RODEO','DISTRIBUCIÓN ZONA','ELÉCTRICO','JEFATURA ATENCION A CLIENTES','JEFATURA COMERCIAL ZONA','JURÍDICO','MCYS B.T.','MCYS M.T.','PLANEACIÓN','SEGURIDAD E HIGIENE','SUPERINTENDENCIA','UTILITARIO / COMERCIAL CENTRO','UTILITARIO / COMERCIAL LERDO','UTILITARIO / COMERCIAL PEDREGAL','UTILITARIO / ZONA / PARA BAJA EN ALMACEN','UTILITARIO ALMACEN','UTILITARIO DPTO. PERSONAL','UTILITARIO MEDICION','UTILITARIO ZONA'],
  responsable: ['ABEL ALFEREZ','ANA FABIOLA SANTANA GONZALEZ','ANGEL SERGIO BAÑUELOS GUZMAN','CARLOS BECERRA','CARLOS GONZALEZ','CECILIA VERTIZ GORAY','CLAUDIA CANO CASTILLO','EDER DE LEON SANCHEZ','EDGAR OSWALDO PADILLA LOPEZ','FABIOLA JOSEFINA NÚÑEZ MENA','FRANCISCO GRIJALVA','FÁTIMA CORPUS GÓMEZ','GABRIEL RODRÍGUEZ LAINEZ','GERARDO IVAN OROPEZA MANRIQUEZ','GERSON ACOSTA','GILBERTO ANTONIO MENDOZA CHI','JORGE RIVERA','JOSE DANIEL GONZALEZ HERNANDEZ','JOSE JAIME ORTEGA TELLEZ','JOSE LUIS MARTINEZ JURADO','JOSÉ DEL PILAR ANDRADE BOCANEGRA','JUAN CARLOS BERUMEN MACIAS','LLUVIA HINOJO','MANUEL ALVARADO SALAZAR','MARIA ELENA MARTINEZ GARCIA','MARIAN VERÓNICA MORALES RODRÍGUEZ','MAURICIO JULIO ZUBIATE JASSO','MELISSA MARTINEZ','MIRIAM MARQUEZ DUQUE','MÓNICA EDELY ORTÍZ CARRILLO','OSCAR GILBERTO RODRÍGUEZ DOMÍNGUEZ','PASCUAL ARMANDO VALLES ANSENO','RAFAEL ALFREDO QUINTANA HERRADO','RASIEL ALAIN MENDEZ LOPEZ','RICARDO DANIEL QUINTANA PEREZ','RIGOBERTO EFRAIN CASAS FLORES','ROBERTO RODRIGUEZ ESCÁRCEGA','SALMA NEVAREZ','SALMA ORTIZ','VICTOR MANUEL RANGEL CARDONA','YANETH RODRIGUEZ'],
};

interface Vehiculo {
  id?: number;
  economico: string;
  numero_serie: string;
  tipo_propiedad: string;
  placas: string;
  marca_vehiculo: string;
  submarca_vehiculo: string;
  modelo: string;
  tipo_vehiculo: string;
  tipo_combustible: string;
  arrendadora: string;
  campo_clasificacion: string;
  responsable: string;
  departamento_id: string;
  vehiculo_pernocta: boolean;
}

const vacio: Vehiculo = {
  economico: "", numero_serie: "", tipo_propiedad: "PROPIO", placas: "",
  marca_vehiculo: "CHEVROLET", submarca_vehiculo: "AVEO", modelo: "",
  tipo_vehiculo: "SED", tipo_combustible: "GASOLINA", arrendadora: "N/A",
  campo_clasificacion: "|", responsable: "", departamento_id: "",
  vehiculo_pernocta: true,
};

export default function GestionVehiculosPage() {
  const [vs, setVs] = useState<Vehiculo[]>([]);
  const [form, setForm] = useState<Vehiculo>(vacio);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const cargar = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/vehiculos');
        const data = await res.json();
        if (isMounted) {
          setVs(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    cargar();

    return () => {
      isMounted = false;
    };
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const name = target.name;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;
    setForm({ ...form, [name]: value });
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editId ? `http://localhost:3000/api/vehiculos/${editId}` : 'http://localhost:3000/api/vehiculos';
    const method = editId ? "PUT" : "POST";
    
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(vacio);
    setEditId(null);
    
    const res = await fetch('http://localhost:3000/api/vehiculos');
    setVs(await res.json());
  };

  const editar = (v: Vehiculo) => {
    if (v.id) {
      setForm(v);
      setEditId(v.id);
    }
  };

  const eliminar = async (id: number) => {
    await fetch(`http://localhost:3000/api/vehiculos/${id}`, { method: "DELETE" });
    const res = await fetch('http://localhost:3000/api/vehiculos');
    setVs(await res.json());
  };

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#145c2c]">Gestión de Vehículos</h1>
          <p className="text-sm text-slate-500">Parque vehicular importado y controlado por CFE</p>
        </div>
        <Link 
          href="/dashboard/pernocta"
          className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          ← Volver
        </Link>
      </div>

      {/* Formulario de Registro */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">
          {editId ? "Editar Vehículo" : "Registrar Nuevo Vehículo"}
        </h2>
        
        <form onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <input name="economico" placeholder="Económico" value={form.economico} onChange={onChange} required className="border p-2 rounded-lg text-sm" />
          <input name="numero_serie" placeholder="Serie" value={form.numero_serie} onChange={onChange} className="border p-2 rounded-lg text-sm" />
          <input name="placas" placeholder="Placas" value={form.placas} onChange={onChange} className="border p-2 rounded-lg text-sm" />
          
          <select name="tipo_propiedad" value={form.tipo_propiedad} onChange={onChange} className="border p-2 rounded-lg text-sm">
            {OPCIONES.tipo_propiedad.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          
          <select name="marca_vehiculo" value={form.marca_vehiculo} onChange={onChange} className="border p-2 rounded-lg text-sm">
            {OPCIONES.marca_vehiculo.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          
          <select name="submarca_vehiculo" value={form.submarca_vehiculo} onChange={onChange} className="border p-2 rounded-lg text-sm">
            {OPCIONES.submarca_vehiculo.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          
          <select name="tipo_vehiculo" value={form.tipo_vehiculo} onChange={onChange} className="border p-2 rounded-lg text-sm">
            {OPCIONES.tipo_vehiculo.map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          <select name="tipo_combustible" value={form.tipo_combustible} onChange={onChange} className="border p-2 rounded-lg text-sm">
            {OPCIONES.tipo_combustible.map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          <select name="arrendadora" value={form.arrendadora} onChange={onChange} className="border p-2 rounded-lg text-sm">
            {OPCIONES.arrendadora.map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          <select name="campo_clasificacion" value={form.campo_clasificacion} onChange={onChange} className="border p-2 rounded-lg text-sm md:col-span-2">
            {OPCIONES.campo_clasificacion.map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          <select name="responsable" value={form.responsable} onChange={onChange} className="border p-2 rounded-lg text-sm md:col-span-2">
            <option value="">Selecciona un responsable...</option>
            {OPCIONES.responsable.map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          <div className="flex items-center gap-2">
            <input name="vehiculo_pernocta" type="checkbox" checked={form.vehiculo_pernocta} onChange={onChange} className="w-4 h-4 text-[#145c2c]" />
            <span className="text-sm font-medium text-slate-700">Aplica Pernocta</span>
          </div>

          <div className="md:col-span-4 flex justify-end gap-3 mt-2">
            {editId && (
              <button type="button" onClick={() => { setForm(vacio); setEditId(null); }} className="bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold">
                Cancelar
              </button>
            )}
            <button type="submit" className="bg-[#145c2c] hover:bg-[#0f4722] text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors">
              {editId ? "Actualizar Vehículo" : "Guardar Vehículo"}
            </button>
          </div>
        </form>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-semibold text-slate-700">
          Vehículos Registrados
        </div>
        {loading ? (
          <p className="p-6 text-slate-400 text-center">Cargando parque vehicular...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="p-3">Económico</th>
                  <th className="p-3">Placas</th>
                  <th className="p-3">Marca / Submarca</th>
                  <th className="p-3">Responsable</th>
                  <th className="p-3 text-center">Pernocta</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vs.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-800">{v.economico}</td>
                    <td className="p-3 text-slate-600">{v.placas || 'S/N'}</td>
                    <td className="p-3 text-slate-600">{v.marca_vehiculo} {v.submarca_vehiculo}</td>
                    <td className="p-3 text-slate-600">{v.responsable || 'No asignado'}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${v.vehiculo_pernocta ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {v.vehiculo_pernocta ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button onClick={() => editar(v)} className="text-blue-600 hover:underline font-medium text-xs">Editar</button>
                      <button onClick={() => eliminar(v.id!)} className="text-red-600 hover:underline font-medium text-xs">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}