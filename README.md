Sí, ahora sí vamos a dejarlo **con la carne necesaria y sin repetir el mismo dato cinco veces** 😂. Mantengo toda la información importante, pero cada cosa vive en una sola sección. También dejo la arquitectura con listas para que no se rompa visualmente.

# ⚡ Sistema Integral Vehicular CFE · SCPV

> **Sistema de Control y Gestión Vehicular para CFE**

Aplicación web para la **gestión, control y seguimiento del parque vehicular institucional**, centralizando procesos de pernocta, combustible, inspecciones, inventario y administración de usuarios.

Desarrollado con una arquitectura modular orientada a la **escalabilidad, mantenibilidad y colaboración del equipo**.

---

## 📑 Contenido

* [🧰 Tecnologías](#-tecnologías)
* [🚀 Instalación](#-instalación)
* [📦 Prisma ORM](#-prisma-orm)
* [🗂️ Arquitectura](#️-arquitectura)
* [🧭 Flujo del sistema](#-flujo-del-sistema)
* [🧩 Módulos](#-módulos)
* [🛠️ Reglas de desarrollo](#️-reglas-de-desarrollo)
* [🔒 Seguridad](#-seguridad)
* [👥 Flujo de trabajo](#-flujo-de-trabajo)
* [⚡ Comandos rápidos](#-comandos-rápidos)

---

# 🧰 Tecnologías

| Tecnología          | Uso                              |
| :------------------ | :------------------------------- |
| ⚛️ **Next.js**      | Framework principal · App Router |
| 🟦 **TypeScript**   | Tipado y desarrollo seguro       |
| 🎨 **Tailwind CSS** | Interfaz y estilos               |
| 🔷 **Prisma ORM**   | Acceso a la base de datos        |
| 🐘 **PostgreSQL**   | Base de datos                    |
| 🟢 **Node.js**      | Entorno de ejecución             |
| 🔐 **NextAuth.js**  | Autenticación y sesiones         |
| 📷 **HTML5-QRCode** | Escaneo de códigos QR            |

---

# 🚀 Instalación

## 1. Clonar el repositorio

```bash
git clone https://github.com/SoyTonion/SCPV.git
cd SCPV
```

## 2. Instalar dependencias

```bash
npm install
```

## 3. Configurar variables de entorno

Crear un archivo `.env` en la raíz:

```env
DATABASE_URL="postgresql://USUARIO:PASSWORD@localhost:5432/control_parque_vehicular?schema=public"
NEXTAUTH_SECRET="tu_palabra_secreta_aqui"
NEXTAUTH_URL="http://localhost:3000"
```

## 4. Configurar la base de datos

Para sincronizar el esquema durante el desarrollo:

```bash
npx prisma db push
```

Generar Prisma Client:

```bash
npx prisma generate
```

Cargar los datos iniciales:

```bash
npx prisma db seed
```

## 5. Iniciar el proyecto

```bash
npm run dev
```

Aplicación disponible en:

```text
http://localhost:3000
```

---

# 📦 Prisma ORM

El proyecto utiliza **Prisma `6.19.3`**.

### Comandos principales

| Comando                                | Función                                   |
| :------------------------------------- | :---------------------------------------- |
| `npx prisma init`                      | Inicializa Prisma                         |
| `npx prisma generate`                  | Genera Prisma Client                      |
| `npx prisma migrate dev --name nombre` | Crea una migración                        |
| `npx prisma db push`                   | Sincroniza el esquema sin crear migración |
| `npx prisma db seed`                   | Ejecuta los datos iniciales               |
| `npx prisma studio`                    | Abre el visor de la base de datos         |

### 🔄 `migrate dev` vs `db push`

**`migrate dev`**

Utilizar cuando el cambio debe quedar registrado en el historial de migraciones:

```bash
npx prisma migrate dev --name descripcion_del_cambio
```

**`db push`**

Utilizar para sincronizar rápidamente `schema.prisma` durante el desarrollo, sin crear una migración:

```bash
npx prisma db push
```

> 💡 Para cambios estructurales que deban conservarse en el historial del proyecto, utilizar `migrate dev`.

### 🌱 Seed

Los datos iniciales se encuentran en:

```text
prisma/
└── seed_roles.ts
```

Se ejecutan mediante:

```bash
npx prisma db seed
```

---

# 🗂️ Arquitectura

La estructura utiliza **Next.js App Router** y una organización modular.

Se utilizan listas anidadas en lugar de árboles con caracteres `├──`, `└──`, etc., para garantizar una visualización correcta en GitHub, VS Code y dispositivos móviles.

## 📁 Estructura principal

* 📁 **`prisma/`**

  * 🗄️ `schema.prisma` → Modelos y estructura de la base de datos.
  * 🌱 `seed_roles.ts` → Datos iniciales y usuarios de prueba.

* 📁 **`src/`**

  * ⚙️ **`actions/`** → Server Actions para operaciones internas.
  * 🧩 **`components/`** → Componentes reutilizables.
  * 🛠️ **`lib/`** → Configuraciones y utilidades globales.
  * 🌐 **`app/`** → Rutas de la aplicación mediante App Router.

    * 📄 `page.tsx` → Login institucional (`/`).

    * 📁 **`api/`**

      * 🔐 `auth/[...nextauth]/` → Configuración de NextAuth.

    * 📁 **`dashboard/`** → Área administrativa.

      * 📄 `layout.tsx` → Layout, Navbar y Sidebar.
      * 📄 `page.tsx` → Dashboard principal.
      * 📁 `admin/` → Usuarios, roles y permisos.
      * 📁 `pernocta/` → Vehículos e historial de pernoctas.
      * 📁 `combustible/` → Gráficas y rendimientos.
      * 📁 `estado/` → Reportes e inventario.

    * 📁 **`operacion/`** → Área para personal en campo.

      * 📄 `layout.tsx` → Layout móvil y cierre de sesión.
      * 📁 `pernocta/` → Lector QR para guardias.
      * 📁 `combustible/` → Registro de recargas.
      * 📁 `estado/` → Inspecciones físicas.

* 📄 **`.env`** → Variables y credenciales locales. **No subir al repositorio.**

* 📄 **`package.json`** → Dependencias y scripts del proyecto.

---

# 🧭 Flujo del sistema

El sistema cuenta con dos áreas principales:

```text
                    🔐 LOGIN
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
      🖥️ DASHBOARD          📱 OPERACIÓN
      Administrativo          En campo
             │                   │
       ┌─────┼─────┐       ┌─────┼─────┐
       ▼     ▼     ▼       ▼     ▼     ▼
    Pernocta Comb. Estado   QR   Comb. Insp.
       │     │     │       │     │     │
       └─────┴─────┴───────┴─────┴─────┘
                       │
                       ▼
                  🔷 PRISMA ORM
                       │
                       ▼
                  🐘 POSTGRESQL
```

> **Dashboard** está orientado a la gestión y consulta.
> **Operación** está orientado a las actividades realizadas directamente en campo.

---

# 🧩 Módulos

| Módulo                | Función                                 |
| :-------------------- | :-------------------------------------- |
| 🔐 **Administración** | Usuarios, roles y permisos              |
| 🚗 **Pernocta**       | Ingresos, salidas e historial vehicular |
| ⛽ **Combustible**     | Tickets, consumo y rendimiento          |
| 🔎 **Estado**         | Inspecciones e inventario               |
| 📊 **Dashboard**      | Información general y métricas          |
| 📱 **Operación**      | Herramientas para personal en campo     |

---

# 🛠️ Reglas de desarrollo

## 01 · Rutas

En Next.js App Router, las carpetas representan segmentos de URL y cada página utiliza `page.tsx`.

Ejemplo:

```text
app/
└── dashboard/
    └── pernocta/
        └── page.tsx
```

Ruta resultante:

```text
/dashboard/pernocta
```

---

## 02 · Client Components

Next.js utiliza Server Components por defecto.

Si un componente utiliza hooks, eventos del navegador o estado interactivo, debe incluir:

```tsx
"use client";
```

---

## 03 · Server Actions y API

Utilizar preferentemente:

```text
src/actions/
```

para operaciones internas de la aplicación.

Utilizar:

```text
src/app/api/
```

para endpoints HTTP, integraciones externas y autenticación.

---

## 04 · Componentes

Los componentes reutilizables deben mantenerse en:

```text
src/components/
```

Evitar duplicar componentes o lógica existente.

---

## 05 · Estilos

El proyecto utiliza **Tailwind CSS**.

Preferir clases utilitarias:

```tsx
<div className="flex items-center gap-4">
```

---

## 06 · Prisma

Los cambios realizados en `schema.prisma` deben sincronizarse correctamente:

* `migrate dev` → cambios que deben quedar registrados.
* `db push` → sincronización rápida durante desarrollo.
* `generate` → actualización de Prisma Client.

---

# 🔒 Seguridad

## Variables de entorno

Nunca subir:

```text
.env
.env.local
.env.production
```

Las credenciales y cadenas de conexión deben permanecer fuera del código fuente.

## 🔑 `NEXTAUTH_SECRET`

En desarrollo puede utilizarse una clave temporal.

En producción debe utilizarse una clave criptográficamente segura.

Generar una clave con:

```bash
openssl rand -base64 32
```

> Cambiar `NEXTAUTH_SECRET` invalida las sesiones existentes, pero no elimina usuarios ni modifica la base de datos.

---

# 👥 Flujo de trabajo

## Antes de comenzar

```bash
git pull
npm install
npm run dev
```

Si hubo cambios en Prisma:

```bash
npx prisma generate
```

## Antes de hacer `push`

1. 🔄 Actualizar el repositorio.
2. 🧪 Probar los cambios localmente.
3. 🔍 Revisar errores.
4. 🗄️ Verificar cambios de Prisma.
5. 🔐 Confirmar que no se incluyan archivos `.env`.
6. 📝 Crear un commit descriptivo.
7. 📤 Subir los cambios.

### 📝 Convención de commits

| Prefijo     | Uso                        |
| :---------- | :------------------------- |
| `feat:`     | Nueva funcionalidad        |
| `fix:`      | Corrección de errores      |
| `refactor:` | Refactorización            |
| `style:`    | Cambios visuales o formato |
| `docs:`     | Documentación              |
| `chore:`    | Mantenimiento              |

Ejemplos:

```text
feat: agregar lector QR
fix: corregir validación de combustible
refactor: reorganizar acciones de usuarios
style: mejorar diseño del dashboard
docs: actualizar README
chore: actualizar dependencias
```

---

# ⚡ Comandos rápidos

| Comando                                  | Acción                            |
| :--------------------------------------- | :-------------------------------- |
| `npm install`                            | Instalar dependencias             |
| `npm run dev`                            | Iniciar desarrollo                |
| `npx prisma generate`                    | Generar Prisma Client             |
| `npx prisma db push`                     | Sincronizar esquema sin migración |
| `npx prisma migrate dev --name <nombre>` | Crear migración                   |
| `npx prisma db seed`                     | Ejecutar Seed                     |
| `npx prisma studio`                      | Abrir Prisma Studio               |

---

# 🏢 Sistema Integral Vehicular CFE

### SCPV · Sistema de Control y Gestión Vehicular

> 💻 Plataforma desarrollada para la **digitalización y optimización de los procesos relacionados con la gestión del parque vehicular institucional**.

**Stack:**
`Next.js` · `TypeScript` · `Tailwind CSS` · `Prisma` · `PostgreSQL`

---

<p align="center">
  ⚡ <strong>SCPV</strong> · Sistema Integral Vehicular CFE
  <br>
  <sub>Sistema de Control y Gestión Vehicular</sub>
</p>
