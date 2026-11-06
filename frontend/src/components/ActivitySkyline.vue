<script setup>
/**
 * /components/ActivitySkyline.vue
 * Skyline 3D de actividad estilo GitHub (contribution skyline), hecho con
 * CSS 3D puro: barras isométricas que crecen en ola, órbita arrastrable y
 * estadísticas (total, día más activo, rachas).
 *
 * Datos: GET /eventos/actividad?dias=... (actividad diaria del laboratorio).
 * La ventana la controla la prop "semanas" desde el panel (7D/30D/90D/12M).
 */
import { computed, onMounted, ref, watch } from 'vue'

import { get } from '@/services/api.service'

const props = defineProps({
  /** Semanas visibles (1, 5, 13 o 53). */
  semanas: { type: Number, default: 53 },
})

// --- Estado ------------------------------------------------------------------
const cargando = ref(true)
const error = ref(null)
const conteos = ref(new Map())
const cargaNro = ref(0)
const totalAnterior = ref(0)

// Órbita (grados) controlada con arrastre.
const orb = ref(0)
let arrastrando = false
let inicioX = 0
let inicioOrb = 0

const PASO = 15 // tamaño de celda + separación
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Color según la intensidad (verde de marca, tema claro).
const colorDe = (n) => {
  if (n <= 1) return '#c8e6c9'
  if (n <= 2) return '#81c784'
  if (n <= 4) return '#4caf50'
  return '#2e7d32'
}

// --- Calendario ---------------------------------------------------------------
const hoyUtc = new Date()
hoyUtc.setUTCHours(12, 0, 0, 0)

const fin = new Date(hoyUtc)
fin.setUTCDate(fin.getUTCDate() + (6 - fin.getUTCDay()))

const inicio = computed(() => {
  const d = new Date(fin)
  d.setUTCDate(d.getUTCDate() - (props.semanas * 7 - 1))
  return d
})

const claveDe = (f) =>
  `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`

const anchoPx = computed(() => props.semanas * PASO - 3)
const altoPx = 7 * PASO - 3

const dias = computed(() => {
  const lista = []
  for (let s = 0; s < props.semanas; s++) {
    for (let d = 0; d < 7; d++) {
      const fecha = new Date(inicio.value)
      fecha.setUTCDate(inicio.value.getUTCDate() + s * 7 + d)
      const clave = claveDe(fecha)
      const cantidad = conteos.value.get(clave) || 0
      lista.push({
        clave,
        fecha,
        cantidad,
        activa: cantidad > 0,
        x: s * PASO,
        y: d * PASO,
        retraso: `${s * 12 + d * 4}ms`,
      })
    }
  }
  return lista
})

