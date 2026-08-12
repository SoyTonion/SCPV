Entiendo perfectamente. Los "árboles" de carpetas hechos con texto dentro de bloques de código a veces se descuadran en GitHub dependiendo de la fuente del navegador o si lo abren en celular.

Para que se vea impecable, moderno y nativo en GitHub, lo mejor es usar Listas Anidadas de Markdown con Emojis. Esto hace que GitHub lo renderice con su propio sistema de espaciado y se vea como una documentación profesional.

Aquí tienes el README con esta nueva estructura. Simplemente cópialo y pégalo:

⚡ Sistema Integral Vehicular CFE (SCPV)
Proyecto construido con Next.js (App Router), Tailwind CSS, Prisma ORM y PostgreSQL.
Este documento sirve como guía rápida de comandos y mapa de arquitectura para el equipo de desarrollo.

🚀 1. Setup Inicial (Levantar el proyecto)
Bash
# 1. Clonar el repositorio
git clone [URL_DEL_REPO]
cd scpv

# 2. Instalar TODAS las dependencias (respetará el package.json)
npm install
Variables de Entorno: Crea un archivo .env en la raíz y pega la conexión a tu PostgreSQL local:
DATABASE_URL="postgresql://USUARIO:PASSWORD@localhost:5432/NOMBRE_BD?schema=public"

📦 2. Instalación Manual de Prisma (Versión Estricta)
Si necesitas instalar Prisma en un entorno nuevo, usa estrictamente estos comandos para asegurar la versión 6.19.3 de nuestro package.json:

Bash
npm install prisma@6.19.3 --save-dev
npm install @prisma/client@6.19.3
🗄️ 3. Base de Datos & ORM (Cheat Sheet)
Bash
# Inicializar Prisma (Solo si no existe la carpeta prisma/)
npx prisma init

# Sincronizar tu BD local con el esquema y crear migración (Correr al modificar schema.prisma)
npx prisma migrate dev --name descripcion_del_cambio

# Generar el cliente (OBLIGATORIO después de un 'git pull' con cambios en BD)
npx prisma generate

# Poblar la BD con los datos iniciales (Seeders)
npx prisma db seed

# Abrir la interfaz gráfica para ver/editar la BD en el navegador
npx prisma studio
🖥️ 4. Iniciar el Servidor
Bash
npm run dev
El sistema estará corriendo en http://localhost:3000.

📂 5. Arquitectura y Estructura de Carpetas
Toda nueva vista, componente o endpoint debe respetar la siguiente jerarquía.

📁 prisma/ — 🗄️ Base de Datos

📄 schema.prisma: El núcleo. Aquí definimos los modelos/tablas. (Si lo modificas, avisa y corre migrate).

📄 seed.ts: Script para inyectar datos iniciales (roles, catálogos) al levantar el proyecto.

📁 src/ — 💻 Código fuente de la aplicación

📁 actions/: ⚙️ Server Actions. Funciones backend que mutan datos en BD directamente desde la UI.

📁 components/: 🧩 Componentes UI. Piezas reutilizables (Botones, Modales, Tablas) que no están atadas a una vista.

📁 lib/: 🛠️ Utilidades. Configuraciones globales (ej. prisma.ts para instanciar la conexión y evitar duplicados).

📁 app/: 🌐 Enrutador (App Router). Cada carpeta aquí que tenga un page.tsx es una URL pública.

📄 page.tsx: Ruta Raíz (/) — Login Institucional.

📁 api/: 🔌 Endpoints REST. Solo para consumos de apps móviles o servicios externos.

📁 dashboard/: 🟢 Panel Central. (Todo lo que requiere haber iniciado sesión).

📄 layout.tsx: Layout maestro (Navbar verde, Sidebar).

📄 page.tsx: Vista de bienvenida al entrar al dashboard.

📁 admin/: Módulo para gestión de usuarios y permisos.

📁 pernocta/: Módulo Tadeo (Vehículos, Asignaciones, Historial).

📁 combustible/: Módulo de Cargas (Vales, rendimientos, kilometrajes).

📁 estado/: Módulo Toni (Inspecciones físicas e inventario).

📁 escaner/: 📷 Ruta aislada (/escaner). Cámara QR full-screen para los Guardias.

📄 .env — Credenciales locales (NO SE SUBE A GITHUB).

📄 package.json — Control de versiones y dependencias.

🛠️ 6. Reglas de Desarrollo del Equipo
Ruteo (page.tsx): En Next.js, las carpetas definen la URL, pero el archivo que renderiza la vista siempre debe llamarse page.tsx.

Componentes de Cliente ("use client"): Por defecto, Next.js renderiza todo en el servidor. Si tu componente usa interactividad (useState, useEffect, onClick), debes poner "use client"; en la línea 1.

Server Actions vs API: Prioricen usar Server Actions (src/actions/) para interactuar con la BD. La carpeta app/api/ déjenla solo para la app móvil.

Estilos (Tailwind CSS v4): Prohibido crear archivos .css externos. Todo el diseño se maneja con clases utilitarias de Tailwind en el mismo componente.