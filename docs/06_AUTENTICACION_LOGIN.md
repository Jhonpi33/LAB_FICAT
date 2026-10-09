# 🔑 Autenticación y login · Integración frontend ↔ backend

> **Qué se hizo:** conectar la pantalla de login que ya existía con el backend
> real de León, para que iniciar sesión valide contra **MongoDB Atlas** y no
> contra una lista de usuarios falsa en el navegador.

---

## 1. El problema que se resolvía

**Antes:** `src/stores/auth.js` tenía un objeto `accounts` hardcodeado:

```js
const accounts = {
  'lab@sena.edu.co': { password: 'Laboratorio2026', ... },
  ...
}
```

Cualquiera que abriera las herramientas del navegador podía leer esas
contraseñas. Además **no existían usuarios reales**: era una simulación.
Esto violaba **RNF-003** (seguridad de acceso) y **RNF-004** (protección de la
información).

**Ahora:** el login hace `POST /api/auth/login`, el backend compara el hash con
`bcryptjs` en Atlas y devuelve un **JWT**. El navegador solo guarda el token.

---

## 2. Cómo funciona

```
LoginPage.vue
   │  email + contraseña
   ▼
stores/auth.js → signIn()  ──POST /api/auth/login──▶  backend (4000)
   │                                                      │
   │                                          bcrypt compara hash
   │                                                      │
   │◀────────────── { token, usuario } ───────────────────┘
   │
   ├─ token → sessionStorage ('lab-token')
   └─ usuario → sessionStorage ('lab-user')

Peticiones siguientes:
   api.js interceptor  →  Authorization: Bearer <token>
   backend middleware  →  verifica firma  →  401 si no sirve
```

---

## 3. Archivos creados o modificados

| Archivo | Qué se hizo | Para qué |
|---|---|---|
| `src/services/api.js` | **Nuevo** — cliente Axios con interceptor de token y traductor de errores | RNF-001/RNF-002: la única puerta de salida hacia el backend |
| `src/stores/auth.js` | **Reescrito** — `signIn()` ahora es `async` y llama a la API | Eliminar las contraseñas en el navegador |
| `src/pages/LoginPage.vue` | `login()` con `await` + botón con `loading` | Que no se envíe dos veces mientras responde el servidor |
| `package.json` | `npm install axios` | Cliente HTTP |

**Se conservó intacta** toda la interfaz que ya usaban las vistas:
`auth.user`, `auth.errorMessage`, `canEdit`, `isAdmin`, `isClient`,
`deniedSections`, `canAccessSection()`, `ownsRecord()`, `setSimulatedRole()`.
Por eso el resto del frontend siguió funcionando sin tocarlo.

---

## 4. Traducción de roles

El backend maneja `admin | encargado | usuario`. La interfaz ya trabajaba con
`admin | editor | reader`. Se traduce en un solo lugar (`auth.js`) para no
reescribir las vistas:

| Backend | Interfaz | `permiso_editar` | `permiso_eliminar` |
|---|---|---|---|
| `admin` | `admin` | ✅ | ✅ |
| `encargado` | `editor` | según BD | según BD |
| `usuario` | `reader` | ❌ | ❌ |

> **`canEdit` ahora sale de `permiso_editar` en la base de datos**, no de una
> constante. Eso es exactamente lo que pide **RF-049** (control de permisos de
> edición).

---

## 5. Verificación realizada

| Prueba | Resultado |
|---|---|
| `POST /api/auth/login` con credenciales del seed | ✅ devuelve JWT + usuario |
| `GET /api/auth/me` con el token | ✅ `{"ok":true,"mensaje":"Sesion activa"}` |
| `GET /api/auth/me` **sin** token | ✅ **HTTP 401** |
| CORS desde `http://localhost:5174` | ✅ `Access-Control-Allow-Origin` correcto |
| Login desde el navegador | ✅ redirige a `/app/panel` con token en sessionStorage |
| Saludo del panel | ✅ *«Buen día, Encargado»* — nombre que viene de Atlas |

---

## 6. ⚠️ Qué sigue siendo simulado (importante)

El **login es real**, pero el **contenido del panel todavía no**:

| Elemento | ¿Real? | Por qué |
|---|---|---|
| Login / sesión / permisos | ✅ **Real** | contra Atlas + JWT |
| «Muestras activas 3», «Pagos pendientes 1»… | ❌ Mock | siguen en `src/mocks/data.js` |
| Cola de muestras `0042-2026` | ❌ Mock | aún no hay colección `muestras` |
| Consulta pública de seguimiento | ❌ Mock | Fase pendiente |

**Esto es lo siguiente:** crear las colecciones reales y reemplazar
`src/services/laboratory.js` (que lee mocks) por llamadas a la API, igual que
se hizo con el login.

---

## 7. Cuentas disponibles en la BD

| Correo | Contraseña | Rol |
|---|---|---|
| `lab@sena.edu.co` | `Laboratorio2026` | admin |

Se creó con `npm run seed` en `backend/`.

> Las otras dos cuentas que muestra la pantalla (`admin@sena.edu.co`,
> `lectura@sena.edu.co`) **aún no existen en Atlas**: si se usan, el backend
> responderá «El correo o la contraseña no coinciden». Hay que ampliar
> `backend/scripts/seed.js`.
