# FASES DEL PROYECTO — Sistema de Gestión para el Servicio de Análisis de Laboratorio

**Stack:** Frontend HTML, CSS, JavaScript, Vue 3, VueRouter y Quasar · Backend JavaScript (Node.js + Express + Mongoose + axios) · MongoDB Atlas (plan M0) · Factus API (entorno sandbox).

**Referencias:** REQUERIMIENTOS_LABORATORIO(2).docx (RF-001 a RF-112, RNF-001 a RNF-019) y CREACION_TABLAS_BD.md.

---

## RUTA A — BACKEND (`backend/`)

Formato de cada fase: **Objetivo · Tareas · Entregables · Criterio de verificación**.

### Fase B1 — Configuración del proyecto
- **Objetivo:** Tener el proyecto Node.js inicializado con sus dependencias y variables de entorno.
- **Tareas:**
  1. `npm init` y definir scripts (`dev`, `start`, `test`).
  2. Instalar dependencias: express, mongoose, dotenv, cors, helmet, jsonwebtoken, bcryptjs, express-validator, axios, nodemailer, pdfkit.
  3. Instalar dependencias de desarrollo: nodemon, jest, supertest.
  4. Diseñar `.env.example` (MONGO_URI, PORT, JWT_SECRET/EXPIRES, FACTUS_ENV/CLIENT_ID/CLIENT_SECRET/URL, SMTP_GMAIL_*, MAX_FILE_MB, IVA).
  5. Configurar `.gitignore` (node_modules, .env, respaldos).
- **Entregables:** `package.json`, `.env.example`, `.gitignore`.
- **Criterio de verificación:** `npm install` sin errores y `npm run dev` arranca sin código (proceso vivo).

### Fase B2 — Conexión y arranque
- **Objetivo:** Servidor Express corriendo y conectado a MongoDB Atlas.
- **Tareas:**
  1. `config/env.js`: cargar y validar variables; bloquear arranque si `FACTUS_ENV ≠ sandbox` (RNF-017).
  2. `config/database.js`: conexión Mongoose a Atlas con manejo de errores.
  3. `config/gridfs.js`: buckets `informes`, `rotulos`, `adjuntos`.
  4. `config/constants.js`: enums del SQL, `MAX_FILE_MB` (RNF-016), IVA 19%.
  5. `app.js` (middlewares globales, `/api/health`) y `server.js` (escucha + cierre limpio).
- **Entregables:** servidor respondiendo en `/api/health`.
- **Criterio de verificación:** respuesta 200 en `/api/health` y mensaje claro si Atlas no responde (RNF-014).

### Fase B3 — Modelos de MongoDB
- **Objetivo:** Modelar las 25 tablas del SQL en 18 colecciones con índices y borrado lógico.
- **Tareas:**
  1. Modelos: Usuario, Auditoria, Secuencia, Cliente, Solicitud, ParametroAnalisis, Cotizacion (embed `items[]`), Pago, Muestra, AnalisisMuestra, EventoTrazabilidad, CambioFecha, Incidencia (embed `acciones[]`, `respuestas[]`), Disposicion, Informe, Encuesta (embed `respuestas[]`), Factura (embed `documento` e `historial[]`), Notificacion.
  2. Índices únicos: `codigo` y `codigo_seguimiento` de muestras, `numero_documento` de clientes, `numero` (cotizaciones/facturas/informes), `referencia` de pagos, `token` de encuestas, `numero` de usuarios; índice único (muestra, parámetro, número_ejecución) en análisis.
  3. Índices compuestos: (estado, fecha) en solicitudes/facturas/notificaciones, (muestra, visible_cliente, fecha) en eventos, `pendiente_disposicion` en muestras (RNF-013).
  4. Campos de borrado lógico `eliminado/eliminado_por/fecha_eliminacion` con middleware de filtro (RNF-015).
  5. Validaciones de esquema (RNF-009) y `timestamps` (fecha_creacion/actualizacion).
- **Entregables:** 18 modelos con sus índices.
- **Criterio de verificación:** las colecciones se crean en Atlas y los índices únicos rechazan duplicados.

