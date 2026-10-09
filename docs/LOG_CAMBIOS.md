# 📒 LOG DE CAMBIOS · Bitácora del proyecto

> Cada entrada explica **qué** se hizo, **cómo** y **para qué**.
> Orden cronológico inverso (lo más nuevo arriba).

---

## 2026-10-09 · Entrada 004 — Se crearon las 18 colecciones en Atlas

### Qué se hizo
1. Se aplicó el documento del equipo **`colecciones mongodb.txt`** contra Atlas.
2. Se crearon las **18 colecciones** con sus validadores `$jsonSchema` e índices.
3. Se creó `backend/scripts/crearColecciones.mjs` y el comando `npm run colecciones`.
4. Se restauró el usuario administrador y se verificó el login.

### Cómo se hizo
- El documento es un script de **`mongosh`**, que no estaba instalado en la
  máquina. En vez de instalarlo, se creó un ejecutor en Node que reproduce el
  entorno que el script espera (`db`, `use`, `print`) con el driver oficial.
- **Primer intento falló** con `NamespaceExists`: el script original lanza las
  operaciones sin orden y `createCollection("usuarios")` llegó **antes** que su
  `drop()`. Se corrigió encadenando las operaciones en una cola secuencial.
- Se renombró a `.mjs` porque `backend/package.json` es CommonJS (proyecto de
  León) y el script usa `import`.
- Al terminar, se ejecutó `npm run seed`: la línea 19 del documento
  (`db[nombre].drop()`) **borra `usuarios`** y con ella el admin.
- Se eliminó `pruebas`, colección residual de una prueba anterior.

### Para qué se hizo
Para que el modelo de datos deje de ser un diseño en papel y pase a existir
físicamente en Atlas con sus reglas de integridad. Sin esto, el backend no
tiene dónde guardar nada.

### Resultados
| Verificación | Resultado |
|---|---|
| Colecciones creadas | ✅ **18** |
| Índices de `muestras` | ✅ `codigo` y `codigo_seguimiento` únicos con `partialFilterExpression` |
| Validador `strict` en `usuarios` | ✅ activo |
| `npm run seed` | ✅ Admin restaurado |
| Login con validadores activos | ✅ `Inicio de sesion exitoso` |
| Colección residual `pruebas` | ✅ eliminada |

### ⚠️ Avisos
| Aviso | Detalle |
|---|---|
| **El script borra colecciones existentes** | Línea 19 de `colecciones mongodb.txt`. Tras cada ejecución hay que correr `npm run seed` |
| GridFS | `rotulo_pdf_id`, `archivo_id` (informes) y `archivo_id` (adjuntos) apuntan a GridFS, no guardan bytes en la colección — respeta RNF-016 |
| BD todavía vacía | Solo existe el usuario admin. Las 18 colecciones tienen **0 documentos** |

### Pendiente de esta entrada
- [ ] Sembrar clientes, solicitudes, parámetros de análisis y una muestra de prueba
- [ ] Reemplazar `src/services/laboratory.js` (mocks) por llamadas a la API
- [ ] Ampliar el seed con las 3 cuentas de demostración

---

## 2026-10-09 · Entrada 003 — Se integró el trabajo de León y el login real

### Qué se hizo
1. Se trajo el repositorio de León (`github.com/Jhonpi33/LAB_FICAT`).
2. Se fusionó su `backend/` completo (94 archivos) con el frontend visual existente.
3. Se conectó la pantalla de login con la API real (**Fase 1.8**).
4. Se verificó el ciclo completo de autenticación contra Atlas.
5. Se documentó en `docs/06_AUTENTICACION_LOGIN.md`.

### Cómo se hizo
- Los dos repositorios tenían **historias sin base común**, así que no era un
  `git pull` normal: se hizo
  `git merge leon/main --allow-unrelated-histories -X theirs`.
  - `-X theirs` → en los conflictos de contenido **prevalece León** (él hizo
    el backend real).
  - Los archivos solo-existente-local (`docs/`, `src/`, `TABLAS…`, `.gitignore`)
    **se conservan automáticamente**.
- Se borraron los archivos míos de prueba reemplazados por los de León:
  `backend/src/config/db.js` y `backend/src/smoke.js`.