const barras = computed(() =>
  dias.value
    .filter((dia) => dia.activa)
    .map((dia) => ({
      ...dia,
      color: colorDe(dia.cantidad),
      altura: Math.max(6, Math.min(110, dia.cantidad * 6)),
      texto: `${dia.cantidad} ${dia.cantidad === 1 ? 'actividad' : 'actividades'} · ${dia.fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    })),
)

// --- Estadísticas (como el skyline de GitHub) ----------------------------------
const etiquetaPeriodo = computed(() => {
  if (props.semanas <= 1) return 'en la última semana'
  if (props.semanas <= 5) return 'en el último mes'
  if (props.semanas <= 13) return 'en los últimos 3 meses'
  return 'en el último año'
})

const totalActividad = computed(() => dias.value.reduce((acc, d) => acc + d.cantidad, 0))

/** Variación del total frente al período anterior (misma cantidad de días). */
const variacion = computed(() => {
  if (!totalAnterior.value && !totalActividad.value) return null
  if (!totalAnterior.value) return 100
  return Math.round(((totalActividad.value - totalAnterior.value) / totalAnterior.value) * 100)
})

const diasConActividad = computed(() => barras.value.length)

const promedioDiario = computed(() => {
  const diasTotal = props.semanas * 7
  return (totalActividad.value / diasTotal).toFixed(1)
})

const diaMasActivo = computed(() =>
  dias.value.reduce((mejor, d) => (d.cantidad > mejor.cantidad ? d : mejor), { cantidad: 0, fecha: null }),
)

const fechaMasActivo = computed(() => {
  if (!diaMasActivo.value.fecha) return '—'
  return diaMasActivo.value.fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
})

const rachaMaxima = computed(() => {
  let max = 0
  let actual = 0
  for (const dia of dias.value) {
    actual = dia.cantidad > 0 ? actual + 1 : 0
    max = Math.max(max, actual)
  }
  return max
})

const rachaActual = computed(() => {
  const cursor = new Date(hoyUtc)
  if (!conteos.value.has(claveDe(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1)
  let racha = 0
  while (conteos.value.has(claveDe(cursor))) {
    racha += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return racha
})

// Etiquetas de meses para el borde superior del plano.
const etiquetasMeses = computed(() => {
  const labels = []
  for (let s = 0; s < props.semanas; s++) {
    const fecha = new Date(inicio.value)
    fecha.setUTCDate(inicio.value.getUTCDate() + s * 7)
    const mes = fecha.getUTCMonth()
    if (!labels.length || labels[labels.length - 1].mes !== mes) labels.push({ s, mes, nombre: MESES[mes] })
  }
  return labels
})

// --- Órbita con arrastre --------------------------------------------------------
function alPresionar(e) {
  arrastrando = true
  inicioX = e.clientX
  inicioOrb = orb.value
}

function alMover(e) {
  if (!arrastrando) return
  orb.value = inicioOrb + (e.clientX - inicioX) * 0.35
}

function alSoltar() {
  arrastrando = false
}

function alDobleClic() {
  orb.value = 0
}

// --- Carga de datos --------------------------------------------------------------
const cargar = async () => {
  cargando.value = true
  error.value = null
  try {
    // Se pide el DOBLE de días para comparar con el período anterior.
    const datos = await get(`/eventos/actividad?dias=${props.semanas * 7 * 2}`)
    const mapa = new Map()
    const limite = claveDe(inicio.value)
    let previo = 0
    for (const item of datos) {
      mapa.set(item.fecha, item.cantidad)
      if (item.fecha < limite) previo += item.cantidad
    }
    conteos.value = mapa
    totalAnterior.value = previo
    cargaNro.value += 1
  } catch (e) {
    error.value = e.mensaje
  } finally {
    cargando.value = false
  }
}

watch(() => props.semanas, cargar)
onMounted(cargar)
</script>

<template>
  <div class="skyline">
    <!-- Estadísticas -->
    <div class="skyline__stats">
      <div class="stat">
        <span class="stat__num">{{ totalActividad }}</span>
        <span class="stat__texto">actividades {{ etiquetaPeriodo }}</span>
      </div>
      <div class="stat" v-if="variacion !== null">
        <span class="stat__num" :class="variacion > 0 ? 'stat__num--sube' : variacion < 0 ? 'stat__num--baja' : ''">
          <q-icon :name="variacion > 0 ? 'arrow_upward' : variacion < 0 ? 'arrow_downward' : 'remove'" size="14px" />
          {{ Math.abs(variacion) }}%
        </span>
        <span class="stat__texto">vs. el período anterior</span>
      </div>
      <div class="stat">
        <span class="stat__num">{{ diaMasActivo.cantidad }}</span>
        <span class="stat__texto">el día más activo · {{ fechaMasActivo }}</span>
      </div>
      <div class="stat">
        <span class="stat__num">{{ diasConActividad }}</span>
        <span class="stat__texto">{{ diasConActividad === 1 ? 'día' : 'días' }} con actividad</span>
      </div>
      <div class="stat">
        <span class="stat__num">{{ promedioDiario }}</span>
        <span class="stat__texto">promedio por día</span>
      </div>
      <div class="stat">
        <span class="stat__num">{{ rachaMaxima }}</span>
        <span class="stat__texto">{{ rachaMaxima === 1 ? 'día' : 'días' }} · racha más larga</span>
      </div>
      <div class="stat">
        <span class="stat__num">{{ rachaActual }}</span>
        <span class="stat__texto">{{ rachaActual === 1 ? 'día' : 'días' }} · racha actual</span>
      </div>
    </div>

    <!-- Estados -->
    <div v-if="cargando" class="skyline__estado">
      <q-spinner-dots color="green-8" size="28px" />
      <span>Cargando actividad…</span>
    </div>

    <div v-else-if="error" class="skyline__estado skyline__estado--error">
      <q-icon name="error_outline" size="20px" />
      <span>{{ error }}</span>
    </div>

    <!-- Escena 3D -->
    <div
      v-else
      class="skyline__escena"
      :class="{ 'skyline__escena--arrastrando': arrastrando }"
      @pointerdown="alPresionar"
      @pointermove="alMover"
      @pointerup="alSoltar"
      @pointercancel="alSoltar"
      @pointerleave="alSoltar"
      @dblclick="alDobleClic"
    >
      <div class="skyline__orbita" :style="{ '--orb': orb + 'deg' }">
        <div
          class="skyline__plano"
          :key="cargaNro"
          :style="{ width: anchoPx + 'px', height: altoPx + 'px' }"
        >
          <!-- Etiquetas de meses (borde superior, giran con el plano) -->
          <span
            v-for="m in etiquetasMeses"
            :key="m.s"
            class="skyline__mes"
            :style="{ left: `${m.s * 15 - 14}px` }"
          >
            {{ m.nombre }}
          </span>

          <!-- Etiquetas de días (borde izquierdo, giran con el plano) -->
          <span class="skyline__dia" style="top: 16px">lun</span>
          <span class="skyline__dia" style="top: 46px">mié</span>
          <span class="skyline__dia" style="top: 76px">vie</span>

          <span
            v-for="barra in barras"
            :key="barra.clave"
            class="bar3d"
            :class="{ 'bar3d--estrella': barra.clave === diaMasActivo.clave }"
            :style="{
              left: barra.x + 'px',
              top: barra.y + 'px',
              '--h': barra.altura + 'px',
              '--d': barra.retraso,
              color: barra.color,
            }"
          >
            <q-tooltip :delay="120" anchor="top middle" self="bottom middle" transition-show="scale" transition-hide="scale">
              {{ barra.texto }}
            </q-tooltip>
          </span>
        </div>
      </div>

      <div v-if="!barras.length" class="skyline__vacio">
        Sin actividad en el período seleccionado.
      </div>
    </div>

    <!-- Pie: leyenda + pista -->
    <div class="skyline__pie">
      <div class="skyline__leyenda">
        <span>Menos</span>
        <span v-for="n in 5" :key="n" class="skyline__punto" :style="{ background: colorDe(n === 5 ? 9 : n) }" />
        <span>Más</span>
      </div>
      <div class="skyline__pista">
        <q-icon name="pan_tool_alt" size="14px" />
        Arrastra para rotar · doble clic para restablecer
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.skyline {
  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    margin-bottom: 16px;
  }

  &__estado {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 240px;
    color: #8a978d;
    font-size: 13px;
  }

  &__estado--error {
    color: #b71c1c;
  }

  // Escena con perspectiva para el 3D
  &__escena {
    position: relative;
    height: 330px;
    perspective: 1300px;
    cursor: grab;
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
    overflow: hidden;
    border-radius: 12px;
    background: radial-gradient(600px 300px at 50% 10%, rgba(200, 230, 201, 0.35), transparent 70%);
  }

  &__escena--arrastrando {
    cursor: grabbing;
  }

  // Rota según el arrastre del usuario
  &__orbita {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transform-style: preserve-3d;
    transform: rotateX(58deg) rotateZ(calc(45deg + var(--orb, 0deg)));
    transition: transform 0.35s cubic-bezier(0.22, 0.9, 0.35, 1);
  }

  // Plano del "piso" con rejilla sutil
  &__plano {
    position: relative;
    flex-shrink: 0;
    transform-style: preserve-3d;
    background:
      repeating-linear-gradient(0deg, rgba(46, 125, 50, 0.07) 0 1px, transparent 1px 15px),
      repeating-linear-gradient(90deg, rgba(46, 125, 50, 0.07) 0 1px, transparent 1px 15px),
      #fcfefc;
    border: 1px solid #dbe7dc;
    border-radius: 6px;
    animation: flotar 7s ease-in-out infinite;
  }

  // Etiquetas de meses sobre el borde superior del plano (isométricas)
  &__mes {
    position: absolute;
    top: -24px;
    font-size: 11px;
    font-weight: 700;
    color: #6b786d;
    letter-spacing: 0.3px;
  }

  // Etiquetas de días sobre el borde izquierdo del plano
  &__dia {
    position: absolute;
    left: -36px;
    width: 30px;
    text-align: right;
    font-size: 10px;
    color: #8a978d;
  }

  &__vacio {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8a978d;
    font-size: 13px;
    pointer-events: none;
  }

  &__pie {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }

  &__leyenda {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    color: #8a978d;
  }

  &__punto {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    display: inline-block;
  }

  &__pista {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #6b786d;
  }
}

// --- Barras 3D (cubo isométrico por día) ------------------------------------------
.bar3d {
  position: absolute;
  width: 12px;
  height: 12px;
  transform-style: preserve-3d;
  transform: translateZ(0);
  transition: transform 0.15s ease, filter 0.15s ease;
  cursor: pointer;

  // Cara superior (color del día)
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 1.5px;
    background: currentColor;
    transform: translateZ(var(--h));
    animation: subir 0.9s cubic-bezier(0.22, 0.9, 0.35, 1) both;
    animation-delay: var(--d, 0ms);
  }

  // Cara lateral (profundidad de la barra)
  &::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    width: 12px;
    height: var(--h);
    border-radius: 1.5px;
    background: currentColor;
    filter: brightness(0.72);
    transform-origin: bottom;
    transform: rotateX(-90deg);
    animation: crecer 0.9s cubic-bezier(0.22, 0.9, 0.35, 1) both;
    animation-delay: var(--d, 0ms);
  }

  &:hover {
    transform: translateZ(7px);
    filter: brightness(1.15);
  }

  // Día más activo: brillo pulsante
  &--estrella::before {
    animation:
      subir 0.9s cubic-bezier(0.22, 0.9, 0.35, 1) both,
      brillo 2.4s ease-in-out infinite;
    animation-delay: var(--d, 0ms), calc(var(--d, 0ms) + 1.1s);
  }
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  background: #fafcfa;
  border: 1px solid #e9ede9;
  border-radius: 10px;
}

.stat__num {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 20px;
  font-weight: 800;
  color: #1b5e20;
  line-height: 1;
  font-variant-numeric: tabular-nums;

  &--sube {
    color: #2e7d32;
  }

  &--baja {
    color: #b71c1c;
  }
}

.stat__texto {
  font-size: 11.5px;
  color: #7d8a80;
}

// --- Animaciones --------------------------------------------------------------------
@keyframes subir {
  from {
    transform: translateZ(0);
  }
}

@keyframes crecer {
  from {
    height: 0;
  }
}

@keyframes flotar {
  0%,
  100% {
    transform: translateZ(0);
  }
  50% {
    transform: translateZ(9px);
  }
}

@keyframes brillo {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(46, 125, 50, 0);
  }
  50% {
    box-shadow: 0 0 14px 3px rgba(46, 125, 50, 0.65);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bar3d::before,
  .bar3d::after,
  .bar3d--estrella::before,
  .skyline__plano {
    animation: none !important;
  }

  .skyline__orbita {
    transition: none;
  }
}
</style>