### Fase B4 — Seguridad y middlewares
- **Objetivo:** API protegida con autenticación, permisos, validación y auditoría.
- **Tareas:**
  1. `auth.js`: JWT (login emite token, middleware valida sesión) — RNF-003.
  2. `roles.js`: roles `admin|encargado|usuario` + flags `permiso_editar/eliminar` (RF-049, RF-050).
  3. `validar.js`: express-validator en todos los POST/PUT (RNF-009).
  4. `audit.js`: registra `antes/después`, usuario e IP en `auditorias` (RNF-006, RF-051).
  5. `errorHandler.js`: mensajes de error en pantalla sin fugar detalles (RNF-014).
  6. CORS y helmet restringidos al origen del frontend.
- **Entregables:** rutas protegidas responden 401/403 sin token.
- **Criterio de verificación:** sin token no se accede a funciones internas (RNF-003); toda acción sensible deja registro en auditorías.

### Fase B5 — Servicios transversales
- **Objetivo:** utilidades comunes listas para ser usadas por todos los módulos.
- **Tareas:**
  1. `secuencias.service.js`: consecutivos atómicos (`0042-2026`, RF-026/027) con `findOneAndUpdate $inc`.
  2. `codigoSeguimiento.js`: hex impredecible de 32 caracteres y token de encuesta de 48.
  3. `fechasHabiles.js`: cálculo de cierre + 7 días hábiles (RF-092) y fechas estimadas.
  4. `email.service.js`: nodemailer con cuenta Gmail (RNF-019), configurable por variable.
  5. `pdf.service.js`: pdfkit para rótulos (RF-031/032) e informes (RF-095).
  6. `notificaciones.service.js`: cola con máximo 3 intentos por notificación (RF-112).
  7. `responses.js`: formato único de respuesta éxito/error.
- **Entregables:** servicios unitarios probados.
- **Criterio de verificación:** pruebas de consecutivo único, fecha hábil y PDF generado sin errores.

### Fase B6 — Módulos CRUD base
- **Objetivo:** operaciones CRUD completas de los módulos 1 y catálogos.
- **Tareas:**
  1. `auth` (registro/login/refresh de usuarios internos).
  2. `usuarios` (lista, edición, desactivación, permisos).
  3. `clientes` (RF-001 a RF-005: crear, editar, tipo interno/externo, borrado lógico).
  4. `parametros` (catálogo RF-030 con precios).
  5. `solicitudes` (RF-003, RF-009, RF-013, RF-014: prioridad y atención inmediata).
  6. `cotizaciones` (RF-006 a RF-008: generar, enviar por correo, registrar aceptación).
  7. `pagos` (RF-010 a RF-012: pago simulado con referencia única, estados).
- **Entregables:** endpoints CRUD con validación, autorización y auditoría.
- **Criterio de verificación:** pruebas supertest por módulo (crear → consultar → editar → borrado lógico → verificar auditoría).

### Fase B7 — Módulo de muestras
- **Objetivo:** cubrir recepción, identificación, rótulo e inventario (RF-015 a RF-039).
- **Tareas:**
  1. Registro de recepción vinculada a solicitud y cliente (RF-015 a RF-018).
  2. Advertencia si cantidad < 300 g/ml sin bloquear; cantidades mayores permitidas (RF-019, RF-020).
  3. Verificación física, aceptación/rechazo con motivo obligatorio (RF-021 a RF-025).
  4. Generación automática de código consecutivo-año y código de seguimiento (RF-026 a RF-028).
  5. Asociación de parámetros de análisis (RF-029) y catálogo.
  6. Rótulo: generación de PDF en GridFS e impresión (RF-031, RF-032).
  7. Inventario: ingreso, ubicación y clasificación (RF-033 a RF-039).
- **Entregables:** flujo completo de recepción hasta inventario.
- **Criterio de verificación:** una muestra aceptada queda con código único, rótulo PDF y ubicación; rechazada conserva motivo y estado.

### Fase B8 — Procesamiento, trazabilidad, fechas e incidencias
- **Objetivo:** módulos 4, 5 y 6 del ERS (RF-040 a RF-073).
- **Tareas:**
  1. Estados de muestra y bloqueo de inicio sin pago confirmado (RF-040 a RF-042, RF-057, RF-058).
  2. Eventos de trazabilidad cronológicos con fecha/hora y visibilidad para el cliente (RF-043 a RF-048).
  3. Correcciones con registro histórico (RF-047, RF-048, RF-051).
  4. Resultados por parámetro, validación y repeticiones con motivo (RF-052 a RF-056).
  5. Cambios de fecha con motivo interno y motivo público (RF-059 a RF-062).
  6. Incidencias: tipos, acciones, respuestas del cliente con hasta 3 adjuntos en GridFS, aprobación (RF-063 a RF-073); nunca cambia estado de muestra automáticamente.
  7. Cierre del proceso (RF-056) y fecha límite de conservación.
