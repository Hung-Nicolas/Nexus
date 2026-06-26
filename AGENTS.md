# AGENTS.md — Nexus

> Este archivo está pensado para que lo lean agentes de código AI. Si estás leyendo esto, se asume que no sabés nada del proyecto. Todo está escrito en español porque ese es el idioma dominante del código, los comentarios y la documentación.

---

## Resumen del proyecto

**Nexus** es una *Base de Datos Escolar Maestra*: un backend en Express conectado a PostgreSQL (hospedado en Supabase) y un frontend web de búsqueda integrado. Expone datos maestros de alumnos, responsables, personal, cursos y materias. Tanto el frontend de Nexus como los proyectos externos acceden en **solo lectura**; no hay operaciones de escritura desde la interfaz web. Otros proyectos del ecosistema (como GIE — Gestor de Informes Escolares) se conectan a través del **API Gateway** (`/api/v1/gateway` en el backend Express) que expone datos de forma controlada mediante API keys independientes. Cada proyecto externo tiene sus propios permisos por tabla (solo lectura).

El sistema es **cerrado**: solo accede personal autorizado con rol `regente`. No hay registros públicos.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | JavaScript vanilla (ES modules), CSS3, HTML5 |
| Build tool | Vite 5.4.10 |
| Backend | Express 4 + Node.js |
| Base de datos | PostgreSQL (Supabase) |
| Driver DB | `pg` 8 |
| Auth | JWT + bcrypt |
| API Gateway | Endpoint `/api/v1/gateway` en Express |
| Tipos | TypeScript 5.6 (solo para tipos de Supabase) |
| Package manager | npm |

---

## Estructura de archivos

```
.
├── index.html              # SPA — punto de entrada único
├── package.json            # Scripts y dependencias
├── vite.config.js          # Config de Vite (puerto 5173, outDir: dist)
├── .env.example            # Template de variables de entorno
├── .gitignore              # Reglas estándar (node_modules, dist, .env)
├── README.md               # Documentación para humanos
├── src/
│   ├── app.js              # Lógica principal: UI, búsqueda, filtros, stats, navegación
│   ├── auth.js             # Autenticación (login/logout y carga de perfil)
│   ├── styles.css          # Design system completo (dark mode, paleta Nexus)
│   ├── lib/
│   │   ├── api.js          # Cliente HTTP hacia el backend Express
│   │   └── database.types.ts  # Placeholder de tipos TypeScript (generar con npm run db:types)
│   └── assets/
│       ├── Nexus_logo.png
│       └── Nexus_wordmark.png
├── backend/
│   ├── .env.example
│   └── src/
│       ├── index.js        # Entry point de Express
│       ├── config.js       # Variables de entorno
│       ├── db.js           # Pool de pg
│       ├── lib/
│       │   ├── jwt.js      # Helpers JWT
│       │   └── configTablas.js  # Config de tablas para queries
│       ├── middleware/
│       │   ├── auth.js     # Verificación de JWT
│       │   ├── errorHandler.js
│       │   ├── rateLimit.js
│       │   └── validate.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── buscador.js
│       │   ├── dashboard.js
│       │   └── gateway.js
│       └── services/
│           ├── authService.js
│           ├── buscadorService.js
│           ├── dashboardService.js
│           └── gatewayService.js
├── supabase/
│   ├── schema.sql                 # Tablas, índices y políticas RLS del schema escolar
│   ├── migracion_auth.sql         # Tabla perfiles, triggers y funciones RPC para auth
│   ├── migracion_proyectos_api.sql # Tabla proyectos, api_logs y gateway API (solo lectura)
│   ├── functions/
│   │   └── api-nexus/
│   │       └── index.ts          # Edge Function: gateway único para proyectos externos
│   └── seed.sql                  # Datos de demostración
├── docs/
│   ├── DER.md                   # Diagrama entidad-relación
│   ├── api-externos.md          # Documentación técnica para proyectos que consumen Nexus
│   └── faq-para-companeros.md   # FAQ para compañeros sin experiencia en APIs |
└── dist/                   # Build de producción (generado por Vite)
```

---

## Cómo correr el proyecto

