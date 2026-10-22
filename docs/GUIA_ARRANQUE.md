# Guía de arranque y publicación · Laboratorio SENA

Cómo levantar el proyecto en local y compartirlo por internet con **Cloudflare Tunnel**.

---

## 0. Requisitos

| Requisito | Cómo verificarlo | Si no lo tienes |
|---|---|---|
| Node.js 18+ | `node -v` | <https://nodejs.org> |
| Dependencias instaladas | `npm install` | Ejecútalo dentro de `frontend/` |
| Cloudflared | `cloudflared --version` | `brew install cloudflared` |

> El frontend vive en `Documents/SENA/LAB_FICAT/frontend` y el backend en
> `Documents/SENA/LAB_FICAT/backend`. Los comandos de frontend se ejecutan
> desde la carpeta `frontend/`.

---

## 1. Arrancar el servicio en local

```bash
cd frontend
npm run dev
```

- Servidor local: **<http://localhost:5174>**
- Deja esa terminal abierta (si la cierras, se apaga).

**Verificación:** abre <http://localhost:5174> y debe cargar
*"Laboratorio de alimentos · SENA"*.

---

## 2. Compartir por internet (Cloudflared)

En una **segunda terminal**:

```bash
cloudflared tunnel --url http://localhost:5174
```

Cloudflared imprimirá algo como:

```
2026-10-01 INF |  https://hart-tiger-unavailable-wealth.trycloudflare.com  |
```

**Esa URL es la que compartes.** Copiar → pegar en el navegador del celular,
compañero o evaluador. Funciona desde cualquier red, sin abrir puertos.

**Verificación externa:** abre la URL en otro dispositivo/navegador y debe
cargar la misma app.

---

## 3. Opción rápida: todo en un solo comando

```bash
npm run tunel        # o ./tunel.sh
```

| Comando | Qué hace |
|---|---|
| `./tunel.sh` | Sube Vite (5174) si no vive + túnel con reintentos. Imprime la URL. |
| `./tunel.sh --nuevo` | Mata el túnel actual y genera **URL nueva**. |
| `./tunel.sh --parar` | Apaga el túnel. |

- Vigila y **relanza automáticamente** el túnel si se cae (5 s) y el servidor
  si muere.
- Logs en `.tunel/vite.log` y `.tunel/cloudflared.log`.

---

## 4. Cuentas de demostración

| Perfil (selector «Probar como…») | Correo | Contraseña |
|---|---|---|
| Encargado | `lab@sena.edu.co` | `Laboratorio2026` |
| Administrador | `admin@sena.edu.co` | `Admin2026` |
| Usuario / Cliente | `lectura@sena.edu.co` | `Lectura2026` |

El selector **«Probar como…»** aparece en el login y en el menú lateral
(solo en modo desarrollo).

---

## 5. Puertos

| Puerto | Uso |
|---|---|
| **5174** | Laboratorio SENA — el que va en el túnel |
| 4000 | Backend (API Express) |

Para ver qué hay en cada puerto:

```bash
lsof -nP -iTCP:5174 -sTCP:LISTEN
lsof -nP -iTCP:4000 -sTCP:LISTEN
```

---

## 6. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| URL da **502/500** | Se cayó Vite | `npm run dev` de nuevo (o `./tunel.sh`, que lo reinicia solo) |
| URL da **Error 1033/1016** | Se cayó el túnel | `./tunel.sh --nuevo` y comparte la URL nueva |
| La URL dejó de servir tras un rato | Las URLs `*.trycloudflare.com` son desechables: **cambian en cada reinicio** | Genera otra con `./tunel.sh --nuevo` |
| `Port already in use` | Algo ya usa el puerto | `lsof -nP -iTCP:5174 -sTCP:LISTEN` → identifica el PID y ciérralo |
| Quiero apagar todo | — | `pkill -f cloudflared` y `Ctrl+C` en la terminal de Vite |
| `cloudflared: command not found` | No está instalado | `brew install cloudflared` |

---

## 7. Resumen rápido (copiar y pegar)

**Terminal 1 — el servicio:**
```bash
cd frontend
npm run dev
```

**Terminal 2 — para compartir:**
```bash
cloudflared tunnel --url http://localhost:5174
```

**O todo junto:**
```bash
npm run tunel
```

Luego abre la URL `https://....trycloudflare.com` que aparezca y compártela. 🎉
