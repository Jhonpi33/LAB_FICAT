<script setup>
/**
 * /components/ActivityHeatmap.vue
 * Gráfico de actividad estilo "contribution graph" de GitHub (heatmap).
 *
 * Muestra 53 semanas × 7 días; cada celda se colorea según la actividad del
 * laboratorio de ese día (eventos + solicitudes + muestras + pagos + facturas
 * + incidencias, agregados por el backend en GET /eventos/actividad).
 */
import { computed, onMounted, ref } from 'vue'

import { get } from '@/services/api.service'

const SEMANAS = 53
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Escala de intensidad (teal/cian sobre el fondo oscuro del panel).
const NIVELES = [
  'rgba(148, 163, 184, 0.16)', // 0 · sin actividad
  'rgba(45, 212, 191, 0.28)', // 1
  'rgba(45, 212, 191, 0.48)', // 2
  'rgba(45, 212, 191, 0.72)', // 3
  '#2dd4bf', // 4+ · mucha actividad
]

const cargando = ref(true)
const error = ref(null)
const totalActividad = ref(0)
const conteos = ref(new Map())
const cargaNro = ref(0) // incrementa en cada carga para re-trigger la animación

// Rango: termina el SÁBADO de la semana actual (como GitHub) y retrocede
// 53 semanas. Así la columna final siempre es la semana en curso.
const hoyUtc = new Date()
hoyUtc.setUTCHours(12, 0, 0, 0)

const fin = new Date(hoyUtc)
fin.setUTCDate(fin.getUTCDate() + (6 - fin.getUTCDay())) // sábado de esta semana

const inicio = new Date(fin)
inicio.setUTCDate(inicio.getUTCDate() - (SEMANAS * 7 - 1))

const claveDe = (f) =>
  `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`

function nivelDe(n) {
  if (n <= 0) return 0
  if (n <= 1) return 1
  if (n <= 2) return 2
  if (n <= 4) return 3
  return 4
}

function textoDe(fecha, cantidad) {
  const f = fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  if (cantidad === 0) return `Sin actividad · ${f}`
  return `${cantidad} ${cantidad === 1 ? 'actividad' : 'actividades'} · ${f}`
}

const semanas = computed(() => {
  const lista = []
  for (let s = 0; s < SEMANAS; s++) {
    const dias = []
    for (let d = 0; d < 7; d++) {
      const fecha = new Date(inicio)
      fecha.setUTCDate(inicio.getUTCDate() + s * 7 + d)
      const clave = claveDe(fecha)
      const cantidad = conteos.value.get(clave) || 0
      const futuro = fecha.getTime() > hoyUtc.getTime()
      dias.push({
        clave,
        fecha,
        cantidad,
        futuro,
        activa: cantidad > 0 && !futuro,
        nivel: nivelDe(cantidad),
        texto: textoDe(fecha, cantidad),
        // Retraso en cascada (por columna + fila) para el efecto "ola".
        retraso: `${s * 14 + d * 5}ms`,
      })
    }
    lista.push(dias)
  }
  return lista
})

// Meses que empiezan en cada columna (para las etiquetas superiores).
const etiquetasMeses = computed(() => {
  const labels = []
  for (let s = 0; s < SEMANAS; s++) {
    const fecha = new Date(inicio)
    fecha.setUTCDate(inicio.getUTCDate() + s * 7)
    const mes = fecha.getUTCMonth()
    if (!labels.length || labels[labels.length - 1].mes !== mes) labels.push({ s, nombre: MESES[mes] })
  }
  return labels
})

