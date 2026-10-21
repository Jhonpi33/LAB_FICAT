# API.md — Contrato HTTP del backend LAB_FICAT

**Documento fuente de verdad para el frontend.** Describe la API REST tal como está
implementada hoy en `backend/` (versión mínima viable): rutas, payloads, respuestas de
éxito y de error, autenticación y estados de negocio. Todos los ejemplos fueron
obtenidos de respuestas reales del servidor en ejecución.

- **Recurso base (desarrollo):** `http://localhost:3000/api`
- En el frontend se recomienda `baseURL = '/api'` aprovechando el proxy de Vite/Quasar
  hacia `http://localhost:3000` (FASES F1).
- **Stack:** Node.js + Express + Mongoose (MongoDB).

---

## 1. Convenciones generales

### 1.1 Formato de respuesta

Toda respuesta es JSON con **un envoltorio común**:

**Éxito (siempre HTTP 200, incluidos POST/PUT/PATCH/DELETE):**

```json
{
  "ok": true,
  "mensaje": "Cliente creado correctamente",
  "datos": { "_id": "6ad8b15a548cffe8bc35ac9a", "nombre": "..." }
}
```

- `ok` (`boolean`): `true` en éxito.
- `mensaje` (`string`): texto en español para mostrar al usuario.
- `datos` (`object | array | null`): carga útil. Puede omitirse (`null`).

**Error:**

```json
{
  "ok": false,
  "mensaje": "Descripcion del error",
  "errores": [ { "campo": "email", "msg": "El email no es valido" } ]
}
```

- `errores` **solo aparece** en errores de validación (HTTP 400 con `mensaje: "Datos invalidos"`).
- En cualquier otro error solo vienen `ok` y `mensaje`.

### 1.2 Códigos HTTP utilizados

| Código | Cuándo | Ejemplo |
|---|---|---|
| 200 | Toda operación exitosa (incluye creación y borrado) | `POST /api/clientes` |
| 400 | Datos inválidos (express-validator) o regla de negocio de transición | `"Datos invalidos"` con `errores[]` |
| 401 | Sin token, token inválido o expirado | `"Debe iniciar sesion para acceder"` |
| 403 | Rol no permitido o cuenta desactivada | `"No tiene permisos para realizar esta accion"` |
| 404 | Recurso inexistente o id mal formado | `"Cliente no encontrado"` |
| 409 | Conflicto: duplicado o regla de negocio (ej. eliminar en uso) | `"El numero de documento ya se encuentra registrado"` |
| 500 | Error inesperado del servidor | `"Ocurrio un error en el servidor"` |

Ruta inexistente (404 global):

```json
{ "ok": false, "mensaje": "Ruta no encontrada" }
```

### 1.3 Identificadores y fechas

- Los documentos usan **`_id`** (`string` de 24 caracteres hexadecimales).
  **Excepción:** los endpoints de `/api/auth` (`login`, `me`, `perfil`) devuelven **`id`**.
- Todas las fechas son **ISO 8601 en UTC**: `"2026-10-21T12:34:34.553Z"`.
- Campos de borrado lógico presentes en todos los módulos: `eliminado` (boolean),
  `eliminado_por` (email de quien borró o `null`), `fecha_eliminacion` (fecha o `null`).
- Fechas de auditoría de esquema: `fecha_creacion`, `fecha_actualizacion`.
- No hay paginación: los listados devuelven **siempre el arreglo completo**.

### 1.4 Borrado lógico

`DELETE /api/<recurso>/:id` **no borra físicamente**: marca `eliminado: true` y responde
200 con el documento completo (ya no aparece en los listados). `eliminado` siempre es
`false` en los filtros por defecto.

---

## 2. Autenticación

- **Header (único mecanismo):**

  ```
  Authorization: Bearer <token>
  Content-Type: application/json
  ```

  > No se usa `x-token`. El interceptor del frontend debe adjuntar
  > `Authorization: Bearer` desde `localStorage` (`lab_token`) y, ante un **401**,
  > limpiar la sesión y redirigir a `/login` (FASES F2 / RNF-014).

- El token es un JWT firmado con `JWT_SECRET`, expiración `JWT_EXPIRES` (12 h por defecto).
- **Payload del token:** `{ id, nombre, email, rol, permiso_editar, permiso_eliminar }`.
- `req.usuario` en el backend expone esos mismos campos.

**Errores de autenticación:**

| Situación | HTTP | `mensaje` |
|---|---|---|
| Sin header | 401 | `Debe iniciar sesion para acceder` |
| Token inválido/expirado | 401 | `Sesion invalida o expirada` |
| Rol no permitido | 403 | `No tiene permisos para realizar esta accion` |
| Login con password incorrecto o usuario inexistente | 401 | `Credenciales incorrectas` |
| Login de cuenta con `activo: false` | 403 | `La cuenta esta desactivada, contacte al administrador` |

### 2.1 Roles

| Rol | Acceso |
|---|---|
| `admin` | Todos los módulos internos + `/api/usuarios` |
| `encargado` | Todos los módulos internos **excepto** `/api/usuarios` |
| `usuario` | Solo `/api/auth` (su perfil). **403** en clientes, parámetros, solicitudes, cotizaciones, muestras y usuarios |

---

## 3. Estados de negocio

### 3.1 Solicitudes

| Estado | Significado |
|---|---|
| `borrador` | Creada, aún no enviada (estado inicial, único posible al crear) |
| `enviada` | Enviada al laboratorio para su revisión |
| `aprobada` | Aprobada por el personal autorizado |

**Transiciones permitidas** (vía `PATCH /api/solicitudes/:id/estado`):

```
borrador ──> enviada ──> aprobada
```

Cualquier otra combinación responde **400** con
`"Transicion de estado no permitida: de \"<actual>\" a \"<nuevo>\""`. No hay retroceso.

### 3.2 Cotizaciones

| Estado | Significado |
|---|---|
| `borrador` | Generada, editable y eliminable (estado inicial) |
| `enviada` | Marcada como enviada al cliente |
| `aceptada` | El cliente la aceptó |
| `rechazada` | El cliente la rechazó |

**Transiciones permitidas** (vía `PATCH /api/cotizaciones/:id/estado`):

```
borrador ──> enviada ──> aceptada
                       └─> rechazada
```

- Solo `borrador` admite `PUT` (editar) y `DELETE`; en otro estado → **409**:
  `"Solo se pueden editar cotizaciones en borrador"` /
  `"Solo se pueden eliminar cotizaciones en borrador"`.

### 3.3 Muestras

| Estado | Significado |
|---|---|
| `pendiente` | Recepción registrada, aún sin verificar (estado inicial) |
| `aceptada` | Verificada y aceptada; aquí se generan `codigo` y `codigo_seguimiento` |
| `rechazada` | Verificada y rechazada; exige `motivo_rechazo` |
| `en_analisis` | En proceso de análisis en el laboratorio |
| `finalizada` | Proceso finalizado |

**Transiciones permitidas** (vía `PATCH /api/muestras/:id/estado`):

```
pendiente ──> aceptada ──> en_analisis ──> finalizada
          └─> rechazada
```

- Rechazar **exige** `motivo_rechazo` en el body (400 si falta).
- Al pasar a `aceptada` (por primera vez) el servidor genera automáticamente:
  - `codigo`: consecutivo por año con formato `0042-2026` (único) — RF-026.
  - `codigo_seguimiento`: 32 caracteres hexadecimales impredecibles (único) — RF-027/028.
- Solo se pueden eliminar (`DELETE`) muestras `pendiente`; en otro estado → **409**
  `"Solo se pueden eliminar muestras pendientes"`.

### 3.4 Reglas de eliminación (409)

| Recurso | Condición que bloquea el borrado lógico | `mensaje` |
|---|---|---|
| Cliente | Tiene solicitudes activas | `No se puede eliminar un cliente con solicitudes registradas` |
| Solicitud | Tiene cotizaciones o muestras | `No se puede eliminar una solicitud con cotizaciones o muestras registradas` |
| Parámetro | Aparece en items de una cotización | `No se puede eliminar un parametro utilizado en cotizaciones` |
| Cotización | Estado ≠ `borrador` | `Solo se pueden eliminar cotizaciones en borrador` |
| Muestra | Estado ≠ `pendiente` | `Solo se pueden eliminar muestras pendientes` |

---