### 1. Variables de entorno

Copiar `.env.example` a `.env` (frontend) y `backend/.env.example` a `backend/.env` (backend):

**Frontend (`.env`):**
```bash
VITE_API_URL=http://localhost:3000/api/v1
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

> **Importante:** las variables del frontend deben empezar con `VITE_` para que Vite las exponga en el cliente. `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` se mantienen por compatibilidad; el frontend ya no los usa directamente.

**Backend (`backend/.env`):**
```bash
PORT=3000
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROYECTO.supabase.co:5432/postgres
JWT_SECRET=tu-jwt-secret-minimo-32-caracteres
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Comandos disponibles

| Comando | Acción |
|---------|--------|
| `npm run dev` | Levanta backend (puerto 3000) y frontend (puerto 5173) en paralelo |
| `npm run dev:backend` | Solo backend con nodemon |
| `npm run dev:frontend` | Solo frontend Vite en `http://localhost:5173` |
| `npm run build` | Build de producción del frontend en `dist/` |
| `npm run preview` | Previsualizar el build de producción |
| `npm run db:types` | Genera `src/lib/database.types.ts` desde el schema de Supabase |

---

## Arquitectura del código

### Frontend

- **SPA monolítica**: un solo `index.html` carga `src/app.js` como módulo.
- **Sin framework**: todo es vanilla JS con manipulación directa del DOM.
- **Estado global** en `app.js`: tabla actual, sección actual, filtros, timeout de búsqueda.
- **Configuración declarativa por tabla** (`configTablas`): cada tabla (`alumnos`, `personal`, `cursos`, `materias`) define título, campos a seleccionar, orden, campos de búsqueda, filtros disponibles y función `render` para las cards.

### Autenticación (`auth.js`)

- Usa el **backend Express** (`POST /api/v1/auth/login`, `/logout`, `/refresh`, `/me`).
- Al loguearse, el backend valida email/contraseña contra la tabla `public.usuarios`, emite un JWT access token y un refresh token.
- `auth.js` guarda el access token en memoria, el refresh token en `localStorage`, y carga el perfil desde `/auth/me`.
- Si el perfil no existe o no se puede cargar, no se asume ningún rol y se fuerza el cierre de sesión.
- El único rol con acceso pleno al frontend es `regente`.
- Expone callbacks `onAuthChange` para que `app.js` reaccione a cambios de sesión.
- Login/logout y carga del perfil del usuario.

### Backend (Express + PostgreSQL)

- **Servidor** (`backend/src/index.js`): Express con CORS, Helmet, rate limiting y rutas bajo `/api/v1`.
- **Config** (`backend/src/config.js`): variables de entorno, validación de requeridas.
- **DB** (`backend/src/db.js`): pool de `pg` con la connection string de Supabase.
- **Schema escolar** (`supabase/schema.sql`): tablas principales con claves foráneas, índices y RLS.
- **Auth propia** (`supabase/migracion_express_auth.sql`): tabla `public.usuarios` y `public.refresh_tokens` para reemplazar a Supabase Auth en la app.
- **API Gateway** (`backend/src/routes/gateway.js` + `backend/src/services/gatewayService.js`): registro de proyectos externos, API keys, permisos de solo lectura por tabla y auditoría en `api_logs`.
- **RLS**: las políticas existentes quedan como defensa en profundidad. La autorización principal vive en el backend Express.

---

## Convenciones de código

- **Idioma**: todo el código, comentarios, variables y UI están en **español**.
- **Módulos ES**: `"type": "module"` en `package.json`. Se usan `import`/`export`.
- **Prefijos de logs**:
  - Debug: `[Nexus Debug] ...`
  - Errores: `[Nexus] Error: ...`
- **Prefijo CSS**: todas las clases usan el prefijo `nx-` (ej: `.nx-sidebar`, `.nx-card`).
- **Design system**: paleta oscura con acentos azul (`#0ea5e9`) a púrpura (`#8b5cf6`). Definida con CSS custom properties en `:root`.
- **Responsive**: breakpoint principal a `1024px` (sidebar fijo en desktop, drawer en móvil).

---

