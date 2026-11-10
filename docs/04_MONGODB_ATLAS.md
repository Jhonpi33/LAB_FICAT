# 🌐 MongoDB Atlas · Crear el cluster y conectar la base de datos

> **Para qué sirve:** los requerimientos **obligan** a usar MongoDB Atlas
> (RNF-001: «Node.js y Express para el backend, y MongoDB/MongoDB Atlas para el
> almacenamiento»; RNF-016: «operar con MongoDB Atlas en su plan gratuito M0»).
> Este documento es la guía paso a paso para que cualquier integrante del equipo
> lo haga desde su propio computador.

---

## 0. Decisiones ya tomadas

| Decisión | Valor | Por qué |
|---|---|---|
| Motor | **MongoDB Atlas (plan M0 Free)** | Lo exige RNF-016 |
| Nombre de la base | `laboratorio` | Un solo espacio para todo el sistema |
| Límite de almacenamiento | **512 MB** | Es el techo del plan M0 |
| Archivos (adjuntos y PDF) | Se guardan **dentro de la misma BD** | RNF-016 prohíbe servicios externos de almacenamiento |
| Respaldos | **Manuales** | M0 **no** incluye respaldos automáticos (RNF-008) |
| Diseño relacional MySQL | Solo **referencia** | Se traduce a colecciones → `docs/02_MODELO_DATOS_MONGODB.md` |

---

## 1. Crear la cuenta y el cluster (una sola vez)

1. Entrar a <https://www.mongodb.com/cloud/atlas/register>
2. Registrarse con el correo del equipo (recomendado: el institucional).
3. En **Atlas → Overview → Build a Database** elegir:
   - **M0 (Free)** — no pedirá tarjeta
   - **Cloud Provider:** AWS
   - **Region:** `us-east-1` (Virginia) — es la más cercana a Colombia y responde más rápido (importante para RNF-013: consulta de seguimiento **< 2 s**)
4. Nombrar el cluster: `ClusterLaboratorio`
5. Esperar ~3 min a que diga **Deploying → Active**

---

## 2. Crear el usuario de la base de datos

**Database → Connect → Add New Database User**

| Campo | Valor |
|---|---|
| Authentication Method | **Username and Password** |
| Username | `lab_admin` |
| Password | Generar una segura y **guardarla en un lugar seguro** |
| Database User Privileges | **Read and write to `laboratorio`** |

> 🔒 **Esta contraseña nunca se escribe en el código ni se sube a GitHub.**
> Vive solo en el archivo `.env`, que está en `.gitignore`.
> Para reducir permisos, en un entorno compartido usa `readWrite` únicamente
> sobre la base `laboratorio`, en lugar de privilegios sobre todas las bases.

---

## 3. Permitir tu conexión (allow list)

**Network Access → Add IP Address**

- En desarrollo: **Allow Access from Anywhere** (`0.0.0.0/0`) para que los
  4 compañeros desde sus casas puedan conectarse.
- Cada equipo que conecte desde una IP nueva deberá agregarla si se deja
  restringido.

---

## 4. Obtener el connection string

**Connect → Drivers → Node.js** → copiar la URI. Tiene esta forma:

