# AGENTS.md — Nexus

> Este archivo está pensado para que lo lean agentes de código AI. Si estás leyendo esto, se asume que no sabés nada del proyecto. Todo está escrito en español porque ese es el idioma dominante del código, los comentarios y la documentación.

---

## Resumen del proyecto

**Nexus** es una *Base de Datos Escolar Maestra*: un backend centralizado en Supabase (PostgreSQL) con un frontend web de búsqueda integrado. Expone datos maestros de alumnos, personal, cursos, materias, evaluaciones y asistencias. Otros proyectos del ecosistema (como GIE — Gestor de Informes Escolares) se conectan a través del **API Gateway** (`api-nexus`, una Edge Function de Supabase) que expone datos de forma controlada mediante API keys independientes. Cada proyecto externo tiene sus propios permisos granulares por tabla y operación.

El sistema es **cerrado**: solo accede personal autorizado con rol `regente`. No hay registros públicos.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | JavaScript vanilla (ES modules), CSS3, HTML5 |
| Build tool | Vite 5.4.10 |
| Backend / DB | Supabase (PostgreSQL + Auth + Edge Functions) |
| Cliente DB | `@supabase/supabase-js` 2.104 |
| API Gateway | Edge Function `api-nexus` (Deno) |
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
│   ├── auth.js             # Autenticación y gestión de usuarios
│   ├── styles.css          # Design system completo (dark mode, paleta Nexus)
│   ├── lib/
│   │   ├── supabase.js     # Cliente Supabase (lee VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY)
│   │   └── database.types.ts  # Placeholder de tipos TypeScript (generar con npm run db:types)
│   └── assets/
│       ├── Nexus_logo.png
│       └── Nexus_wordmark.png
├── supabase/
│   ├── schema.sql                 # Tablas, índices y políticas RLS del schema escolar
│   ├── migracion_auth.sql         # Tabla perfiles, triggers y funciones RPC para auth
│   ├── migracion_proyectos_api.sql # Tabla proyectos, api_logs y gateway API
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

Copiar `.env.example` a `.env` y completar las credenciales de Supabase:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

> **Importante:** las variables deben empezar con `VITE_` para que Vite las exponga en el cliente.

### 2. Instalar dependencias

```bash
npm install
```

### 3. Comandos disponibles

| Comando | Acción |
|---------|--------|
| `npm run dev` | Servidor de desarrollo en `http://localhost:5173` |
| `npm run build` | Build de producción en `dist/` |
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

- Usa **Supabase Auth** (`signInWithPassword`, `signOut`, `signUp`).
- Al loguearse, carga el perfil desde la tabla `public.perfiles` (vinculada 1:1 con `auth.users`).
- Si el perfil no existe, genera un *fallback* con datos del `user_metadata`.
- El único rol existente es `regente`.
- Expone callbacks `onAuthChange` para que `app.js` reaccione a cambios de sesión.
- Gestión de usuarios (solo para regentes): `listarUsuarios`, `crearUsuario`, `eliminarUsuario`, `cambiarPasswordUsuario`.

### Backend (Supabase)

- **Schema escolar** (`supabase/schema.sql`): tablas principales con claves foráneas, índices y RLS.
- **Auth** (`supabase/migracion_auth.sql`): tabla `perfiles`, trigger `on_auth_user_created_nexus` y funciones RPC de gestión de usuarios.
- **API Gateway** (`supabase/migracion_proyectos_api.sql` + Edge Function `api-nexus`): registro de proyectos externos, API keys, permisos granulares y auditoría.
- **RLS**: todas las tablas tienen Row Level Security habilitado.
  - `SELECT`: solo `authenticated` (el frontend de Nexus). `anon` fue removido.
  - `INSERT/UPDATE/DELETE`: requiere `authenticated`.
  - `proyectos` y `api_logs`: solo regentes (`rol = 'regente'`).

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
| `evaluaciones` | Notas por alumno y materia |
| `asistencias` | Registro diario (presente, ausente, tarde, justificado) |
| `perfiles` | Perfiles de usuario (vinculados a `auth.users`) |
| `proyectos` | Sistemas externos autorizados con API key y permisos JSONB |
| `api_logs` | Auditoría de requests al gateway (`api-nexus`) |

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
3. Asegurarse de que las variables de entorno de Supabase estén disponibles en tiempo de build (Vite las inyecta en el bundle).
4. Deployar la Edge Function:
   ```bash
   supabase functions deploy api-nexus
   ```
5. Aplicar las migraciones SQL en el proyecto de Supabase:
   - Primero `supabase/schema.sql`
   - Luego `supabase/migracion_auth.sql`
   - Luego `supabase/migracion_proyectos_api.sql`
   - Opcionalmente `supabase/seed.sql` para datos de prueba.

---

## Consideraciones de seguridad

- **Nunca commitear** `.env` ni `dist/` (ya están en `.gitignore`).
- El `anon key` de Supabase **solo viaja al cliente del frontend de Nexus**. Los proyectos externos NO reciben la `anon key`; acceden únicamente vía la Edge Function `api-nexus` con API keys propias.
- Cada proyecto externo tiene una API key independiente (`nx_...`) almacenada en `proyectos`, con permisos granulares por tabla y operación. Las keys son revocables y rotables vía `rotar_api_key()`.
- Las funciones RPC usan `SECURITY DEFINER` para poder operar sobre `auth.users`.
- `eliminar_usuario_completo` y `actualizar_password_usuario` bloquean la auto-eliminación y auto-cambio de contraseña.
- En Supabase Dashboard se recomienda desactivar *"Confirm email"* en Authentication → Providers → Email, para que los regentes creen usuarios sin verificación.

---

## Notas para agentes AI

- Si necesitás agregar una nueva tabla al buscador, extendé `configTablas` en `src/app.js`.
- Si modificás el schema de Supabase, regenerá los tipos con `npm run db:types` (requiere tener el CLI de Supabase configurado con el `project-id` correcto).
- Si agregás una tabla nueva que deba ser accesible por proyectos externos, actualizá:
  - `TABLAS_PERMITIDAS` en `supabase/functions/api-nexus/index.ts`
  - Las políticas RLS en `supabase/schema.sql`
  - La documentación en `docs/api-externos.md`
- No asumas que hay React, Vue ni ningún framework. Todo es vanilla JS.
- Los estilos están todos en un solo archivo (`src/styles.css`). Si agregás componentes nuevos, seguí el prefijo `nx-`.
