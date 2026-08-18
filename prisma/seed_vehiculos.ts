import { PrismaClient, TipoPropiedadVehiculo, TipoVehiculo, TipoCombustible, Arrendadora } from '@prisma/client';
import * as fs from 'fs';
import csv from 'csv-parser';
import * as path from 'path';

const prisma = new PrismaClient();

// ========== UTILIDADES ==========
const limpiar = (texto: string | undefined) => (texto ? texto.trim() : '');

// Busca una columna por varios nombres posibles (normalizados)
const buscarColumna = (row: Record<string, string>, ...nombres: string[]): string => {
  const rowKeys = Object.keys(row);
  for (const nombre of nombres) {
    const key = rowKeys.find(
      (k) => k.trim().toUpperCase() === nombre.trim().toUpperCase()
    );
    if (key !== undefined) return row[key];
  }
  return '';
};

const mapearArrendadora = (texto: string): Arrendadora => {
  const t = texto.toUpperCase().trim();
  if (t.includes('JETVAN')) return Arrendadora.JETVAN;
  if (t.includes('LUMO')) return Arrendadora.LUMO;
  return Arrendadora.NA;
};

const mapearTipo = (texto: string): TipoVehiculo => {
  const t = texto.toUpperCase().trim();
  if (t === 'PIK' || t === 'PICKUP') return TipoVehiculo.PIK;
  if (t === 'CAM' || t === 'CAMIONETA') return TipoVehiculo.CAM;
  if (t === 'CEE') return TipoVehiculo.CEE;
  if (t === 'MON') return TipoVehiculo.MON;
  return TipoVehiculo.SED;
};

// ========== DETECCIÓN DE SEPARADOR ==========
const detectarSeparador = (filePath: string): string => {
  const contenido = fs.readFileSync(filePath, 'utf8');
  const primeraLinea = contenido.split('\n')[0] || '';
  // Si encuentra punto y coma fuera de comillas, asume que es el separador
  return primeraLinea.includes(';') ? ';' : ',';
};

// ========== MAIN ==========
async function main() {
  console.log('🚗 Iniciando la lectura del archivo vehiculos.csv...');

  const csvFilePath = path.join(__dirname, 'vehiculos.csv');

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ No se encontró el archivo en la ruta: ${csvFilePath}`);
    process.exit(1);
  }

  const separador = detectarSeparador(csvFilePath);
  console.log(`🔍 Separador detectado: "${separador}"`);

  const vehiculos: Record<string, string>[] = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv({ separator: separador }))
    .on('data', (row) => {
      // Limpiar las claves: eliminar BOM y espacios
      const cleanedRow: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        const cleanKey = key.trim().replace(/^\uFEFF/, '');
        cleanedRow[cleanKey] = row[key];
      }

      // Saltar filas completamente vacías
      const valores = Object.values(cleanedRow);
      if (valores.every((v) => !v || v.trim() === '')) return;

      vehiculos.push(cleanedRow);
    })
    .on('end', async () => {
      console.log(`✅ Archivo leído. Se encontraron ${vehiculos.length} filas.`);

      // ========== DIAGNÓSTICO SOLICITADO ==========
      if (vehiculos.length > 0) {
        console.log('🔍 Columnas detectadas en tu CSV:', Object.keys(vehiculos[0]));
        console.log('📦 Primera fila (valores):', JSON.stringify(vehiculos[0], null, 2));
      }

      // Limpieza de la base de datos (opcional pero recomendado)
      console.log('🧹 Limpiando registros anteriores de vehículos...');
      await prisma.registroCombustible.deleteMany();
      await prisma.vehiculo.deleteMany();

      let creados = 0;

      for (const v of vehiculos) {
        try {
          // Extraer campos usando búsqueda flexible
          const economico = limpiar(
            buscarColumna(v, 'ECONOMICO', 'Económico', 'No. Economico', 'No Economico')
          );
          const placas = limpiar(
            buscarColumna(v, 'PLACAS ACTUALES', 'Placas', 'PLACAS', 'placas')
          );
          const serie = limpiar(
            buscarColumna(v, 'No. DE SERIE', 'NUMERO DE SERIE', 'SERIE', 'No. Serie', 'No Serie')
          );
          const marca = limpiar(
            buscarColumna(v, 'MARCA', 'Marca')
          );
          const submarca = limpiar(
            buscarColumna(v, 'SUBMARCA', 'Submarca')
          );
          const modelo = limpiar(
            buscarColumna(v, 'MODELO', 'Modelo')
          );
          const tipo = limpiar(
            buscarColumna(v, 'TIPO', 'Tipo')
          );
          const combustible = limpiar(
            buscarColumna(v, 'COMBUSTIBLE', 'Combustible')
          );
          const arrendadora = limpiar(
            buscarColumna(v, 'ARRENDADORA', 'Arrendadora')
          );
          const propiedad = limpiar(
            buscarColumna(v, 'PROPIO/ARRENDADO', 'Propiedad')
          );
          const responsable = limpiar(
            buscarColumna(v, 'RESPONSABLE', 'Responsable')
          );
          const clasificacion = limpiar(
            buscarColumna(v, 'CAMPO DE CLASIFICACION', 'Clasificacion')
          );

          // Construir QR (si no hay económico ni placas, usar un número aleatorio)
          const qrGenerado = `CFE-QR-${economico || placas || Math.floor(Math.random() * 100000)}`;

          await prisma.vehiculo.create({
            data: {
              economico: economico || null,
              numeroSerie: serie || null,
              tipoPropiedad: propiedad.toUpperCase().includes('ARRENDADO')
                ? TipoPropiedadVehiculo.ARRENDADO
                : TipoPropiedadVehiculo.PROPIO,
              placas: placas || null,
              marcaVehiculo: marca || 'CHEVROLET',
              submarcaVehiculo: submarca || 'AVEO',
              modelo: parseInt(modelo) || 2020,
              tipoVehiculo: mapearTipo(tipo),
              tipoCombustible: combustible.toUpperCase().includes('DIESEL')
                ? TipoCombustible.DIESEL
                : TipoCombustible.GASOLINA,
              arrendadora: mapearArrendadora(arrendadora),
              campoClasificacion: clasificacion || '|',
              responsable: responsable || 'SIN ASIGNAR',
              capacidadTanque: 45.0,
              qrToken: qrGenerado,
            },
          });
          creados++;
        } catch (error) {
          console.error(`❌ Error inyectando un vehículo:`, error);
        }
      }

      console.log(`\n🎉 ¡Proceso terminado! Se guardaron ${creados} vehículos correctamente con sus placas y económicos reales.`);
      await prisma.$disconnect();
    });
}

main().catch((e) => {
  console.error('Ocurrió un error fatal al ejecutar el seed:', e);
  prisma.$disconnect();
  process.exit(1);
});