- **Entregables:** ciclo completo desde ingreso hasta resultados validados y cierre.
- **Criterio de verificación:** el historial de eventos no se puede modificar ni borrar (RNF-005, RNF-006).

### Fase B9 — Cierre del servicio: disposiciones, informes y encuestas
- **Objetivo:** módulos 8 y 9 (RF-074 a RF-098).
- **Tareas:**
  1. Disposición devolución/desecho 1:1 con motivo y notificación (RF-074 a RF-091).
  2. Control de conservación de 7 días hábiles y aviso previo (RF-092, RF-093).
  3. Informes: generación desde resultados validados, PDF en GridFS, versionado `regenerado_de`, estados borrador→enviado (RF-094 a RF-097).
  4. Encuestas: token público de 48 caracteres, 4 preguntas 1-5 (RF-098).
- **Entregables:** cierre de muestra con informe disponible y encuesta enviada.
- **Criterio de verificación:** PDF del informe descargable; muestra cerrada calcula fecha límite y queda `pendiente_disposicion`.

### Fase B10 — Facturación con Factus (sin DIAN productiva)
- **Objetivo:** RF-099 a RF-106 cumpliendo RNF-017.
- **Tareas:**
  1. `factusClient.js` con axios: POST `/oauth/token` (caché y refresh antes de expirar, 60 min), GET `/v2/numbering-ranges`, POST `/v2/bills/validate`.
  2. URL base exclusivamente `https://api-sandbox.factus.com.co`; `env.js` impide cualquier modo distinto de sandbox (nunca `api.factus.com.co`).
  3. `factusMapper.js`: cliente (CC→13, NIT→31), ítems de la cotización aceptada, `payment_details` del pago confirmado (contado), IVA 19%, `reference_code` único (`FACT-{id}`), `send_email:false`.
  4. Endpoints: consultar estado (RF-099), indicadores pendiente/generada (RF-100, RF-101), generar manualmente solo solicitudes externas con pago confirmado (RF-102, RF-103), consulta del laboratorio (RF-104), consulta limitada por código (RF-105), historial de estados (RF-106).
  5. Guardar respuesta completa en `facturas.documento` (number, cufe, is_validated, links) y errores 409/422 con reintento.
  6. `.env.example` con credenciales vacías (se piden gratis en factus.com.co cuando se integre).
- **Entregables:** factura generada en sandbox con número, CUFE y PDF/XML de Factus.
- **Criterio de verificación:** ninguna llamada sale hacia producción de Factus/DIAN; el historial de la factura conserva cada cambio.

### Fase B11 — Notificaciones, seguimiento público y respaldos
- **Objetivo:** módulo 11, consulta pública y respaldos (RF-107 a RF-112, RNF-005, RNF-008).
- **Tareas:**
  1. Notificaciones por correo en cambios de etapa, incidencias, resultados, cambios de fecha (máx. 3 intentos).
  2. Rutas públicas `/api/public/seguimiento/:codigo` y `/api/public/encuesta/:token` en solo lectura con proyección de campos (sin observaciones internas).
  3. Índices optimizados para responder < 2 s (RNF-013).
  4. `scripts/backup.js`: export JSON por colección (RNF-008) y endpoint de respaldo (RNF-016, M0 sin respaldos automáticos).
- **Entregables:** seguimiento público, notificaciones y respaldo manual.
- **Criterio de verificación:** consulta pública < 2 s; no expone datos internos; un respaldo completo se genera en una carpeta local.

### Fase B12 — Pruebas, documentación y entrega
- **Objetivo:** backend estable y documentado.
- **Tareas:**
  1. Tests de integración con jest + supertest por módulo (`tests/api.test.js`).
  2. README del backend: instalación, variables, comandos, estructura de carpetas.
  3. Checklist de trazabilidad RF/RNF cubiertos.
  4. Revisión de límites: tamaño de archivos (RNF-016), intentos de notificación, borrado lógico.
- **Entregables:** suite de pruebas en verde + README.
- **Criterio de verificación:** `npm test` sin fallos y arranque limpio en entorno nuevo.

---

## RUTA B — FRONTEND (`frontend/`)

