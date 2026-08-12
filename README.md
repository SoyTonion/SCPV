# ⚡ Sistema Integral Vehicular CFE · SCPV

> **Sistema Integral de Control y Gestión Vehicular para CFE**

Aplicación web desarrollada para la **gestión, control y seguimiento de vehículos institucionales**, incluyendo pernocta, combustible, inspecciones, inventario y administración de usuarios.

Construido con tecnologías modernas y una arquitectura orientada a mantener el sistema **modular, escalable y fácil de mantener**.

---

## 🧰 Stack Tecnológico

| Tecnología          | Uso                              |
| ------------------- | -------------------------------- |
| ⚛️ **Next.js**      | Framework principal · App Router |
| 🎨 **Tailwind CSS** | Interfaz y estilos               |
| 🟦 **TypeScript**   | Tipado y desarrollo seguro       |
| 🔷 **Prisma ORM**   | Acceso y gestión de datos        |
| 🐘 **PostgreSQL**   | Base de datos                    |
| 🟢 **Node.js**      | Entorno de ejecución             |

---

# 🚀 1. Instalación

### 📥 Clonar el repositorio

```bash
git clone https://github.com/SoyTonion/SCPV.git
cd scpv
```

### 📦 Instalar dependencias

```bash
npm install
```

> **Importante:** `npm install` utilizará las versiones especificadas en `package.json`.

### 🔐 Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://USUARIO:PASSWORD@localhost:5432/Control_Parque_Vehicular?schema=public"
```

> ⚠️ **Nunca subas `.env` al repositorio.**
> Este archivo contiene credenciales y configuraciones privadas.

---

# 📦 2. Prisma

El proyecto utiliza **Prisma 6.19.3**.

Si necesitas realizar una instalación manual:

```bash
npm install prisma@6.19.3 --save-dev
npm install @prisma/client@6.19.3
```

### 🗄️ Comandos principales

| Comando                                | Función                          |
| -------------------------------------- | -------------------------------- |
| `npx prisma init`                      | Inicializa Prisma                |
| `npx prisma migrate dev --name nombre` | Crea y aplica una migración      |
| `npx prisma generate`                  | Genera Prisma Client             |
| `npx prisma db seed`                   | Ejecuta los datos iniciales      |
| `npx prisma studio`                    | Abre la interfaz visual de la BD |

### ✏️ Después de modificar `schema.prisma`

```bash
npx prisma migrate dev --name descripcion_del_cambio
```

Si únicamente necesitas regenerar el cliente:

```bash
npx prisma generate
```

---

# 🖥️ 3. Ejecutar el proyecto

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Después abre:

**http://localhost:3000**

---

# 🗂️ 4. Arquitectura del Proyecto

La estructura principal del proyecto está organizada de la siguiente manera:

* 📁 **`prisma/`**

  * 🗄️ `schema.prisma` → Modelos y estructura de la base de datos.
  * 🌱 `seed.ts` → Datos iniciales y catálogos.

* 📁 **`src/`**

  * ⚙️ **`actions/`** → Server Actions para operaciones con la BD.
  * 🧩 **`components/`** → Componentes reutilizables de interfaz.
  * 🛠️ **`lib/`** → Configuraciones y utilidades globales.
  * 🌐 **`app/`** → Sistema de rutas mediante Next.js App Router.

    * 📄 `page.tsx` → **Login institucional** (`/`)

    * 📁 **`api/`**

      * 🔌 Endpoints REST destinados principalmente a aplicaciones móviles o servicios externos.

    * 📁 **`dashboard/`**

      * 🟢 Panel principal del sistema.

      * 📄 `layout.tsx` → Layout general, Navbar y Sidebar.

      * 📄 `page.tsx` → Página principal del Dashboard.

      * 📁 **`admin/`**

        * 👤 Gestión de usuarios.
        * 🔐 Roles y permisos.

      * 📁 **`pernocta/`**

        * 🚗 Vehículos.
        * 📋 Asignaciones.
        * 🕘 Historial de pernoctas.

      * 📁 **`combustible/`**

        * ⛽ Cargas.
        * 🎫 Vales.
        * 📊 Rendimientos.
        * 🧭 Kilometrajes.

      * 📁 **`estado/`**

        * 🔎 Inspecciones físicas.
        * 📦 Inventario vehicular.

    * 📁 **`escaner/`**

      * 📷 Lector QR.
      * 🛡️ Interfaz destinada a los guardias.
      * 📱 Vista optimizada para pantalla completa.

* 📄 **`.env`**

  * 🔐 Variables y credenciales locales.
  * 🚫 **No debe subirse a GitHub.**

* 📄 **`package.json`**

  * 📦 Dependencias y scripts del proyecto.

---

# 🧭 5. Flujo General del Sistema

```text
                    ┌─────────────────────┐
                    │     LOGIN CFE       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      DASHBOARD      │
                    └──────────┬──────────┘
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
      ┌───────────┐      ┌────────────┐     ┌───────────┐
      │ Pernocta  │      │Combustible │     │   Estado  │
      └───────────┘      └────────────┘     └───────────┘
            │                  │                  │
            └──────────────────┼──────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │      PRISMA ORM     │
                    └──────────┬──────────┘
                               ▼
                    ┌─────────────────────┐
                    │     POSTGRESQL      │
                    └─────────────────────┘
