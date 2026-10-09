# FASES — DESARROLLO DEL LOGIN Y REGISTRO

Documento aparte con las fases para implementar la autenticación (login y registro) del Sistema de Gestión para el Servicio de Análisis de Laboratorio, incluyendo la ruta exacta de cada archivo que debe crearse o rellenarse.

**Stack:** Backend JavaScript (Node.js + Express + Mongoose + JWT) · Frontend HTML, CSS, JavaScript, Vue 3, VueRouter y Quasar · MongoDB Atlas.

**Estructura del backend (organización por capas, carpetas únicas):** cada recurso se distribuye así:
`src/routes/<recurso>.routes.js` → `src/controllers/<recurso>.controller.js` → `src/services/<recurso>.service.js` → `src/validators/<recurso>.validators.js`, apoyados en `src/models/`, `src/middlewares/` y `src/utils/`. **No existe carpeta `modules/`.**

---

## REGLAS DEL SISTEMA

1. Un script semilla crea el **administrador** inicial desde las variables del `.env`.
2. El registro público solo crea cuentas con rol **`usuario`** (auto-registro).
3. El **admin** tiene gestión completa: crea **solo encargados**; edita y desactiva encargados y usuarios.
4. Cualquier sesión edita **solo su propio perfil**; el rol nunca se modifica desde la API.
5. Todo el acceso interno va protegido con JWT (RNF-003) y las contraseñas se guardan con hash bcrypt.

---

## PARTE 1 — BACKEND

### Fase B1 — Configuración y arranque del servidor

- **Objetivo:** proyecto Node.js inicializado, conectado a Atlas y respondiendo.
- **Archivos:**
  | Ruta | Contenido |
  |---|---|
  | `backend/package.json` | scripts `dev` (nodemon), `start` (node), `seed`; deps: express, mongoose, dotenv, cors, helmet, jsonwebtoken, bcryptjs, express-validator; dev: nodemon |
  | `backend/.env.example` | `PORT=3000`, `MONGO_URI=`, `JWT_SECRET=`, `JWT_EXPIRES=12h`, `FRONTEND_URL=http://localhost:9000`, `ADMIN_NOMBRE=`, `ADMIN_EMAIL=`, `ADMIN_PASSWORD=` |
  | `backend/.gitignore` | `node_modules/`, `.env`, `*.log` |
  | `backend/src/config/env.js` | carga dotenv; valida `MONGO_URI` y `JWT_SECRET`; sale con error claro si faltan |
  | `backend/src/config/database.js` | `mongoose.connect()` con eventos connected/error/disconnected |
  | `backend/src/config/constants.js` | `ROLES = ['admin','encargado','usuario']`, defaults de JWT |
  | `backend/src/app.js` | express, helmet, CORS, JSON, `GET /api/health`, monta `/api/auth` y `/api/usuarios`, 404 en JSON, errorHandler |
  | `backend/src/server.js` | conectar BD → escuchar en PORT |
- **Entregables:** servidor corriendo con las variables cargadas.
- **Criterio de verificación:** `GET /api/health` responde `{"ok":true}`; si Atlas no conecta se ve un mensaje claro en consola.

### Fase B2 — Modelo de usuario y middlewares

- **Objetivo:** modelo de usuarios con las 3 reglas de negocio y seguridad base.
- **Archivos:**
  | Ruta | Contenido |
  |---|---|
  | `backend/src/models/Usuario.js` | nombre (3–120), email único, password (`select:false`), rol enum, `activo`, `permiso_editar/eliminar`, `eliminado*` (RNF-015), timestamps; índice único en email; hook `pre('save')` con bcrypt; método `compararPassword()` |
  | `backend/src/middlewares/auth.js` | `requireAuth`: verifica `Authorization: Bearer` → `req.usuario`; 401 si falta o falla |
  | `backend/src/middlewares/roles.js` | `requireRole(...roles)` → 403 si el rol no está permitido |
  | `backend/src/middlewares/validar.js` | ejecuta express-validator → 400 con lista de errores campo/mensaje |
  | `backend/src/middlewares/errorHandler.js` | error único en JSON sin exponer stack (RNF-014) |
  | `backend/src/utils/responses.js` | helpers `ok()` y `fail()` |
- **Entregables:** modelo y middlewares listos.
- **Criterio de verificación:** una ruta de prueba con `requireAuth` responde 401 sin token y 403 con rol no permitido.

### Fase B3 — Semilla del administrador

- **Objetivo:** crear el primer admin de forma idempotente.
- **Archivos:**
  | Ruta | Contenido |
  |---|---|
  | `backend/scripts/seed.js` | lee `ADMIN_NOMBRE/ADMIN_EMAIL/ADMIN_PASSWORD`; si faltan → error y sale; si el email ya existe → "El admin ya existe"; si no → crea con `rol:'admin'`, `activo:true`, permisos en true; cierra la conexión |
  | `backend/package.json` | script `"seed": "node scripts/seed.js"` (se completa en Fase B1 si aún no existe) |
- **Entregables:** comando `npm run seed`.
- **Criterio de verificación:** ejecutar `npm run seed` dos veces; la segunda informa que el admin ya existe.

### Fase B4 — API de autenticación (módulo auth)

- **Objetivo:** endpoints de registro, login, sesión activa y edición de perfil propio.
- **Archivos:**
  | Ruta | Contenido |
  |---|---|
  | `backend/src/validators/auth.validators.js` | registro: nombre 3–120, email válido, password min 8 con número; login: email + password; perfil: nombre, email, password opcional |
  | `backend/src/services/auth.service.js` | `registro()` fuerza `rol:'usuario'`, rechaza email duplicado (409); `login()` valida credenciales genéricas (401), cuenta activa (403) y firma JWT `{id, nombre, email, rol, permiso_editar, permiso_eliminar}`; `me()` devuelve datos públicos; `actualizarPerfil()` solo nombre/email/password con id del token (nunca del body) |
  | `backend/src/controllers/auth.controller.js` | orquesta req/res con `responses.js` |
  | `backend/src/routes/auth.routes.js` | `POST /registro` (público) · `POST /login` (público) · `GET /me` (requireAuth) · `PUT /perfil` (requireAuth) |
- **Entregables:** 4 endpoints funcionando.
- **Criterio de verificación:** registro sin enviar rol queda como `usuario`; email repetido → 409; login → token; `GET /me` con token → 200; `PUT /perfil` no permite cambiar el rol.

### Fase B5 — API de gestión de usuarios (solo admin)

- **Objetivo:** CRUD de encargados y usuarios bajo el rol admin.
- **Archivos:**
  | Ruta | Contenido |
  |---|---|
  | `backend/src/validators/usuarios.validators.js` | crear: nombre, email, password, rol ∈ enum; editar: nombre, email (rol solo puede ser `encargado` o `usuario`, nunca `admin`) |
  | `backend/src/services/usuarios.service.js` | `listar()` con filtro `?rol=` y búsqueda, sin password; `crear()` acepta **solo rol encargado** (400 en caso contrario); `editar()` con email duplicado → 409; `cambiarEstado()` aplica baja lógica e impide desactivar al propio admin |
  | `backend/src/controllers/usuarios.controller.js` | listar, crear, editar, cambiarEstado |
  | `backend/src/routes/usuarios.routes.js` | todas las rutas con `requireAuth + requireRole('admin')` |
- **Entregables:** CRUD completo de usuarios.
- **Criterio de verificación:** sin token → 401; con rol `usuario` → 403; crear `usuario` o `admin` por API → 400.

### Fase B6 — Verificación manual del backend

- **Checklist (PowerShell/curl):**
  1. `npm run seed` → admin creado; repetir → "ya existe".
  2. `POST /api/auth/registro` sin rol → 201 como `usuario`; email repetido → 409.
  3. `POST /api/auth/login` → token; login con cuenta desactivada → 403; password malo → 401.
  4. `GET /api/auth/me` y `PUT /api/auth/perfil` con token → 200; sin token → 401.
  5. Con token de admin: `GET /api/usuarios`, `POST /api/usuarios` (encargado), `PUT /api/usuarios/:id`, `PATCH /api/usuarios/:id/estado`.
  6. Con token de `usuario`: `GET /api/usuarios` → 403.
- **Criterio de verificación:** todos los puntos pasan antes de avanzar al frontend.

---

## PARTE 2 — FRONTEND

### Fase F1 — Proyecto Quasar base

- **Objetivo:** aplicación Quasar (Vue 3 + Vite) arrancando con proxy al backend.
- **Archivos:**
  | Ruta | Contenido |
  |---|---|
  | `frontend/package.json` | deps: vue, vue-router, quasar, @quasar/extras, axios; dev: @quasar/vite-plugin, vite; scripts `dev`/`build` |
  | `frontend/vite.config.js` | plugin Quasar y Vue; **proxy `/api` → `http://localhost:3000`** |
  | `frontend/quasar.config.js` | boot `['axios']`, devServer en puerto 9000 |
  | `frontend/index.html` | `<div id="q-app">` + script `src/main.js` |
  | `frontend/.env.example` | `VITE_API_URL=` (vacío en dev, URL en producción) |
  | `frontend/.gitignore` | `node_modules/`, `.quasar/`, `dist/` |
  | `frontend/README.md` | comandos de instalación y arranque |
- **Entregables:** app base compilando.
- **Criterio de verificación:** `npm run dev` abre la app sin errores de consola.

### Fase F2 — Núcleo: router, axios y sesión

- **Objetivo:** navegación protegida, cliente HTTP y manejo de sesión (sin librería de estado).
- **Archivos:**
  | Ruta | Contenido |
  |---|---|
  | `frontend/src/main.js` | createApp + Quasar + router |
  | `frontend/src/App.vue` | `<router-view />` |
  | `frontend/src/boot/axios.js` | instancia axios con `baseURL`; interceptor que agrega el token desde `session` y en 401 limpia sesión y redirige a `/login` |
  | `frontend/src/router/index.js` | rutas y guardas (ver tabla de rutas abajo) |
  | `frontend/src/utils/session.js` | `setSession`, `getToken`, `getUsuario`, `isAuth`, `clear` en localStorage (`lab_token`, `lab_usuario`) |
  | `frontend/src/services/api.js` | `auth.{registro,login,me,perfil}` y `usuarios.{listar,crear,editar,estado}`; propaga el `mensaje` del backend para mostrarlo |
- **Entregables:** guardas activas y cliente HTTP conectado.
- **Criterio de verificación:** entrar a `/home` sin token redirige a `/login`; con token de `usuario` entrar a `/usuarios` redirige a `/home`.

### Fase F3 — Layout y páginas

- **Objetivo:** pantallas de login, registro, home, perfil y gestión de usuarios.
- **Archivos:**
  | Ruta | Contenido |
  |---|---|
  | `frontend/src/layouts/MainLayout.vue` | barra con título, nombre y rol de la sesión; enlace "Usuarios" visible **solo si rol = admin**; Inicio, Mi perfil, Cerrar sesión |
  | `frontend/src/pages/auth/Login.vue` | form email + password; errores junto al campo y aviso para 401/403; enlace "Regístrate"; al éxito guarda sesión y entra a `/home` |
  | `frontend/src/pages/auth/Registro.vue` | form nombre, email, password, confirmar; **sin selector de rol**; validaciones en cliente con mensajes junto al campo; 409 mostrado en pantalla; enlace "Inicia sesión" |
  | `frontend/src/pages/HomePage.vue` | saludo con nombre y rol; tarjetas placeholder de los módulos |
  | `frontend/src/pages/perfil/PerfilPage.vue` | edita nombre, email y password opcional; rol y permisos en solo lectura; mensajes de éxito/error en pantalla |
  | `frontend/src/pages/usuarios/UsuariosPage.vue` | tabla con filtro por rol y buscador; "Nuevo encargado" con rol fijo (no hay selector); editar; desactivar/activar con confirmación; errores del backend en el diálogo |
  | `frontend/src/css/app.scss` | estilos globales mínimos |
