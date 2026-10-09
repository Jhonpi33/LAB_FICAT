# Guía de arranque y publicación · Laboratorio SENA

Cómo levantar el proyecto en local y compartirlo por internet con **Cloudflare Tunnel**.

---

## 0. Requisitos

| Requisito | Cómo verificarlo | Si no lo tienes |
|---|---|---|
| Node.js 18+ | `node -v` | <https://nodejs.org> |
| Dependencias instaladas | `npm install` | Ejecútalo en la raíz del proyecto |
| Cloudflared | `cloudflared --version` | `brew install cloudflared` |

> Todo se ejecuta desde la raíz del proyecto: `Documents/SENA/LAB_FICAT`

---

## 1. Arrancar el servicio en local

```bash
npm run dev
```

- Servidor local: **<http://localhost:5173>**
- Deja esa terminal abierta (si la cierras, se apaga).

**Verificación:** abre <http://localhost:5173> y debe cargar
*"Laboratorio de alimentos · SENA"*.

> ⚠️ El proyecto puede arrancar en **5174** si el 5173 está ocupado por otro
> proceso. En ese caso revisa el puerto que imprime Vite en pantalla
> (`➜ Local: http://localhost:XXXX/`) y usa ese número en el túnel.

---

## 2. Compartir por internet (Cloudflared)

En una **segunda terminal**:

```bash
cloudflared tunnel --url http://localhost:5173
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
| `./tunel.sh` | Sube Vite (5173) si no vive + túnel con reintentos. Imprime la URL. |
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
| **5173** | Laboratorio SENA — el que va en el túnel |
| 5174 | Segunda instancia / sesión paralela (no usar para compartir) |

Para ver qué hay en cada puerto:

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
lsof -nP -iTCP:5174 -sTCP:LISTEN
```

---

## 6. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| URL da **502/500** | Se cayó Vite | `npm run dev` de nuevo (o `./tunel.sh`, que lo reinicia solo) |
| URL da **Error 1033/1016** | Se cayó el túnel | `./tunel.sh --nuevo` y comparte la URL nueva |
| La URL dejó de servir tras un rato | Las URLs `*.trycloudflare.com` son desechables: **cambian en cada reinicio** | Genera otra con `./tunel.sh --nuevo` |
| `Port already in use` | Algo ya usa el puerto | `lsof -nP -iTCP:5173 -sTCP:LISTEN` → identifica el PID y ciérralo |
| Quiero apagar todo | — | `pkill -f cloudflared` y `Ctrl+C` en la terminal de Vite |
| `cloudflared: command not found` | No está instalado | `brew install cloudflared` |

---

## 7. Resumen rápido (copiar y pegar)

**Terminal 1 — el servicio:**
```bash
npm run dev
```

**Terminal 2 — para compartir:**
```bash
cloudflared tunnel --url http://localhost:5173
```

**O todo junto:**
```bash
npm run tunel
```

Luego abre la URL `https://....trycloudflare.com` que aparezca y compártela. 🎉
