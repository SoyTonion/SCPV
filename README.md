⚡ SCPV · Sistema Integral Vehicular CFE

Sistema integral para la gestión y control del parque vehicular de CFE.

Stack tecnológico



Proyecto construido con Next.js (App Router), Tailwind CSS, Prisma ORM y PostgreSQL.

Este documento sirve como guía rápida de instalación, comandos frecuentes y mapa de arquitectura para el equipo de desarrollo.

📑 Contenido
🚀 Setup inicial
🔐 Variables de entorno
📦 Instalación de Prisma
🗄️ Base de datos y ORM
▶️ Iniciar el servidor
📂 Arquitectura
🛠️ Reglas de desarrollo
🚀 Setup inicial

Pasos necesarios para clonar y ejecutar el proyecto por primera vez.

1. Clonar el repositorio
git clone [https://github.com/SoyTonion/SCPV.git]
cd SCPV
2. Instalar dependencias

Instala todas las dependencias especificadas en package.json:

npm install
🔐 Variables de entorno

Crea un archivo .env en la raíz del proyecto, al mismo nivel que package.json.

DATABASE_URL="postgresql://USUARIO:PASSWORD@localhost:5432/NOMBRE_BD?schema=public"

⚠️ Importante: El archivo .env contiene credenciales y no debe subirse al repositorio.

📦 Instalación manual de Prisma

Si necesitas instalar Prisma en un entorno nuevo o existe algún problema con npm install, utiliza estrictamente la versión 6.19.3, definida actualmente en el proyecto.

Prisma CLI
npm install prisma@6.19.3 --save-dev
Prisma Client
npm install @prisma/client@6.19.3
🗄️ Base de datos & ORM

Comandos principales para trabajar con PostgreSQL mediante Prisma.

Inicializar Prisma

Crea la carpeta prisma/ y los archivos necesarios si no existen:

npx prisma init
Crear una migración

Después de modificar schema.prisma:

npx prisma migrate dev --name descripcion_del_cambio
Generar Prisma Client

Obligatorio después de hacer git pull si alguien modificó schema.prisma.

npx prisma generate
Ejecutar Seeders

Pobla la base de datos con catálogos y datos iniciales:

npx prisma db seed
Abrir Prisma Studio

Permite visualizar y editar los registros de la base de datos desde una interfaz gráfica:

npx prisma studio
▶️ Iniciar el servidor

Levanta el entorno de desarrollo:

npm run dev

El sistema estará disponible en:

http://localhost:3000

📂 Arquitectura y estructura de carpetas

⚠️ MUY IMPORTANTE: Toda nueva vista, componente, función o endpoint debe respetar esta estructura.

SCPV/
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── src/
│   │
│   ├── actions/
│   │   └── # Server Actions
│   │
│   ├── components/
│   │   └── # Componentes reutilizables de UI
│   │
│   ├── lib/
│   │   └── # Utilidades globales
│   │
│   └── app/
│       │
│       ├── page.tsx
│       │   └── # Ruta raíz ('/') - Login institucional
│       │
│       ├── api/
│       │   └── vehiculos/
│       │       └── route.ts
│       │           └── # GET/POST /api/vehiculos
│       │
│       ├── dashboard/
│       │   │
│       │   ├── layout.tsx
│       │   │   └── # Layout maestro
│       │   │
│       │   ├── page.tsx
│       │   │   └── # Dashboard principal
│       │   │
│       │   ├── admin/
│       │   │   └── # Usuarios y permisos
│       │   │
│       │   ├── pernocta/
│       │   │   └── # Vehículos, asignaciones e historial
│       │   │
│       │   ├── combustible/
│       │   │   └── # Vales, rendimientos y kilometrajes
│       │   │
│       │   └── estado/
│       │       └── # Inspecciones físicas e inventario
│       │
│       └── escaner/
│           └── # Escáner QR para el guardia
│
├── .env
└── package.json
🗄️ prisma/

Contiene todo lo relacionado con la base de datos.

Archivo	Función
schema.prisma	Núcleo de la BD. Define modelos y relaciones
seed.ts	Inserta datos iniciales y catálogos
⚙️ src/actions/

Contiene las Server Actions utilizadas para ejecutar operaciones del servidor y modificar datos.

🧩 src/components/

Componentes reutilizables de interfaz:

Botones
Modales
Tarjetas
Tablas
Formularios
Otros componentes de UI
🛠️ src/lib/

Utilidades globales del proyecto.

Ejemplo:

src/lib/prisma.ts

Aquí se mantiene la instancia de Prisma para evitar conexiones duplicadas.

🌐 src/app/

Es el App Router de Next.js.

Las carpetas representan las rutas y los archivos page.tsx representan las páginas.

🔌 API

La carpeta:

src/app/api/

está destinada exclusivamente a endpoints que serán consumidos por servicios externos, por ejemplo aplicaciones móviles.

Ejemplo:

src/app/api/vehiculos/route.ts

Disponible mediante:

GET  /api/vehiculos
POST /api/vehiculos

💡 Para operaciones realizadas directamente desde la interfaz web, se deben priorizar las Server Actions.

🟢 Dashboard

Todo lo que se encuentra dentro de:

src/app/dashboard/

corresponde a funcionalidades protegidas detrás del Login.

Módulos actuales
Módulo	Descripción
admin/	Usuarios y permisos
pernocta/	Vehículos, asignaciones e historial
combustible/	Vales, rendimientos y kilometrajes
estado/	Inspecciones físicas e inventario
📷 Escáner

La ruta:

src/app/escaner/

corresponde a una sección aislada del sistema destinada al escaneo de códigos QR.

Está diseñada para utilizarse en modo full-screen por el personal de guardia.

🛠️ Reglas de desarrollo
1. Ruteo con page.tsx

En Next.js, las carpetas determinan la URL.

Las páginas deben utilizar:

page.tsx

Ejemplo:

dashboard/
└── pernocta/
    └── page.tsx

corresponde a:

/dashboard/pernocta
2. Componentes de cliente

Next.js utiliza Server Components por defecto.

Si un componente utiliza:

useState
useEffect
onClick
eventos del navegador
APIs del navegador

debe incluir:

"use client";

como primera línea del archivo.

3. Server Actions vs API
✅ Preferido

Para operaciones realizadas desde la aplicación web:

src/actions/

Utilizar Server Actions para interactuar con la base de datos.

🔌 API

Utilizar:

src/app/api/

únicamente cuando el endpoint vaya a ser consumido por un servicio externo.

Por ejemplo:

App móvil → API → Base de datos
4. Estilos

El proyecto utiliza:

Tailwind CSS v4

Los estilos deben manejarse principalmente mediante clases de Tailwind directamente en los componentes.

❌ Evitar

Crear archivos .css externos innecesariamente.

✅ Preferir
<div className="flex items-center justify-between rounded-lg p-4">
📌 Stack tecnológico
Tecnología	Uso
Next.js	Framework principal
App Router	Sistema de rutas
TypeScript	Lenguaje
Tailwind CSS v4	Estilos
Prisma ORM	Acceso a datos
PostgreSQL	Base de datos
Server Actions	Mutaciones desde la aplicación
👨‍💻 Flujo rápido para comenzar

Para un desarrollador nuevo, el flujo básico sería:

# Clonar
git clone [URL_DEL_REPO]

# Entrar al proyecto
cd scpv

# Instalar dependencias
npm install

# Configurar .env
# DATABASE_URL="..."

# Generar Prisma Client
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# Ejecutar seeders
npx prisma db seed

# Iniciar servidor
npm run dev

🚀 Sistema Integral Vehicular CFE (SCPV)
Desarrollado con Next.js + Prisma + PostgreSQL