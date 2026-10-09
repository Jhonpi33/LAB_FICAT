# ⚙️ Backend · Node.js + Express + Mongoose

> **Para qué sirve este documento:** explicar qué es el backend, cómo está
> armado y por qué cada decisión. Es la base sobre la que León va a construir
> los endpoints de las fases siguientes.

---

## 1. Qué es y por qué hace falta

Hasta hoy la app era una **demostración**: `src/services/laboratory.js` leía
datos falsos de `src/mocks/data.js`. No había servidor ni base de datos.

```
ANTES                              AHORA
┌─────────────┐                    ┌─────────────┐      ┌──────────────┐
│  Vue (5174) │─── datos falsos ──▶│  mocks/data  │      │  Vue (5174)  │
└─────────────┘                    └──────────────┘      └──────┬───────┘
                                                               │ HTTP (Axios)
                                                               ▼
                                                        ┌──────────────┐
                                                        │ API Express  │ ← backend (4000)
                                                        │  (León)      │
                                                        └──────┬───────┘
                                                               │ Mongoose
                                                               ▼
                                                        ┌──────────────┐
                                                        │MongoDB Atlas │ ← los datos reales
                                                        └──────────────┘
```

**Requisitos que obligan a esto:**
- **RNF-001** → «Node.js y Express para el backend, y MongoDB/MongoDB Atlas para el almacenamiento»
- **RNF-002** → arquitectura cliente-servidor
- **RNF-009** → «el backend debe realizar nuevamente las validaciones» (no basta validar en el navegador)

---

## 2. Estructura creada

```
backend/
├── .env                🔒 credenciales (IGNORADO por git)
├── .env.example        plantilla sin secretos (SÍ sube)
├── package.json        dependencias y scripts
├── node_modules/       (ignorado)
└── src/
    ├── server.js       arranque, CORS, rutas, manejo de errores
    ├── smoke.js        prueba de escritura/lectura contra Atlas
    └── config/
        └── db.js       conexión a MongoDB Atlas
```

### Archivos

| Archivo | Qué hace | Para qué |
|---|---|---|
| `src/config/db.js` | `mongoose.connect(process.env.MONGO_URI)` | Un solo lugar para la conexión; si falla, no se arranca |
| `src/server.js` | Express + CORS + JSON + `/api/health` + 404 + manejador de errores | El esqueleto donde León irá agregando rutas |
| `src/smoke.js` | Crea, lee, actualiza, reconecta y verifica persistencia | Comprobar que la BD **realmente** guarda, no solo que conecta |

---

## 3. Decisiones tomadas y su justificación

| Decisión | Por qué | Requisito |
|---|---|---|
| `type: "module"` (import/export) | Igual que el frontend; código más limpio | — |
| Puerto **4000** para la API | Vite ya usa 5174; deben ser distintos | — |
| `cors()` habilitado | Sin esto el navegador bloquea las respuestas entre puertos | RNF-002 |
| `express.json({ limit: '2mb' })` | Evita cuerpos gigantes que agoten los 512 MB de Atlas | RNF-016 |
| El servidor **no arranca** si falla la BD | Si no, respondería datos inexistentes | RNF-007, RNF-009 |
| `/api/health` devuelve el estado de la BD | Comprobación rápida para León y para las pruebas | — |
| 404 y errores devuelven **JSON con mensaje claro** | Los errores van en pantalla, sin redirigir a páginas de error | RNF-014 |
| Sin `nodemon` en producción | Es solo para desarrollo | — |

---

## 4. Comandos

```bash
cd backend
npm install          # instalar dependencias
npm run dev          # desarrollo, reinicia al guardar (nodemon)
npm start            # producción
node src/smoke.js    # probar que la BD guarda de verdad
```

**Verificación esperada:**

```
✅ MongoDB Atlas conectado · laboratorio
🚀 API escuchando en http://localhost:4000
```

```bash
curl http://localhost:4000/api/health
{"ok":true,"bd":"conectada","proyecto":"Sistema de Gestión de Análisis de Laboratorio","timestamp":"..."}
```

---

## 5. Resultado de la prueba real (`smoke.js`)

```
1. Conectado a Atlas
2. Creado : 6ac9598d3e20acae0ea76c86
3. Leído  : muestra-0042-2026
4. Update : muestra-0043-2026
5. Tras reconectar: el dato persistió ✅
6. Colecciones en la BD: (ninguna)
✅ TODAS LAS PRUEBAS PASARON
```

Punto 6 es correcto: la colección de prueba se eliminó al finalizar, así que
la BD está **limpia y lista** para los 18 modelos reales.

---

## 6. Vulnerabilidades detectadas

`npm audit` reporta **3 altas**, todas provenientes de `braces` → `chokidar` →
**`nodemon`**.

| Dato | Valor |
|---|---|
| ¿Afecta producción? | **No**: `nodemon` es `devDependencies` |
| Fix automático | `npm audit fix --force` instalaría `nodemon@1.14.10` (más viejo y peor) |
| **Decisión** | **No aplicar `--force`**. Se monitorea y se actualiza nodemon cuando publiquen versión corregida |

---

## 7. Próximos pasos (los hace León)

| # | Tarea | Requisito |
|---|---|---|
| 1 | Los **18 modelos Mongoose** de `docs/02_MODELO_DATOS_MONGODB.md` | RNF-001, RNF-009 |
| 2 | **Auth**: registro/login, `bcryptjs` + `jsonwebtoken` | RNF-003, RNF-004 |
| 3 | **Middleware de roles**: `admin`, `encargado`, `usuario` + permisos editar/eliminar | RF-049, RF-050 |
| 4 | **Auditoría** automática en cada escritura | RNF-006 |
| 5 | **Borrado lógico** (`eliminado: true`), nunca físico | RNF-015 |
| 6 | **Seed** de usuarios y catálogo de parámetros | RF-030 |
| 7 | Conectar el login de Vue con Axios | RNF-003 |
| 8 | Consulta pública por código con **índice** | RF-075, RNF-013 |
