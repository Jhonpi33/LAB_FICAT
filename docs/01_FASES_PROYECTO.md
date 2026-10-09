# 🗺️ Fases del proyecto · Sistema de Gestión de Análisis de Laboratorio

> **Fuente:** `REQUERIMIENTOS_LABORATORIO.docx` (ERS IEEE 830)
> **Alcance real:** **112 requisitos funcionales** (RF-001 → RF-112),
> **19 no funcionales** (RNF-001 → RNF-019) y **11 módulos**.
> **Para qué sirve este documento:** ordenar ese alcance en fases ejecutables,
> con un entregable concreto, un responsable y una forma de verificar que
> quedó terminada.

---

## 1. Equipo y responsabilidades

| Persona | Rol principal | Responsable de |
|---|---|---|
| **Jhon** | Coordinador técnico + Datos/Backend | Base de datos, modelado, integración, revisión del trabajo de todos |
| **León** | Backend | API Express, rutas, lógica de negocio, autenticación |
| **Joymar** | Frontend / Visual | Componentes Vue + Quasar, vistas, formulario |
| **Jaunda** | Frontend / Visual | Layout, estilos, responsive, experiencia de usuario |

**Regla de trabajo:** nadie trabaja sobre el mismo archivo al mismo tiempo.
Cada persona trabaja en su **rama** y se integra con *Pull Request*.
Procedimiento completo en `docs/03_COLABORACION_GIT.md`.

---

## 2. Mapa general de fases

```
Fase 0 ─ Base del equipo (Git, estructura)          ← HOY
   │
Fase 1 ─ Datos + Backend + Acceso                   ← HOY  [Jhon + León]
   │        └ Joymar y Jaunda arrancan el UI en paralelo
   ▼
Fase 2 ─ Comercial: clientes, cotizaciones, pagos
   ▼
Fase 3 ─ Recepción, código, rótulo e inventario
   ▼
Fase 4 ─ Proceso, trazabilidad y fechas
   ▼
Fase 5 ─ Incidencias
   ▼
Fase 6 ─ Análisis, resultados, seguimiento e informes
   ▼
Fase 7 ─ Disposición de muestras y notificaciones
   ▼
Fase 8 ─ Facturación
   ▼
Fase 9 ─ Cierre: UI, pruebas y despliegue           ← ENTREGA
```

> **Las fases 2 a 8 se pueden solapar** en frontend y backend: mientras León
> construye la API de la Fase N, Joymar y Jaunda montan la pantalla de la
> Fase N−1. Eso mantiene a los 4 ocupados sin pisarse.

---

## FASE 0 · Base del equipo
**Objetivo:** que los 4 puedan trabajar sobre el mismo código sin romperse.
**Responsable:** Jhon · **Duración:** hoy, antes de escribir código

| # | Tarea | Por qué |
|---|---|---|
| 0.1 | Mover el repositorio Git de `/Users/jhonpimiento` (tu home) a `LAB_FICAT` | 🔴 Hoy el repo está en el home de 94 GB con **0 archivos trackeados**; `git add .` intentaría subir 94 GB |
| 0.2 | Crear `.gitignore` | Para que `node_modules/`, `.env` (con la contraseña de Atlas) y `dist/` **nunca** suban a GitHub |
| 0.3 | Primer commit real + push a `github.com/jhonpi33/fichero` | Que los compañeros puedan clonar |
| 0.4 | Acuerdo de ramas: `main`, `develop`, `fase/...` | Evita que se pisen los cambios |
| 0.5 | Documentar estructura de carpetas | Que León, Joymar y Jaunda sepan dónde va cada cosa |

**✔ Criterio de terminado:** los 4 clonan el repo y `npm run dev` les funciona.

---

## FASE 1 · Datos + Backend + Acceso ← HOY
**Objetivo:** la app deja de ser una demo con datos falsos y empieza a leer y
escribir en **MongoDB Atlas real**, con usuarios reales.
**Responsables:** Jhon + León · **Frontend en paralelo:** Joymar + Jaunda

