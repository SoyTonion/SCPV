⚡ Sistema Integral Vehicular CFE (SCPV)
Proyecto construido con Next.js (App Router), Tailwind CSS, Prisma ORM y PostgreSQL.
Este documento sirve como guía rápida de comandos y mapa de arquitectura para el equipo de desarrollo.

🚀 1. Setup Inicial (Levantar el proyecto por primera vez)
Pasos exactos para clonar y correr el proyecto en tu máquina local.

Bash
# 1. Clonar el repositorio y entrar a la carpeta
git clone [URL_DEL_REPO]
cd scpv

# 2. Instalar TODAS las dependencias (respetará el package.json)
npm install
Variables de Entorno:
Crea un archivo .env en la raíz (al mismo nivel que package.json) y pega la conexión a tu PostgreSQL local:

Fragmento de código
DATABASE_URL="postgresql://USUARIO:PASSWORD@localhost:5432/NOMBRE_BD?schema=public"
📦 2. Instalación Manual de Prisma (Versión Estricta)
Si necesitas instalar Prisma en un entorno nuevo o hubo un problema con npm install, usa estrictamente estos comandos para asegurar la versión 6.19.3 de tu package.json:

Bash
# Instalar el CLI de Prisma como dependencia de desarrollo
npm install prisma@6.19.3 --save-dev

# Instalar el Cliente de Prisma para el código
npm install @prisma/client@6.19.3
🗄️ 3. Base de Datos & ORM (Cheat Sheet)
Comandos del día a día para manejar la base de datos a través de Prisma.

Bash
# Inicializar Prisma (Crea la carpeta prisma/ y el archivo .env si no existen)
npx prisma init

# Sincronizar tu BD local con el esquema y crear una migración (Ejecutar cuando modifiques schema.prisma)
npx prisma migrate dev --name descripcion_del_cambio

# Generar el cliente de Prisma (OBLIGATORIO cada vez que hagas 'git pull' y alguien haya cambiado el schema.prisma)
npx prisma generate

# Poblar la BD con los catálogos y datos iniciales (Seeders)
npx prisma db seed

# Abrir la interfaz gráfica en el navegador para ver y editar los registros de la BD directamente
npx prisma studio
🖥️ 4. Iniciar el Servidor
Bash
# Levantar el entorno de desarrollo
npm run dev
El sistema estará corriendo en http://localhost:3000.

📂 5. Arquitectura y Estructura de Carpetas
Toda nueva vista, componente, función o endpoint debe respetar la siguiente jerarquía.

Bash
scpv/
├── prisma/
│   ├── schema.prisma   # Modelos y tablas de la BD (Correr migrate/generate si se modifica)
│   └── seed.ts         # Script para inyectar datos iniciales (roles, catálogos)
├── src/
│   ├── actions/        # Server Actions: Funciones asíncronas para mutar datos en BD
│   ├── components/     # Componentes UI reutilizables (Botones, Modales, Tablas)
│   ├── lib/            # Utilidades globales e instancia de Prisma (prisma.ts)
│   └── app/            # App Router (Rutas públicas del sistema)
│       ├── page.tsx    # Ruta '/' (Login Institucional)
│       ├── api/        # Endpoints REST solo para consumos externos o móviles
│       │   └── vehiculos/
│       │       └── route.ts
│       ├── dashboard/  # Panel Central (Detrás del Login)
│       │   ├── layout.tsx  # Layout maestro (Navbar verde, Sidebar)
│       │   ├── page.tsx    # Vista general ('/dashboard')
│       │   ├── admin/      # Módulo Administrativo (Usuarios y permisos)
│       │   ├── pernocta/   # Módulo Tadeo (Vehículos, Asignaciones, Historial)
│       │   ├── combustible/# Módulo Cargas (Vales, rendimientos, kilometrajes)
│       │   └── estado/     # Módulo Toni (Inspecciones físicas e inventario)
│       └── escaner/    # Ruta aislada ('/escaner'). Cámara QR full-screen para Guardia
├── .env                # Credenciales locales (NO subir a GitHub)
└── package.json        # Dependencias y scripts del proyecto
💡 ¿Para qué sirve cada carpeta principal?
prisma/: Contiene la definición de los modelos de la base de datos (schema.prisma) y los scripts de datos iniciales (seed.ts).

src/actions/: Aquí van las funciones del backend que se ejecutan directamente desde los formularios o vistas usando Next.js Server Actions.

src/components/: Piezas de interfaz reutilizables. No deben depender directamente de páginas o rutas específicas.

src/lib/: Archivos de configuración general (como la conexión centralizada a la base de datos con Prisma).

src/app/: Enrutador principal. Cada carpeta con un page.tsx define una ruta accesible en el navegador.

🛠️ 6. Reglas de Desarrollo del Equipo
Ruteo (page.tsx): En Next.js, las carpetas definen la URL, pero el archivo visual siempre debe llamarse page.tsx.

Componentes de Cliente ("use client"): Next.js renderiza todo en el servidor por defecto. Si tu componente usa interactividad (ej. useState, useEffect, onClick), debes poner "use client"; en la línea 1.

Server Actions vs API: Prioricen el uso de Server Actions (en src/actions/) para interactuar con la BD desde la UI. La carpeta app/api/ es exclusivamente para endpoints que consumirá un servicio externo (como una app móvil).

Estilos: Usamos Tailwind CSS v4. Eviten crear archivos .css externos. Todo el diseño se maneja mediante clases utilitarias en los componentes.