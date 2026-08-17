import { PrismaClient, TipoPropiedadVehiculo, TipoVehiculo, TipoCombustible, Arrendadora } from '@prisma/client';
import * as fs from 'fs';
import csv from 'csv-parser';
import * as path from 'path';

const prisma = new PrismaClient();

// Función para limpiar los textos de Excel (quita espacios extra al inicio y al final)
const limpiar = (texto: string | undefined) => texto ? texto.trim() : '';

// Función para mapear la Arrendadora con base en tus ENUMs
const mapearArrendadora = (texto: string): Arrendadora => {
  const t = texto.toUpperCase().trim();
  if (t.includes('JETVAN')) return Arrendadora.JETVAN;
  if (t.includes('LUMO')) return Arrendadora.LUMO;
  return Arrendadora.NA;
};

// Función para mapear Tipo de Vehículo con base en tus ENUMs
const mapearTipo = (texto: string): TipoVehiculo => {
  const t = texto.toUpperCase().trim();
  if (t === 'PIK' || t === 'PICKUP') return TipoVehiculo.PIK;
  if (t === 'CAM' || t === 'CAMIONETA') return TipoVehiculo.CAM;
  if (t === 'CEE') return TipoVehiculo.CEE;
  if (t === 'MON') return TipoVehiculo.MON;
  return TipoVehiculo.SED; // Por defecto Sedán
};

async function main() {
  console.log('🚗 Iniciando la lectura del archivo vehiculos.csv...');
  
  const vehiculos: Record<string, string>[] = [];
  const csvFilePath = path.join(__dirname, 'vehiculos.csv');

  // Asegúrate de que el archivo exista antes de intentar leerlo
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ No se encontró el archivo en la ruta: ${csvFilePath}`);
    console.log('Asegúrate de que se llame exactamente "vehiculos.csv" y esté dentro de la carpeta "prisma"');
    process.exit(1);
  }

  // Leemos el CSV fila por fila
  fs.createReadStream(csvFilePath)
    .pipe(csv({ separator: ',' })) // Cambia la coma a ';' si tu sistema guarda los CSV con punto y coma
    .on('data', (row) => {
      vehiculos.push(row);
    })
    .on('end', async () => {
      console.log(`✅ Archivo leído. Se encontraron ${vehiculos.length} vehículos. Inyectando a PostgreSQL...`);

      let creados = 0;

      for (const v of vehiculos) {
        try {
          // Extraemos usando los nombres exactos de las columnas de tu Excel
          const economico = limpiar(v['Economico']);
          const placas = limpiar(v['PLACAS ACTUALES']);
          
          // Generamos un QR Token único (ej. CFE-QR-23000147)
          const qrGenerado = `CFE-QR-${economico || placas || Math.floor(Math.random() * 10000)}`;

          await prisma.vehiculo.create({
            data: {
              economico: economico || null,
              numeroSerie: limpiar(v['No. DE SERIE']) || null,
              tipoPropiedad: limpiar(v['PROPIO/ARRENDADO']).toUpperCase() === 'ARRENDADO' 
                ? TipoPropiedadVehiculo.ARRENDADO 
                : TipoPropiedadVehiculo.PROPIO,
              placas: placas || null,
              marcaVehiculo: limpiar(v['MARCA']) || 'CHEVROLET',
              submarcaVehiculo: limpiar(v['SUBMARCA']) || 'AVEO',
              modelo: parseInt(limpiar(v['MODELO'])) || 2020, // Por si viene vacío en el Excel
              tipoVehiculo: mapearTipo(limpiar(v['TIPO'])),
              tipoCombustible: limpiar(v['COMBUSTIBLE']).toUpperCase() === 'DIESEL' 
                ? TipoCombustible.DIESEL 
                : TipoCombustible.GASOLINA,
              arrendadora: mapearArrendadora(limpiar(v['ARRENDADORA'])),
              campoClasificacion: limpiar(v['CAMPO DE CLASIFICACION']) || '|',
              responsable: limpiar(v['RESPONSABLE']) || 'SIN ASIGNAR',
              // Capacidad simulada para que tu módulo de combustible tenga un dato numérico base
              capacidadTanque: 45.00, 
              qrToken: qrGenerado
            }
          });
          creados++;
        } catch (error) {
          console.error(`❌ Error inyectando el vehículo con Placas/Económico ${v['PLACAS ACTUALES'] || v['Economico']}:`);
          console.error(error); // Si algún carro falla, te dirá exactamente cuál fue
        }
      }

      console.log(`\n🎉 ¡Proceso terminado! Se guardaron ${creados} vehículos correctamente en la base de datos.`);
      await prisma.$disconnect();
    });
}

main().catch((e) => {
  console.error('Ocurrió un error fatal al ejecutar el seed:', e);
  prisma.$disconnect();
  process.exit(1);
});