# 📒 LOG DE CAMBIOS · Bitácora del proyecto

> Cada entrada explica **qué** se hizo, **cómo** y **para qué**.
> Orden cronológico inverso (lo más nuevo arriba).

---

## 2026-10-09 · Entrada 001 — Conocimiento base y plan de fases

### Qué se hizo
1. Se analizó `REQUERIMIENTOS_LABORATORIO.docx` completo (ERS IEEE 830).
2. Se localizó y leyó `TABLAS MYSQL LABORATORIO.txt` (25 tablas).
3. Se revisó el estado actual del código (`src/`).
4. Se crearon los documentos `docs/00`, `docs/01` y `docs/03`.
5. Se creó el `.gitignore` del proyecto.

### Cómo se hizo
- Extracción del `.docx` con `textutil -convert txt -stdout` para poder
  buscar y numerar los requisitos sin abrir Word.
- Extracción de la lista exacta de requisitos con
  `grep -o "^RF-[0-9]*: .*"`, lo que confirmó **RF-001 → RF-112** y
  **RNF-001 → RNF-019** en los **11 módulos**.
- Lectura de `src/router/index.js`, `src/services/laboratory.js` y
  `src/stores/auth.js` para entender qué existe hoy.

### Para qué se hizo
Para tener un conocimiento único y verificable antes de planificar. El plan de
fases no se puede armar «a ojo»: tiene que cubrir los 112 RF y 19 RNF, o el
proyecto se entrega incompleto.

### Hallazgos
| Hallazgo | Impacto |
|---|---|
| El frontend es **100 % mock** (`src/mocks/data.js` + `services/laboratory.js`) | No hay backend ni BD: todo hay que construirlo |
| El repo Git está en `/Users/jhonpimiento` (94 GB) con **0 archivos trackeados** | 🔴 El proyecto no está versionado; `git add .` subiría 94 GB |
| No existía `.gitignore` | Riesgo de subir `node_modules/` y el `.env` con la contraseña de Atlas |
| Los requerimientos obligan a **MongoDB Atlas** (RNF-001, RNF-016) | Las 25 tablas MySQL son **diseño de referencia**, hay que traducirlas a colecciones |
| El puerto real de Vite es **5174**, no 5173 como dice `GUIA_ARRANQUE.md` | `GUIA_ARRANQUE.md` queda desactualizado |

### Lo que queda pendiente de esta entrada
- [ ] Corregir la ubicación del repositorio Git (Fase 0.1)
- [ ] Crear el cluster Atlas M0 (Fase 1.1)
- [ ] Recibir las colecciones en formato MongoDB del equipo
