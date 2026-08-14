import { PrismaClient, TipoPropiedadVehiculo, TipoVehiculo, TipoCombustible, Arrendadora, EstadoRondin, TipoIncidencia, EstadoIncidencia } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('🌱 Iniciando seed...');

  // ============================================================
  // ROLES
  // ============================================================
  const [rolAdmin, rolSupervisor, rolGuardia] = await Promise.all([
    prisma.rol.upsert({
      where: { nombreRol: 'ADMIN' },
      update: {},
      create: { nombreRol: 'ADMIN' },
    }),
    prisma.rol.upsert({
      where: { nombreRol: 'SUPERVISOR' },
      update: {},
      create: { nombreRol: 'SUPERVISOR' },
    }),
    prisma.rol.upsert({
      where: { nombreRol: 'GUARDIA' },
      update: {},
      create: { nombreRol: 'GUARDIA' },
    }),
  ]);
  console.log('✅ Roles creados');

  // ============================================================
  // DEPARTAMENTOS
  // ============================================================
  const nombresDepartamentos = [
    'Logística',
    'Ventas',
    'Recursos Humanos',
    'Sistemas',
    'Mantenimiento',
    'Dirección General',
  ];

  const departamentos = await Promise.all(
    nombresDepartamentos.map((nombre) =>
      prisma.departamento.upsert({
        where: { nombreDepartamento: nombre },
        update: {},
        create: { nombreDepartamento: nombre },
      })
    )
  );
  console.log('✅ Departamentos creados');

  // ============================================================
  // USUARIOS
  // ============================================================
  const passwordHash = await hash('Password123!');

  const admin = await prisma.usuario.upsert({
    where: { usuario: 'admin' },
    update: {},
    create: {
      nombre: 'Administrador General',
      telefono: '5510000001',
      email: 'admin@empresa.com',
      usuario: 'admin',
      passwordHash,
      rolId: rolAdmin.id,
      activo: true,
    },
  });

  const supervisor = await prisma.usuario.upsert({
    where: { usuario: 'jperez' },
    update: {},
    create: {
      nombre: 'Juan Pérez López',
      telefono: '5510000002',
      email: 'jperez@empresa.com',
      usuario: 'jperez',
      passwordHash,
      rolId: rolSupervisor.id,
      activo: true,
    },
  });

  const guardiasData = [
    { nombre: 'Carlos Ramírez Ortiz', usuario: 'cramirez', telefono: '5510000003' },
    { nombre: 'María Fernanda Gómez', usuario: 'mgomez', telefono: '5510000004' },
    { nombre: 'Luis Ángel Torres', usuario: 'ltorres', telefono: '5510000005' },
  ];

  const guardias = [];
  for (const g of guardiasData) {
    const guardia = await prisma.usuario.upsert({
      where: { usuario: g.usuario },
      update: {},
      create: {
        nombre: g.nombre,
        telefono: g.telefono,
        email: `${g.usuario}@empresa.com`,
        usuario: g.usuario,
        passwordHash,
        rolId: rolGuardia.id,
        activo: true,
      },
    });
    guardias.push(guardia);
  }
  console.log('✅ Usuarios creados');

  // ============================================================
  // USUARIOS <-> DEPARTAMENTOS (tabla pivote)
  // ============================================================
  const asignaciones = [
    { usuarioId: admin.id, departamentoId: departamentos[5].id }, // Dirección General
    { usuarioId: supervisor.id, departamentoId: departamentos[0].id }, // Logística
    { usuarioId: supervisor.id, departamentoId: departamentos[4].id }, // Mantenimiento
    { usuarioId: guardias[0].id, departamentoId: departamentos[0].id },
    { usuarioId: guardias[1].id, departamentoId: departamentos[1].id },
    { usuarioId: guardias[2].id, departamentoId: departamentos[3].id },
  ];

  for (const a of asignaciones) {
    await prisma.usuarioDepartamento.upsert({
      where: {
        usuarioId_departamentoId: {
          usuarioId: a.usuarioId,
          departamentoId: a.departamentoId,
        },
      },
      update: {},
      create: a,
    });
  }
  console.log('✅ Relaciones usuario-departamento creadas');

  // ============================================================
  // VEHÍCULOS
  // ============================================================
  const vehiculosData = [
    {
      economico: 'ECO-001',
      numeroSerie: '1HGCM82633A004352',
      tipoPropiedad: TipoPropiedadVehiculo.PROPIO,
      placas: 'ABC1234',
      marcaVehiculo: 'CHEVROLET',
      submarcaVehiculo: 'AVEO',
      modelo: 2022,
      tipoVehiculo: TipoVehiculo.SED,
      tipoCombustible: TipoCombustible.GASOLINA,
      arrendadora: Arrendadora.NA,
      departamentoId: departamentos[0].id,
    },
    {
      economico: 'ECO-002',
      numeroSerie: '3N1AB7AP0FY289456',
      tipoPropiedad: TipoPropiedadVehiculo.ARRENDADO,
      placas: 'XYZ9876',
      marcaVehiculo: 'NISSAN',
      submarcaVehiculo: 'NP300',
      modelo: 2021,
      tipoVehiculo: TipoVehiculo.PIK,
      tipoCombustible: TipoCombustible.DIESEL,
      arrendadora: Arrendadora.JETVAN,
      departamentoId: departamentos[4].id,
    },
    {
      economico: 'ECO-003',
      numeroSerie: '9BWHE21JX24060960',
      tipoPropiedad: TipoPropiedadVehiculo.ARRENDADO,
      placas: 'JKL4567',
      marcaVehiculo: 'FREIGHTLINER',
      submarcaVehiculo: 'M2 106',
      modelo: 2019,
      tipoVehiculo: TipoVehiculo.CAM,
      tipoCombustible: TipoCombustible.DIESEL,
      arrendadora: Arrendadora.LUMO,
      departamentoId: departamentos[0].id,
    },
    {
      economico: 'ECO-004',
      numeroSerie: '2G1WT58K389123456',
      tipoPropiedad: TipoPropiedadVehiculo.PROPIO,
      placas: 'MNO7890',
      marcaVehiculo: 'CHEVROLET',
      submarcaVehiculo: 'AVEO',
      modelo: 2023,
      tipoVehiculo: TipoVehiculo.SED,
      tipoCombustible: TipoCombustible.GASOLINA,
      arrendadora: Arrendadora.NA,
      departamentoId: departamentos[1].id,
    },
    {
      economico: 'ECO-005',
      numeroSerie: 'JH2SC5407NM100234',
      tipoPropiedad: TipoPropiedadVehiculo.PROPIO,
      placas: 'PQR3456',
      marcaVehiculo: 'HONDA',
      submarcaVehiculo: 'CB190',
      modelo: 2020,
      tipoVehiculo: TipoVehiculo.MON,
      tipoCombustible: TipoCombustible.GASOLINA,
      arrendadora: Arrendadora.NA,
      departamentoId: departamentos[3].id,
      vehiculoPernocta: false,
    },
  ];

  const vehiculos = [];
  for (const v of vehiculosData) {
    const vehiculo = await prisma.vehiculo.create({ data: v });
    vehiculos.push(vehiculo);
  }
  console.log('✅ Vehículos creados');

  // ============================================================
  // RONDINES + ESCANEOS
  // ============================================================
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  const rondin1 = await prisma.rondin.create({
    data: {
      fecha: ayer,
      guardiaId: guardias[0].id,
      inicio: new Date(ayer.setHours(22, 0, 0, 0)),
      fin: new Date(ayer.setHours(23, 45, 0, 0)),
      estado: EstadoRondin.CERRADO,
    },
  });

  const rondin2 = await prisma.rondin.create({
    data: {
      fecha: hoy,
      guardiaId: guardias[1].id,
      inicio: new Date(),
      estado: EstadoRondin.ABIERTO,
    },
  });

  await prisma.escaneo.createMany({
    data: [
      {
        rondinId: rondin1.id,
        vehiculoId: vehiculos[0].id,
        dispositivo: 'Handheld-01',
      },
      {
        rondinId: rondin1.id,
        vehiculoId: vehiculos[1].id,
        dispositivo: 'Handheld-01',
      },
      {
        rondinId: rondin1.id,
        vehiculoId: vehiculos[2].id,
        dispositivo: 'Handheld-01',
      },
      {
        rondinId: rondin2.id,
        vehiculoId: vehiculos[3].id,
        dispositivo: 'Handheld-02',
      },
    ],
  });
  console.log('✅ Rondines y escaneos creados');

  // ============================================================
  // INCIDENCIAS
  // ============================================================
  await prisma.incidencia.createMany({
    data: [
      {
        vehiculoId: vehiculos[4].id,
        fecha: ayer,
        tipo: TipoIncidencia.VEHICULO_NO_LOCALIZADO,
        estado: EstadoIncidencia.ABIERTA,
        descripcion: 'No se localizó la motocicleta en el punto de resguardo asignado.',
      },
      {
        vehiculoId: vehiculos[2].id,
        fecha: ayer,
        tipo: TipoIncidencia.QR_DANADO,
        estado: EstadoIncidencia.CERRADA,
        descripcion: 'Código QR dañado por exposición al sol, se reemplazó.',
        resueltaPor: supervisor.id,
        resueltaEn: new Date(),
      },
    ],
  });
  console.log('✅ Incidencias creadas');

  // ============================================================
  // AUTORIZACIONES DE PERNOCTA
  // ============================================================
  await prisma.autorizacionPernocta.create({
    data: {
      vehiculoId: vehiculos[1].id,
      fechaInicio: hoy,
      fechaFin: new Date(hoy.getTime() + 3 * 24 * 60 * 60 * 1000),
      motivo: 'Viaje foráneo a entrega en cliente foráneo.',
      autorizadoPor: supervisor.id,
    },
  });
  console.log('✅ Autorizaciones de pernocta creadas');

  // ============================================================
  // CONFIGURACIÓN
  // ============================================================
  await prisma.configuracion.createMany({
    data: [
      { clave: 'HORA_INICIO_RONDIN', valor: '21:00' },
      { clave: 'HORA_FIN_RONDIN', valor: '06:00' },
      { clave: 'TOLERANCIA_MINUTOS', valor: '15' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Configuración creada');

  console.log('🌱 Seed finalizado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });