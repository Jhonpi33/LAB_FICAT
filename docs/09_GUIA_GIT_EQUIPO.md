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

## 8. Resumen de bolsillo (copiar y pegar)

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