const cargar = async () => {
  cargando.value = true
  error.value = null
  try {
    const datos = await get('/eventos/actividad')
    const mapa = new Map()
    let total = 0
    for (const item of datos) {
      mapa.set(item.fecha, item.cantidad)
      total += item.cantidad
    }
    conteos.value = mapa
    totalActividad.value = total
    cargaNro.value += 1 // re-trigger la animación de entrada
  } catch (e) {
    error.value = e.mensaje
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div class="heatmap">
    <!-- Encabezado: total + leyenda -->
    <div class="heatmap__cabecera">
      <div class="heatmap__total-box">
        <span class="heatmap__total">{{ totalActividad }}</span>
        <span class="heatmap__total-label">actividades en el último año</span>
      </div>

      <div class="heatmap__leyenda">
        <span class="heatmap__leyenda-texto">Menos</span>
        <span
          v-for="(color, i) in NIVELES"
          :key="i"
          class="heatmap__celda"
          :style="{ background: color }"
        />
        <span class="heatmap__leyenda-texto">Más</span>
      </div>
    </div>

    <!-- Estados -->
    <div v-if="cargando" class="heatmap__estado">
      <q-spinner-dots color="cyan-4" size="28px" />
      <span>Cargando actividad…</span>
    </div>

    <div v-else-if="error" class="heatmap__estado heatmap__estado--error">
      <q-icon name="error_outline" size="20px" />
      <span>{{ error }}</span>
    </div>

    <!-- Gráfico -->
    <template v-else>
      <div class="heatmap__scroll">
        <div class="heatmap__contenido">
          <!-- Etiquetas de meses -->
          <div class="heatmap__meses">
            <span
              v-for="m in etiquetasMeses"
              :key="m.s"
              class="heatmap__mes"
              :style="{ left: `${m.s * 15}px` }"
            >
              {{ m.nombre }}
            </span>
          </div>

          <!-- Cuerpo: días de la semana + celdas -->
          <div class="heatmap__cuerpo">
            <div class="heatmap__dias">
              <span style="top: 16px">lun</span>
              <span style="top: 46px">mié</span>
              <span style="top: 76px">vie</span>
            </div>

            <div class="heatmap__grid" :key="cargaNro">
              <template v-for="(semana, s) in semanas" :key="s">
                <span
                  v-for="dia in semana"
                  :key="dia.clave"
                  class="heatmap__celda"
                  :class="{ 'heatmap__celda--futuro': dia.futuro, 'heatmap__celda--activa': dia.activa }"
                  :style="{ background: dia.futuro ? 'transparent' : NIVELES[dia.nivel], '--d': dia.retraso }"
                >
                  <q-tooltip :delay="150" anchor="top middle" self="bottom middle" transition-show="scale" transition-hide="scale">
                    {{ dia.texto }}
                  </q-tooltip>
                </span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.heatmap {
  &__cabecera {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 14px;
  }

  &__total-box {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  &__total {
    font-size: 20px;
    font-weight: 800;
    color: #fff;
    font-variant-numeric: tabular-nums;
  }

  &__total-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
  }

  &__leyenda {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__leyenda-texto {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 4px;
  }

  &__estado {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 130px;
    color: rgba(255, 255, 255, 0.55);
    font-size: 13px;
  }

  &__estado--error {
    color: #fca5a5;
  }

  &__scroll {
    overflow-x: auto;
    padding-bottom: 4px;
  }

  &__contenido {
    width: max-content;
    min-width: 100%;
  }

  &__meses {
    position: relative;
    height: 18px;
    margin-left: 32px;
  }

  &__mes {
    position: absolute;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.45);
    text-transform: capitalize;
  }

  &__cuerpo {
    display: flex;
    gap: 6px;
  }

  &__dias {
    position: relative;
    width: 26px;
    flex-shrink: 0;

    span {
      position: absolute;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.45);
    }
  }

  &__grid {
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(7, 12px);
    gap: 3px;
  }
}

.heatmap__celda {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  animation: celda-aparecer 0.55s cubic-bezier(0.22, 0.9, 0.35, 1) both;
  animation-delay: var(--d, 0ms);
  transition: background-color 0.3s ease, transform 0.15s ease;

  &:hover {
    transform: scale(1.35);
  }

  &--futuro {
    border: 1px solid rgba(255, 255, 255, 0.06);
    animation: none;
  }

  // Celdas con actividad: además de aparecer, emiten un pulso de brillo
  // permanente para que el gráfico siempre se vea "vivo".
  &--activa {
    animation:
      celda-aparecer 0.55s cubic-bezier(0.22, 0.9, 0.35, 1) both,
      brillo-celda 2.4s ease-in-out infinite;
    animation-delay: var(--d, 0ms), calc(var(--d, 0ms) + 1s);
  }
}

@keyframes celda-aparecer {
  from {
    opacity: 0;
    transform: scale(0.25);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes brillo-celda {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(45, 212, 191, 0);
  }
  50% {
    box-shadow: 0 0 10px 2px rgba(45, 212, 191, 0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .heatmap__celda {
    animation: none !important;
  }
}
</style>
