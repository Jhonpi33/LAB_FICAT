# Verificación de cobertura

Estado al terminar esta entrega. **Hecho** describe el flujo visual/mock
solicitado, no una integración de producción. **Parcial** indica que existe
una pantalla o control, pero no está implementada toda la regla, persistencia,
validación o respuesta del servidor. No se reporta un requisito como completo
solo porque exista una ruta.

## Requerimientos funcionales

| Requisito | Pantalla o componente | Estado |
|---|---|---|
| RF-001 | Clientes · alta y validación de formulario | Parcial |
| RF-002 | Clientes · edición y ficha | Parcial |
| RF-003 | Solicitudes · tipo de cliente | Parcial |
| RF-004 | Clientes · búsqueda e historial mock | Parcial |
| RF-005 | Solicitudes · estado sin continuidad | Parcial |
| RF-006 | Cotizaciones · lista y acción de generación | Parcial |
| RF-007 | Cotizaciones · plantilla y envío simulado | Parcial |
| RF-008 | Solicitudes · acción de aceptación | Parcial |
| RF-009 | Solicitud · ruta interna/externa | Parcial |
| RF-010 | Solicitud · información de pago | Parcial |
| RF-011 | Solicitud · confirmación de pago simulada | Parcial |
| RF-012 | Solicitudes y panel · pago pendiente | Parcial |
| RF-013 | Solicitudes · orden por prioridad SENA | Parcial |
| RF-014 | Solicitudes · atención inmediata con motivo | Parcial |
| RF-015 | Recepción · vínculo con solicitud | Parcial |
| RF-016 | Recepción · descripción del alimento | Parcial |
| RF-017 | Recepción · selector de tipo físico | Parcial |
| RF-018 | Recepción · unidad g/ml dinámica | Parcial |
| RF-019 | Recepción · aviso bajo 300 g/ml | Parcial |
| RF-020 | Recepción · cantidades mayores permitidas | Parcial |
| RF-021 | Recepción · verificación física | Parcial |
| RF-022 | Recepción · aceptar o rechazar | Parcial |
| RF-023 | Recepción · motivo obligatorio de rechazo | Parcial |
| RF-024 | Recepción · conservación de rechazos | Parcial |
| RF-025 | Recepción · aviso de rechazo simulado | Parcial |
| RF-026 | Recepción · código automático | Parcial |
| RF-027 | Recepción · formato consecutivo-año | Parcial |
| RF-028 | Ficha de muestra · código compartido | Parcial |
| RF-029 | Recepción · selección de parámetros | Parcial |
| RF-030 | Catálogo de parámetros | Parcial |
| RF-031 | Recepción · vista previa de rótulo | Parcial |
| RF-032 | Recepción · impresión | Parcial |
| RF-033 | Inventario · fecha de ingreso | Parcial |
| RF-034 | Inventario · ubicación física | Parcial |
| RF-035 | Inventario · clasificación de etapa | Parcial |
| RF-036 | Ficha · actualizar ubicación | Parcial |
| RF-037 | Inventario · filtros | Parcial |
| RF-038 | Inventario · orden de llegada | Parcial |
| RF-039 | Búsqueda global e inventario por código | Parcial |
| RF-040 | Ficha de muestra · estado actual | Parcial |
| RF-041 | Ficha de muestra · stepper de etapas | Parcial |
| RF-042 | Ficha · registrar avance | Parcial |
| RF-043 | Ficha · línea de tiempo | Parcial |
| RF-044 | Línea de tiempo · fecha y hora | Parcial |
| RF-045 | Ficha · observaciones y visibilidad | Parcial |
| RF-046 | Línea de tiempo · usuario de la acción | Parcial |
| RF-047 | Ficha · corrección de información | Parcial |
| RF-048 | Auditoría · evento de modificación | Parcial |
| RF-049 | Control de permisos de edición · perfiles de acceso | Hecho |
| RF-050 | Ficha · eliminación lógica con motivo | Parcial |
| RF-051 | Auditoría · dato anterior/nuevo | Parcial |
| RF-052 | Resultados · registro por parámetro | Parcial |
| RF-053 | Resultados · validar o devolver | Parcial |
| RF-054 | Resultados · devolución a etapa anterior | Parcial |
| RF-055 | Resultados · motivo de repetición | Parcial |
| RF-056 | Resultados · cierre condicionado | Parcial |
| RF-057 | Ficha · inicio formal | Parcial |
| RF-058 | Resultados · bloqueo por pago externo | Parcial |
| RF-059 | Ficha · fecha estimada | Parcial |
| RF-060 | Ficha · modificar fecha | Parcial |
| RF-061 | Ficha · motivo de cambio | Parcial |
| RF-062 | Ficha · historial de fecha | Parcial |
| RF-063 | Incidencias · asociación con muestra | Parcial |
| RF-064 | Incidencias · clasificación | Parcial |
| RF-065 | Incidencias · descripción y observaciones | Parcial |
| RF-066 | Incidencias · caso informativo | Parcial |
| RF-067 | Incidencias · demora y aviso | Parcial |
| RF-068 | Incidencias · solicitud de información | Parcial |
| RF-069 | Seguimiento público · respuesta | Parcial |
| RF-070 | Seguimiento público · adjuntos de respuesta | Parcial |
| RF-071 | Incidencias · aprobación | Parcial |
| RF-072 | Incidencias · estado de muestra manual | Parcial |
| RF-073 | Incidencias · cierre | Parcial |
| RF-074 | Incidencias · historial de acciones | Parcial |
| RF-075 | `/seguimiento/:codigo` · consulta sin cuenta | Hecho |
| RF-076 | Seguimiento · etapa actual y stepper | Hecho |
| RF-077 | Seguimiento · historial público | Hecho |
| RF-078 | Seguimiento · fecha y hora por evento | Hecho |
| RF-079 | Seguimiento · novedades del proceso | Parcial |
| RF-080 | Seguimiento · aviso de demora y nueva fecha | Parcial |
| RF-081 | Seguimiento · disponibilidad del informe | Parcial |
| RF-082 | Servicio público · proyección sin datos internos | Hecho |
| RF-083 | Seguimiento · consulta de solo lectura | Hecho |
| RF-084 | Seguimiento · validación de formato de código | Hecho |
| RF-085 | Notificaciones de cambios relevantes | Parcial |
| RF-086 | Disposición · fechas de permanencia | Parcial |
| RF-087 | Disposición · salida física | Parcial |
| RF-088 | Disposición · registro final | Parcial |
| RF-089 | Disposición · devolución | Parcial |
| RF-090 | Disposición · desecho | Parcial |
| RF-091 | Disposición · motivo u observación | Parcial |
| RF-092 | Disposición · conservación de 7 días hábiles | Parcial |
| RF-093 | Disposición · aviso previo | Parcial |
| RF-094 | Informes · vista previa con resultados | Parcial |
| RF-095 | Informes · impresión/descarga demostrativa | Parcial |
| RF-096 | Informes · disponible | Parcial |
| RF-097 | Informes · envío por correo simulado | Parcial |
| RF-098 | `/encuesta/:codigo` · calificación, comentario y envío | Hecho |
| RF-099 | Facturación · estado por solicitud | Parcial |
| RF-100 | Facturación · factura pendiente | Parcial |
| RF-101 | Facturación · factura generada | Parcial |
| RF-102 | Facturación · fecha de generación | Parcial |
| RF-103 | Facturación · generación manual | Parcial |
| RF-104 | Facturación · consulta de personal | Parcial |
| RF-105 | Seguimiento · estado público de factura | Parcial |
| RF-106 | Auditoría · cambios de factura | Parcial |
| RF-107 | Notificaciones · cambios de etapa | Parcial |
| RF-108 | Notificaciones · incidencias | Parcial |
| RF-109 | Notificaciones · resultados e informe | Parcial |
| RF-110 | Notificaciones · cambio de fecha | Parcial |
| RF-111 | Notificaciones · bandeja y reenvío mock | Parcial |
| RF-112 | Notificaciones · remitente y plantillas | Parcial |