- `backend/.env` se reescribió con las variables que León exige
  (`PORT`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES`, `FRONTEND_URL`, `ADMIN_*`).
- Se instaló `axios` en el frontend y se creó `src/services/api.js`.

### Para qué se hizo
Para dejar de duplicar trabajo y para que la validación de usuario ocurra en
el servidor. Un login validado en el navegador no protege nada (RNF-003).

### Resultados
| Verificación | Resultado |
|---|---|
| Backend arranca y conecta Atlas | ✅ `MongoDB Atlas: conexion establecida` |
| `npm run seed` | ✅ Admin creado en Atlas |
| `POST /api/auth/login` | ✅ devuelve JWT |
| `GET /api/auth/me` con token | ✅ sesión activa |
| `GET /api/auth/me` sin token | ✅ **HTTP 401** |
| CORS para `localhost:5174` | ✅ |
| Login desde el navegador | ✅ → `/app/panel`, *«Buen día, Encargado»* |

### ⚠️ Aviso: qué sigue siendo falso
El **login es real**, pero el **panel todavía lee `src/mocks/data.js`**
(Muestras activas, Cola de muestras, etc.). Sigue siendo Fase pendiente.

### Pendiente de esta entrada
- [ ] Colecciones reales de muestras/clientes y reemplazar `laboratory.js`
- [ ] Ampliar `backend/scripts/seed.js` con las 3 cuentas de demostración
- [ ] Push a GitHub (pendiente de decisión del equipo)
- [ ] Arreglar `GUIA_ARRANQUE.md`: dice puerto 5173, el real es 5174

---

## 2026-10-09 · Entrada 002 — Cluster de Atlas creado y backend conectado

### Qué se hizo
1. Se creó el cluster **`ClusterLaboratorio`** (plan **M0, $0/hour**) en MongoDB Atlas.
2. Se habilitó el acceso de red **`0.0.0.0/0` permanente** para el equipo.
3. Se creó la estructura del backend (`backend/`) con Express + Mongoose.
4. Se verificó la conexión y la **persistencia real** de los datos.
5. Se documentó en `docs/05_BACKEND_EXPRESS.md`.

### Cómo se hizo
- Cluster creado desde la consola de Atlas dentro de la sesión:
  `Deploy your cluster` → se corrigió el plan por defecto (**M10 a $0.08/hora**
  → **M0 a $0/hour**) y la región (México → **N. Virginia us-east-1**).
- Credenciales generadas por Atlas: usuario `jhonpimiento31_db_user`.
- Conexión probada con `backend/src/smoke.js`, que crea, lee, actualiza,
  **se desconecta, reconecta** y confirma que el dato persistió.

### Para qué se hizo
Para que el frontend deje de leer `src/mocks/data.js` y empiece a leer y
escribir datos reales. Sin esto ninguna fase posterior es posible.

### Resultados
| Verificación | Resultado |
|---|---|
| `GET /api/health` | `{"ok":true,"bd":"conectada"}` ✅ |
| Crear / leer / actualizar en Atlas | ✅ |
| Persistir tras reconectar | ✅ |
| `.env` no se sube a Git | ✅ `git check-ignore` lo confirma |
| Acceso para León, Joymar y Jaunda | ✅ `0.0.0.0/0` permanente |

### ⚠️ Avisos
| Aviso | Detalle |
|---|---|
| Plan correcto | El formulario proponía **M10 ($0.08/hora)**; si se creaba tal cual habría cobro. Se cambió a **M0 $0** antes de crear |
| Sin respaldos automáticos | El plan M0 no los trae → `mongodump` manual (RNF-008) |
| 512 MB | PDF y adjuntos deben tener límite de tamaño (RNF-016) |
| `npm audit` | 3 altas en `braces`/`chokidar`, **solo de `nodemon`** (dev). No se aplicó `--force` porque instalaría nodemon más viejo |

### Pendiente de esta entrada
- [ ] 18 modelos Mongoose (Fase 1.2)
- [ ] Auth con JWT (Fase 1.4)
- [ ] Conectar login y seguimiento del frontend (Fase 1.8 y 1.9)

---

## 2026-10-09 · Entrada 001 — Conocimiento base y plan de fases

### Qué se hizo
1. Se analizó `REQUERIMIENTOS_LABORATORIO.docx` completo (ERS IEEE 830).
2. Se localizó y leyó `TABLAS MYSQL LABORATORIO.txt` (25 tablas).
3. Se revisó el estado actual del código (`src/`).
4. Se crearon los documentos `docs/00`, `docs/01` y `docs/03`.
5. Se creó el `.gitignore` del proyecto.

### Cómo se hizo
- Extracción del `.docx` con `textutil -convert txt -stdout` para poder
  buscar y numerar los requisitos sin abrir Word.
- Extracción de la lista exacta de requisitos con
  `grep -o "^RF-[0-9]*: .*"`, lo que confirmó **RF-001 → RF-112** y
  **RNF-001 → RNF-019** en los **11 módulos**.
- Lectura de `src/router/index.js`, `src/services/laboratory.js` y
  `src/stores/auth.js` para entender qué existe hoy.

### Para qué se hizo
Para tener un conocimiento único y verificable antes de planificar. El plan de
fases no se puede armar «a ojo»: tiene que cubrir los 112 RF y 19 RNF, o el
proyecto se entrega incompleto.

### Hallazgos
| Hallazgo | Impacto |
|---|---|
| El frontend es **100 % mock** (`src/mocks/data.js` + `services/laboratory.js`) | No hay backend ni BD: todo hay que construirlo |
| El repo Git está en `/Users/jhonpimiento` (94 GB) con **0 archivos trackeados** | 🔴 El proyecto no está versionado; `git add .` subiría 94 GB |
| No existía `.gitignore` | Riesgo de subir `node_modules/` y el `.env` con la contraseña de Atlas |
| Los requerimientos obligan a **MongoDB Atlas** (RNF-001, RNF-016) | Las 25 tablas MySQL son **diseño de referencia**, hay que traducirlas a colecciones |
| El puerto real de Vite es **5174**, no 5173 como dice `GUIA_ARRANQUE.md` | `GUIA_ARRANQUE.md` queda desactualizado |

### Lo que queda pendiente de esta entrada
- [ ] Corregir la ubicación del repositorio Git (Fase 0.1)
- [ ] Crear el cluster Atlas M0 (Fase 1.1)
- [ ] Recibir las colecciones en formato MongoDB del equipo