| # | Tarea | Requisitos | Por qué |
|---|---|---|---|
| 1.1 | Crear cluster **Atlas M0** y base de datos `laboratorio` | RNF-001, RNF-016 | Es el único almacenamiento permitido: 512 MB, sin respaldos automáticos |
| 1.2 | Modelar las 25 tablas → colecciones Mongoose | RNF-001, RNF-009 | Ya existe el diseño relacional; hay que traducirlo, no inventarlo (`docs/02`) |
| 1.3 | Armar el backend Express: servidor, `/api/health`, conexión a BD | RNF-001, RNF-002 | Todo el frontend hablará contra esta API con **Axios** |
| 1.4 | Autenticación: registro/login de personal, **bcrypt + JWT** | RF-049, RNF-003, RNF-004 | Sin esto no hay panel interno ni control de permisos |
| 1.5 | Roles y permisos: `admin`, `encargado`, `usuario` + `permiso_editar` / `permiso_eliminar` | RF-049, RF-050 | El sistema distingue quien edita de quien solo consulta |
| 1.6 | Auditoría de toda escritura y **borrado lógico** | RNF-006, RNF-015 | Ningún registro se borra físicamente; toda modificación deja rastro |
| 1.7 | Semillas: usuarios de prueba y catálogo de parámetros de análisis | RF-030 | Para poder probar sin digitar todo a mano |
| 1.8 | Login real en Vue (reemplazar el mock de `stores/auth.js`) con Axios | RNF-003 | Primer contacto real frontend ↔ backend |
| 1.9 | **Consulta pública por código** conectada a la BD | RF-075 a RF-084 | Es la pantalla que más se ve; hoy lee de `src/mocks/data.js` |
| 1.10 | Manejo de errores en pantalla (sin redirecciones) | RNF-014 | Los errores van como mensajes, no como páginas 404/500 |

**✔ Criterio de terminado:**
1. Entrar a `/login` con un usuario real creado en Atlas y llegar al panel.
2. Consultar `/seguimiento/0042-2026` y ver una **muestra que existe en la BD**.
3. Cerrar sesión y ver que la sesión ya no sirve (token inválido).

---

## FASE 2 · Comercial: clientes, solicitudes, cotizaciones y pagos
**Módulo 1** · **RF-001 → RF-014** · Responsables: León (API) + Joymar/Jaunda (UI)

- CRUD de clientes con validación y edición (RF-001, RF-002)
- Tipo de usuario interno/externo (RF-003) y conservación de registros (RF-004, RF-005)
- Solicitudes con prioridad y **atención inmediata** (RF-013, RF-014)
- Cotizaciones: generación, envío por correo, aceptación (RF-006 → RF-008)
- Diferenciación internas/externas (RF-009)
- Pagos **simulados**, sin pasarela real ni datos de tarjeta (RF-010 → RF-012, RNF-018)
- Listado con identificación visual de «pago pendiente»

**✔ Terminado cuando:** se registra un cliente, se cotiza, se acepta y se
confirma un pago simulado, todo guardado en Atlas.

---

## FASE 3 · Recepción, identificación, rótulo e inventario
**Módulos 2 y 3** · **RF-015 → RF-039**

- Registro de recepción: nombre, tipo físico sólido/líquido, cantidad (RF-015 → RF-018)
- **Advertencia** si es menor a 300 g/ml sin impedir el registro (RF-019); permitir más de 300 (RF-020)
- Verificación física, aceptación o rechazo con motivo obligatorio (RF-021 → RF-025)
- **Código automático consecutivo-por-año** `0042-2026` (RF-026 → RF-028)
- Selección de parámetros desde el catálogo (RF-029, RF-030)
- Generación e impresión del **rótulo en PDF** (RF-031, RF-032)
- Inventario, ubicación física y búsquedas (RF-033 → RF-039)

**✔ Terminado cuando:** una muestra recibida genera su código, su rótulo
imprimible y aparece en el inventario con su ubicación.

---

## FASE 4 · Proceso, trazabilidad y fechas
**Módulos 4 y 5** · **RF-040 → RF-062**

- Estados: `ingresada → en proceso → en análisis → …` con **cambio manual, nunca automático** (RF-040 → RF-042, RF-072)
- Eventos cronológicos con fecha, hora, usuario y ubicación (RF-043 → RF-046)
- Correcciones con registro del evento de corrección (RF-047, RF-048, RNF-006)
- Permisos de edición vs solo lectura y eliminación controlada (RF-049, RF-050)
- Historial de modificaciones (RF-051, RNF-005)
- Fechas: inicio, **bloqueo si el pago no está confirmado** (RF-057, RF-058),
  fecha estimada, su modificación y el historial de cambios (RF-059 → RF-062)

**✔ Terminado cuando:** el historial de una muestra es inmutable y cada
cambio de estado quedó registrado con su usuario y fecha.

---

## FASE 5 · Incidencias
**Módulo 6** · **RF-063 → RF-074**

- Registro y clasificación: `informativa`, `demora`, `requiere acción del cliente` (RF-063 → RF-068)
- Respuesta del cliente con **adjuntos** (RF-069, RF-070) → límite de tamaño por RNF-016 (M0 = 512 MB)
- Aprobación por personal autorizado (RF-071), cierre y bitácora de acciones (RF-073, RF-074)
- **Las incidencias nunca cambian el estado de la muestra solas** (RF-072)
- Observaciones internas **nunca visibles** para el cliente (RF-082)

**✔ Terminado cuando:** se registra una demora, cambia la fecha estimada y el
cliente la ve reflejada en su seguimiento.

---

## FASE 6 · Análisis, resultados, seguimiento público e informes
**Módulos 7 y 9** · **RF-075 → RF-085**, **RF-094 → RF-098**

