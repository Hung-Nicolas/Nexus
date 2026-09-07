# Backend Nexus — Spring Boot

Backend de la Base de Datos Escolar Maestra. Expone el buscador de solo lectura,
la autenticación (JWT + refresh tokens) y el API Gateway para proyectos externos.

- **Framework**: Spring Boot 4 (Java 17, Gradle)
- **Persistencia**: Spring Data JPA (auth/gateway) + JdbcTemplate (buscador, SQL dinámico)
- **Seguridad**: Spring Security stateless + JWT (jjwt), bcrypt, rotación de refresh tokens
- **Base de datos**: PostgreSQL **local** (Docker Compose en desarrollo y producción)

## Estructura

```
backend/src/main/java/com/nexus/
├── NexusApplication.java      # Entry point
├── config/                    # CORS, SecurityConfig, rate limiting, ConfigTablas
├── controller/                # Auth, Buscador, Dashboard, Gateway, Health
├── service/                   # Lógica de negocio
├── repository/                # Spring Data JPA (usuarios, refresh_tokens, proyectos)
├── model/                     # Entidades JPA
├── dto/                       # Request/Response
├── security/                  # JwtUtils, JwtFilter
└── exception/                 # ApiException + GlobalExceptionHandler
```

## Variables de entorno

Ver `.env.example`. Spring Boot las lee directamente del entorno (no hay archivo `.env` autogenerado):
exportalas en tu shell o configurá tu IDE.

| Variable | Requerida | Default | Uso |
|----------|-----------|---------|-----|
| `DB_URL` | no | `jdbc:postgresql://localhost:5432/nexus` | JDBC url de la base local |
| `DB_USERNAME` | no | `nexus` | Usuario de PostgreSQL |
| `DB_PASSWORD` | no | `nexus_local_password` | Password de PostgreSQL |
| `JWT_SECRET` | sí | — | Firma de access/refresh tokens (mínimo 32 caracteres) |
| `JWT_ACCESS_EXPIRES_IN` | no | `15m` | Formato `(\d+)(d\|h\|m)` |
| `JWT_REFRESH_EXPIRES_IN` | no | `7d` | Idem; define también `expires_at` en DB |
| `BCRYPT_ROUNDS` | no | `12` | Rounds de bcrypt |
| `CORS_ORIGIN` | no | `http://localhost:5173` | Lista separada por comas; localhost:5173 siempre se permite |
| `CORS_ORIGIN_PATTERN` | no | — | Regex de orígenes extra (ej. previews de Vercel) |
| `SERVER_PORT` | no | `3000` | Puerto del servidor |
| `APP_ENV` | no | `development` | Valor expuesto en `GET /health` |

## Comandos

```bash
# Desarrollo (requiere JDK 17)
./gradlew bootRun

# Compilar y correr tests
./gradlew build

# Solo tests
./gradlew test

# JAR de producción (backend/build/libs/nexus-0.0.1-SNAPSHOT.jar)
./gradlew bootJar
```

## Endpoints

Todos bajo `/api/v1` (mismo contrato que el frontend espera):

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | no | Healthcheck |
| POST | `/api/v1/auth/login` | no | Login email + password → access + refresh token |
| POST | `/api/v1/auth/logout` | no | Borra el refresh token |
| POST | `/api/v1/auth/refresh` | no | Rota el refresh token |
| GET | `/api/v1/auth/me` | JWT | Usuario actual |
| GET | `/api/v1/buscar/:tabla` | JWT | Búsqueda con `?term=`, `?limite=` y filtros |
| GET | `/api/v1/registros/:tabla/:campo/:id` | JWT | Detalle de un registro |
| GET | `/api/v1/tablas/:tabla/opciones-filtros` | JWT | Opciones dinámicas de filtros |
| GET | `/api/v1/stats` | JWT | Conteos de las 7 tablas |
| POST | `/api/v1/gateway` | `x-api-key` | SELECT controlado para proyectos externos |

Rate limits por IP: login 20/15min · gateway 100/min · resto de la API 200/min.

## Crear usuarios

No hay CLI: insertar directamente en la tabla `usuarios` con un hash bcrypt.
Para generar el hash (desde cualquier entorno con Python):

```bash
python3 -c "import bcrypt; print(bcrypt.hashpw(b'TuPassword123!', bcrypt.gensalt(12)).decode())"
```

```sql
INSERT INTO public.usuarios (email, password_hash, nombre, apellido, rol)
VALUES ('nuevo.usuario@nexus.local', '<hash_bcrypt_aqui>', 'Nombre', 'Apellido', 'regente');
```

Roles válidos: `regente`, `subregente`, `rector`, `vicerector`, `docente`, `preceptor`,
`doe`, `pat`, `cooperadora`, `jefe_de_taller` (solo `regente` tiene acceso pleno al frontend).

## Deploy

- **Docker Compose** (desarrollo y server de la escuela): el `Dockerfile` de la raíz hace build
  multi-stage del jar y la imagen final corre sobre `eclipse-temurin:17-jre`. El servicio
  `postgres` del compose inicializa el schema (`db/schema.sql`) en el primer arranque.
- **Cualquier VPS / servidor Java**: `./gradlew bootJar` y `java -jar build/libs/nexus-0.0.1-SNAPSHOT.jar`
  con las variables de entorno configuradas. El healthcheck es `GET /health`.

> La base siempre es local al despliegue (contenedor o instancia propia de PostgreSQL).
> El backend funciona con cualquier PostgreSQL 14+ cambiando `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`.