### Fase F1 — Proyecto Quasar
- **Objetivo:** aplicación Quasar (Vue 3, VueRouter, Vite) base instalada.
- **Tareas:**
  1. Configurar `package.json` con quasar, vue, vue-router, axios, @quasar/extras.
  2. Configurar `quasar.config.js` y `vite.config.js` con proxy `/api` → `http://localhost:3000`.
  3. `.env.example` con `VITE_API_URL` (producción) y modo desarrollo por proxy.
  4. `index.html` y estructura `src/`.
- **Entregables:** proyecto arranca con `quasar dev`.
- **Criterio de verificación:** la app compila y muestra la página base sin errores de consola.

### Fase F2 — Base del cliente
- **Objetivo:** andamiaje navegable: layouts, router, axios y utilidad de sesión (sin librería de estado).
- **Tareas:**
  1. `main.js` y `App.vue`.
  2. `boot/axios.js`: instancia con `baseURL = VITE_API_URL`, interceptor que adjunta token JWT y maneja 401 (RNF-014).
  3. `router/index.js`: rutas con `meta.requiresAuth`, `meta.perms` y guardas de navegación.
  4. `layouts/MainLayout.vue`: barra de menú por permisos y datos de sesión.
  5. `layouts/PublicLayout.vue`: sin menú interno (seguimiento/encuesta).
  6. `utils/session.js`: leer/guardar/cerrar sesión en localStorage.
  7. `pages/Error404.vue` (RNF-014: sin redirecciones a páginas de error externas).
- **Entregables:** navegación con layouts y guardas activas.
- **Criterio de verificación:** entrar a una ruta protegida sin sesión redirige al login; con sesión abre MainLayout.

### Fase F3 — Autenticación
- **Objetivo:** login funcionando contra el backend.
- **Tareas:**
  1. `pages/auth/Login.vue`: formulario validado en cliente y servidor.
  2. Consumo con `services/api.js` (módulo `auth`).
  3. Guardia de sesión y cierre de sesión.
  4. Mensajes de error junto al campo, sin redirecciones (RNF-014).
- **Entregables:** login y logout operativos.
- **Criterio de verificación:** credenciales válidas entran al sistema; inválidas muestran mensaje en pantalla sin perder lo digitado.

### Fase F4 — Componentes reutilizables y servicios
- **Objetivo:** caja de componentes para acelerar los módulos.
- **Tareas:**
  1. `components/`: tabla con paginación/búsqueda, formulario con validaciones, diálogo de confirmación para borrado lógico, indicador de estados, bloque de mensajes de error.
  2. `services/api.js` con módulos por recurso (clientes, solicitudes, muestras, facturación, etc.).
  3. Patrón de pantallas: listado + diálogo crear/editar + detalle.
  4. Estilos globales en `css/app.scss` y layout responsive (RNF-012).
- **Entregables:** componentes base y módulos de servicio.
- **Criterio de verificación:** una pantalla de prueba compuesta solo con componentes reutilizables.

### Fase F5 — Módulos de gestión (Módulo 1)
- **Objetivo:** interfaces de clientes, solicitudes, cotizaciones, pagos y parámetros (RF-001 a RF-014, RF-030).
- **Tareas:**
  1. CRUD de clientes con edición para corregir digitación (RF-001, RF-002).
  2. Solicitudes: tipo interno/externo, prioridad, atención inmediata con motivo, indicadores de pago pendiente (RF-003 a RF-014).
  3. Cotizaciones: generación desde parámetros, envío por correo, registro de aceptación (RF-006 a RF-008).
  4. Pagos: simulación sin datos tarjeta/bancaria (RNF-018).
  5. Catálogo de parámetros (RF-030).
- **Entregables:** 5 pantallas CRUD funcionales.
- **Criterio de verificación:** flujo cliente → solicitud → cotización → aceptación → pago completo desde la UI.

### Fase F6 — Muestras (Módulos 2 y 3)
- **Objetivo:** recepción, identificación, rótulo e inventario (RF-015 a RF-039).
- **Tareas:**
  1. Formulario de recepción con advertencia < 300 g/ml sin bloquear (RF-019).
  2. Aceptación/rechazo con motivo obligatorio (RF-021 a RF-023).
  3. Selección de parámetros y generación de rótulo con impresión (RF-029 a RF-032).
  4. Inventario: listado, búsqueda por código, orden de llegada, ubicación (RF-033 a RF-039).
  5. Ficha de muestra: estados, fechas, eventos visibles.
