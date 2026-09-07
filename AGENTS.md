# AGENTS.md — Nexus

> Este archivo está pensado para que lo lean agentes de código AI. Si estás leyendo esto, se asume que no sabés nada del proyecto. Todo está escrito en español porque ese es el idioma dominante del código, los comentarios y la documentación.

---

## Resumen del proyecto

**Nexus** es una *Base de Datos Escolar Maestra*: un backend en **Spring Boot (Java 17 + Gradle)** conectado a una base **PostgreSQL local** y un frontend web de búsqueda integrado. Expone datos maestros de alumnos, responsables, personal, cursos y materias. Tanto el frontend de Nexus como los proyectos externos acceden en **solo lectura**; no hay operaciones de escritura desde la interfaz web. Otros proyectos del ecosistema (como GIE — Gestor de Informes Escolares) se conectan a través del **API Gateway** (`POST /api/v1/gateway`) que expone datos de forma controlada mediante API keys independientes, con permisos por tabla (solo lectura) y auditoría en `api_logs`.

El sistema es **cerrado**: solo accede personal autorizado con rol `regente`. No hay registros públicos.

> **Migración importante:** el backend fue reescrito de Express (Node.js) a Spring Boot. Si encontrás referencias a Express, `pg`, `supabase/` o un `package.json` en la raíz, son documentación desactualizada — la fuente de verdad es `backend/` (Java) y `db/schema.sql`.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | JavaScript vanilla (ES modules), CSS3, HTML5, Tailwind CSS 3 |
| Build tool | Vite 5.4.10 |
| Backend | Spring Boot 4.1 + Java 17 + Gradle |
| Persistencia | Spring Data JPA (auth/gateway) + JdbcTemplate (buscador, SQL dinámico) |
| Base de datos | PostgreSQL 16 (local, vía Docker Compose) |
| Seguridad | Spring Security stateless + JWT (jjwt 0.12.5) + bcrypt |
| Rate limiting | bucket4j 8.10.1 (in-memory, filtro HTTP) |
| Deploy | Docker multi-stage + Docker Compose + Nginx |

No hay dependencia de servicios externos (ni Supabase): la base corre local al despliegue.

---

## Estructura de archivos

```
.
├── docker-compose.yml        # PostgreSQL 16 + backend + Nginx (dev y server de la escuela)
├── Dockerfile                # Build multi-stage del jar Spring Boot (temurin 17)
├── nginx.conf                # Sirve el frontend y hace proxy de /api/v1 al backend
├── db/
│   └── schema.sql            # Tablas, índices, RLS, roles y usuario regente por defecto
├── docs/
│   ├── DER.md                # Diagrama entidad-relación
│   ├── api-externos.md       # Documentación técnica para proyectos que consumen Nexus
│   └── faq-para-companeros.md # FAQ para compañeros sin experiencia en APIs
├── backend/
│   ├── build.gradle          # Spring Boot 4.1.1, Java 17, deps (JPA, Security, jjwt, bucket4j, pg)
│   ├── settings.gradle
│   ├── gradlew / gradlew.bat
│   ├── .env.example          # Template de variables de entorno
│   ├── README.md             # Referencia del backend (estructura, endpoints, env vars)
│   └── src/
│       ├── main/java/com/nexus/
│       │   ├── NexusApplication.java   # Entry point
│       │   ├── config/                 # SecurityConfig, CorsConfig, RateLimitFilter, ConfigTablas
│       │   ├── controller/             # Auth, Buscador, Dashboard, Gateway, Health
│       │   ├── service/                # AuthService, BuscadorService, DashboardService, GatewayService
│       │   ├── repository/             # JPA: Usuario, RefreshToken, Proyecto
│       │   ├── model/                  # Entidades JPA
│       │   ├── dto/                    # LoginRequest, TokenResponse, UsuarioResponse, GatewayRequest
│       │   ├── security/               # JwtUtils, JwtFilter
│       │   └── exception/              # ApiException + GlobalExceptionHandler
│       ├── main/resources/application.yml   # Config (lee variables de entorno)
│       └── test/java/com/nexus/        # Tests JUnit (ConfigTablas, JwtUtils, contexto)
└── frontend/
    ├── package.json            # Vite + Tailwind (scripts: dev, build, preview)
    ├── vite.config.js          # Puerto 5173, outDir dist
    ├── tailwind.config.js / postcss.config.js
    ├── index.html              # SPA — punto de entrada único
    ├── .env.example            # VITE_API_URL
    └── src/
        ├── app.js              # Lógica principal: UI, búsqueda, filtros, stats, navegación
        ├── auth.js             # Login/logout y carga de perfil
        ├── info-nexus.js       # Contenido estático de la sección Info
        ├── styles.css          # Design system completo (dark mode, paleta Nexus)
        ├── lib/api.js          # Cliente HTTP hacia el backend (refresh automático de token)
        └── assets/             # Nexus_logo.png, Nexus_wordmark.png
```

