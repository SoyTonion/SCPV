// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la inyección de datos (Seed)...');

  // 1. Crear los Roles
  const rolAdmin = await prisma.rol.upsert({
    where: { nombreRol: 'ADMIN' },
    update: {},
    create: { nombreRol: 'ADMIN' },
  });

  const rolGuardia = await prisma.rol.upsert({
    where: { nombreRol: 'GUARDIA' },
    update: {},
    create: { nombreRol: 'GUARDIA' },
  });

  const rolOperador = await prisma.rol.upsert({
    where: { nombreRol: 'OPERADOR' },
    update: {},
    create: { nombreRol: 'OPERADOR' },
  });

  // 2. Encriptar la contraseña genérica ("Cfe.2026")
  const passwordHash = await bcrypt.hash('Cfe.2026', 10);

  // 3. Crear los Usuarios de Prueba
  await prisma.usuario.upsert({
    where: { usuario: 'admin_cfe' },
    update: {},
    create: {
      nombre: 'Administrador Principal',
      usuario: 'admin_cfe',
      passwordHash: passwordHash,
      rolId: rolAdmin.id,
      activo: true,
    },
  });

  await prisma.usuario.upsert({
    where: { usuario: 'guardia_01' },
    update: {},
    create: {
      nombre: 'Juan Pérez (Guardia)',
      usuario: 'guardia_01',
      passwordHash: passwordHash,
      rolId: rolGuardia.id,
      activo: true,
    },
  });

  await prisma.usuario.upsert({
    where: { usuario: 'operador_01' },
    update: {},
    create: {
      nombre: 'Carlos López (Operador)',
      usuario: 'operador_01',
      passwordHash: passwordHash,
      rolId: rolOperador.id,
      activo: true,
    },
  });

  console.log('✅ Base de datos poblada con 3 usuarios de prueba.');
  console.log('🔑 Contraseña para todos: Cfe.2026');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });