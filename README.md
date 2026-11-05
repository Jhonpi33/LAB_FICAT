# LAB_FICAT

Sistema de información y software de gestión para el **Laboratorio de Alimentos y Grasas del SENA (FICAT)**.

Gestiona el ciclo completo del servicio de análisis: **clientes → solicitudes → cotizaciones → pagos → recepción de muestras → resultados → incidencias → informes → facturación → disposición**, con seguimiento público de muestras y encuesta de satisfacción.

## Stack

| Capa | Tecnologías |
|---|---|
| Frontend | Vue 3 · Quasar · Pinia · Vue Router · Axios · Vite |
| Backend | Node.js · Express · Mongoose · JWT · express-validator |
| Base de datos | MongoDB Atlas (plan M0) |
| Facturación | Factus (modo sandbox) |

## Estructura

```
LAB_FICAT/
├── backend/      API REST (Express + Mongoose)
│   └── src/      models, services, controllers, routes, validators, middlewares
├── frontend/     Aplicación Vue 3 + Quasar
│   └── src/      views, components, store, plugins, services, composables, utils
├── docs/         Documentación técnica del equipo
└── ...
```

## Requisitos

- Node.js 18+
- Una base de datos MongoDB Atlas (propia o la compartida por el equipo)

## Configuración inicial

Cada carpeta necesita su archivo `.env` (copiar desde `.env.example`):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Completa `backend/.env` con tu `MONGO_URI` (URL de conexión de Atlas) y un `JWT_SECRET` propio.

> ⚠️ **Para que todos vean los mismos datos**, deben conectarse al **mismo cluster de Atlas** (misma `MONGO_URI`). Ver la guía completa en [`docs/08_GUIA_CLONAR_EJECUTAR.md`](docs/08_GUIA_CLONAR_EJECUTAR.md).

## Arranque

```bash
# Terminal 1 — Backend (http://localhost:4000)
cd backend
npm install
npm run dev

# Terminal 2 — Frontend (http://localhost:5174)
cd frontend
npm install
npm run dev
```

Abre **http://localhost:5174**.

## Cuentas de demostración

| Perfil | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@sena.edu.co` | `Admin2026` |
| Encargado | `lab@sena.edu.co` | `Laboratorio2026` |
| Usuario / Cliente | `lectura@sena.edu.co` | `Lectura2026` |

> Se crean con `npm run seed` (en `backend/`). La primera vez también puedes correr `npm run colecciones` para crear las colecciones e índices en Atlas.

## Documentación

- [Guía para clonar y ejecutar (para el equipo)](docs/08_GUIA_CLONAR_EJECUTAR.md)
- [Guía de arranque y publicación con Cloudflare Tunnel](GUIA_ARRANQUE.md)
- [Índice de documentación técnica](docs/00_INDICE.md)
