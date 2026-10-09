# 🗄️ Modelo de datos · De las 25 tablas MySQL a colecciones de MongoDB

> **Para qué sirve:** `TABLAS MYSQL LABORATORIO.txt` tiene el diseño de **25
> tablas relacionales**, pero los requerimientos **prohíben MySQL**: RNF-001
> obliga a *Node.js + Express + MongoDB Atlas* y RNF-016 obliga a operar dentro
> del **plan gratuito M0**. Este documento traduce ese diseño a MongoDB **sin
> perder ninguna regla de negocio**, y explica **por qué** cada decisión.

---

## 1. Reglas de traducción

| En MySQL | En MongoDB | Por qué |
|---|---|---|
| `FOREIGN KEY` | `ObjectId` + `.populate()` | Mongo no tiene claves foráneas: se referencia y se trae después |
| `ENUM(...)` | `String` + `enum` en Mongoose | Se valida en la aplicación, no en el motor |
| `DATETIME` | `Date` de JavaScript | Un solo tipo de fecha en todo el sistema |
| `DECIMAL(12,2)` dinero | `Decimal128` | Evita errores de coma flotante en totales y facturas |
| `LONGBLOB` (PDF, adjuntos) | `Buffer` | RNF-016: los archivos van **dentro de la misma BD** |
| `AUTO_INCREMENT` | `ObjectId` automático | Mongo genera el id |
| `eliminado BOOLEAN` | `eliminado: Boolean` | **Borrado lógico** (RNF-015): nunca se borra físico |
| `INDEX idx_...` | `schema.index({...})` | RNF-013: los campos de código **deben estar indexados** |
| Tabla de consecutivos | Colección `secuencias` + `$inc` atómico | El código `0042-2026` debe ser único sin condiciones de carrera |

---

## 2. Mapa: 25 tablas → 18 colecciones

Se pasó de 25 tablas a **18 colecciones** embebiendo las hijas pequeñas y de
vida ligada a su padre. Eso **reduce llamadas** y **ahorra espacio** en un plan
de solo 512 MB.

| # | Tabla MySQL | Colección MongoDB | Decisión | Motivo |
|---|---|---|---|---|
| 1 | `usuarios` | **`usuarios`** | 📁 independiente | Raíz de autenticación |
| 2 | `auditorias` | **`auditorias`** | 📁 independiente | Append-only, crece para siempre |
| 3 | `secuencias` | **`secuencias`** | 📁 independiente | Necesita atomicidad (`$inc`) |
| 4 | `clientes` | **`clientes`** | 📁 independiente | Raíz: tiene solicitudes, muestras, encuestas |
| 5 | `solicitudes` | **`solicitudes`** | 📁 independiente | Raíz del módulo comercial |
| 6 | `parametros_analisis` | **`parametros_analisis`** | 📁 independiente | Catálogo compartido |
| 7 | `cotizaciones` | **`cotizaciones`** | 📁 independiente | Raíz |
| 7b | `cotizacion_items` | → ⚓ **embebido** en `cotizaciones.items` | ⚓ embeber | Solo existe dentro de su cotización; nunca se consulta solo |
| 8 | `pagos` | **`pagos`** | 📁 independiente | Se consulta por estado y fecha |
| 9 | `muestras` | **`muestras`** | 📁 independiente | Corazón del sistema |
| 10 | `muestra_parametros` | → ⚓ **embebido** en `muestras.parametros` | ⚓ embeber | Es una lista de ids, no aporta campos |
| 11 | `analisis_muestras` | **`analisis_muestras`** | 📁 independiente | Consultado por muestra **y** por parámetro; guarda repeticiones |
| 12 | `eventos_trazabilidad` | **`eventos_trazabilidad`** | 📁 independiente | Append-only; podría quedarse corto en 512 MB |
| 13 | `cambios_fecha` | **`cambios_fecha`** | 📁 independiente | Historial que crece y se audita aparte |
| 14 | `incidencias` | **`incidencias`** | 📁 independiente | Raíz |
| 15 | `incidencia_acciones` | → ⚓ **embebido** en `incidencias.acciones` | ⚓ embeber | Bitácora corta y siempre se lee con su incidencia |
| 16 | `respuestas_incidencias` | **`respuestas_incidencias`** | 📁 independiente | Puede traer adjuntos pesados |
| 17 | `respuesta_archivos` | → ⚓ **embebido** en `respuestas_incidencias.archivos` | ⚓ embeber | Máximo 3 por respuesta, validado en backend |
| 18 | `disposiciones` | → ⚓ **embebido** en `muestras.disposicion` | ⚓ embeber | Es **1:1 estricto** (`UNIQUE`) |
| 19 | `informes` | **`informes`** | 📁 independiente | Versiones con PDF; se consulta por versión |
| 20 | `encuestas` | **`encuestas`** | 📁 independiente | Raíz accesible por token |
| 21 | `encuesta_respuestas` | → ⚓ **embebido** en `encuestas.respuestas` | ⚓ embeber | Son **4 preguntas fijas**, tamaño conocido |
| 22 | `facturas` | **`facturas`** | 📁 independiente | Raíz |
| 23 | `factura_historial` | → ⚓ **embebido** en `facturas.historial` | ⚓ embeber | Bitácora corta de la misma factura |
| 24 | `notificaciones` | **`notificaciones`** | 📁 independiente | Cola de envío con reintentos |
| 25 | *( tabla puente N:M )* | → ⚓ en `muestras.parametros` y `cotizaciones.items` | ⚓ embeber | Ya no hace falta tabla puente |

