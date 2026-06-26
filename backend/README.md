# Backend Nexus — Express

Backend de Nexus implementado en Express. Se conecta directamente a PostgreSQL (Supabase) mediante el driver `pg` y expone la API REST que consume el frontend y los proyectos externos.

---

## Stack

- Express 4
- PostgreSQL (vía `pg`)
- JWT (`jsonwebtoken`)
- bcrypt
- Helmet, CORS, express-rate-limit

---

## Estructura

```
backend/
├── .env.example
└── src/
    ├── index.js          # Entry point
    ├── config.js         # Variables de entorno
    ├── db.js             # Pool de pg
    ├── lib/
    │   ├── jwt.js        # Helpers JWT
    │   └── configTablas.js
    ├── middleware/
    │   ├── auth.js
    │   ├── errorHandler.js
    │   ├── rateLimit.js
    │   └── validate.js
    ├── routes/
    │   ├── auth.js
    │   ├── buscador.js
    │   ├── dashboard.js
    │   └── gateway.js
    └── services/
        ├── authService.js
        ├── buscadorService.js
        ├── dashboardService.js
        └── gatewayService.js
```

---

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `PORT` | `3000` | Puerto del servidor |
| `DATABASE_URL` | `postgresql://...` | Connection string de PostgreSQL |
| `JWT_SECRET` | `minimo-32-caracteres...` | Clave para firmar JWT |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Vida del access token |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Vida del refresh token |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido del frontend |
| `NODE_ENV` | `development` | Entorno |

---

## Endpoints

### Auth

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/auth/login` | Login con email y password |
| `POST` | `/api/v1/auth/logout` | Invalida el refresh token |
| `POST` | `/api/v1/auth/refresh` | Renueva el access token |
| `GET`  | `/api/v1/auth/me` | Perfil del usuario autenticado |

### Frontend

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/buscar/:tabla` | Búsqueda con filtros y relaciones |
| `GET` | `/api/v1/registros/:tabla/:campo/:id` | Detalle de un registro |
| `GET` | `/api/v1/tablas/:tabla/opciones-filtros` | Opciones para filtros dinámicos |
| `GET` | `/api/v1/stats` | Conteos para el dashboard |

### Gateway externo

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/gateway` | API pública para proyectos externos con `x-api-key` |

---

## Gateway externo

Ejemplo de uso:

```bash
curl -X POST http://localhost:3000/api/v1/gateway \
  -H "x-api-key: nx_tu_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "tabla": "alumnos",
    "datos": {
      "campos": "dni, nombre, apellido",
      "filtros": { "turno": "Mañana" },
      "limite": 10
    }
  }'
```

---

## Seguridad

- Helmet para headers seguros.
- CORS restringido al origen del frontend.
- Rate limiting en login, API y gateway.
- Contraseñas hasheadas con bcrypt.
- JWT access token corto + refresh token rotativo.
- Queries parametrizadas para prevenir SQL injection.
- Whitelist de tablas en búsqueda y gateway.