- Consulta pública solo con el código, **sin cuenta** (RF-075)
- Estado actual, historial público y fechas (RF-076 → RF-078)
- Novedades, demoras y disponibilidad de resultados (RF-079 → RF-081)
- Protección de lo interno y solo lectura para el cliente (RF-082, RF-083)
- Registro y **validación de resultados**, con repeticiones y su motivo (RF-052 → RF-055)
- Generación del **informe técnico en PDF** y su disponibilidad (RF-094 → RF-097)
- **Encuesta de satisfacción** por token impredecible (RF-098)

**✔ Terminado cuando:** el cliente pone su código, ve el estado, el historial
limpio y descarga el informe PDF validado.

---

## FASE 7 · Disposición de muestras y notificaciones
**Módulos 8 y 11** · **RF-086 → RF-093**, **RF-107 → RF-112**

- Permanencia, salida física, devolución o desecho con motivo (RF-086 → RF-091)
- **7 días hábiles** de conservación y aviso previo al descarte (RF-092, RF-093)
- Notificaciones por correo (Gmail en pruebas) de etapa, incidencias,
  resultados y cambios de fecha (RF-107 → RF-112, RNF-019)
- Máximo **3 intentos** de envío por notificación (RF-112)

**✔ Terminado cuando:** una muestra vencida dispara el aviso y la disposición
queda registrada.

---

## FASE 8 · Facturación
**Módulo 10** · **RF-099 → RF-106**

- Estado de facturación con identificación visual (RF-099 → RF-101)
- Generación **manual** del documento y su fecha (RF-102, RF-103)
- Consulta por el laboratorio (RF-104) y **consulta limitada** por el cliente con su código (RF-105)
- Historial de cambios de la factura (RF-106)
- Integración **Factus en entorno de pruebas, sin enviar nada a la DIAN** (RNF-017)

**✔ Terminado cuando:** se genera una factura de prueba y el cliente solo ve
lo que le corresponde según su código.

---

## FASE 9 · Cierre: UI, pruebas y despliegue
**Responsables:** los 4 · **RNF de calidad**

| Área | Requisitos |
|---|---|
| Usabilidad | RNF-010 — el personal y el cliente usan el sistema sin ayuda técnica |
| Navegadores | RNF-011 — Chrome, Firefox, Edge modernos |
| Responsive | RNF-012 — computador, tableta y móvil |
| Rendimiento | RNF-013 — seguimiento en **< 2 s**, resto en **< 3 s**, campos de código **indexados** |
| Errores | RNF-014 — mensajes en pantalla, sin perder lo digitado |
| Disponibilidad | RNF-007 — la información no desaparece al cerrar procesos |
| Respaldo | RNF-008 — **manual**, porque el plan M0 no trae respaldos automáticos |
| Integridad | RNF-009 — validación en frontend **y otra vez** en backend |

**✔ Terminado cuando:** la lista de verificación de RNF pasa completa,
hay respaldo exportado y la app está publicada con Cloudflare Tunnel.

---

## 3. Resumen de cobertura

| Fase | Módulos | Requisitos | Responsable |
|---|---|---|---|
| 0 · Base del equipo | — | — | Jhon |
| 1 · Datos + Backend + Acceso | — | RNF-001, 002, 003, 004, 006, 009, 014, 015, 016 · RF-049, 050, 075-084 | **Jhon + León** |
| 2 · Comercial | 1 | RF-001 → RF-014 · RNF-018 | León + Joymar/Jaunda |
| 3 · Recepción e inventario | 2, 3 | RF-015 → RF-039 | León + Joymar/Jaunda |
| 4 · Proceso y trazabilidad | 4, 5 | RF-040 → RF-062 · RNF-005, 006 | León + Joymar/Jaunda |
| 5 · Incidencias | 6 | RF-063 → RF-074 | León + Joymar/Jaunda |
| 6 · Resultados, seguimiento e informes | 7, 9 | RF-075 → RF-085, RF-094 → RF-098 | León + Joymar/Jaunda |
| 7 · Disposición y notificaciones | 8, 11 | RF-086 → RF-093, RF-107 → RF-112 · RNF-019 | León + Joymar/Jaunda |
| 8 · Facturación | 10 | RF-099 → RF-106 · RNF-017 | León + Joymar/Jaunda |
| 9 · Cierre | — | RNF-007, 008, 010 → 014 | Los 4 |

> **Total: 112 RF + 19 RNF cubiertos.** Ningún requisito queda fuera del plan.

---

## 4. Cómo se documenta cada fase

Por cada fase entregada se crea un archivo en `docs/` con esta estructura:

```markdown
# Fase N · <título>
## Qué se hizo
## Cómo se hizo
## Para qué se hizo
## Cómo probarlo
## Requisitos cubiertos (RF/RNF)
## Lo que queda pendiente
```

La bitácora cronológica vive en `docs/LOG_CAMBIOS.md`.