## Base de datos — Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `cursos` | Año, división, turno y especialidad |
| `alumnos` | Datos personales, contacto, vinculación a curso |
| `personal` | Docentes, preceptores, directivos, administrativos |
| `materias` | Asignaturas del plan de estudios |
| `personal_materia` | Relación N:M entre personal y materias |
| `usuarios` | Usuarios del sistema (reemplaza a `auth.users` para la app) |
| `refresh_tokens` | Tokens de refresco rotativos para sesiones |
| `perfiles` | Perfiles de usuario legacy (vinculados a `auth.users`) |
| `proyectos` | Sistemas externos autorizados con API key y permisos JSONB |
| `api_logs` | Auditoría de requests al gateway (`api-nexus`) |

> **Nota sobre claves primarias:** las entidades principales (`alumnos`, `personal`, `responsables`) usan UUIDs (`id`) como PK. Los campos `dni` siguen siendo obligatorios y únicos, pero ya no son la clave primaria. Las tablas catálogo (`cursos`, `materias`, `roles`, `domicilios`) mantienen PKs seriales.

---

## Testing

El proyecto **no tiene tests automáticos** configurados. No hay Jest, Vitest, Playwright ni ninguna otra herramienta de testing en las dependencias.

---

## Deploy

1. Ejecutar `npm run build` para generar `dist/`.
2. El contenido de `dist/` es una SPA estática que puede deployarse en:
   - Vercel / Netlify / Cloudflare Pages
   - Supabase Storage (hosting estático)
   - Cualquier servidor de archivos estáticos
3. Deployar el backend Express en un servidor con Node.js (Railway, Render, Fly.io, VPS, etc.). Asegurarse de que las variables de entorno del backend estén configuradas.
4. Asegurarse de que `VITE_API_URL` apunte al dominio del backend en producción.
5. Aplicar las migraciones SQL en el proyecto de Supabase:
   - Primero `supabase/schema.sql`
   - Luego `supabase/migracion_proyectos_api.sql`
   - Luego `supabase/migracion_express_auth.sql`
   - Luego `supabase/migracion_permisos_rls.sql`
   - Opcionalmente `supabase/migracion_gateway_solo_lectura.sql` si existían proyectos con permisos en formato antiguo
   - Opcionalmente `supabase/seed.sql` para datos de prueba.

---

## Consideraciones de seguridad

- **Nunca commitear** `.env`, `backend/.env` ni `dist/` (ya están en `.gitignore`).
- El frontend **no recibe credenciales de la base de datos**. Solo conoce la URL del backend Express (`VITE_API_URL`).
- Los proyectos externos acceden únicamente vía el endpoint `/api/v1/gateway` con API keys propias.
- Cada proyecto externo tiene una API key independiente (`nx_...`) almacenada en `proyectos`, con permisos de solo lectura por tabla (array JSONB).
- Las contraseñas de usuarios se almacenan hasheadas con `bcrypt` en `public.usuarios`.
- Los JWT se firman con `JWT_SECRET`; los refresh tokens se almacenan hasheados en `public.refresh_tokens`.
- El frontend de Nexus es de **solo lectura**: no expone formularios de alta, edición ni eliminación de registros ni usuarios.

---

## Notas para agentes AI

- Si necesitás agregar una nueva tabla al buscador, extendé `configTablas` en `src/app.js` **y** en `backend/src/lib/configTablas.js`.
- Si modificás el schema de Supabase, regenerá los tipos con `npm run db:types` (requiere tener el CLI de Supabase configurado con el `project-id` correcto).
- Si agregás una tabla nueva que deba ser accesible por proyectos externos, actualizá:
  - `TABLAS_PERMITIDAS_GATEWAY` en `backend/src/lib/configTablas.js`
  - La documentación en `docs/api-externos.md`
- No asumas que hay React, Vue ni ningún framework. Todo es vanilla JS.
- Los estilos están todos en un solo archivo (`src/styles.css`). Si agregás componentes nuevos, seguí el prefijo `nx-`.
- El backend usa Express con ES modules. Mantené las convenciones de nombres en español y los logs con prefijo `[Nexus]` / `[Nexus Debug]`.
