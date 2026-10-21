# Frontend — LAB_FICAT

Interfaz web del **Sistema de Gestión para el Servicio de Análisis de Laboratorio (SENA — FICAT)**.

- **Stack:** Vue 3 + Vite + Quasar 2 + Vue Router + Pinia + Axios.
- **Contrato HTTP (fuente de verdad):** [`../API.md`](../API.md). Todas las llamadas salen de
  `src/services/api.js`; no se consume ningún endpoint que no esté documentado allí.

---

## 1. Instalación

```bash
cd frontend
npm install
```

## 2. Variables de entorno (`.env`)

Opcional: en desarrollo **no hace falta crear `.env`** — basta con levantar el
backend en el puerto 3100, porque el cliente usa `/api` y Vite lo proxya hacia
`http://localhost:3100` (`vite.config.js` → `server.proxy`, sin CORS — API.md §1).
Si quieres apuntar a otro backend, copia y ajusta el ejemplo:

```bash
cp .env.example .env
```

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL base **con `/api`** del backend (opcional). Si **no** existe: en `npm run dev` se usa `/api` (proxy de Vite, sin CORS); en `npm run build` se usa `http://localhost:3100/api`. | `http://localhost:3100/api` |

## 3. Scripts

| Comando | Descripción |
|---|---|
| `npm install` | Instala dependencias |
| `npm run dev` | Servidor de desarrollo Vite (puerto **5173**; si está ocupado sube al siguiente) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción |

## 4. Levantar el backend (requisito previo)

```bash
cd ../backend
npm install
npm run seed                 # semilla idempotente: admin + datos de prueba
PORT=3100 npm start          # API en http://localhost:3100
```

Credenciales del seed (también se muestran en la pantalla de login):

```
admin@labficat.test / Admin2026!
```

Verificación rápida del backend:

```bash
curl http://localhost:3100/api/health   # {"ok":true,"mensaje":"API funcionando"}
```

Requisitos: Node.js 18+ y MongoDB local corriendo (`mongodb://127.0.0.1:27017/labficat`,
configurable en `backend/.env` → `MONGO_URI`).

## 5. Arranque completo

```bash
# Terminal 1 (backend en 3100)
cd backend && npm run seed && PORT=3100 npm start

# Terminal 2 (frontend en 5173)
cd frontend && npm run dev
```

Abrir <http://localhost:5173>.

## 6. Estructura

```
frontend/
├── index.html
├── vite.config.js            # plugin Vite de Quasar
├── .env.example              # VITE_API_URL
├── src/
│   ├── main.js               # createApp + Quasar + Pinia + Router
│   ├── App.vue
│   ├── layouts/
│   │   └── MainLayout.vue    # barra superior (usuario + logout) y menu lateral
│   ├── pages/
│   │   ├── auth/Login.vue
│   │   ├── inicio/InicioPage.vue        # dashboard con contadores
│   │   ├── clientes/ClientesPage.vue
│   │   ├── solicitudes/SolicitudesPage.vue
│   │   ├── cotizaciones/CotizacionesPage.vue
│   │   ├── muestras/MuestrasPage.vue
│   │   ├── parametros/ParametrosPage.vue
│   │   └── Error404.vue
│   ├── router/index.js       # rutas + guards (sin token → /login)
│   ├── stores/auth.js        # Pinia: token + perfil en localStorage
│   ├── services/api.js       # axios: baseURL, Authorization: Bearer, 401 → logout
│   ├── components/           # EstadoChip, ErrorBanner
│   └── utils/                # session.js (lab_token) y format.js
```

## 7. Sesión y errores (API.md §2 y §13)

- El token JWT se guarda en `localStorage` con la clave **`lab_token`** y se adjunta como
  `Authorization: Bearer <token>` en cada petición.
- Ante un **401** el interceptor limpia la sesión y el guard del router redirige a `/login`.
- Los mensajes del backend (`mensaje` y `errores[]`) se muestran en pantalla tal cual
  (sin redirecciones a páginas de error externas).
