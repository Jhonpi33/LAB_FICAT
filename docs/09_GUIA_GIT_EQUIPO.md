# 🔀 Guía práctica de Git para el equipo (bajar, trabajar y fusionar sin pisarse)

> **Para qué sirve:** saber **cómo bajar** los cambios de los demás, **cómo
> subir** los propios y **cómo fusionar** todo en la rama `DV` sin que nadie
> borre el trabajo de otro.
>
> Regla de oro: **nadie trabaja directo en `DV`**. Cada tarea se hace en una
> rama propia y se fusiona al final.

---

## 1. Conceptos en 4 líneas

| Palabra | Qué significa |
|---|---|
| `DV` | La rama principal del equipo (aquí vive el código "oficial") |
| **rama propia** | Una copia donde trabajas sin molestar a nadie |
| `pull` | **Bajar** lo último que subieron los demás |
| `merge` | **Unir** tu trabajo con el de los demás |

---

## 2. Primera vez (solo una vez por computador)

```bash
git clone https://github.com/Jhonpi33/LAB_FICAT.git
cd LAB_FICAT
git checkout DV
```

Luego, cada proyecto necesita sus dependencias y sus `.env` (ver
[`docs/08_GUIA_CLONAR_EJECUTAR.md`](08_GUIA_CLONAR_EJECUTAR.md)).

---

## 3. Antes de empezar a trabajar (SIEMPRE)

Baja lo último del equipo **antes de tocar nada**:

```bash
git checkout DV
git pull leon DV
```

> Si te sale un error de "changes not staged", revisa la §6 (no pierdas tu
> trabajo).

---

## 4. Trabajar en una tarea (el flujo de siempre)

**1) Crear tu rama desde el DV actualizado:**

```bash
git checkout -b mi-tarea
# ejemplo: git checkout -b joymar-notificaciones
```

**2) Programar normalmente y guardar avances** (commits pequeños y claros):

```bash
git add .                      # agrega TODO lo que cambiaste
git commit -m "feat(notificaciones): agrego el botón de reenvío"
```

> Commits pequeños = si algo sale mal, se puede deshacer sin drama.
> Mensaje claro = los demás entienden qué hiciste sin abrir el código.

**3) Subir tu rama a GitHub:**

```bash
git push -u leon mi-tarea
```

Con eso tu trabajo queda **respaldado en la nube**, aunque tu rama todavía no
esté fusionada.

---

## 5. Fusionar con DV (cuando la tarea está lista)

### Opción A — Con Pull Request (recomendado)

1. Entra a `github.com/Jhonpi33/LAB_FICAT`.
2. GitHub te mostrará el botón **"Compare & pull request"** de tu rama.
3. Créalo, ponle título claro y avisa en el grupo para que otro revise.
4. El que revisa hace clic en **"Merge pull request"**.
5. Listo: tu trabajo ya está en `DV`.

> Ventaja: otro par de ojos revisa antes de fusionar y los conflictos se
> resuelven desde la web.

### Opción B — Fusionar tú mismo (si el equipo lo acuerda)

```bash
git checkout DV
git pull leon DV          # ← traer lo más nuevo de los demás
git merge mi-tarea        # ← unir tu rama aquí
git push leon DV          # ← subir el resultado
```

---

## 6. ⚠️ Qué hacer cuando algo se complica

### "No me deja hacer checkout/pull porque tengo cambios sin guardar"

```bash
git status                 # ver qué está pendiente
git add . && git commit -m "wip: avance sin terminar"
```

> Un commit "wip" (work in progress) guarda lo tuyo y te deja moverte. Nadie
> pierde nada: todo queda en el historial.

### "Me salió CONFLICTO al hacer merge" (dos personas tocaron el mismo archivo)

No es grave. Git marca el archivo así:

```
<<<<<<< HEAD
lo que hay en DV (de tu compañero)
=======
lo que cambiaste tú
>>>>>>> mi-tarea
```

**Cómo se resuelve:**

1. Abre el archivo y **decide qué se queda** (a veces se quedan las dos cosas).
2. Borra las líneas `<<<<<<<`, `=======` y `>>>>>>>`.
3. Guarda y dile a Git que ya quedó:

```bash
git add archivo-conflictivo.vue
git commit -m "merge: resuelvo conflicto en archivo-conflictivo"
git push leon DV
```

### "Fusioné algo y quiero volver atrás"

```bash
git log --oneline -5        # ver los últimos commits
git revert <código-del-commit>   # deshace ESE cambio sin borrar el historial
```

---

## 7. 🔒 Qué NO se toca ni se sube nunca