**Resultado: 18 colecciones.**

---

## 3. Reglas de negocio que NO se pierden

| Regla | Requisito | Dónde vive en Mongo |
|---|---|---|
| Borrado **lógico** nunca físico | RNF-015 | `eliminado`, `eliminado_por`, `fecha_eliminacion` en toda colección |
| Toda modificación deja rastro | RNF-006 | Hook `pre('findOneAndUpdate')` que escribe en `auditorias` |
| Historial inmutable | RNF-005 | `eventos_trazabilidad` y `auditorias` **solo insertan** |
| Código `0042-2026` único | RF-026, RF-027 | Índice `unique` + colección `secuencias` con `$inc` atómico |
| Código de seguimiento impredecible | RF-075 | 32 caracteres aleatorios, `unique` e **indexado** |
| Consulta pública **< 2 segundos** | RNF-013 | `index({ codigo_seguimiento: 1 })` |
| Máximo 3 adjuntos por respuesta | RF-070 | Validación en backend + `maxlength` |
| PDF y adjuntos dentro de la BD | RNF-016 | `Buffer` (ojo: come de los 512 MB) |
| Respaldos manuales | RNF-008 | `mongodump` → `docs/04_MONGODB_ATLAS.md` §7 |
| Validación de integridad | RNF-009 | `required` en Mongoose + validación en controller |
| Permisos edición / solo lectura | RF-049 | `usuarios.permiso_editar`, `permiso_eliminar` |

---

## 4. Estados del sistema (los ENUM)

Se mantienen **idénticos** a los de MySQL. Son el corazón del flujo.

```
solicitudes.estado   : pendiente | cotizada | aceptada | pagada | rechazada

muestras.estado      : ingresada | en_proceso | en_analisis | resultados_validados
                     | cerrada | rechazada | en_almacen | devuelta | desechada

muestras.estado_recepcion : pendiente | aceptada | rechazada

cotizaciones.estado  : borrador | enviada | envio_fallido | aceptada | rechazada

pagos.estado         : pendiente | confirmado | fallido

incidencias.tipo     : informativa | demora | requiere_accion_cliente
incidencias.estado   : abierta | en_revision | esperando_cliente | aprobada | cerrada

informes.estado      : borrador | generado | disponible | enviado

facturas.estado      : pendiente | generada | enviada | anulada | error

notificaciones.estado: pendiente | enviada | fallida   (máx. 3 intentos)

usuarios.rol         : admin | encargado | usuario
```

> ⚠️ **Transición crítica (RF-058):** el estado de la muestra **no** avanza a
> `en_proceso` si el pago está pendiente y la solicitud es externa. Esa regla
> vive en el **controller**, no en la BD.

---

## 5. Relaciones principales

```
usuarios ──(email)──> auditorias
   │
   └──< (1:N) crea/actúa sobre todo

clientes ──< solicitudes ──< cotizaciones ──< pagos
    │            │                │              │
    │            │                └──< items ⚓  └──< facturas ──< historial ⚓
    │            │
    │            └──< facturas
    │
    └──< muestras ──┬── parametros ⚓  (N:M)
                    ├── disposicion ⚓ (1:1)
                    ├──< eventos_trazabilidad
                    ├──< cambios_fecha
                    ├──< analisis_muestras ──> parametros_analisis
                    ├──< incidencias ──┬── acciones ⚓
                    │                  └──< respuestas ──< archivos ⚓
                    ├──< informes
                    └──< encuestas ──< respuestas ⚓

parametros_analisis ──< analisis_muestras / cotizaciones
notificaciones ──> muestras, clientes
secuencias (técnica): 'cotizaciones', 'muestras-2026', 'informes-2026'
```

---

## 6. Índices obligatorios (RNF-013)

