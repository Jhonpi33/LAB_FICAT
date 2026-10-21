# Backend — LAB_FICAT

API REST del **Sistema de Gestión para el Servicio de Análisis de Laboratorio (SENA — FICAT)**.

- **Stack:** Node.js + Express + Mongoose (MongoDB) + JWT.
- **Convención de carpetas:** `routes → controllers → services → validators`,
  apoyados en `src/models/`, `src/middlewares/` y `src/utils/`.
- **Contrato HTTP completo (fuente de verdad para el frontend):** ver [`../API.md`](../API.md).

---

## 1. Instalación

```bash
cd backend
npm install
cp .env.example .env    # y completar los valores
```

Requisitos: Node.js 18+ y una instancia de MongoDB (local o Atlas).

## 2. Variables de entorno (`.env`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | no | Puerto del servidor (default `3000`) |
| `MONGO_URI` | **sí** | String de conexión, ej. `mongodb://127.0.0.1:27017/labficat` |
| `JWT_SECRET` | **sí** | Secreto para firmar los tokens |
| `JWT_EXPIRES` | no | Expiración del token (default `12h`) |
| `FRONTEND_URL` | no | Origen permitido por CORS (default `http://localhost:9000`) |
| `ADMIN_NOMBRE` | para `seed` | Nombre del administrador inicial |
| `ADMIN_EMAIL` | para `seed` | Email del administrador inicial |
| `ADMIN_PASSWORD` | para `seed` | Contraseña del administrador (mín. 8 con número) |

Si faltan `MONGO_URI` o `JWT_SECRET`, el proceso sale con un mensaje claro
(`src/config/env.js`).

## 3. Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Arranque con recarga automática (nodemon) |
| `npm start` | Arranque en modo producción |
| `npm run seed` | Semilla idempotente: admin + 5 parámetros + 3 clientes + 3 solicitudes |

Verificación rápida:

```bash
npm run seed
npm start
curl http://localhost:3000/api/health   # {"ok":true,"mensaje":"API funcionando"}
```

## 4. Endpoints

Autenticación: header `Authorization: Bearer <token>`. Éxito = HTTP 200 con
`{ ok, mensaje, datos }`; error = `{ ok: false, mensaje[, errores] }`.
Detalle completo, payloads y estados de negocio en [`../API.md`](../API.md).

| Grupo | Rutas | Acceso |
|---|---|---|
| Salud | `GET /api/health` | público |
| Auth | `POST /api/auth/registro`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/perfil` | público / JWT |
| Usuarios | `GET|POST /api/usuarios`, `PUT /api/usuarios/:id`, `PATCH /api/usuarios/:id/estado` | JWT + `admin` |
| Clientes | `GET /api/clientes[/:id]`, `POST`, `PUT /:id`, `DELETE /:id` | JWT + `admin`\|`encargado` |
| Parámetros | `GET /api/parametros[/:id]`, `POST`, `PUT /:id`, `PATCH /:id/estado`, `DELETE /:id` | JWT + `admin`\|`encargado` |
| Solicitudes | `GET /api/solicitudes[/:id]`, `POST`, `PUT /:id`, `PATCH /:id/estado`, `DELETE /:id` | JWT + `admin`\|`encargado` |
| Cotizaciones | `GET /api/cotizaciones[/:id]`, `POST`, `PUT /:id`, `PATCH /:id/estado`, `DELETE /:id` | JWT + `admin`\|`encargado` |
| Muestras | `GET /api/muestras[/:id]`, `POST`, `PUT /:id`, `PATCH /:id/estado`, `DELETE /:id` | JWT + `admin`\|`encargado` |

## 5. Estructura

```
backend/
├── scripts/seed.js            # semilla idempotente
├── src/
│   ├── app.js                 # middlewares globales, rutas, 404 y errorHandler
│   ├── server.js              # conectar BD → escuchar en PORT
│   ├── config/                # env, database, constants, gridfs
│   ├── controllers/           # orquestación req/res (responses.js)
│   ├── middlewares/           # auth (JWT), roles, validar, errorHandler, audit
│   ├── models/                # esquemas Mongoose (Usuario, Cliente, Solicitud, ...)
│   ├── routes/                # definición de rutas por recurso
│   ├── services/              # reglas de negocio
│   ├── utils/                 # responses, utilidades
│   └── validators/            # reglas express-validator por recurso
└── tests/api.test.js          # pruebas (pendiente)
```

## 6. Estados de negocio (resumen)

- **Solicitud:** `borrador → enviada → aprobada`
- **Cotización:** `borrador → enviada → aceptada | rechazada` (editar/eliminar solo en borrador)
- **Muestra:** `pendiente → aceptada → en_analisis → finalizada` y `pendiente → rechazada`
  (al aceptar se generan `codigo` `0042-2026` y `codigo_seguimiento` de 32 hex)

Todos los módulos usan **borrado lógico** (`eliminado`, `eliminado_por`, `fecha_eliminacion`).