## 4. Catálogo de endpoints

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/health` | público |
| POST | `/api/auth/registro` | público |
| POST | `/api/auth/login` | público |
| GET | `/api/auth/me` | JWT |
| PUT | `/api/auth/perfil` | JWT |
| GET | `/api/usuarios` | JWT + `admin` |
| POST | `/api/usuarios` | JWT + `admin` |
| PUT | `/api/usuarios/:id` | JWT + `admin` |
| PATCH | `/api/usuarios/:id/estado` | JWT + `admin` |
| GET | `/api/clientes` | JWT + `admin`\|`encargado` |
| GET | `/api/clientes/:id` | JWT + `admin`\|`encargado` |
| POST | `/api/clientes` | JWT + `admin`\|`encargado` |
| PUT | `/api/clientes/:id` | JWT + `admin`\|`encargado` |
| DELETE | `/api/clientes/:id` | JWT + `admin`\|`encargado` |
| GET | `/api/parametros` | JWT + `admin`\|`encargado` |
| GET | `/api/parametros/:id` | JWT + `admin`\|`encargado` |
| POST | `/api/parametros` | JWT + `admin`\|`encargado` |
| PUT | `/api/parametros/:id` | JWT + `admin`\|`encargado` |
| PATCH | `/api/parametros/:id/estado` | JWT + `admin`\|`encargado` |
| DELETE | `/api/parametros/:id` | JWT + `admin`\|`encargado` |
| GET | `/api/solicitudes` | JWT + `admin`\|`encargado` |
| GET | `/api/solicitudes/:id` | JWT + `admin`\|`encargado` |
| POST | `/api/solicitudes` | JWT + `admin`\|`encargado` |
| PUT | `/api/solicitudes/:id` | JWT + `admin`\|`encargado` |
| PATCH | `/api/solicitudes/:id/estado` | JWT + `admin`\|`encargado` |
| DELETE | `/api/solicitudes/:id` | JWT + `admin`\|`encargado` |
| GET | `/api/cotizaciones` | JWT + `admin`\|`encargado` |
| GET | `/api/cotizaciones/:id` | JWT + `admin`\|`encargado` |
| POST | `/api/cotizaciones` | JWT + `admin`\|`encargado` |
| PUT | `/api/cotizaciones/:id` | JWT + `admin`\|`encargado` |
| PATCH | `/api/cotizaciones/:id/estado` | JWT + `admin`\|`encargado` |
| DELETE | `/api/cotizaciones/:id` | JWT + `admin`\|`encargado` |
| GET | `/api/muestras` | JWT + `admin`\|`encargado` |
| GET | `/api/muestras/:id` | JWT + `admin`\|`encargado` |
| POST | `/api/muestras` | JWT + `admin`\|`encargado` |
| PUT | `/api/muestras/:id` | JWT + `admin`\|`encargado` |
| PATCH | `/api/muestras/:id/estado` | JWT + `admin`\|`encargado` |
| DELETE | `/api/muestras/:id` | JWT + `admin`\|`encargado` |

---

## 5. Salud

### `GET /api/health` — público

```bash
curl http://localhost:3000/api/health
```

```json
{ "ok": true, "mensaje": "API funcionando" }
```

---

## 6. Autenticación (`/api/auth`)

### `POST /api/auth/registro` — público

Crea cuentas con **rol fijo `usuario`** (nunca admin ni encargado).

**Request:**

```json
{
  "nombre": "Maria Lopez",
  "email": "maria@correo.com",
  "password": "Segura123"
}
```

| Campo | Reglas |
|---|---|
| `nombre` | 3 a 120 caracteres |
| `email` | válido y normalizado a minúsculas |
| `password` | mínimo 8 caracteres y al menos un número |

**Éxito (200):**

```json
{
  "ok": true,
  "mensaje": "Usuario registrado correctamente",
  "datos": {
    "id": "6ad8b15a548cffe8bc35ac97",
    "nombre": "Maria Lopez",
    "email": "maria@correo.com",
    "rol": "usuario",
    "activo": true,
    "permiso_editar": false,
    "permiso_eliminar": false,
    "fecha_creacion": "2026-10-21T12:34:34.465Z"
  }
}
```

**Errores:** 400 (`Datos invalidos` + `errores[]`) · 409 `"El email ya se encuentra registrado"`.

### `POST /api/auth/login` — público

**Request:**

```json
{ "email": "admin@labficat.test", "password": "Admin2026!" }
```

**Éxito (200):**

```json
{
  "ok": true,
  "mensaje": "Inicio de sesion exitoso",
  "datos": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": "6ad8b0f66c34c85270e39511",
      "nombre": "Jhon Administrador",
      "email": "admin@labficat.test",
      "rol": "admin",
      "activo": true,
      "permiso_editar": true,
      "permiso_eliminar": true,
      "fecha_creacion": "2026-10-21T12:32:54.484Z"
    }
  }
}
```

**Errores:** 400 · 401 `"Credenciales incorrectas"` · 403 `"La cuenta esta desactivada, contacte al administrador"`.

### `GET /api/auth/me` — JWT

```json
{
  "ok": true,
  "mensaje": "Sesion activa",
  "datos": {
    "id": "6ad8b0f66c34c85270e39511",
    "nombre": "Jhon Administrador",
    "email": "admin@labficat.test",
    "rol": "admin",
    "activo": true,
    "permiso_editar": true,
    "permiso_eliminar": true,
    "fecha_creacion": "2026-10-21T12:32:54.484Z"
  }
}
```

**Errores:** 401 (sin token o inválido) · 404 `"Usuario no encontrado"`.

### `PUT /api/auth/perfil` — JWT (solo el propio)

El id **siempre** proviene del token; el body no puede cambiar `rol` ni permisos.

**Request:**

```json
{
  "nombre": "Jhon Administrador",
  "email": "admin@labficat.test",
  "password": "NuevaClave1"
}
```

| Campo | Reglas |
|---|---|
| `nombre` | 3 a 120 (obligatorio) |
| `email` | válido (obligatorio) |
| `password` | opcional; si viene, mínimo 8 con al menos un número |

**Éxito (200):** mismo shape que `GET /me` con `mensaje: "Perfil actualizado correctamente"`.

**Errores:** 400 · 404 · 409 `"El email ya se encuentra registrado"`.

---

## 7. Usuarios (`/api/usuarios`) — solo rol `admin`

> Notas de contrato de este módulo (implementación preexistente):
> el listado incluye `__v` y `POST` devuelve además el hash `password`
> (`"$2a$10$..."`) — el frontend debe ignorarlo. `GET /:id` no existe.

### `GET /api/usuarios`

**Query:** `?rol=admin|encargado|usuario` y `?q=texto` (busca en nombre y email).

**Éxito (200):**

```json
{
  "ok": true,
  "mensaje": "Usuarios obtenidos correctamente",
  "datos": [
    {
      "_id": "6ad8b15a548cffe8bc35ac97",
      "nombre": "Usuario Demo",
      "email": "demo@labficat.test",
      "rol": "usuario",
      "activo": true,
      "permiso_editar": false,
      "permiso_eliminar": false,
      "eliminado": false,
      "eliminado_por": null,
      "fecha_eliminacion": null,
      "fecha_creacion": "2026-10-21T12:34:34.465Z",
      "fecha_actualizacion": "2026-10-21T12:34:34.465Z",
      "__v": 0
    }
  ]
}
```

### `POST /api/usuarios` — crea **solo encargados**

**Request:**

```json
{ "nombre": "Encargado Prueba", "email": "encargado@labficat.test", "password": "Prueba123" }
```

`rol` es opcional pero, si se envía, debe ser `"encargado"` (400 en caso contrario:
`Solo se pueden crear encargados`).

**Éxito (200):**

```json
{
  "ok": true,
  "mensaje": "Encargado creado correctamente",
  "datos": {
    "_id": "6ad8b195548cffe8bc35ad01",
    "nombre": "Encargado Prueba",
    "email": "encargado@labficat.test",
    "password": "$2a$10$XpSrPtaDfSadka81DDWS7OxRQjLewkrMim8npK4KoXZJx/YOGLbu.",
    "rol": "encargado",
    "activo": true,
    "permiso_editar": false,
    "permiso_eliminar": false,
    "eliminado": false,
    "eliminado_por": null,
    "fecha_eliminacion": null,
    "fecha_creacion": "2026-10-21T12:35:33.619Z",
    "fecha_actualizacion": "2026-10-21T12:35:33.619Z"
  }
}
```

**Errores:** 400 · 401/403 · 409 `"El email ya se encuentra registrado"`.

### `PUT /api/usuarios/:id`

**Request:** `nombre` (3–120), `email` válido, `password` opcional (8+ con número),
`rol` opcional solo `encargado|usuario`.

**Éxito (200):** mismo shape que `POST` **sin** `password`, con
`mensaje: "Usuario actualizado correctamente"`.

### `PATCH /api/usuarios/:id/estado`

**Request:** `{ "activo": false }`

**Éxito (200):**

```json
{
  "ok": true,
  "mensaje": "Estado actualizado correctamente",
  "datos": {
    "id": "6ad8b195548cffe8bc35ad01",
    "nombre": "Encargado Editado",
    "email": "encargado@labficat.test",
    "rol": "encargado",
    "activo": false
  }
}
```

**Errores:** 400 · 404 `"Usuario no encontrado"` · 400 `"No puede desactivar su propia cuenta"`.

---

## 8. Clientes (`/api/clientes`)

### Shape de cliente

```json
{
  "_id": "6ad8b15a548cffe8bc35ac9a",
  "nombre": "Alimentos Andinos S.A.S.",
  "tipo_documento": "NIT",
  "numero_documento": "900123456-2",
  "email": "compras@alimentosandinos.co",
  "telefono": "6014445566",
  "direccion": "Carrera 7 # 40 - 62, Bogota",
  "tipo_cliente": "externo",
  "eliminado": false,
  "eliminado_por": null,
  "fecha_eliminacion": null,
  "fecha_creacion": "2026-10-21T12:32:54.502Z",
  "fecha_actualizacion": "2026-10-21T12:32:54.502Z"
}
```

| Campo | Tipo | Reglas |
|---|---|---|
| `nombre` | string | 3–120, obligatorio |
| `tipo_documento` | string | `CC` \| `NIT` \| `CE` \| `TI`, default `CC` |
| `numero_documento` | string | hasta 20, obligatorio, **único** |
| `email` | string | obligatorio, se normaliza a minúsculas |
| `telefono` | string | hasta 20, default `""` |
| `direccion` | string | hasta 200, default `""` |
| `tipo_cliente` | string | `interno` \| `externo`, obligatorio |

### `GET /api/clientes`

**Query:** `?q=texto` (nombre, email o documento) · `?tipo=interno|externo`.
Orden: `fecha_creacion` descendente.

```json
{
  "ok": true,
  "mensaje": "Clientes obtenidos correctamente",
  "datos": [ { "_id": "6ad8b15a548cffe8bc35ac9a", "nombre": "Cliente Prueba Smoke", "tipo_documento": "CC", "numero_documento": "SMOKE-001", "email": "smoke@cliente.test", "telefono": "3001112233", "direccion": "Calle 1 # 2-3", "tipo_cliente": "externo", "eliminado": false, "eliminado_por": null, "fecha_eliminacion": null, "fecha_creacion": "2026-10-21T12:34:34.553Z", "fecha_actualizacion": "2026-10-21T12:34:34.553Z" } ]
}
```

### `GET /api/clientes/:id`

**Éxito (200):** `{ "ok": true, "mensaje": "Cliente obtenido correctamente", "datos": { ...cliente } }`
**Errores:** 404 `"Cliente no encontrado"`.

### `POST /api/clientes`

**Request:**

```json
{
  "nombre": "Cliente Prueba Smoke",
  "tipo_documento": "CC",
  "numero_documento": "SMOKE-001",
  "email": "smoke@cliente.test",
  "telefono": "3001112233",
  "direccion": "Calle 1 # 2-3",
  "tipo_cliente": "externo"
}
```

`tipo_documento` es opcional (default `CC`); `telefono` y `direccion` opcionales (default `""`).

**Éxito (200):** `mensaje: "Cliente creado correctamente"` + `datos` = objeto cliente.

**Errores:** 400 `Datos invalidos` + `errores[]` · 409 `"El numero de documento ya se encuentra registrado"`.

### `PUT /api/clientes/:id`

Mismo payload que `POST` (todos los campos principales obligatorios). No modifica
`eliminado*` ni fechas.

**Éxito (200):** `mensaje: "Cliente actualizado correctamente"`.
**Errores:** 400 · 404 · 409 (documento tomado por otro cliente).

### `DELETE /api/clientes/:id` — borrado lógico

**Éxito (200):**

```json
{
  "ok": true,
  "mensaje": "Cliente eliminado correctamente",
  "datos": { "_id": "6ad8b15a548cffe8bc35ac9a", "nombre": "Cliente Prueba Smoke", "eliminado": true, "eliminado_por": "admin@labficat.test", "fecha_eliminacion": "2026-10-21T12:40:00.000Z", "...": "resto de campos del cliente" }
}
```

**Errores:** 404 · 409 `"No se puede eliminar un cliente con solicitudes registradas"`.

---

## 9. Parámetros de análisis (`/api/parametros`)

### Shape de parámetro

```json
{
  "_id": "6ad8b15a548cffe8bc35ac9f",
  "nombre": "Analisis de humedad",
  "descripcion": "Contenido de humedad por metodo de secado en estufa",
  "precio": 25000,
  "unidad": "%",
  "activo": true,
  "eliminado": false,
  "eliminado_por": null,
  "fecha_eliminacion": null,
  "fecha_creacion": "2026-10-21T12:32:54.615Z",
  "fecha_actualizacion": "2026-10-21T12:32:54.615Z"
}
```

| Campo | Tipo | Reglas |
|---|---|---|
| `nombre` | string | hasta 100, obligatorio, **único** (catálogo) |
| `descripcion` | string | hasta 2000, obligatorio |
| `precio` | number | ≥ 0, obligatorio (COP) |
| `unidad` | string | hasta 20, default `""` (ej. `%`, `cP`, `pH`) |
| `activo` | boolean | default `true`; `false` lo oculta del catálogo |

### `GET /api/parametros`

**Query:** `?q=texto` (nombre o descripción) · `?activo=true|false`.
Orden: `nombre` ascendente.

```json
{
  "ok": true,
  "mensaje": "Parametros de analisis obtenidos correctamente",
  "datos": [ { "_id": "6ad8b15a548cffe8bc35ac9f", "nombre": "Analisis de humedad", "descripcion": "Contenido de humedad por metodo de secado en estufa", "precio": 25000, "unidad": "%", "activo": true, "eliminado": false, "eliminado_por": null, "fecha_eliminacion": null, "fecha_creacion": "2026-10-21T12:32:54.615Z", "fecha_actualizacion": "2026-10-21T12:32:54.615Z" } ]
}
```

### `GET /api/parametros/:id`

200 con `mensaje: "Parametro de analisis obtenido correctamente"` · 404
`"Parametro de analisis no encontrado"`.

### `POST /api/parametros`

**Request:**

```json
{ "nombre": "Parametro Smoke", "descripcion": "Parametro creado por el smoke test", "precio": 15000, "unidad": "%" }
```

**Éxito (200):** `mensaje: "Parametro de analisis creado correctamente"` + objeto parámetro.

**Errores:** 400 · 409 `"El nombre del parametro ya se encuentra registrado"`.

### `PUT /api/parametros/:id`

Mismo payload que `POST`. `activo` opcional.

**Éxito (200):** `mensaje: "Parametro de analisis actualizado correctamente"`.

### `PATCH /api/parametros/:id/estado` — activar/desactivar catálogo

**Request:** `{ "activo": false }`

**Éxito (200):** `mensaje: "Estado actualizado correctamente"` + objeto parámetro completo.
**Errores:** 400 (`activo` debe ser booleano) · 404.

### `DELETE /api/parametros/:id` — borrado lógico

**Éxito (200):** `mensaje: "Parametro de analisis eliminado correctamente"` + objeto con `eliminado: true`.
**Errores:** 404 · 409 `"No se puede eliminar un parametro utilizado en cotizaciones"`.

---

## 10. Solicitudes (`/api/solicitudes`)

### Shape de solicitud (respuesta)

```json
{
  "_id": "6ad8b15a548cffe8bc35aca3",
  "cliente": {
    "_id": "6ad8b15a548cffe8bc35ac9a",
    "nombre": "Cliente Prueba Smoke",
    "numero_documento": "SMOKE-001",
    "email": "smoke@cliente.test",
    "tipo_cliente": "externo"
  },
  "tipo_cliente": "externo",
  "descripcion": "Solicitud generada por el smoke test",
  "prioridad": "alta",
  "atencion_inmediata": true,
  "motivo_atencion_inmediata": "Prueba de flujo completo",
  "estado": "enviada",
  "eliminado": false,
  "eliminado_por": null,
  "fecha_eliminacion": null,
  "fecha_creacion": "2026-10-21T12:34:34.604Z",
  "fecha_actualizacion": "2026-10-21T12:34:34.620Z"
}
```

> `cliente` viene **poblado** con `_id, nombre, numero_documento, email, tipo_cliente`.

| Campo | Tipo | Reglas |
|---|---|---|
| `cliente` | string (id) | obligatorio en request; en respuesta es objeto poblado |
| `tipo_cliente` | string | se **deriva del cliente** (`interno`/`externo`); no hace falta enviarlo |
| `descripcion` | string | hasta 2000, obligatorio |
| `prioridad` | string | `baja` \| `media` \| `alta`, default `media` |
| `atencion_inmediata` | boolean | default `false` |
| `motivo_atencion_inmediata` | string | hasta 300; **obligatorio si `atencion_inmediata: true`** |
| `estado` | string | `borrador` \| `enviada` \| `aprobada`, default `borrador` |

### `GET /api/solicitudes`

**Query:** `?q=texto` (en descripción) · `?cliente=<id>` · `?estado=borrador|enviada|aprobada`
· `?prioridad=baja|media|alta`. Orden: `fecha_creacion` descendente.

```json
{
  "ok": true,
  "mensaje": "Solicitudes obtenidas correctamente",
  "datos": [ { "_id": "6ad8b15a548cffe8bc35aca3", "cliente": { "_id": "6ad8b15a548cffe8bc35ac9a", "nombre": "Cliente Prueba Smoke", "numero_documento": "SMOKE-001", "email": "smoke@cliente.test", "tipo_cliente": "externo" }, "tipo_cliente": "externo", "descripcion": "Solicitud generada por el smoke test", "prioridad": "alta", "atencion_inmediata": true, "motivo_atencion_inmediata": "Prueba de flujo completo", "estado": "enviada", "eliminado": false, "eliminado_por": null, "fecha_eliminacion": null, "fecha_creacion": "2026-10-21T12:34:34.604Z", "fecha_actualizacion": "2026-10-21T12:34:34.620Z" } ]
}
```

**Errores:** 400 si `cliente` no es un id válido (`"El cliente no es valido"`).

### `GET /api/solicitudes/:id`

200 con `mensaje: "Solicitud obtenida correctamente"` · 404 `"Solicitud no encontrada"`.

### `POST /api/solicitudes`

**Request:**

```json
{
  "cliente": "6ad8b15a548cffe8bc35ac9a",
  "descripcion": "Analisis de humedad para lote de harina",
  "prioridad": "alta",
  "atencion_inmediata": true,
  "motivo_atencion_inmediata": "El cliente exige resultados antes del cierre del mes"
}
```

Se crea **siempre** en `estado: "borrador"`. `prioridad` y `atencion_inmediata`
son opcionales; `tipo_cliente` se toma del cliente.

**Éxito (200):** `mensaje: "Solicitud creada correctamente"` + objeto solicitud (cliente poblado).

**Errores:**
- 400 `Datos invalidos` + `errores[]` (ej. `{"campo":"motivo_atencion_inmediata","msg":"El motivo de atencion inmediata es obligatorio"}`)
- 404 `"Cliente no encontrado"`.

### `PUT /api/solicitudes/:id`

Mismo payload que `POST` (`cliente` obligatorio). No cambia `estado`.

**Éxito (200):** `mensaje: "Solicitud actualizada correctamente"`.
**Errores:** 400 · 404 (solicitud o cliente).

### `PATCH /api/solicitudes/:id/estado`

**Request:** `{ "estado": "enviada" }` (valores: `borrador|enviada|aprobada`)

**Éxito (200):** `mensaje: "Estado de la solicitud actualizado correctamente"` + objeto solicitud.

**Errores:**
- 400 `{"campo":"estado","msg":"Estado de solicitud no valido"}` si el valor no es del catálogo.
- 400 `"Transicion de estado no permitida: de \"aprobada\" a \"enviada\""` si la flecha no existe.
- 404.

### `DELETE /api/solicitudes/:id` — borrado lógico

**Éxito (200):** `mensaje: "Solicitud eliminada correctamente"` + objeto con `eliminado: true`.
**Errores:** 404 · 409 `"No se puede eliminar una solicitud con cotizaciones o muestras registradas"`.

---

## 11. Cotizaciones (`/api/cotizaciones`)

### Shape de cotización (respuesta)

```json
{
  "_id": "6ad8b15a548cffe8bc35acad",
  "solicitud": {
    "_id": "6ad8b15a548cffe8bc35aca3",
    "cliente": {
      "_id": "6ad8b15a548cffe8bc35ac9a",
      "nombre": "Cliente Prueba Smoke",
      "numero_documento": "SMOKE-001",
      "tipo_cliente": "externo"
    },
    "prioridad": "alta",
    "estado": "enviada",
    "fecha_creacion": "2026-10-21T12:34:34.604Z"
  },
  "numero": 1,
  "items": [
    {
      "parametro": { "_id": "6ad8b15a548cffe8bc35ac9f", "nombre": "Parametro Smoke", "precio": 15000, "unidad": "%" },
      "descripcion": "Parametro Smoke",
      "cantidad": 3,
      "precio_unitario": 15000,
      "subtotal": 45000
    }
  ],
  "subtotal": 45000,
  "total": 53550,
  "estado": "aceptada",
  "eliminado": false,
  "eliminado_por": null,
  "fecha_eliminacion": null,
  "fecha_creacion": "2026-10-21T12:34:34.637Z",
  "fecha_actualizacion": "2026-10-21T12:34:34.675Z"
}
```

> `solicitud` viene poblado **con su `cliente` anidado**; `items[].parametro` viene poblado
> con `_id, nombre, precio, unidad`.

| Campo | Tipo | Reglas |
|---|---|---|
| `numero` | number | consecutivo único asignado por el servidor (1, 2, 3…) |
| `items` | array | mínimo 1 ítem |
| `items[].parametro` | string (id) | obligatorio; debe existir y no estar eliminado |
| `items[].cantidad` | number | entero ≥ 1 |
| `items[].precio_unitario` | number | ≥ 0; **si no se envía se toma el precio del catálogo** |
| `items[].descripcion` | string | hasta 200; si no se envía se usa el nombre del parámetro |
| `subtotal` | number | calculado por el servidor = Σ (cantidad × precio_unitario) |
| `total` | number | calculado por el servidor = `subtotal × 1.19` (IVA 19%), redondeado a 2 decimales |
| `estado` | string | `borrador` \| `enviada` \| `aceptada` \| `rechazada`, default `borrador` |

### `GET /api/cotizaciones`

**Query:** `?solicitud=<id>` · `?estado=borrador|enviada|aceptada|rechazada`.
Orden: `fecha_creacion` descendente.

```json
{
  "ok": true,
  "mensaje": "Cotizaciones obtenidas correctamente",
  "datos": [ { "_id": "6ad8b15a548cffe8bc35acad", "solicitud": { "...": "..." }, "numero": 1, "items": [ { "...": "..." } ], "subtotal": 45000, "total": 53550, "estado": "aceptada", "eliminado": false, "eliminado_por": null, "fecha_eliminacion": null, "fecha_creacion": "2026-10-21T12:34:34.637Z", "fecha_actualizacion": "2026-10-21T12:34:34.675Z" } ]
}
```

**Errores:** 400 si `solicitud` no es id válido (`"La solicitud no es valida"`).

### `GET /api/cotizaciones/:id`

200 con `mensaje: "Cotizacion obtenida correctamente"` · 404 `"Cotizacion no encontrada"`.

### `POST /api/cotizaciones`

**Request** (el `precio_unitario` es opcional por ítem):

```json
{
  "solicitud": "6ad8b15a548cffe8bc35aca3",
  "items": [
    { "parametro": "6ad8b15a548cffe8bc35ac9f", "cantidad": 2 },
    { "parametro": "6ad8b15a548cffe8bc35ac97", "cantidad": 1, "precio_unitario": 12000, "descripcion": "Prueba especial" }
  ]
}
```

Se crea en `estado: "borrador"` con `numero` consecutivo; `subtotal` y `total` se calculan
en el servidor (los valores enviados en el body se ignoran).

**Éxito (200):** `mensaje: "Cotizacion creada correctamente"` + objeto cotización completo.

**Errores:**
- 400 `Datos invalidos` (`items` vacío → `"Debe enviar al menos un item"`; cantidad 0 →
  `"La cantidad debe ser un numero entero mayor o igual a 1"`).
- 404 `"Solicitud no encontrada"` o `"Uno o mas parametros de analisis no fueron encontrados"`.
- 409 `"No fue posible asignar el numero de la cotizacion"` (colisión extrema de concurrencia).

### `PUT /api/cotizaciones/:id`

**Solo en estado `borrador`.** Reemplaza los ítems y recalcula totales; **no** cambia la
solicitud asociada ni el estado.

**Request:**

```json
{ "items": [ { "parametro": "6ad8b15a548cffe8bc35ac9f", "cantidad": 3 } ] }
```

**Éxito (200):** `mensaje: "Cotizacion actualizada correctamente"` + objeto cotización.
**Errores:** 400 · 404 · 409 `"Solo se pueden editar cotizaciones en borrador"`.

### `PATCH /api/cotizaciones/:id/estado`

**Request:** `{ "estado": "enviada" }` (valores: `borrador|enviada|aceptada|rechazada`)

**Éxito (200):** `mensaje: "Estado de la cotizacion actualizado correctamente"` + objeto cotización.
**Errores:** 400 (valor fuera de catálogo o `"Transicion de estado no permitida..."`) · 404.

### `DELETE /api/cotizaciones/:id` — borrado lógico

**Éxito (200):** `mensaje: "Cotizacion eliminada correctamente"` + objeto con `eliminado: true`.
**Errores:** 404 · 409 `"Solo se pueden eliminar cotizaciones en borrador"`.

---

## 12. Muestras (`/api/muestras`)

### Shape de muestra (respuesta)

```json
{
  "_id": "6ad8b15a548cffe8bc35acca",
  "solicitud": { "_id": "6ad8b15a548cffe8bc35aca3", "prioridad": "alta", "estado": "enviada", "fecha_creacion": "2026-10-21T12:34:34.604Z" },
  "cliente": { "_id": "6ad8b15a548cffe8bc35ac9a", "nombre": "Cliente Prueba Smoke", "numero_documento": "SMOKE-001", "tipo_cliente": "externo" },
  "nombre_muestra": "Harina de trigo",
  "descripcion": "Muestra lote 2026-A",
  "tipo_fisico": "solido",
  "cantidad": 250,
  "unidad": "g",
  "estado": "finalizada",
  "motivo_rechazo": "",
  "parametros": [ { "_id": "6ad8b15a548cffe8bc35ac9f", "nombre": "Parametro Smoke", "precio": 15000, "unidad": "%" } ],
  "ubicacion": "Refrigerador 1",
  "eliminado": false,
  "eliminado_por": null,
  "fecha_eliminacion": null,
  "fecha_recepcion": "2026-10-21T12:34:34.727Z",
  "fecha_creacion": "2026-10-21T12:34:34.727Z",
  "fecha_actualizacion": "2026-10-21T12:34:34.754Z",
  "codigo": "0001-2026",
  "codigo_seguimiento": "8f5f96357c8c9da8bb7607d98e35cb2a"
}
```

> `solicitud` y `cliente` vienen poblados; `parametros` es un arreglo de parámetros
> poblados (`_id, nombre, precio, unidad`). `codigo` y `codigo_seguimiento` **pueden
> no existir** (`undefined`) mientras la muestra no haya sido aceptada: en ese caso el
> campo no aparece en el JSON.

| Campo | Tipo | Reglas |
|---|---|---|
| `solicitud` | string (id) | obligatorio |
| `cliente` | string (id) | **derivable**: si no se envía se toma el de la solicitud; si se envía debe coincidir (400 si difiere) |
| `nombre_muestra` | string | hasta 150, obligatorio |
| `descripcion` | string | hasta 2000, obligatorio |
| `tipo_fisico` | string | `solido` \| `liquido`, obligatorio |
| `cantidad` | number | ≥ 0, obligatorio |
| `unidad` | string | `g` \| `ml`, obligatorio |
| `parametros` | array de ids | opcional; todos deben existir y estar activos en el catálogo |
| `ubicacion` | string | hasta 150, default `""` |
| `estado` | string | `pendiente` \| `aceptada` \| `rechazada` \| `en_analisis` \| `finalizada`, default `pendiente` |
| `motivo_rechazo` | string | hasta 300; obligatorio al rechazar |
| `codigo` | string | solo servidor: `0042-2026`, único, generado al aceptar |
| `codigo_seguimiento` | string | solo servidor: 32 hex, único, generado al aceptar |
| `fecha_recepcion` | date | default fecha actual |

### `GET /api/muestras`

**Query:** `?q=texto` (busca en `codigo`, `codigo_seguimiento` y `nombre_muestra`) ·
`?estado=...` · `?solicitud=<id>` · `?cliente=<id>`. Orden: `fecha_recepcion` descendente.

```json
{
  "ok": true,
  "mensaje": "Muestras obtenidas correctamente",
  "datos": [ { "_id": "6ad8b15a548cffe8bc35acca", "solicitud": { "...": "..." }, "cliente": { "...": "..." }, "nombre_muestra": "Harina de trigo", "descripcion": "Muestra lote 2026-A", "tipo_fisico": "solido", "cantidad": 250, "unidad": "g", "estado": "finalizada", "motivo_rechazo": "", "parametros": [ { "...": "..." } ], "ubicacion": "Refrigerador 1", "eliminado": false, "eliminado_por": null, "fecha_eliminacion": null, "fecha_recepcion": "2026-10-21T12:34:34.727Z", "fecha_creacion": "2026-10-21T12:34:34.727Z", "fecha_actualizacion": "2026-10-21T12:34:34.754Z", "codigo": "0001-2026", "codigo_seguimiento": "8f5f96357c8c9da8bb7607d98e35cb2a" } ]
}
```

**Errores:** 400 si `solicitud`/`cliente` no son ids válidos.

### `GET /api/muestras/:id`

200 con `mensaje: "Muestra obtenida correctamente"` · 404 `"Muestra no encontrada"`.

### `POST /api/muestras` — recepción

**Request:**

```json
{
  "solicitud": "6ad8b15a548cffe8bc35aca3",
  "nombre_muestra": "Harina de trigo",
  "descripcion": "Muestra lote 2026-A",
  "tipo_fisico": "solido",
  "cantidad": 250,
  "unidad": "g",
  "parametros": ["6ad8b15a548cffe8bc35ac9f"],
  "ubicacion": "Refrigerador 1"
}
```

Se crea en `estado: "pendiente"` y **sin** código.

**Éxito (200):** `mensaje: "Muestra creada correctamente"` + objeto muestra.
**Errores:** 400 (`Datos invalidos`, `"El cliente no coincide con el cliente de la solicitud"`,
`"Uno o mas parametros de analisis no son validos"`) · 404 (`"Solicitud no encontrada"`).

### `PUT /api/muestras/:id`

Mismo payload que `POST`. Permite corregir datos y actualizar `ubicacion`; **no** modifica
`estado`, `motivo_rechazo`, `codigo` ni `codigo_seguimiento`.

**Éxito (200):** `mensaje: "Muestra actualizada correctamente"`.
**Errores:** 400 · 404.

### `PATCH /api/muestras/:id/estado`

**Request (aceptar):**

```json
{ "estado": "aceptada" }
```

**Request (rechazar):**

```json
{ "estado": "rechazada", "motivo_rechazo": "Empaque roto y sin identificacion" }
```

**Éxito (200):** `mensaje: "Estado de la muestra actualizado correctamente"` + objeto
muestra. Al aceptar, la respuesta incluye por primera vez `codigo` y `codigo_seguimiento`:

```json
{
  "ok": true,
  "mensaje": "Estado de la muestra actualizado correctamente",
  "datos": { "_id": "6ad8b15a548cffe8bc35acca", "estado": "aceptada", "codigo": "0001-2026", "codigo_seguimiento": "8f5f96357c8c9da8bb7607d98e35cb2a", "...": "resto de la muestra" }
}
```

**Errores:**
- 400 `{"campo":"estado","msg":"Estado de muestra no valido"}` (valor fuera de catálogo).
- 400 `{"campo":"estado","msg":"El motivo de rechazo es obligatorio al rechazar la muestra"}`.
- 400 `"Transicion de estado no permitida: de \"finalizada\" a \"aceptada\""`.
- 404.

### `DELETE /api/muestras/:id` — borrado lógico

**Éxito (200):** `mensaje: "Muestra eliminada correctamente"` + objeto con `eliminado: true`.
**Errores:** 404 · 409 `"Solo se pueden eliminar muestras pendientes"`.

---

## 13. Errores estándar (resumen para el interceptor/UI)

```json
// 400 validación express-validator
{ "ok": false, "mensaje": "Datos invalidos", "errores": [ { "campo": "cliente", "msg": "El cliente no es valido" }, { "campo": "descripcion", "msg": "La descripcion es obligatoria" } ] }

