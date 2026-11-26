<script setup>
/**
 * /views/SeguimientoView.vue
 * Consulta PÚBLICA de muestras (sin cuenta). El cliente escribe el código que
 * recibió al entregar la muestra y ve su estado, novedades, resultados,
 * facturación y, si el laboratorio lo solicita, responde una incidencia.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { animate, stagger } from 'animejs'
import { useRoute, useRouter } from 'vue-router'

import ConsultaHero from '@/components/ConsultaHero.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { obtenerMuestraPublica, responderIncidencia } from '@/services/seguimiento'
import { useAuthStore } from '@/store/Auth'
import { formatDate } from '@/utils/formatDate'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const code = ref(route.params.codigo || '')
const muestra = ref(null)
const error = ref('')
const errorFormato = ref(false)
const cargando = ref(false)
const respuesta = ref('')
const enviado = ref(false)
const particulasAscendentes = [
  { id: 'molecula-a', forma: 'ramificada', x: '4%', tamano: '30px', duracion: '14s', retardo: '-2s', color: '#81c784' },
  { id: 'molecula-b', forma: 'cadena', x: '12%', tamano: '24px', duracion: '16s', retardo: '-11s', color: '#66bb6a' },
  { id: 'molecula-c', forma: 'triangulo', x: '20%', tamano: '34px', duracion: '13s', retardo: '-5s', color: '#a5d6a7' },
  { id: 'molecula-d', forma: 'orbita', x: '28%', tamano: '27px', duracion: '15s', retardo: '-9s', color: '#81c784' },
  { id: 'molecula-e', forma: 'burbujas', x: '36%', tamano: '22px', duracion: '12s', retardo: '-3s', color: '#66bb6a' },
  { id: 'molecula-f', forma: 'cruz', x: '44%', tamano: '32px', duracion: '16.5s', retardo: '-14s', color: '#a5d6a7' },
  { id: 'molecula-g', forma: 'doble', x: '52%', tamano: '25px', duracion: '13.5s', retardo: '-7s', color: '#81c784' },
  { id: 'molecula-h', forma: 'dispersa', x: '60%', tamano: '29px', duracion: '15.5s', retardo: '-12s', color: '#66bb6a' },
  { id: 'molecula-i', forma: 'hexagonal', x: '68%', tamano: '31px', duracion: '14.5s', retardo: '-4s', color: '#a5d6a7' },
  { id: 'molecula-j', forma: 'onda', x: '76%', tamano: '26px', duracion: '12.5s', retardo: '-10s', color: '#81c784' },
  { id: 'molecula-k', forma: 'estrella', x: '84%', tamano: '33px', duracion: '17s', retardo: '-6s', color: '#66bb6a' },
  { id: 'molecula-l', forma: 'microburbuja', x: '92%', tamano: '23px', duracion: '13s', retardo: '-8s', color: '#a5d6a7' },
]

const codigoNormalizado = computed(() => code.value.trim().toUpperCase())
const etapas = ['Ingresada', 'En proceso', 'En análisis', 'Resultados validados', 'Informe disponible']
const indiceEtapa = computed(() => {
  const idx = etapas.findIndex((e) => e.toLowerCase() === muestra.value?.status.toLowerCase())
  return idx >= 0 ? idx : 2
})
const incidenciaAbierta = computed(() => muestra.value?.incidentes?.find((i) => i.status === 'Abierta'))

function volver() {
  const anterior = window.history.state?.back
  const puedeVolver = typeof anterior === 'string' && !anterior.startsWith('/seguimiento')

  if (auth.estaAutenticado && puedeVolver) {
    router.back()
    return
  }

  router.replace({ name: auth.estaAutenticado ? 'panel' : 'login' })
}

async function buscar() {
  if (!/^\d{4}-\d{4}$/.test(codigoNormalizado.value)) {
    error.value = 'Escribe el código con el formato 0042-2026.'
    errorFormato.value = true
    muestra.value = null
    return
  }

  muestra.value = null
  respuesta.value = ''
  cargando.value = true
  error.value = ''
  errorFormato.value = false
  enviado.value = false
  router.replace({ name: 'seguimiento' })

  try {
    muestra.value = await obtenerMuestraPublica(codigoNormalizado.value)
  } catch (causa) {
    muestra.value = null
    error.value = causa.mensaje
  } finally {
    cargando.value = false
  }
}

async function enviarRespuesta() {
  if (!respuesta.value.trim()) return

  enviado.value = false
  try {
    await responderIncidencia(incidenciaAbierta.value.id, respuesta.value.trim())
    enviado.value = true
  } catch (causa) {
    error.value = causa.mensaje
  }
}

watch(
  () => route.params.codigo,
  (valor) => {
    if (valor && valor !== code.value) {
      code.value = valor
      buscar()
    }
  },
)

const heroTexto = ref(null)
const resultados = ref(null)
const animaciones = []

function prefiereMenosMovimiento() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

onMounted(() => {
  const recargando = window.performance.getEntriesByType('navigation')[0]?.type === 'reload'

  // Entrada escalonada del texto y del formulario.
  if (!prefiereMenosMovimiento() && heroTexto.value) {
    const elementos = Array.from(heroTexto.value.querySelectorAll('[data-entrada]'))
    elementos.forEach((el) => {
      el.style.opacity = '0'
    })
    animaciones.push(
      animate(elementos, {
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 650,
        delay: stagger(90),
        ease: 'outCubic',
      }),
    )
  }

  if (route.params.codigo && recargando) {
    code.value = ''
    router.replace({ name: 'seguimiento' })
  } else if (route.params.codigo) {
    buscar()
  }
})

// Entrada suave de las tarjetas cuando llega el resultado.
watch(muestra, async (valor) => {
  if (!valor || prefiereMenosMovimiento()) return
  await nextTick()
  if (!resultados.value) return
  animaciones.push(
    animate(Array.from(resultados.value.querySelectorAll('.tarjeta')), {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 480,
      delay: stagger(70),
      ease: 'outCubic',
    }),
  )
})

onBeforeUnmount(() => {
  animaciones.forEach((animacion) => animacion?.revert?.())
  animaciones.length = 0
})
</script>

<template>
  <main class="public-page">
    <div class="row items-center">
      <q-btn
        flat
        round
        dense
        color="grey-7"
        icon="arrow_back"
        aria-label="Volver"
        @click="volver"
      >
        <q-tooltip>Volver</q-tooltip>
      </q-btn>
    </div>

    <div class="public-container" :class="{ 'public-container--inicio': !muestra }">
      <section class="consulta-hero q-mb-xl">
        <div ref="heroTexto" class="consulta-hero__texto">
          <div class="text-overline text-primary" data-entrada>Consulta sin cuenta</div>
          <h1 class="consulta-hero__titulo q-mt-sm q-mb-sm" data-entrada>
            Sigue el estado de tu muestra
          </h1>
          <p class="muted" data-entrada>Escribe el código que recibiste al entregar tu muestra.</p>

          <form
            class="consulta-hero__form q-mt-md"
            data-entrada
            @submit.prevent="buscar"
          >
            <q-input
              v-model="code"
              class="consulta-hero__campo"
              autofocus
              outlined
              label="Código de seguimiento"
              placeholder="0042-2026"
              maxlength="9"
              input-class="mono"
              :error="errorFormato"
              :error-message="errorFormato ? error : ''"
            />
            <q-btn
              type="submit"
              unelevated
              class="btn-primary consulta-hero__boton"
              size="lg"
              icon="search"
              label="Consultar"
            />
          </form>
        </div>

        <ConsultaHero :activo="cargando" class="consulta-hero__arte" />
      </section>

      <div v-if="cargando" class="q-card tarjeta panel carga-muestra" aria-live="polite">
        <q-spinner-dots color="primary" size="34px" />
        <div>
          <div class="text-subtitle1 text-weight-medium">Analizando tu muestra…</div>
          <p class="muted q-mb-none">Consultando el estado en el laboratorio.</p>
        </div>
      </div>

      <q-banner
        v-else-if="error && !muestra && !errorFormato"
        class="status-danger q-mb-lg"
        rounded
        role="alert"
        aria-live="assertive"
      >
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
      </q-banner>

      <div v-if="muestra" ref="resultados" class="resultados">
        <section class="q-card tarjeta panel q-mb-lg">
          <div class="row justify-between items-start q-gutter-md">
            <div>
              <div class="muted text-caption">Código de seguimiento</div>
              <div class="mono text-h5 q-mt-xs">{{ muestra.code }}</div>
              <div class="text-body1 q-mt-sm">{{ muestra.food }}</div>
            </div>
            <StatusBadge :status="muestra.status" />
          </div>

          <div class="row items-center q-gutter-sm q-mt-xl" aria-label="Etapa actual">
            <template v-for="(etapa, index) in etapas.slice(0, 3)" :key="etapa">
              <span class="step-dot" :class="{ active: index <= indiceEtapa }" />
              <span class="text-caption" :class="{ 'text-weight-bold': index === indiceEtapa }">{{ etapa }}</span>
              <q-separator v-if="index < 2" class="col" />
            </template>
          </div>

          <q-banner v-if="muestra.isDelayed" class="status-warning q-mt-lg" rounded>
            <template #avatar><q-icon name="schedule" /></template>
            Tu proceso presenta una demora. Nueva fecha estimada: {{ formatDate(muestra.dueDate) }}.
          </q-banner>
        </section>

        <div class="row q-col-gutter-lg">
          <div class="col-12 col-md-7">
            <section class="q-card tarjeta panel q-mb-lg">
              <h2 class="panel-title">Novedades de tu muestra</h2>
              <div v-if="muestra.publicEvents.length" class="timeline">
                <article v-for="evento in muestra.publicEvents" :key="evento.at + evento.title" class="timeline-event">
                  <time>{{ new Date(evento.at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) }}</time>
                  <p><strong>{{ evento.title }}</strong></p>
                  <p class="muted">{{ evento.description }}</p>
                </article>
              </div>
              <div v-else class="empty-state">Aún no hay novedades para mostrar.</div>
            </section>
          </div>

          <div class="col-12 col-md-5">
            <section class="q-card tarjeta panel consulta-panel q-mb-lg">
              <h2 class="panel-title">Facturación</h2>
              <p class="muted">Información de facturación compartida por el laboratorio.</p>
              <StatusBadge :status="muestra.invoiceStatus === 'Generada' ? 'Factura generada' : 'Factura pendiente'" />
            </section>

            <section class="q-card tarjeta panel consulta-panel q-mb-lg">
              <h2 class="panel-title">Resultados e informe</h2>
              <p class="muted">Cuando los resultados estén validados, podrás consultar aquí su disponibilidad.</p>
              <StatusBadge :status="muestra.resultStatus === 'Validado' ? 'Resultados disponibles' : 'En preparación'" />
              <template v-if="muestra.informeDisponible">
                <q-banner class="status-success" rounded>
                  <template #avatar><q-icon name="description" /></template>
                  Tu informe está disponible para descarga.
                </q-banner>
                <q-btn class="btn-primary" label="Ver informe" icon="description" @click="$q.notify({ type: 'info', message: 'Descarga demostrativa: el PDF real se habilitará próximamente.' })" />
              </template>
            </section>

            <section v-if="incidenciaAbierta" class="q-card tarjeta panel">
              <h2 class="panel-title">Necesitamos información</h2>
              <p>{{ incidenciaAbierta.text }}</p>
              <q-banner v-if="enviado" class="status-success q-mb-md" rounded aria-live="polite">
                Tu respuesta quedó registrada. Gracias.
              </q-banner>
              <q-banner v-if="error" class="status-danger q-mb-md" rounded aria-live="polite">
                {{ error }}
              </q-banner>
              <q-input v-model="respuesta" type="textarea" outlined label="Tu respuesta" rows="3" :disable="enviado" />
              <q-btn class="btn-primary full-width q-mt-md" label="Enviar respuesta" icon="send" :disable="!respuesta.trim() || enviado" @click="enviarRespuesta" />
            </section>
          </div>
        </div>
      </div>

      <p class="text-caption muted q-mt-xl">La consulta muestra únicamente información autorizada para compartir.</p>
    </div>

    <div class="particulas-ascendentes" aria-hidden="true">
      <svg
        v-for="particula in particulasAscendentes"
        :key="particula.id"
        class="particula-ascendente"
        viewBox="0 0 36 30"
        :style="{
          '--particula-x': particula.x,
          '--particula-tamano': particula.tamano,
          '--particula-duracion': particula.duracion,
          '--particula-retardo': particula.retardo,
          '--particula-color': particula.color,
        }"
      >
        <g v-if="particula.forma === 'ramificada'">
          <line x1="8" y1="21" x2="17" y2="12" />
          <line x1="17" y1="12" x2="27" y2="17" />
          <circle cx="8" cy="21" r="3" />
          <circle cx="17" cy="12" r="4" />
          <circle cx="27" cy="17" r="2.5" />
        </g>
        <g v-else-if="particula.forma === 'cadena'">
          <line x1="6" y1="22" x2="15" y2="16" />
          <line x1="15" y1="16" x2="25" y2="8" />
          <line x1="25" y1="8" x2="31" y2="14" />
          <circle cx="6" cy="22" r="2.5" />
          <circle cx="15" cy="16" r="3" />
          <circle cx="25" cy="8" r="4" />
          <circle cx="31" cy="14" r="2" />
        </g>
        <g v-else-if="particula.forma === 'triangulo'">
          <path d="M7 22 L17 7 L29 21 Z" fill="none" stroke="currentColor" />
          <circle cx="7" cy="22" r="2.5" />
          <circle cx="17" cy="7" r="3.5" />
          <circle cx="29" cy="21" r="3" />
        </g>
        <g v-else-if="particula.forma === 'orbita'">
          <circle cx="18" cy="15" r="5" />
          <circle cx="7" cy="10" r="2.5" />
          <circle cx="29" cy="7" r="2" />
          <circle cx="28" cy="24" r="3" />
          <path d="M8 10 L14 13 M22 12 L28 8 M22 18 L27 23" fill="none" stroke="currentColor" />
        </g>
        <g v-else-if="particula.forma === 'burbujas'">
          <circle cx="8" cy="21" r="3" />
          <circle cx="17" cy="12" r="5" class="particula-hueca" />
          <circle cx="28" cy="19" r="2" />
          <circle cx="27" cy="7" r="2.5" />
        </g>
        <g v-else-if="particula.forma === 'cruz'">
          <path d="M18 5 V25 M8 15 H28" fill="none" stroke="currentColor" />
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="8" cy="15" r="3" />
          <circle cx="18" cy="15" r="4" />
          <circle cx="28" cy="15" r="2" />
          <circle cx="18" cy="25" r="3" />
        </g>
        <g v-else-if="particula.forma === 'doble'">
          <line x1="7" y1="17" x2="27" y2="11" />
          <circle cx="7" cy="17" r="3.5" />
          <circle cx="27" cy="11" r="2.5" />
        </g>
        <g v-else-if="particula.forma === 'dispersa'">
          <circle cx="8" cy="8" r="2" />
          <circle cx="18" cy="17" r="4" />
          <circle cx="29" cy="7" r="3" />
          <circle cx="10" cy="25" r="3.5" />
          <circle cx="28" cy="23" r="2" />
        </g>
        <g v-else-if="particula.forma === 'hexagonal'">
          <path d="M9 8 L18 4 L28 10 L27 21 L17 26 L8 20 Z" fill="none" stroke="currentColor" />
          <circle cx="9" cy="8" r="2.5" />
          <circle cx="18" cy="4" r="2" />
          <circle cx="28" cy="10" r="3" />
          <circle cx="27" cy="21" r="2" />
          <circle cx="17" cy="26" r="3" />
          <circle cx="8" cy="20" r="2" />
        </g>
        <g v-else-if="particula.forma === 'onda'">
          <path d="M4 20 C10 5 17 26 23 11 S31 8 33 16" fill="none" stroke="currentColor" />
          <circle cx="4" cy="20" r="2.5" />
          <circle cx="14" cy="16" r="3" />
          <circle cx="23" cy="11" r="2.5" />
          <circle cx="33" cy="16" r="3" />
        </g>
        <g v-else-if="particula.forma === 'estrella'">
          <path d="M18 15 L18 3 M18 15 L30 15 M18 15 L18 27 M18 15 L6 15" fill="none" stroke="currentColor" />
          <circle cx="18" cy="15" r="4" />
          <circle cx="18" cy="3" r="2.5" />
          <circle cx="30" cy="15" r="3" />
          <circle cx="18" cy="27" r="2" />
          <circle cx="6" cy="15" r="2.5" />
        </g>
        <g v-else>
          <circle cx="15" cy="15" r="7" class="particula-hueca" />
          <circle cx="27" cy="7" r="2" />
          <circle cx="28" cy="23" r="3" />
          <path d="M21 11 L26 8 M21 19 L26 22" fill="none" stroke="currentColor" />
        </g>
      </svg>
    </div>
  </main>
</template>

<style scoped lang="scss">
.public-page {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
}

.public-container--inicio {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  margin: 0 auto;
  transform: translateY(-18px);
}

.consulta-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;

  .panel-title,
  p {
    margin: 0;
  }

  .q-banner {
    width: 100%;
  }
}

.particulas-ascendentes {
  position: fixed;
  z-index: -1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.particula-ascendente {
  position: absolute;
  top: 100%;
  left: var(--particula-x);
  width: var(--particula-tamano);
  height: var(--particula-tamano);
  fill: var(--particula-color);
  stroke: var(--particula-color);
  stroke-width: 1.5;
  animation: particula-asciende var(--particula-duracion) linear var(--particula-retardo) infinite;
  opacity: 0.32;
}

.particula-hueca {
  fill: none;
}

@keyframes particula-asciende {
  0% {
    top: 100%;
    opacity: 0;
  }

  8%,
  98% {
    opacity: 0.32;
  }

  100% {
    top: 0;
    opacity: 0;
  }
}

.consulta-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: clamp(16px, 4vw, 48px);
  align-items: center;
}

.consulta-hero__texto {
  min-width: 0;
}

.consulta-hero__titulo {
  font-size: clamp(2.1rem, 4.4vw, 3.1rem);
  font-weight: 300;
  line-height: 1.08;
  letter-spacing: -0.02em;
  max-width: 18ch;
}

.consulta-hero__form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
  max-width: 540px;
}

.consulta-hero__campo {
  flex: 1 1 260px;
  min-width: 0;
}

.consulta-hero__boton {
  flex: 0 0 auto;
}

.consulta-hero__arte {
  width: 100%;
  max-width: 360px;
  justify-self: end;
}

.carga-muestra {
  display: flex;
  align-items: center;
  gap: 16px;
}

@media (max-width: 767px) {
  .consulta-hero {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .consulta-hero__texto {
    width: 100%;
  }

  .consulta-hero__form {
    max-width: 100%;
  }

  .consulta-hero__arte {
    order: -1;
    max-width: 230px;
    justify-self: center;
    margin-bottom: 4px;
  }

  .consulta-hero__titulo {
    max-width: none;
  }
}

@media (max-width: 599px) {
  .consulta-hero__boton {
    flex: 1 1 100%;
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .particulas-ascendentes {
    display: none;
  }
}
</style>
