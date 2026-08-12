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
Si necesitas instalar Prisma en un entorno nuevo o hubo un problema con npm install, usa estrictamente estos comandos para asegurar la versión 6.19.3 de tu package.json y evitar conflictos de compatibilidad:

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

📂 5. Arquitectura y Estructura de Carpetas (MUY IMPORTANTE)


Plaintext
📦 SCPV
├── 📁 prisma/             # 🗄️ Todo lo relacionado a la Base de Datos
│   ├── 📄 schema.prisma   # EL NÚCLEO: Aquí se definen los modelos/tablas de la BD.
│   └── 📄 seed.ts         # Script para inyectar datos por defecto al inicializar la BD.
│
├── 📁 src/
│   ├── 📁 actions/        # ⚙️ Server Actions: Funciones asíncronas que mutan datos en la BD directamente.
│   │
│   ├── 📁 components/     # 🧩 Componentes Reutilizables de UI (Botones, Modales, Tarjetas, Tablas).
│   │
│   ├── 📁 lib/            # 🛠️ Utilidades globales (ej. 'prisma.ts' para instanciar la conexión y evitar duplicados).
│   │
│   └── 📁 app/            # 🌐 ENRUTADOR (App Router): Las carpetas con un 'page.tsx' son URLs públicas.
│       │
│       ├── 📄 page.tsx    # Ruta Raíz ('/'): Pantalla de Login Institucional.
│       │
│       ├── 📁 api/        # 🔌 Endpoints REST: Solo para consumos externos o móviles.
│       │   └── 📁 vehiculos/
│       │       └── 📄 route.ts # Accesible vía GET/POST en '/api/vehiculos'
│       │
│       ├── 📁 dashboard/  # 🟢 Panel Central: Todo lo que está detrás del Login.
│       │   ├── 📄 layout.tsx  # Layout maestro (Navbar verde, Sidebar).
│       │   ├── 📄 page.tsx    # Vista general ('/dashboard').
│       │   │
│       │   ├── 📁 admin/      # Módulo Administrativo (Usuarios, permisos).
│       │   ├── 📁 pernocta/   # Módulo Tadeo (Vehículos, Asignaciones, Historial).
│       │   ├── 📁 combustible/# Módulo de Cargas (Vales, rendimientos, kilometrajes).
│       │   └── 📁 estado/     # Módulo Toni (Inspecciones físicas e inventario).
│       │
│       └── 📁 escaner/    # 📷 Ruta aislada ('/escaner'). Cámara QR full-screen para el Guardia.
│
├── 📄 .env                # Credenciales y variables locales (Ignorado por Git).
└── 📄 package.json        # Dependencias y scripts del sistema.


🛠️ 6. Reglas de Desarrollo del Equipo
Ruteo (page.tsx): En Next.js, las carpetas definen la URL, pero el archivo visual siempre debe llamarse page.tsx.

Componentes de Cliente ("use client"): Next.js renderiza todo en el servidor por defecto. Si tu componente usa interactividad (ej. useState, useEffect, onClick), debes poner "use client"; en la línea 1.

Server Actions vs API: Prioricen el uso de Server Actions (en src/actions/) para interactuar con la BD desde la UI. La carpeta app/api/ es exclusivamente para endpoints que consumirá un servicio externo (como una app móvil).

Estilos: Usamos Tailwind CSS v4. Eviten crear archivos .css externos. Todo el diseño se maneja mediante clases en los componentes.