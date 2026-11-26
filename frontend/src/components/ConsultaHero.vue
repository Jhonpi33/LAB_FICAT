<script setup>
/**
 * /components/ConsultaHero.vue
 * Ilustración animada para la consulta pública de muestras.
 *
 * Un matraz de laboratorio (el mismo símbolo del logo) con líquido que se
 * llena, burbujas, moléculas orbitando y una lupa que late. Las animaciones
 * usan anime.js v4 y respetan `prefers-reduced-motion`.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { animate, createTimeline, stagger } from 'animejs'

const props = defineProps({
  /** Se pone en true mientras se consulta una muestra. */
  activo: { type: Boolean, default: false },
})

const raiz = ref(null)
const animaciones = []
let reducido = false

// IDs únicos para los gradientes y el clip del SVG.
let contador = 0
const uid = `arte-${++contador}`
const idLiquido = `${uid}-liquido`
const idHalo = `${uid}-halo`
const idClip = `${uid}-clip`

const q = (selector) => raiz.value?.querySelector(selector) ?? null
const qa = (selector) => (raiz.value ? Array.from(raiz.value.querySelectorAll(selector)) : [])

function guardar(animacion) {
  if (animacion) animaciones.push(animacion)
  return animacion
}

function prefiereMenosMovimiento() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

onMounted(() => {
  reducido = prefiereMenosMovimiento()
  if (reducido || !raiz.value) return

  // --- Entrada ------------------------------------------------------------
  const linea = createTimeline({ defaults: { ease: 'outCubic' } })
  linea.add(q('.halo'), { scale: [0.82, 1], opacity: [0, 1], duration: 800 }, 0)
  linea.add(q('.matraz'), { opacity: [0, 1], translateY: [22, 0], duration: 800 }, 120)
  linea.add(q('.liquido-grupo'), { scaleY: [0, 1], duration: 950 }, 420)
  linea.add(q('.lupa'), { opacity: [0, 1], scale: [0.6, 1], duration: 600, ease: 'outBack' }, 900)
  guardar(linea)

  // --- Burbujas -----------------------------------------------------------
  qa('.burbuja').forEach((burbuja, i) => {
    const inicio = Number(burbuja.getAttribute('cy')) || 270
    guardar(
      animate(burbuja, {
        cy: [inicio, 214],
        opacity: [0, 0.9, 0],
        duration: 2600 + i * 380,
        delay: 1200 + i * 320,
        loop: true,
        ease: 'inOutSine',
      }),
    )
  })

  // --- Moléculas orbitando ------------------------------------------------
  qa('.orbita').forEach((orbita, i) => {
    const horario = i % 2 === 0
    guardar(
      animate(orbita, {
        rotate: horario ? [0, 360] : [360, 0],
        duration: 24000 + i * 7000,
        loop: true,
        ease: 'linear',
      }),
    )
  })

  // --- Lupa: pulso --------------------------------------------------------
  guardar(
    animate(q('.lupa'), {
      scale: [1, 1.07, 1],
      duration: 3600,
      delay: 1600,
      loop: true,
      ease: 'inOutSine',
    }),
  )

  // --- Destellos ----------------------------------------------------------
  guardar(
    animate(qa('.destello'), {
      opacity: [0.15, 0.9, 0.15],
      duration: 2800,
      delay: stagger(500),
      loop: true,
      ease: 'inOutSine',
    }),
  )

  // --- Halo: respiración suave -------------------------------------------
  guardar(
    animate(q('.halo'), {
      scale: [1, 1.035, 1],
      duration: 7000,
      delay: 900,
      loop: true,
      ease: 'inOutSine',
    }),
  )

  // --- Anillo punteado: giro lento ---------------------------------------
  guardar(
    animate(q('.anillo'), {
      rotate: [0, 360],
      duration: 60000,
      loop: true,
      ease: 'linear',
    }),
  )
})

watch(
  () => props.activo,
  (valor) => {
    if (!valor || reducido || !raiz.value) return

    guardar(
      animate(q('.onda'), {
        r: [8, 150],
        opacity: [0.5, 0],
        duration: 900,
        ease: 'outCubic',
      }),
    )
    guardar(
      animate(q('.liquido-grupo'), {
        skewX: [0, 3, -3, 0],
        duration: 700,
        ease: 'inOutSine',
      }),
    )
    guardar(
      animate(q('.lupa'), {
        rotate: [0, -12, 0],
        duration: 700,
        ease: 'inOutSine',
      }),
    )
  },
)

onBeforeUnmount(() => {
  animaciones.forEach((animacion) => animacion?.revert?.())
  animaciones.length = 0
})
</script>

<template>
  <div ref="raiz" class="consulta-arte" aria-hidden="true">
    <svg class="arte-svg" viewBox="0 0 360 360" role="presentation" focusable="false">
      <defs>
        <linearGradient :id="idLiquido" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#a5d6a7" />
          <stop offset="55%" stop-color="#66bb6a" />
          <stop offset="100%" stop-color="#1b5e20" />
        </linearGradient>

        <radialGradient :id="idHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#c8e6c9" stop-opacity="0.6" />
          <stop offset="65%" stop-color="#e8f5e9" stop-opacity="0.28" />
          <stop offset="100%" stop-color="#e8f5e9" stop-opacity="0" />
        </radialGradient>

        <clipPath :id="idClip">
          <path d="M 166 128 L 104 272 Q 100 296 124 296 L 236 296 Q 260 296 256 272 L 194 128 Z" />
        </clipPath>
      </defs>

      <!-- Halo y anillo -->
      <circle class="halo" cx="180" cy="185" r="132" :fill="`url(#${idHalo})`" />
      <circle
        class="anillo"
        cx="180"
        cy="185"
        r="118"
        fill="none"
        stroke="#c8e6c9"
        stroke-width="1.5"
        stroke-dasharray="4 10"
        opacity="0.75"
      />

      <!-- Destellos -->
      <g class="destellos">
        <circle class="destello" cx="118" cy="88" r="2.6" fill="#81c784" />
        <circle class="destello" cx="252" cy="72" r="2" fill="#a5d6a7" />
        <circle class="destello" cx="64" cy="246" r="2.2" fill="#c8e6c9" />
        <circle class="destello" cx="300" cy="160" r="2" fill="#81c784" />
      </g>

      <!-- Moléculas orbitando -->
      <g class="orbita">
        <g transform="translate(290 100)">
          <line x1="0" y1="0" x2="20" y2="-12" stroke="#a5d6a7" stroke-width="2" stroke-linecap="round" />
          <line x1="0" y1="0" x2="-16" y2="10" stroke="#a5d6a7" stroke-width="2" stroke-linecap="round" />
          <line x1="20" y1="-12" x2="34" y2="0" stroke="#c8e6c9" stroke-width="2" stroke-linecap="round" />
          <circle cx="0" cy="0" r="7" fill="#66bb6a" />
          <circle cx="20" cy="-12" r="4.5" fill="#81c784" />
          <circle cx="-16" cy="10" r="4" fill="#a5d6a7" />
          <circle cx="34" cy="0" r="3.5" fill="#c8e6c9" />
        </g>
      </g>

      <g class="orbita">
        <g transform="translate(70 172) scale(0.85)">
          <line x1="0" y1="0" x2="20" y2="-12" stroke="#a5d6a7" stroke-width="2" stroke-linecap="round" />
          <line x1="0" y1="0" x2="-16" y2="10" stroke="#a5d6a7" stroke-width="2" stroke-linecap="round" />
          <line x1="20" y1="-12" x2="34" y2="0" stroke="#c8e6c9" stroke-width="2" stroke-linecap="round" />
          <circle cx="0" cy="0" r="7" fill="#66bb6a" />
          <circle cx="20" cy="-12" r="4.5" fill="#81c784" />
          <circle cx="-16" cy="10" r="4" fill="#a5d6a7" />
          <circle cx="34" cy="0" r="3.5" fill="#c8e6c9" />
        </g>
      </g>

      <g class="orbita">
        <g transform="translate(104 292) scale(0.7)">
          <line x1="0" y1="0" x2="20" y2="-12" stroke="#a5d6a7" stroke-width="2" stroke-linecap="round" />
          <line x1="0" y1="0" x2="-16" y2="10" stroke="#a5d6a7" stroke-width="2" stroke-linecap="round" />
          <line x1="20" y1="-12" x2="34" y2="0" stroke="#c8e6c9" stroke-width="2" stroke-linecap="round" />
          <circle cx="0" cy="0" r="7" fill="#66bb6a" />
          <circle cx="20" cy="-12" r="4.5" fill="#81c784" />
          <circle cx="-16" cy="10" r="4" fill="#a5d6a7" />
          <circle cx="34" cy="0" r="3.5" fill="#c8e6c9" />
        </g>
      </g>

      <!-- Sombra -->
      <ellipse cx="180" cy="306" rx="82" ry="10" fill="#1b5e20" opacity="0.06" />

      <!-- Matraz -->
      <g class="matraz">
        <path
          d="M 166 64 L 166 128 L 104 272 Q 100 296 124 296 L 236 296 Q 260 296 256 272 L 194 128 L 194 64"
          fill="#ffffff"
          fill-opacity="0.65"
          stroke="#2e7d32"
          stroke-width="5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <path d="M 157 64 L 203 64" stroke="#2e7d32" stroke-width="7" stroke-linecap="round" />

        <g :clip-path="`url(#${idClip})`">
          <g class="liquido-grupo">
            <rect
              class="liquido"
              x="92"
              y="206"
              width="176"
              height="94"
              :fill="`url(#${idLiquido})`"
            />
            <ellipse class="superficie" cx="180" cy="207" rx="50" ry="6" fill="#a5d6a7" opacity="0.9" />
          </g>

          <g class="burbujas">
            <circle class="burbuja" cx="158" cy="274" r="5" fill="#c8e6c9" opacity="0" />
            <circle class="burbuja" cx="184" cy="286" r="3.5" fill="#e8f5e9" opacity="0" />
            <circle class="burbuja" cx="206" cy="268" r="4.5" fill="#c8e6c9" opacity="0" />
            <circle class="burbuja" cx="172" cy="280" r="2.8" fill="#e8f5e9" opacity="0" />
            <circle class="burbuja" cx="196" cy="282" r="3.2" fill="#c8e6c9" opacity="0" />
            <circle class="burbuja" cx="148" cy="288" r="2.4" fill="#e8f5e9" opacity="0" />
          </g>
        </g>

        <!-- Brillo del cristal -->
        <path
          d="M 150 150 Q 134 200 130 244"
          fill="none"
          stroke="#ffffff"
          stroke-width="7"
          stroke-linecap="round"
          opacity="0.75"
        />
        <path
          d="M 214 158 Q 226 200 230 236"
          fill="none"
          stroke="#ffffff"
          stroke-width="4"
          stroke-linecap="round"
          opacity="0.4"
        />
      </g>

      <!-- Onda al consultar -->
      <circle class="onda" cx="180" cy="216" r="8" fill="none" stroke="#66bb6a" stroke-width="3" opacity="0" />

      <!-- Lupa -->
      <g class="lupa">
        <circle cx="288" cy="258" r="27" fill="#ffffff" stroke="#2e7d32" stroke-width="6" />
        <circle cx="288" cy="258" r="18" fill="#e8f5e9" />
        <path
          d="M 279 258 L 286 265 L 298 251"
          fill="none"
          stroke="#2e7d32"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <line x1="308" y1="278" x2="328" y2="298" stroke="#2e7d32" stroke-width="8" stroke-linecap="round" />
      </g>
    </svg>
  </div>
</template>

<style scoped lang="scss">
.consulta-arte {
  width: 100%;
  max-width: 360px;
  margin-inline: auto;
  pointer-events: none;
  user-select: none;
}

.arte-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.halo {
  transform-box: fill-box;
  transform-origin: center;
}

.anillo {
  transform-box: view-box;
  transform-origin: 180px 185px;
}

.orbita {
  transform-box: view-box;
  transform-origin: 180px 180px;
}

.liquido-grupo {
  transform-box: fill-box;
  transform-origin: center bottom;
}

.lupa {
  transform-box: view-box;
  transform-origin: 288px 258px;
}
</style>
