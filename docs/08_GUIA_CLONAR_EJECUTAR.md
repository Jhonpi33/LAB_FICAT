# 🚀 Guía para clonar y ejecutar el proyecto (equipo)

> **Para qué sirve:** que cualquier integrante del equipo descargue el repo y lo
> deje funcionando **igual que el de los demás**, con los mismos datos.
>
> Stack: backend (`backend/`) + frontend (`frontend/`) + MongoDB Atlas.

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/Jhonpi33/LAB_FICAT.git
cd LAB_FICAT
git checkout DV
```

> La rama de desarrollo es **`DV`**. Ahí está el código más reciente.

---

## 2. Crear los archivos `.env`

Los `.env` tienen datos sensibles (claves) y **no se suben al repositorio**.
Cada quien crea los suyos a partir de los ejemplos:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### `backend/.env` — edítalo y completa

```env
PORT=4000
MONGO_URI=                          # ← URL de conexión de Atlas (ver §3)
JWT_SECRET=una_cadena_larga_y_secreta
FRONTEND_URL=http://localhost:5174
```

### `frontend/.env` — normalmente no hay que tocar nada

```env
VITE_API_URL=http://localhost:4000/api
VITE_APP_TITULO=LABFICAT
```

---

## 3. ⚠️ La clave: la base de datos (para ver los MISMOS datos)

Todos los datos viven en **MongoDB Atlas**, no en el código. Hay dos caminos:

| Opción | Qué hacer | Resultado |
|---|---|---|
| **A) Cluster compartido (recomendado)** | El líder del equipo comparte la `MONGO_URI` (o agrega a los demás como usuarios en Atlas → *Database Access → Add New User*) | Todos ven **exactamente los mismos datos** |
| **B) Cluster propio** | Cada uno crea su cluster en Atlas, pega su propia URL, y ejecuta `npm run colecciones` + `npm run seed` | Ven datos de **demo**, pero vacío de inicio |

> Con la opción **A**, cada quien puede usar su propio `JWT_SECRET` distinto:
> no tiene que coincidir con el de los demás. Lo único que debe ser igual es
> la `MONGO_URI`.

---

## 4. Instalar dependencias

```bash
cd backend && npm install
cd ../frontend && npm install
```

---

## 5. Arrancar (dos terminales)

```bash
# Terminal 1 — Backend
cd backend
npm run dev        # → http://localhost:4000

# Terminal 2 — Frontend
cd frontend
npm run dev        # → http://localhost:5174
```

Abre **http://localhost:5174**.

---

## 6. Entrar con las cuentas de demostración

Se crean con `npm run seed` (en `backend/`):

| Perfil | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@sena.edu.co` | `Admin2026` |
| Encargado | `lab@sena.edu.co` | `Laboratorio2026` |
| Usuario / Cliente | `lectura@sena.edu.co` | `Lectura2026` |

---

## 7. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `ERR_CONNECTION_REFUSED` al abrir la app | El backend no está corriendo | `cd backend && npm run dev` |
| `No hay conexión con el servidor` | El frontend no llega al backend | Revisa `frontend/.env` → `VITE_API_URL=http://localhost:4000/api` y reinicia Vite |
| `blocked by CORS policy` | El origen no está permitido | En `backend/.env` → `FRONTEND_URL=http://localhost:5174` |
| Datos vacíos / no ve las muestras de los demás | Cada quien apunta a un cluster distinto | Usar la **misma** `MONGO_URI` (opción A) |
| `Port 5174 is already in use` | Ya hay un Vite corriendo | Ciérralo o usa otro puerto |
| `Port 4000 is already in use` | Ya hay un backend corriendo | Cierra el proceso con `lsof -ti:4000 | xargs kill` |

---

## 8. Publicar por internet (opcional)

Para compartir una demo con un evaluador, ver [`GUIA_ARRANQUE.md`](../GUIA_ARRANQUE.md):
usa `cloudflared` o `cd frontend && npm run tunel`.