| Colección | Índice | Para qué |
|---|---|---|
| `muestras` | `{ codigo: 1 }` unique | Búsqueda por código de muestra |
| `muestras` | `{ codigo_seguimiento: 1 }` unique | **Consulta pública < 2 s** |
| `muestras` | `{ estado: 1, fecha_recepcion: -1 }` | Inventario y listados |
| `muestras` | `{ solicitud_id: 1 }`, `{ cliente_id: 1 }` | Navegación |
| `muestras` | `{ disposicion.pendiente: 1 }` | Aviso de conservación vencida |
| `eventos_trazabilidad` | `{ muestra_id: 1, visible_cliente: 1, fecha: 1 }` | Historial público |
| `solicitudes` | `{ estado: 1, fecha_creacion: -1 }` | Panel de trabajo |
| `clientes` | `{ numero_documento: 1 }` unique | Búsqueda de cliente |
| `usuarios` | `{ email: 1 }` unique | Login |
| `pagos` | `{ estado: 1, fecha_creacion: -1 }` | Pagos pendientes |
| `notificaciones` | `{ estado: 1, fecha_programada: 1 }` | Cola de envío |

---

## 7. ⚠️ Advertencia de espacio (plan M0 · 512 MB)

| Qué ocupa | Riesgo |
|---|---|
| `informes.archivo` (PDF) | Un PDF de 1 MB × 200 informes = **200 MB** |
| `respuesta_archivos.contenido` | Adjuntos de los clientes |
| `muestras.rotulo_pdf` | Rótulos impresos |
| `eventos_trazabilidad` | Crecimiento lineal para siempre |

**Decisiones tomadas:**
1. **Límite máximo por archivo** definido en backend (ej. 3 MB) que rechaza con
   mensaje claro, tal como exige RNF-016.
2. El rótulo se **genera bajo demanda** en vez de guardarlo siempre.
3. `eventos_trazabilidad` y `auditorias` se monitorean con `db.stats()`.
4. Respaldo manual con `mongodump` al cerrar cada fase (RNF-008).

---

## 8. Cómo se documenta esto en el backend

Cada colección genera un archivo en `backend/src/models/`:

```
backend/src/models/
├── Usuario.js
├── Auditoria.js
├── Secuencia.js
├── Cliente.js
├── Solicitud.js
├── ParametroAnalisis.js
├── Cotizacion.js
├── Pago.js
├── Muestra.js
├── AnalisisMuestra.js
├── EventoTrazabilidad.js
├── CambioFecha.js
├── Incidencia.js
├── RespuestaIncidencia.js
├── Informe.js
├── Encuesta.js
├── Factura.js
└── Notificacion.js
```

**Ejemplo — `Usuario.js`** (RF-049, RNF-003, RNF-004):

```js
import mongoose from 'mongoose'

const usuarioSchema = new mongoose.Schema({
  nombre:      { type: String, required: true, trim: true, maxlength: 120 },
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, required: true },     // hash bcrypt, NUNCA texto plano
  rol:         { type: String, enum: ['admin', 'encargado', 'usuario'], required: true },
  activo:      { type: Boolean, default: true },
  permiso_editar:   { type: Boolean, default: false },
  permiso_eliminar: { type: Boolean, default: false },
  // RNF-015 — borrado lógico
  eliminado:          { type: Boolean, default: false },
  eliminado_por:      { type: String, default: null },
  fecha_eliminacion:  { type: Date, default: null },
}, { timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' } })

usuarioSchema.index({ email: 1 }, { unique: true })

export default mongoose.model('Usuario', usuarioSchema)
```

**Ejemplo — `Muestra.js` (extracto, el más importante del sistema):**

```js
const muestraSchema = new mongoose.Schema({
  solicitud_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Solicitud', required: true },
  cliente_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente',   required: true },
  nombre_muestra: { type: String, required: true, maxlength: 150 },
  tipo_fisico:  { type: String, enum: ['solido', 'liquido'], required: true },
  cantidad:     { type: mongoose.Schema.Types.Decimal128, required: true, min: 0 },
  unidad:       { type: String, enum: ['g', 'ml'], required: true },
  codigo:           { type: String, unique: true, sparse: true },  // '0042-2026'
  codigo_seguimiento:{ type: String, unique: true, sparse: true }, // 32 chars aleatorios
  estado:       { type: String, enum: ['ingresada','en_proceso','en_analisis',
      'resultados_validados','cerrada','rechazada','en_almacen','devuelta','desechada'],
      default: 'ingresada' },
  parametros:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'ParametroAnalisis' }], // antes tabla puente
  disposicion:  { type: disposicionSchema, default: null },        // antes tabla 1:1
  // RNF-015
  eliminado: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' } })

muestraSchema.index({ codigo_seguimiento: 1 }, { unique: true })
muestraSchema.index({ codigo: 1 }, { unique: true })
muestraSchema.index({ estado: 1, fecha_recepcion: -1 })
```