// 400 regla de negocio (transiciones)
{ "ok": false, "mensaje": "Transicion de estado no permitida: de \"aprobada\" a \"enviada\"" }

// 401
{ "ok": false, "mensaje": "Debe iniciar sesion para acceder" }

// 403
{ "ok": false, "mensaje": "No tiene permisos para realizar esta accion" }

// 404
{ "ok": false, "mensaje": "Cliente no encontrado" }

// 409
{ "ok": false, "mensaje": "El numero de documento ya se encuentra registrado" }

// 500
{ "ok": false, "mensaje": "Ocurrio un error en el servidor" }
```

**Recomendación para el frontend:** mostrar `mensaje` en pantalla y, si existe `errores`,
pintar cada `msg` junto a su `campo` (RNF-009/RNF-014: sin redirecciones a páginas de error).

---

## 14. Semilla de datos (`npm run seed`)

`backend/scripts/seed.js` es **idempotente** (puede ejecutarse varias veces). Crea:

| Dato | Detalle |
|---|---|
| Administrador | desde `ADMIN_NOMBRE`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` del `.env` (rol `admin`, permisos en `true`) |
| 5 parámetros | `Analisis de humedad` (25000), `Cenizas totales` (30000), `Proteina cruda` (45000), `Viscosidad` (38000), `pH` (20000) |
| 3 clientes | `Centro de Formacion SENA` (interno), `Alimentos Andinos S.A.S.` y `Laboratorio Universitario Ltda` (externos) |
| 3 solicitudes | en estados `borrador`, `enviada` y `aprobada` (una con atención inmediata) |

