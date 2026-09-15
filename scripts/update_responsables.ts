import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import csv from 'csv-parser';
import * as path from 'path';

const prisma = new PrismaClient();

const limpiar = (texto: string | undefined) => (texto ? texto.trim() : '');

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

async function main() {
  console.log('🚗 Iniciando la actualización de responsables y acentos...');
  const csvFilePath = path.join(process.cwd(), 'prisma/Vehiculos.csv');

  const vehiculosCSV: Record<string, string>[] = [];

  // Usar latin1 para leer correctamente los acentos del Excel/CSV de Windows
  fs.createReadStream(csvFilePath, { encoding: 'latin1' })
    .pipe(csv({ separator: ',' }))
    .on('data', (row) => {
      const cleanedRow: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        const cleanKey = key.trim().replace(/^\uFEFF/, '');
        cleanedRow[cleanKey] = row[key];
      }
      vehiculosCSV.push(cleanedRow);
    })
    .on('end', async () => {
      let actualizados = 0;
      for (const v of vehiculosCSV) {
        const economico = limpiar(buscarColumna(v, 'ECONOMICO', 'Económico'));
        const placas = limpiar(buscarColumna(v, 'PLACAS ACTUALES', 'Placas'));
        const serie = limpiar(buscarColumna(v, 'No. DE SERIE', 'SERIE'));
        const responsable = limpiar(buscarColumna(v, 'RESPONSABLE', 'Responsable', 'REPONSABLE', 'Reponsable'));
        const clasificacion = limpiar(buscarColumna(v, 'CAMPO DE CLASIFICACION', 'Clasificacion'));

        if (!responsable && !clasificacion) continue;

        try {
          const vehiculoDB = await prisma.vehiculo.findFirst({
            where: {
              OR: [
                ...(economico ? [{ economico }] : []),
                ...(placas ? [{ placas }] : []),
                ...(serie ? [{ numeroSerie: serie }] : []),
              ]
            }
          });

          if (vehiculoDB && (vehiculoDB.responsable !== responsable || vehiculoDB.campoClasificacion !== clasificacion)) {
            await prisma.vehiculo.update({
              where: { id: vehiculoDB.id },
              data: { 
                responsable: responsable || vehiculoDB.responsable,
                campoClasificacion: clasificacion || vehiculoDB.campoClasificacion
              }
            });
            actualizados++;
          }
        } catch (error) {
          console.error('Error actualizando vehículo:', error);
        }
      }
      console.log(`✅ ¡Se actualizaron ${actualizados} vehículos corrigiendo los acentos!`);
      await prisma.$disconnect();
    });
}

main().catch(console.error);