---

## 9. ✅ APLICADO EN ATLAS (2026-10-09)

El equipo entregó el documento **`colecciones mongodb.txt`** en la raíz del
proyecto: un script de `mongosh` que crea las 18 colecciones con
**validadores `$jsonSchema`** e índices. Se aplicó tal cual.

### Cómo se ejecutó

`mongosh` no estaba instalado, así que se creó
`backend/scripts/crearColecciones.mjs`, que reproduce el entorno del script
(`db`, `use`, `print`) con el driver oficial de MongoDB.

```bash
cd backend
npm run colecciones   # aplica colecciones mongodb.txt
npm run seed          # ← OBLIGATORIO después: el script borra "usuarios"
```

> ⚠️ **Línea 19 del documento original:**
> `if (db.getCollectionNames().includes(nombre)) db[nombre].drop();`
> Borra la colección si ya existe. Por eso hay que volver a correr el seed.

### Resultado

**18 colecciones creadas**, todas con sus índices:

| Colección | Índices |
|---|---|
| `muestras` | `codigo` (unique), `codigo_seguimiento` (unique), `solicitud_id`, `cliente_id`, `estado+fecha_recepcion`, `pendiente_disposicion` |
| `usuarios` | `email` (unique) |
| `clientes` | `numero_documento` (unique) |
| `solicitudes` | `estado+fecha_creacion`, `cliente_id` |
| `cotizaciones` | `numero` (unique), `solicitud_id` |
| `pagos` | `referencia` (unique), `solicitud_id`, `cotizacion_id`, `estado+fecha_creacion` |
| `analisis_muestras` | `muestra_id+parametro_id+numero_ejecucion` (unique), `muestra_id` |
| `eventos_trazabilidad` | `muestra_id`, `muestra_id+visible_cliente+fecha` |
| `incidencias` | `muestra_id` |
| `informes` | `numero_informe` (unique), `muestra_id` |
| `encuestas` | `token` (unique), `muestra_id` |
| `facturas` | `numero` (unique), `solicitud_id`, `pago_id` |
| `notificaciones` | `muestra_id`, `cliente_id`, `estado+fecha_programada` |
| `disposiciones` | `muestra_id` (unique) |
| `parametros_analisis` | `nombre` (unique) |
| `cambios_fecha` | `muestra_id` |
| `auditorias` | `entidad+entidad_id`, `fecha_creacion` |
| `secuencias` | `_id` |

Índices de `codigo` y `codigo_seguimiento` con `partialFilterExpression`, para
permitir `null` antes de que la muestra reciba su código **sin romper el
`unique`** — y al mismo tiempo cumplir **RNF-013** (consulta pública < 2 s).

### Verificación

| Prueba | Resultado |
|---|---|
| Colecciones creadas | ✅ 18 |
| Login con validador `strict` activo | ✅ `{"ok":true,"mensaje":"Inicio de sesion exitoso"}` |
| `npm run seed` restauró el admin | ✅ |

### Diferencias respecto al diseño MySQL

| MySQL | `colecciones mongodb.txt` | Impacto |
|---|---|---|
| `rotulo_pdf LONGBLOB` | `rotulo_pdf_id` → **GridFS** | RNF-016: PDF fuera de la colección, no infla los documentos |
| `archivo LONGBLOB` (informes) | `archivo_id` → **GridFS** | Ídem |
| `contenido LONGBLOB` (adjuntos) | `archivo_id` → **GridFS** | Ídem, respeta el máximo de 3 archivos |
| Tabla `muestra_parametros` | `muestras.parametros_ids[]` | Una tabla puente menos |
| Tabla `disposiciones` | sigue **separada** y 1:1 con `unique` | Coincide con el diseño original |
| `incidencia_acciones`, `respuestas_*` | **embebidos** en `incidencias` | Menos consultas |
| `cotizacion_items` | **embebido** en `cotizaciones.items` | Menos consultas |
| `encuesta_respuestas` | **embebido** en `encuestas.respuestas` | 4 preguntas fijas |
| `factura_historial` | **embebido** en `facturas.historial` | Bitácora corta |

---

## 10. Pendiente

- [ ] Recibir las colecciones si el equipo ya tiene una versión propia y
      contrastarla con este documento
- [ ] Generar los 18 archivos de modelos en `backend/src/models/` (Fase 1.2)
- [ ] Definir el límite exacto de MB por archivo adjunto