---

## Cómo correr el proyecto

### Desarrollo local

1. **Base de datos** (requiere Docker):
   ```bash
   docker compose up -d postgres
   ```
   La primera vez inicializa `db/schema.sql` (tablas, RLS, usuario regente por defecto).

2. **Backend** (requiere JDK 17):
   ```bash
   cd backend
   ./gradlew bootRun        # compilar + tests: ./gradlew build
   ```
   Variables de entorno: exportalas en el shell o configurá tu IDE (no hay `.env` autogenerado; Spring Boot lee el entorno directamente). Ver `backend/.env.example`:
   - `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` (defaults: `localhost:5432/nexus`, usuario `nexus`)
   - `JWT_SECRET` (requerida, mínimo 32 caracteres)
   - `JWT_ACCESS_EXPIRES_IN` (default `15m`), `JWT_REFRESH_EXPIRES_IN` (default `7d`)
   - `BCRYPT_ROUNDS` (default `12`)
   - `CORS_ORIGIN` (default `http://localhost:5173`; lista separada por comas, `localhost:5173` siempre se permite)
   - `CORS_ORIGIN_PATTERN` (regex opcional de orígenes extra)
   - `SERVER_PORT` (default `3000`), `APP_ENV` (default `development`)

3. **Frontend**:
   ```bash
   cd frontend
   npm install
   cp .env.example .env     # VITE_API_URL=http://localhost:3000/api/v1 en dev
   npm run dev              # http://localhost:5173
   ```

Login por defecto: `regente@nexus.local` / `Regente123!` (cambiar en producción).

### Deploy en el server de la escuela (Docker Compose)

```bash
cd frontend && npm install && cp .env.example .env   # VITE_API_URL=/api/v1 (URL relativa)
cd .. && docker compose up -d --build
```

Levanta PostgreSQL + backend (puerto 3000) + Nginx sirviendo `frontend/dist` (puerto 80) con proxy de `/api/v1` al backend. `docker-compose.yml` lee `JWT_SECRET` y demás variables del entorno o de un `.env` en la raíz.

---

## Arquitectura del código

### Backend (Spring Boot + PostgreSQL)

- **API REST** bajo `/api/v1` (el healthcheck `GET /health` es la única ruta sin prefijo):

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | — | Healthcheck |
| POST | `/api/v1/auth/login` | — | Email + password → access + refresh token |
| POST | `/api/v1/auth/logout` | — | Borra el refresh token |
| POST | `/api/v1/auth/refresh` | — | Rota el refresh token |
| GET | `/api/v1/auth/me` | JWT | Usuario actual |
| GET | `/api/v1/buscar/:tabla` | JWT | Búsqueda con `?term=`, `?limite=` y filtros |
| GET | `/api/v1/registros/:tabla/:campo/:id` | JWT | Detalle de un registro |
| GET | `/api/v1/tablas/:tabla/opciones-filtros` | JWT | Opciones dinámicas de filtros |
| GET | `/api/v1/stats` | JWT | Conteos de las tablas |
| POST | `/api/v1/gateway` | `x-api-key` | SELECT controlado para proyectos externos |

- **Autenticación**: JWT stateless. Access token corto (15m) + refresh token (7d) con rotación; el hash del refresh token se guarda en `public.refresh_tokens`. Contraseñas con bcrypt.
- **Autorización**: Spring Security. Todo requiere JWT excepto login/logout/refresh y el gateway (que autentica por API key propia en el servicio). El único rol con acceso pleno al frontend es `regente`. Roles válidos en la tabla `usuarios`: `regente`, `subregente`, `rector`, `vicerector`, `docente`, `preceptor`, `doe`, `pat`, `cooperadora`, `jefe_de_taller`.
- **Rate limiting** (bucket4j, por IP): login 20/15min · gateway 100/min · resto de la API 200/min.
- **Buscador**: SQL dinámico armado con JdbcTemplate a partir de la config declarativa de `ConfigTablas`. El auth y el gateway usan Spring Data JPA.
- **RLS**: `db/schema.sql` crea roles PostgreSQL (`anon`, `authenticated`, `service_role`) y un schema `auth` local con `auth.role()` / `auth.uid()` que reemplazan a Supabase Auth. El backend setea antes de cada query:
  ```sql
  SET LOCAL app.current_role = 'authenticated' | 'service_role';
  SET LOCAL app.current_user_id = '<uuid>';
  ```
  Requisito: PostgreSQL 14+ con extensión `pgcrypto`.

### Frontend

- **SPA monolítica**: un solo `index.html` carga `src/app.js` como módulo.
- **Sin framework**: todo es vanilla JS con manipulación directa del DOM.
- **Estado global** en `app.js`: tabla actual, sección actual, filtros, cache de resultados en memoria (TTL 30s), timeout de búsqueda.
- **Configuración declarativa por tabla** (`configTablas` en `app.js`): cada tabla define título, campos, orden, campos de búsqueda, filtros y función `render` para las cards.
- **Cliente HTTP** (`lib/api.js`): guarda el access token en memoria y el refresh token en `localStorage` (clave `nexus-refresh-token`). Ante un 401 con refresh token disponible, refresca y reintenta automáticamente (con promesa compartida para evitar refrescos duplicados).
- **Secciones**: buscador (7 tablas), dashboard (stats) e Info. Modal de detalle de registro.
- Iconos Material Design Icons (clases `mdi mdi-*`).

### API Gateway

- `POST /api/v1/gateway` con header `x-api-key: nx_...`.
- Solo lectura: no expone `insert`, `update` ni `delete`.
- Cada proyecto externo es una fila en `proyectos` (API key hasheada + permisos JSONB de tablas permitidas + restricción opcional por IP).
- Cada request se audita en `api_logs` (proyecto, IP, operación, tabla, body, status, error, duración).
- Alta de proyectos vía función SQL `crear_proyecto_api(nombre, slug, tablas_jsonb, descripcion)` que devuelve la API key (solo se muestra una vez).

---

## Convenciones de código

- **Idioma**: todo el código, comentarios, variables y UI están en **español**.
- **Módulos ES en el frontend** (`"type": "module"` en `frontend/package.json`).
- **Backend**: paquete `com.nexus`, capas `controller` → `service` → `repository`, DTOs en `dto/`, errores de negocio como `ApiException` manejados por `GlobalExceptionHandler`. Comentarios Javadoc en español donde aplica.
- **Prefijo CSS**: todas las clases custom usan el prefijo `nx-` (ej: `.nx-sidebar`, `.nx-card`).
- **Design system**: paleta oscura con acentos azul (`#0ea5e9`) a púrpura (`#8b5cf6`), definida con CSS custom properties + Tailwind.
- **Responsive**: sidebar fijo en desktop, drawer en móvil.
- **Sincronización frontend ↔ backend**: `configTablas` en `frontend/src/app.js` y `ConfigTablas.java` en el backend deben mantenerse **idénticos** (campos, orden, búsqueda, relaciones, PK). Hay un test (`ConfigTablasTest`) que valida parte de esta config del lado backend.

---

## Base de datos — Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `cursos` | Año, división, turno y especialidad |
| `alumnos` | Datos personales, contacto, vinculación a curso y domicilio |
| `personal` | Docentes, preceptores, directivos, administrativos |
| `roles` | Catálogo de roles del personal |
| `personal_rol` | Relación N:M entre personal y roles |
| `materias` | Asignaturas del plan de estudios |
| `personal_materia` | Relación N:M entre personal y materias |
| `responsables` | Padres, madres y tutores de los alumnos |
| `domicilios` | Domicilios de alumnos, personal y responsables |
| `sincronizaciones` | Mapeo de IDs locales con IDs remotos de otros sistemas |
| `usuarios` | Usuarios del sistema (auth propia) |
| `refresh_tokens` | Tokens de refresco (hash) con expiración y rotación |
| `proyectos` | Sistemas externos autorizados con API key y permisos JSONB |
| `api_logs` | Auditoría de requests al gateway |

> Evaluaciones y asistencias están planificadas pero aún no implementadas.

> **Nota sobre claves primarias:** `alumnos`, `personal` y `responsables` usan UUIDs (`id`) como PK (`pgcrypto` los genera). Los campos `dni` siguen siendo obligatorios y únicos, pero ya no son la clave primaria. Las tablas catálogo (`cursos`, `materias`, `roles`, `domicilios`) mantienen PKs seriales (`id_curso`, `id_materia`, `id_rol`, `id_domicilio`).

Tablas permitidas:
- **Buscador** (`TABLAS_PERMITIDAS_BUSCADOR` en `ConfigTablas.java`): `alumnos`, `responsables`, `personal`, `cursos`, `materias`, `roles`, `domicilios`.
- **Gateway** (`TABLAS_PERMITIDAS_GATEWAY`): las anteriores + `personal_materia`, `personal_rol`.

**No hay CLI para crear usuarios**: se insertan directamente en `usuarios` con un hash bcrypt (se puede generar con `python3 -c "import bcrypt; print(bcrypt.hashpw(b'TuPassword123!', bcrypt.gensalt(12)).decode())"`). Ver `backend/README.md`.

---

## Testing

- **Backend**: JUnit 5 + Spring Security Test. Tests existentes:
  - `ConfigTablasTest` — valida la config declarativa de tablas.
  - `JwtUtilsTest` — valida generación/validación de tokens.
  - `NexusApplicationTests` — carga de contexto Spring.
  - Comandos: `./gradlew test` (solo tests) · `./gradlew build` (compila + tests + jar).
- **Frontend**: **no hay tests** (no hay Jest, Vitest, Playwright ni ninguna otra herramienta de testing en las dependencias).
- El Dockerfile excluye los tests del build de producción (`bootJar -x test`).

---

## Deploy

1. **Docker Compose** (desarrollo y server de la escuela): `docker compose up -d --build`. El `Dockerfile` hace build multi-stage (`eclipse-temurin:17-jdk` → `./gradlew bootJar` → runtime `eclipse-temurin:17-jre`). El servicio `postgres` inicializa `db/schema.sql` en el primer arranque (volumen `nexus-postgres-data`).
2. **Cualquier VPS con Java**: `cd backend && ./gradlew bootJar` y `java -jar build/libs/nexus-0.0.1-SNAPSHOT.jar` con las variables de entorno configuradas. Healthcheck: `GET /health`.
3. **Frontend estático**: `cd frontend && npm run build` genera `dist/`; en el compose, Nginx lo sirve con SPA fallback (`try_files ... /index.html`) y proxifica `/api/v1/` al backend.

> La base siempre es local al despliegue (contenedor o instancia propia de PostgreSQL 14+).

---

## Consideraciones de seguridad

- **Nunca commitear** `.env`, `backend/.env` ni `frontend/dist` (ya están en `.gitignore`).
- `JWT_SECRET` es requerida y debe tener mínimo 32 caracteres; el placeholder que trae `docker-compose.yml` **hay que cambiarlo** en producción.
- Cambiar la contraseña por defecto del regente (`regente@nexus.local` / `Regente123!`) tras el primer deploy.
- El frontend **no recibe credenciales de la base de datos**. Solo conoce `VITE_API_URL`.
- Los proyectos externos acceden únicamente vía `/api/v1/gateway` con API keys propias (`nx_...`), almacenadas hasheadas en `proyectos`, con permisos de solo lectura por tabla (array JSONB).
- Las contraseñas de usuarios se almacenan hasheadas con `bcrypt` en `public.usuarios`.
- Los JWT se firman con `JWT_SECRET`; los refresh tokens se almacenan hasheados en `public.refresh_tokens` y rotan en cada uso.
- CORS restringido (`CORS_ORIGIN` / `CORS_ORIGIN_PATTERN`); `localhost:5173` siempre permitido para desarrollo.
- El frontend de Nexus es de **solo lectura**: no expone formularios de alta, edición ni eliminación de registros ni usuarios.

---

## Notas para agentes AI

- Si necesitás agregar una nueva tabla al buscador, extendé `configTablas` en `frontend/src/app.js` **y** `ConfigTablas.java` en el backend (mantenélos sincronizados), y sumala a `TABLAS_PERMITIDAS_BUSCADOR` / `TABLAS_PERMITIDAS_GATEWAY` según corresponda.
- Si agregás una tabla nueva accesible por proyectos externos, actualizá también la documentación en `docs/api-externos.md`.
- Si modificás `db/schema.sql`, recordá que solo se aplica en el **primer** arranque del contenedor (initdb); para cambios posteriores necesitás migraciones manuales contra la base existente.
- No asumas que hay React, Vue ni ningún framework en el frontend. Todo es vanilla JS + Tailwind.
- Los estilos custom están en `frontend/src/styles.css` (prefijo `nx-`); el layout usa clases de Tailwind.
- El backend usa Spring Boot con Java 17. Mantené las convenciones de nombres en español y la estructura de capas `controller`/`service`/`repository`.
- Documentación desactualizada: `docs/api-externos.md` todavía menciona "backend Express" en su diagrama de arquitectura, aunque el contrato del gateway (`POST /api/v1/gateway`, header `x-api-key`) sigue siendo el mismo.