```
mongodb+srv://lab_admin:<PASSWORD>@clusterlaboratorio.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**Ajustes obligatorios:**

1. Cambiar `<PASSWORD>` por la contraseña real.
2. Usar el nombre de la base configurado por la aplicación (`laboratorio`):

```
mongodb+srv://lab_admin:<PASSWORD>@clusterlaboratorio.xxxxx.mongodb.net/laboratorio?retryWrites=true&w=majority&authSource=admin
```

---

## 5. Configurar el proyecto

### 5.1 Archivo `.env` (en la raíz del backend) 🔒

```env
MONGO_URI=mongodb+srv://lab_admin:CONTRASENA_AQUI@clusterlaboratorio.xxxxx.mongodb.net/laboratorio?retryWrites=true&w=majority&authSource=admin
MONGO_DATABASE=laboratorio
PORT=4000
JWT_SECRET=cadena-larga-y-aleatoria-para-firmar-tokens
JWT_EXPIRES=12h
NODE_ENV=development
```

### 5.2 Archivo `.env.example` (sí sube a GitHub)

```env
MONGO_URI=mongodb+srv://USUARIO:CONTRASENA@TU_CLUSTER.mongodb.net/laboratorio?retryWrites=true&w=majority&authSource=admin
MONGO_DATABASE=laboratorio
PORT=4000
JWT_SECRET=
JWT_EXPIRES=12h
NODE_ENV=development
```

### 5.3 Dependencias

```bash
npm install mongoose dotenv express cors jsonwebtoken bcryptjs express-validator
npm install -D nodemon
```

| Paquete | Para qué |
|---|---|
| `mongoose` | Traduce los documentos de Mongo a objetos de JavaScript y valida |
| `dotenv` | Lee el `.env` para no hardcodear secretos |
| `express` | Servidor del backend (RNF-001) |
| `cors` | Permite que Vite (5174) le haga peticiones al backend (4000) |
| `jsonwebtoken` | Firma y verifica los tokens de sesión (RNF-003) |
| `bcrypthas` → `bcryptjs` | Hashea las contraseñas, nunca se guarda texto plano (RNF-004) |
| `express-validator` | Validación del lado del servidor (RNF-009) |

---

## 6. Verificar la conexión

Desde la carpeta `backend`, inicia el servidor:

```bash
cd backend
npm start
```

En otra terminal consulta el estado:

```bash
curl http://localhost:4000/api/health
```

Si la API y MongoDB están disponibles, la respuesta indica `"estado":"operativo"` y `"baseDatos":"conectada"`. Si Atlas rechaza la conexión, la API permanece accesible, informa `"estado":"degradado"` y reintenta la conexión; las operaciones que requieren datos responden `503` hasta recuperarla.

## 7. Plan de respaldo manual (RNF-008)

Como M0 **no** respalda solo, se hace a mano. En el Atlas CLI:

```bash
mongodump "mongodb+srv://lab_admin:PASSWORD@TU_CLUSTER.mongodb.net/laboratorio" --out ./respaldos/$(date +%Y-%m-%d)
```

**Frecuencia sugerida:** al cerrar cada fase del proyecto.

---

## 8. Límites del plan M0 a respetar

| Límite | Consecuencia práctica | Requisito |
|---|---|---|
| **512 MB** totales | PDF y adjuntos deben pesar poco | Definir un **máximo por archivo** y rechazar con mensaje claro |
| Sin respaldos automáticos | Hay que exportar a mano | RNF-008 |
| Limitación de conexiones | No usar pooling enorme | — |
| Sin regiones dedicadas | Puede haber latencia ocasional | RNF-013 pide < 2 s en la consulta por código |

---

## 9. Troubleshooting

| Error | Causa | Solución |
|---|---|---|
| `MongooseServerSelectionError: IP not allowed` | No se agregó la IP | Network Access → Allow `0.0.0.0/0` |
| `bad auth : authentication failed` | Atlas recibió una conexión, pero rechazó las credenciales | En **Database Access**, confirma el usuario de base de datos (no el usuario con el que inicias sesión en Atlas) y restablece su contraseña. En Render configura `MONGO_URI` con el valor nuevo. No agregues la contraseña al repositorio. |
| `bad auth` con contraseña correcta | La contraseña contiene caracteres reservados | Codifica los caracteres reservados de usuario/contraseña en la URI (`@` → `%40`, `:` → `%3A`, `/` → `%2F`, etc.). |
| `IP not allowed` / timeout de selección | Network Access List bloquea la salida de Render | En Atlas → Network Access, agrega las IP de salida de Render o temporalmente `0.0.0.0/0` para diagnosticar. Limita el acceso antes de producción. |
| `Invalid connection string` | URI incompleta, con placeholder o caracteres sin codificar | Copia la URI de Drivers en Atlas, reemplaza usuario/contraseña y verifica que no quede `<PASSWORD>`. |
| `/api/health` informa `baseDatos: desconectada` | El proceso web está arriba, pero Atlas no aceptó o aún no restableció la conexión | Revisa los logs de Render y corrige las credenciales o Network Access List; el backend reintenta automáticamente. Las rutas de negocio responden `503` hasta que Mongo conecte. |
| `Buffering timed out` | Se intentó usar un modelo mientras Mongo estaba desconectado | Revisa `/api/health`; las rutas ya responden `503` claro mientras la conexión se recupera. |
| `CORS error` en el navegador | Vite y Express en puertos distintos | `app.use(cors())` en el backend |