- **Entregables:** flujo completo en navegador.
- **Criterio de verificación:** el checklist de la Fase F4 pasa.

### Fase F4 — Verificación manual integral

- **Checklist (navegador):**
  1. `npm run seed` en backend.
  2. Registro público → entra como `usuario` → ve su home y su perfil (sin enlace "Usuarios").
  3. Editar perfil propio → cambios reflejados en la barra.
  4. Login de admin → aparece "Usuarios" → crea encargado → lo edita → lo desactiva y reactiva.
  5. Admin edita un `usuario` auto-registrado y lo desactiva; ese usuario ya no puede iniciar sesión (403 en pantalla).
  6. Sin token: `/home`, `/perfil`, `/usuarios` redirigen a `/login`.
- **Criterio de verificación:** todo el checklist en verde = fase concluida.

---

## TABLA 1 — RUTAS HTTP (backend)

| Método | Ruta | Acceso | Archivo que la atiende |
|---|---|---|---|
| GET | `/api/health` | público | `backend/src/app.js` |
| POST | `/api/auth/registro` | público (fuerza rol `usuario`) | `backend/src/routes/auth.routes.js` |
| POST | `/api/auth/login` | público | `backend/src/routes/auth.routes.js` |
| GET | `/api/auth/me` | JWT | `backend/src/routes/auth.routes.js` |
| PUT | `/api/auth/perfil` | JWT (solo propio) | `backend/src/routes/auth.routes.js` |
| GET | `/api/usuarios` | JWT + rol `admin` | `backend/src/routes/usuarios.routes.js` |
| POST | `/api/usuarios` | JWT + rol `admin` (solo crea `encargado`) | `backend/src/routes/usuarios.routes.js` |
| PUT | `/api/usuarios/:id` | JWT + rol `admin` | `backend/src/routes/usuarios.routes.js` |
| PATCH | `/api/usuarios/:id/estado` | JWT + rol `admin` | `backend/src/routes/usuarios.routes.js` |

## TABLA 2 — RUTAS DE NAVEGACIÓN (frontend)

| Ruta | Página | Acceso | Archivo |
|---|---|---|---|
| `/login` | Login | público (con sesión → `/home`) | `frontend/src/pages/auth/Login.vue` |
| `/registro` | Registro | público (con sesión → `/home`) | `frontend/src/pages/auth/Registro.vue` |
| `/home` | Inicio | JWT | `frontend/src/pages/HomePage.vue` |
| `/perfil` | Mi perfil | JWT (edita solo sí mismo) | `frontend/src/pages/perfil/PerfilPage.vue` |
| `/usuarios` | Gestión de usuarios | JWT + `meta.roles: ['admin']` | `frontend/src/pages/usuarios/UsuariosPage.vue` |
| `*` | Redirección | — | `frontend/src/router/index.js` → `/home` |

Las rutas `/home`, `/perfil` y `/usuarios` usan el layout `frontend/src/layouts/MainLayout.vue`.

---

## ORDEN DE EJECUCIÓN

| Paso | Fase | Verificación |
|---|---|---|
| 1 | B1 | `/api/health` = 200 |
| 2 | B2 | `requireAuth` = 401 sin token |
| 3 | B3 | `npm run seed` idempotente |
| 4 | B4 | registro → login → me → perfil |
| 5 | B5 | CRUD admin; 400/403 según reglas |
| 6 | B6 | checklist backend completo |
| 7 | F1 | `quasar dev` compila |
| 8 | F2 | guardas por token/rol |
| 9 | F3 | pantallas navegables |
| 10 | F4 | checklist integral en verde |

**Fuera de esta fase:** gridfs, auditoría, notificaciones, PDF, Factus y los demás módulos del sistema (ver `FASES.md`).