Valores por defecto usados en el `.env` de desarrollo:

```
ADMIN_EMAIL=admin@labficat.test
ADMIN_PASSWORD=Admin2026!
```

---

## 15. Checklist de integración para el frontend

1. Cliente HTTP con `baseURL = '/api'` (proxy) o `http://localhost:3000/api`.
2. Interceptor de request: `headers['Authorization'] = 'Bearer ' + token` (clave `lab_token`).
3. Interceptor de respuesta: en **401** limpiar sesión → `/login`; en **403** mostrar `mensaje`.
4. Todas las respuestas se leen con `res.data.ok`, `res.data.mensaje`, `res.data.datos`.
5. Los listados son **arreglos** (`Array.isArray(datos)`), sin paginación.
6. Al crear: se espera HTTP 200 (no 201).
7. Estados a pintar con indicadores:
   - solicitudes: `borrador` (gris) · `enviada` (azul) · `aprobada` (verde)
   - cotizaciones: `borrador` (gris) · `enviada` (azul) · `aceptada` (verde) · `rechazada` (rojo)
   - muestras: `pendiente` (gris) · `aceptada` (azul) · `en_analisis` (naranja) · `finalizada` (verde) · `rechazada` (rojo)
8. Los `PATCH .../estado` devuelven el recurso completo actualizado: usar `datos` para
   refrescar la tabla sin volver a consultar.