| Qué | Por qué |
|---|---|
| `backend/.env` y `frontend/.env` | Tienen claves (MongoDB, JWT). **Ya están en `.gitignore`**: aunque hagas `git add .`, no se suben. Cada quien tiene el suyo. |
| `node_modules/` y `dist/` | Se generan solos con `npm install` / `npm run build`. Ignorados. |
| Archivos de otro módulo sin avisar | Si dos editan el mismo archivo a la vez → conflicto. **Avisa en el grupo qué archivo vas a tocar.** |
| La rama `DV` directamente | Solo recibe fusiones, nunca trabajo directo. |

---

## 8. 👥 Trabajar EN PARALELO en módulos distintos (el caso del equipo)

**Escenario:** Jaunda mejora **Clientes** y Joymar mejora **Notificaciones**,
los dos al mismo tiempo. ¿Se pisan? **No**, si cada uno toca solo los archivos
de su módulo. Así funciona:

### Por qué NO se pisan

| Persona | Rama | Archivos que toca |
|---|---|---|
| Jaunda | `jaunda-clientes` | `frontend/src/views/ClientesView.vue` |
| Joymar | `joymar-notificaciones` | `frontend/src/views/NotificacionesView.vue` |

Como son **archivos distintos**, Git puede unir las dos ramas en `DV` **sin un
solo conflicto**, en el orden que sea. Los dos trabajos quedan los dos.

### La línea de tiempo, paso a paso

```
1) Ambos parten del mismo punto:
   git checkout DV && git pull leon DV
   Jaunda:  git checkout -b jaunda-clientes
   Joymar:  git checkout -b joymar-notificaciones

2) Cada uno trabaja en SU archivo y sube su rama:
   Jaunda:  git add . && git commit -m "mejoro vista de clientes"
            git push -u leon jaunda-clientes
   Joymar:  git add . && git commit -m "mejoro bandeja de notificaciones"
            git push -u leon joymar-notificaciones

3) Jaunda termina primero → su Pull Request se fusiona en DV.
   (DV ahora tiene el trabajo de Jaunda)

4) Joymar termina después. Antes de su Pull Request, DV ya trae lo de Jaunda.
   GitHub le dice "This branch has no conflicts" porque tocaron archivos
   distintos → Merge directo.

5) Resultado: DV tiene lo de CLIENTES ✅ y lo de NOTIFICACIONES ✅.
   Nadie perdió nada, nadie esperó a nadie.
```

### ⚠️ Los 4 archivos COMPARTIDOS (aquí sí hay que coordinar)

Hay archivos que TODOS necesitan tocar alguna vez. Son estos:

| Archivo | Quién lo toca | Cómo evitar líos |
|---|---|---|
| `frontend/src/router/index.js` | El que agregue una vista nueva | Avisar en el grupo: "hoy agrego la ruta de X" |
| `frontend/src/layouts/AdminLayout.vue` | El que agregue ítems al menú | Igual: avisar antes |
| `backend/src/app.js` | El que agregue rutas del backend | Igual: avisar antes |
| `docs/00_INDICE.md` | Cualquiera al documentar | Sin miedo: Git lo une solo si editan líneas distintas |

> Aun así, tranquilos: Git fusiona **línea por línea**. Si Jaunda agregó el ítem
> "Clientes" al menú en la línea 40 y Joymar agregó "Notificaciones" en la
> línea 50, el merge **une las dos líneas solo**. El conflicto solo aparece
> si los dos editaron **la misma línea** — y eso se resuelve en 1 minuto (§6).

### Regla práctica del grupo

> 📌 **Reparto de módulos en el grupo antes de empezar la semana:**
> *"Jaunda: clientes · Joymar: notificaciones · León: informes · Jhon: panel."*
>
> Cada uno toca **solo lo suyo**. Los archivos compartidos se tocan de a uno y
> avisando. Con eso, las fusiones son automáticas y nadie espera a nadie.

---

## 9. Resumen de bolsillo (copiar y pegar)

```bash
# ── Cada día, antes de trabajar ──
git checkout DV
git pull leon DV

# ── Nueva tarea ──
git checkout -b mi-tarea

# ── Guardar avances ──
git add .
git commit -m "descripción corta de lo que hice"

# ── Subir mi rama ──
git push -u leon mi-tarea

# ── Fusionar (si me toca a mí) ──
git checkout DV
git pull leon DV
git merge mi-tarea
git push leon DV

# ── ¿Qué estoy haciendo? ──
git status
```

> Si algo sale raro: **no borres la carpeta del proyecto**. Casi todo se
> arregla con `git status` para ver qué pasa y `git commit` para no perder
> trabajo. Y pregunta en el grupo antes de ejecutar comandos que no conoces.