```

---

# 🛠️ 6. Reglas de Desarrollo

### 01 · Rutas

En Next.js, las carpetas determinan las rutas.

El archivo que renderiza cada página debe llamarse:

```text
page.tsx
```

Ejemplo:

```text
app/
└── dashboard/
    └── page.tsx
```

Esto genera:

```text
/dashboard
```

---

### 02 · Componentes de Cliente

Next.js utiliza Server Components por defecto.

Si un componente utiliza:

* `useState`
* `useEffect`
* `onClick`
* Eventos del navegador
* APIs del navegador

debe utilizar:

```tsx
"use client";
```

---

### 03 · Server Actions vs API

Priorizar:

```text
src/actions/
```

para operaciones internas de la aplicación y acceso a la base de datos.

La carpeta:

```text
src/app/api/
```

queda principalmente destinada a:

* 📱 Aplicaciones móviles
* 🔌 Servicios externos
* 🌐 Integraciones que requieran endpoints HTTP

---

### 04 · Estilos

El proyecto utiliza **Tailwind CSS**.

Los estilos deben manejarse mediante clases utilitarias:

```tsx
<div className="flex items-center justify-between">
```

Evitar crear archivos `.css` externos salvo que exista una necesidad técnica justificada.

---

### 05 · Prisma

Después de modificar:

```text
prisma/schema.prisma
```

se debe crear una migración:

```bash
npx prisma migrate dev --name descripcion_del_cambio
```

Y después de obtener cambios del repositorio que involucren Prisma:

```bash
npx prisma generate
```

---

# 👥 7. Módulos del Sistema

| Módulo                | Función                             |
| --------------------- | ----------------------------------- |
| 🔐 **Administración** | Usuarios, roles y permisos          |
| 🚗 **Pernocta**       | Vehículos, asignaciones e historial |
| ⛽ **Combustible**     | Vales, cargas y rendimientos        |
| 🔎 **Estado**         | Inspecciones e inventario           |
| 📷 **Escáner**        | Lectura de códigos QR               |
| 📊 **Dashboard**      | Información general y métricas      |

---

# ⚡ 8. Comandos Rápidos

### Desarrollo

```bash
npm run dev
```

### Compilar

```bash
npm run build
```

### Ejecutar producción

```bash
npm start
```

### Prisma

```bash
npx prisma studio
```

```bash
npx prisma generate
```

```bash
npx prisma migrate dev --name cambio
```

---

# 🔒 9. Seguridad

### Nunca subir al repositorio:

```text
.env
.env.local
.env.production
```

Las credenciales, contraseñas y cadenas de conexión deben permanecer únicamente en variables de entorno.

---

# 📌 10. Notas para el Equipo

Antes de realizar cambios importantes:

1. 🔄 Actualizar el repositorio.
2. 📦 Instalar dependencias si hubo modificaciones.
3. 🗄️ Revisar cambios en Prisma.
4. 🧪 Probar localmente.
5. 🔍 Verificar que no existan errores.
6. 📤 Realizar el commit.
7. 🚀 Subir los cambios.

### Flujo recomendado

```bash
git pull
npm install

npx prisma generate

npm run dev
```

Después de comprobar los cambios:

```bash
git add .
git commit -m "descripcion del cambio"
git push
```

---

## 🏢 Sistema Integral Vehicular CFE

**SCPV · Sistema de Control y Gestión Vehicular**

> 💻 Desarrollo orientado a la digitalización y optimización de procesos vehiculares institucionales.
