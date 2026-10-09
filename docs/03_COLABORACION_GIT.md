# 👥 Colaboración con Git · 4 personas, un solo repo, distintos computadores

> **Para qué sirve este documento:** León, Joymar y Jaunda están en **otros
> computadores**. Sin un acuerdo claro, dos personas editan el mismo archivo a
> la vez y se pisan los cambios. Aquí está el procedimiento para que eso no pase.

---

## 1. 🔴 Hallazgo crítico (Fase 0 — se corrige hoy)

| Dato | Valor |
|---|---|
| `.git` está en | `/Users/jhonpimiento` (tu **carpeta de usuario**) |
| Tamaño de esa carpeta | **94 GB** |
| Archivos trackeados | **0** |
| Único commit | `majito` → `Documents/JHON /MAJO/pag_quiz/index.html` (nada que ver con el proyecto) |
| Remoto | `https://github.com/jhonpi33/fichero.git` |
| `.gitignore` | **no existía** |

**Qué significa:** el proyecto `LAB_FICAT` **no está versionado**. Si alguien
ejecuta `git add .` desde tu home intentaría subir 94 GB a GitHub.

**Corrección:** mover el repositorio a la carpeta del proyecto e ignorar lo que
no debe subir. Detalle en `docs/LOG_CAMBIOS.md`.

---

## 2. Estructura del proyecto (dónde va cada cosa)

```
LAB_FICAT/
├── docs/                    ← documentación (lo que escribes tú)
├── src/                     ← FRONTEND Vue + Quasar   [Joymar y Jaunda]
│   ├── pages/               ← vistas (Login, Tracking, Survey, Module)
│   ├── components/          ← componentes reutilizables
│   ├── layouts/             ← estructura del panel
│   ├── router/              ← rutas y guardas de sesión
│   ├── stores/              ← Pinia (auth, theme)
│   ├── services/            ← capa de Axios  ← aquí se conecta al backend
│   └── mocks/               ← ⚠️ datos falsos, se va eliminando por fases
├── backend/                 ← API Node + Express       [León]
│   ├── src/
│   │   ├── config/          ← conexión a MongoDB Atlas
│   │   ├── models/          ← modelos Mongoose (25 colecciones)
│   │   ├── routes/          ← endpoints /api/...
│   │   ├── controllers/     ← lógica de cada endpoint
│   │   ├── middleware/      ← auth JWT, roles, validación, errores
│   │   ├── seed/            ← datos iniciales
│   │   └── server.js
│   └── .env                 ← 🔒 NO sube a GitHub
├── .env.example             ← plantilla SIN secretos (sí sube)
├── package.json             ← dependencias del frontend
└── vite.config.js
```

---

## 3. Ramas: quién trabaja dónde

| Rama | Para quién | Qué se hace ahí |
|---|---|---|
| `main` | nadie escribe directo | Solo se recibe lo ya probado |
| `develop` | todos leen | La línea de avance del proyecto |
| `fase/backend-auth` | León | API de autenticación |
| `fase/modelos` | Jhon | Modelos Mongoose |
| `fase/login-ui` | Joymar | Pantalla de login |
| `fase/seguimiento-ui` | Jaunda | Pantalla de seguimiento |

**Regla:** cada persona trabaja **solo en su rama** y nunca en `main`.

---

## 4. Flujo de trabajo diario (copiar y pegar)

### 4.1 Empezar el día

```bash
cd Documents/SENA/LAB_FICAT
git checkout develop
git pull origin develop          # traer lo que hicieron los demás
git checkout -b fase/mi-tarea    # crear mi rama
```

### 4.2 Trabajar

```bash
git add src/pages/LoginPage.vue  # SIEMPRE archivos concretos
git commit -m "feat: valida formato de correo en login"
```

> ⚠️ **Nunca** `git add .` sin revisar antes con `git status`.
> Esa es exactamente la forma en que se suben archivos que no deben subir.

### 4.3 Compartir con el equipo

```bash
push -u origin fase/mi-tarea     # (git push -u origin fase/mi-tarea)
```

Luego en GitHub se abre un **Pull Request** hacia `develop` y otro compañero
lo revisa antes de fusionar.

### 4.4 Integrar

```bash
git checkout develop
git pull origin develop
git merge fase/mi-tarea
git push origin develop
```

---

## 5. Qué hacer cuando hay conflicto

```
CONFLICT (content): Merge conflict in src/pages/LoginPage.vue
```

**No es un desastre.** Significa que dos personas tocaron el mismo tramo:

```bash
git status                      # ver los archivos en conflicto
# abrir el archivo: Git marca <<<<<<< y >>>>>>>
# dejar SOLO el código correcto, borrar los marcadores
git add src/pages/LoginPage.vue
git commit -m "resuelve conflicto en login"
git push origin develop
```

**Cómo se evita:** hablar antes de tocar un archivo compartido y editar
archivos distintos en paralelo.

---

## 6. Qué NUNCA subir a GitHub

Ya está cubierto por `.gitignore`, pero queda la lista explícita:

| Nunca subir | Por qué |
|---|---|
| `.env` | Tiene la contraseña de MongoDB Atlas |
| `node_modules/` | Se reinstalan con `npm install` |
| `dist/` | Se genera con `npm run build` |
| Respaldos `.bson` / `.json.gz` | Datos sensibles del laboratorio |
| `.DS_Store` | Basura de macOS |

**Cómo comparten secretos:** con el archivo `.env.example`, que contiene las
**llaves** pero **no los valores**:

```
MONGO_URI=mongodb+srv://USUARIO:CONTRASENA@...
JWT_SECRETO=
PUERTO=4000
```

Cada quien copia `.env.example` → `.env` en su equipo y pone sus valores.

---

## 7. Comandos de rescate

| Situación | Comando |
|---|---|
| Ver qué estoy por subir | `git status` |
| Ver mi historial | `git log --oneline -10` |
| Volver un archivo a como estaba | `git checkout -- archivo.vue` |
| Cancelar un commit malo | `git reset --soft HEAD~1` |
| Ver en qué rama estoy | `git branch` |
| Borrar una rama ya fusionada | `git branch -d fase/...` |
| Actualizarme sin merge | `git pull --rebase origin develop` |