- **Entregables:** pantallas de recepción, inventario y ficha.
- **Criterio de verificación:** recepción completa genera código, rótulo imprimible y ubicación; búsqueda por código responde < 2 s (RNF-013).

### Fase F7 — Análisis, trazabilidad, fechas e incidencias (Módulos 4, 5 y 6)
- **Objetivo:** interfaces de procesamiento (RF-040 a RF-073).
- **Tareas:**
  1. Registro y validación de resultados con repeticiones (RF-052 a RF-055).
  2. Línea de tiempo de eventos por muestra; correcciones con registro (RF-043 a RF-048).
  3. Cambio de fechas con motivo interno y motivo público (RF-059 a RF-062).
  4. Incidencias: creación, clasificación, respuestas con adjuntos (≤3) y aprobación (RF-063 a RF-073); observaciones internas nunca visibles para el cliente.
  5. Cierre de proceso (RF-056) con bloqueo de inicio sin pago (RF-058).
- **Entregables:** pantallas de análisis, trazabilidad, fechas e incidencias.
- **Criterio de verificación:** flujo de resultados a validación completo; ningún control permite editar el historial de eventos (RNF-005).

### Fase F8 — Informes, disposiciones y encuestas (Módulos 8 y 9)
- **Objetivo:** interfaces de cierre del servicio (RF-074 a RF-098).
- **Tareas:**
  1. Disposición devolución/desecho con motivo y notificación (RF-074 a RF-093).
  2. Generación/descarga de informes PDF y estados de disponibilidad (RF-094 a RF-097).
  3. Encuesta pública por token: 4 preguntas 1-5 y confirmación (RF-098).
  4. Aviso de conservación próxima a vencer.
- **Entregables:** pantallas de disposición, informes y encuesta.
- **Criterio de verificación:** informe descargable desde la UI y encuesta respondible sin sesión.

### Fase F9 — Facturación y administración (Módulo 10 y admin)
- **Objetivo:** interfaces de facturación (RF-099 a RF-106) y administración.
- **Tareas:**
  1. Tablero de facturación: estados pendiente/generada con indicadores visuales (RF-099 a RF-101).
  2. Botón de generación manual de factura (RF-103) con confirmación y resultado de Factus (número, CUFE, PDF/XML).
  3. Historial de cambios de la factura (RF-106) y errores de facturación visibles en pantalla.
  4. Administración: usuarios con permisos de edición/lectura (RF-049), eliminación controlada (RF-050), consulta de auditorías, descarga de respaldos (RNF-008).
- **Entregables:** módulo de facturación y panel administrativo.
- **Criterio de verificación:** generación real contra sandbox con respuesta visible; solo usuarios con permiso eliminan o generan facturas.

### Fase F10 — Rutas públicas y pulido final
- **Objetivo:** seguimiento del cliente y calidad final (Módulo 7, RNF-010 a RNF-014).
- **Tareas:**
  1. `pages/publico/Seguimiento.vue`: consulta por código de 32 caracteres, estado actual, historial visible, respuesta a incidencias con adjuntos (RF consulta; RNF-005 solo lectura).
  2. `pages/publico/Encuesta.vue` accesible solo por token.
  3. Validación en cliente + mensajes junto al campo sin perder datos (RNF-009, RNF-014).
  4. Responsive en escritorio/tablet/móvil (RNF-012) y navegadores modernos (RNF-011).
  5. Pruebas manuales de los 11 módulos + checklist de RF/RNF.
- **Entregables:** flujo público completo y checklist final.
- **Criterio de verificación:** un cliente sin cuenta consulta su muestra solo con el código en < 2 s y no ve información interna (RNF-004, RNF-013).

---

## ORDEN RECOMENDADO DE EJECUCIÓN

| # | Fase backend | Fase frontend | Punto de encuentro |
|---|---|---|---|
| 1 | B1 + B2 | F1 + F2 | Ambos conectados entre sí |
| 2 | B3 + B4 | F3 + F4 | Login funcional punta a punta |
| 3 | B5 + B6 | F5 | Módulo 1 completo |
| 4 | B7 | F6 | Recepción de muestras |
| 5 | B8 | F7 | Procesamiento y trazabilidad |
| 6 | B9 | F8 | Cierre del servicio |
| 7 | B10 | F9 | Facturación con Factus sandbox |
| 8 | B11 | F10 | Notificaciones y seguimiento público |
| 9 | B12 | — | Entrega final con pruebas y documentación |