## Requerimientos no funcionales

| Requisito | Pantalla o componente | Estado |
|---|---|---|
| RNF-001 | Vite, Vue 3, Quasar, Router y Pinia | Hecho |
| RNF-002 | `src/services/` con promesas y datos mock | Parcial |
| RNF-003 | Guarda de rutas internas y acceso demo | Hecho |
| RNF-004 | Roles y proyección pública sin datos internos | Hecho |
| RNF-005 | Seguimiento público de solo lectura | Hecho |
| RNF-006 | Auditoría y trazabilidad visual | Parcial |
| RNF-007 | Consulta de registros cerrados e historial | Parcial |
| RNF-008 | Respaldo manual descargable simulado | Parcial |
| RNF-009 | Validación de cliente y simulación de validación de servicio | Parcial |
| RNF-010 | Navegación y acciones principales | Parcial |
| RNF-011 | Build Vite; navegadores modernos no probados individualmente | Parcial |
| RNF-012 | Layout adaptable; verificado a 390 px | Parcial |
| RNF-013 | Latencia mock menor a 300 ms | Parcial |
| RNF-014 | Errores en pantalla y conservación de la búsqueda | Hecho |
| RNF-015 | Borrado lógico y restauración demostrativos | Parcial |
| RNF-016 | Validación de adjuntos de 5 MB y uso mock | Parcial |
| RNF-017 | Etiqueta de entorno académico de pruebas | Hecho |
| RNF-018 | Pago simulado sin información de tarjeta | Hecho |
| RNF-019 | Correo y plantillas solo simulados | Parcial |

## Casos de uso

| Casos | Pantalla o componente | Estado |
|---|---|---|
| CU-01–10 | Clientes, solicitudes, cotizaciones y pagos | Parcial |
| CU-11–15 | Recepción y verificación | Parcial |
| CU-16–21 | Código, parámetros, rótulo e inventario | Parcial |
| CU-22–30 | Etapas, trazabilidad, acceso y resultados | Parcial |
| CU-31–38 | Fechas e incidencias | Parcial |
| CU-39 | Consulta pública de muestra | Hecho |
| CU-40 | Historial público y novedades | Parcial |
| CU-41 | Disponibilidad de resultados e informe | Parcial |
| CU-42 | Vista pública de solo lectura | Hecho |
| CU-43–55 | Notificaciones y cierre del servicio | Parcial |
| CU-56 | Inicio de sesión del personal | Hecho |
| CU-57 | Copia de respaldo | Parcial |
| CU-58 | Cambio de tema | Hecho |

## Pendientes para declarar cobertura completa

- Conectar API y persistencia para cada módulo; completar operaciones de alta,
  edición, estados, auditoría, permisos y filtros.
- Implementar los formularios y reglas de negocio restantes, incluyendo
  cálculo de días hábiles y el ciclo de resultados por parámetro.
- Completar notificaciones, generación real de PDF, Factus de pruebas y pruebas
  de compatibilidad/accesibilidad en los navegadores requeridos.
