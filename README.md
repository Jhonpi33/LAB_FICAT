# Sistema de gestión de análisis de laboratorio · SENA

Frontend demostrativo para el ciclo de muestras del laboratorio de alimentos.
Los datos y las operaciones son simulados; no se conecta a un servidor ni envía
correos o documentos reales.

## Ejecutar

Requiere Node.js 20 o posterior.

```sh
npm install
npm run dev
```

Para generar y probar la versión de producción:

```sh
npm run build
npm run preview
```

## Compartir con Cloudflare Tunnel

El servidor de desarrollo del laboratorio usa el puerto fijo `5174`, separado
del portafolio que usa `5173`. Si el puerto `5174` está ocupado, libera ese
puerto antes de iniciar la app. Para compartirla, ejecuta:

```sh
cloudflared tunnel --url http://127.0.0.1:5174 --http-host-header localhost:5174
```

Usar `127.0.0.1` evita que macOS resuelva `localhost` a IPv6 y llegue a otro
servidor. El encabezado fija el host del origen para Vite.

## Cuentas de demostración

| Perfil | Correo | Contraseña |
|---|---|---|
| Encargado | `lab@sena.edu.co` | `Laboratorio2026` |
| Administrador | `admin@sena.edu.co` | `Admin2026` |
| Usuario / Cliente | `lectura@sena.edu.co` | `Lectura2026` |

El selector **Probar como…** está disponible durante el desarrollo. Los
registros iniciales relacionan solicitudes, clientes, muestras, pagos,
incidencias, resultados y facturas mediante los códigos `0042-2026` a
`0044-2026`.

## Rutas

| Ruta | Uso |
|---|---|
| `/login` | Acceso del personal y cuentas demo |
| `/seguimiento` | Consulta pública por código |
| `/seguimiento/:codigo` | Estado e historial público de una muestra |
| `/encuesta/:codigo` | Encuesta de satisfacción |
| `/app/panel` | Resumen del laboratorio |
| `/app/clientes` y `/app/clientes/:id` | Clientes e historial |
| `/app/solicitudes`, `/app/solicitudes/:id`, `/app/cotizaciones` | Solicitudes, cotizaciones y pagos |
| `/app/recepcion/nueva` | Recepción y verificación |
| `/app/muestras`, `/app/muestras/:codigo` | Inventario y ficha de muestra |
| `/app/incidencias`, `/app/resultados`, `/app/informes` | Incidencias, resultados e informes |
| `/app/facturacion`, `/app/disposicion`, `/app/notificaciones` | Cierre del servicio |
| `/app/catalogo-parametros`, `/app/usuarios` | Catálogos y perfiles |
| `/app/auditoria`, `/app/eliminados`, `/app/respaldo` | Auditoría y administración |

Las rutas internas requieren sesión. La interfaz protege la administración y
desactiva las acciones de edición en el perfil de solo lectura.

### Permisos por perfil

| Perfil | Puede ver |
|---|---|
| Encargado | Todos los módulos; edita si tiene permiso |
| Administrador | Todos los módulos + usuarios, auditoría, eliminados y respaldo |
| Usuario / Cliente | Solo su panel, sus resultados, informes, facturación y notificaciones |

El perfil **Usuario / Cliente** no accede a clientes, solicitudes, cotizaciones,
inventario de muestras, incidencias ni a los módulos de administración, y sus
listas se limitan a los registros de su propia cuenta (resultados propios, no
los de otros análisis). La trazabilidad de su muestra solo muestra los eventos
visibles para el cliente, nunca las notas internas. Requerimientos RF-049 y
RNF-004.

## Estructura

```text
src/
  components/    StatusBadge y control de tema
  css/           tokens semánticos, escalas de marca y estilos
  layouts/       navegación interna
  mocks/         datos de demostración relacionados
  pages/         acceso, consulta pública, encuesta y módulos
  router/        rutas y guarda de sesión
  services/      operaciones simuladas con Promise y latencia
  stores/        sesión y tema
```

`src/css/tokens.scss` contiene los temas claro y oscuro, las escalas
normalizadas de marca, los tokens semánticos de estado y los colores de la
marca. Los servicios en `src/services/` son el punto de reemplazo para HTTP.
Las páginas no deben conectarse directamente a una base de datos.

## Conectar con Express

1. Crear un cliente Axios en `src/boot/` con la URL y gestión de sesión del API.
2. Sustituir las funciones de `src/services/laboratory.js` por llamadas Axios,
   manteniendo sus formas de respuesta y errores por campo.
3. Mover validaciones, permisos, auditoría, persistencia y filtros al servidor;
   la interfaz debe conservar su validación previa y mostrar los errores que
   responda el API.
4. No poner secretos SMTP, credenciales de MongoDB ni llaves de Factus en el
   frontend. El servidor debe gestionar correo, facturación y archivos.

## Trazabilidad de requerimientos

La matriz detallada por requisito está en [COBERTURA.md](./COBERTURA.md).
**La presencia de una pantalla no equivale a que el requisito esté listo para
producción**: la persistencia, el correo, los cálculos de negocio y varias
acciones avanzadas requieren integración y completar sus flujos en el backend.

| Requisitos | Pantalla o componente |
|---|---|
| RF-001–005 | Clientes, detalle de cliente e historial |
| RF-006–014 | Solicitudes, detalle, cotizaciones y simulación de pago |
| RF-015–025 | Asistente visual de recepción, verificación y rechazo |
| RF-026–039 | Ficha de muestra, catálogo e inventario |
| RF-040–056 | Ficha, línea de tiempo, auditoría, resultados y controles de cierre |
| RF-057–062 | Fechas en la ficha de la muestra |
| RF-063–074 | Incidencias, acciones y respuesta pública |
| RF-075–085 | `/seguimiento/:codigo`, timeline público y consulta de solo lectura |
| RF-086–093 | Disposición y conservación de muestras |
| RF-094–098 | Informes, impresión y encuesta pública |
| RF-099–106 | Facturación interna y estado público |
| RF-107–112 | Bandeja de notificaciones, remitente y plantillas |
| RNF-001–003 | Vite, Vue 3, Quasar, Router, Pinia y guarda de sesión |
| RNF-004–005 | Proyección pública de datos y consulta de solo lectura |
| RNF-006–009 | Auditoría visual, historial y validación cliente/servicio |
| RNF-010–014 | Navegación, adaptación, tema y mensajes en pantalla |
| RNF-015–016 | Eliminación lógica demostrativa y límite de 5 MB |
| RNF-017–019 | Etiqueta de pruebas de facturación, pago simulado y correo mock |
| CU-01–10 | Clientes, solicitudes y cotizaciones |
| CU-11–21 | Recepción, verificación, catálogo e inventario |
| CU-22–30 | Etapas, trazabilidad, usuarios y resultados |
| CU-31–38 | Inicio, fechas e incidencias |
| CU-39–42 | Seguimiento público |
| CU-43–55 | Notificaciones y cierre del servicio |
| CU-56–58 | Inicio de sesión, respaldo y tema |
