<script setup>
/**
 * /views/SeguimientoView.vue
 * Consulta PÚBLICA de muestras (sin cuenta). El cliente escribe el código que
 * recibió al entregar la muestra y ve su estado, novedades, resultados,
 * facturación y, si el laboratorio lo solicita, responde una incidencia.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import StatusBadge from '@/components/StatusBadge.vue'
import { obtenerMuestraPublica, responderIncidencia } from '@/services/seguimiento'
import { formatDate } from '@/utils/formatDate'
import logo from '@/assets/logo.svg'

const route = useRoute()
const router = useRouter()

const code = ref(route.params.codigo || '')
const muestra = ref(null)
const error = ref('')
const errorFormato = ref(false)
const cargando = ref(false)
const respuesta = ref('')
const enviado = ref(false)

const codigoNormalizado = computed(() => code.value.trim().toUpperCase())
const etapas = ['Ingresada', 'En proceso', 'En análisis', 'Resultados validados', 'Informe disponible']
const indiceEtapa = computed(() => {
  const idx = etapas.findIndex((e) => e.toLowerCase() === muestra.value?.status.toLowerCase())
  return idx >= 0 ? idx : 2
})
const incidenciaAbierta = computed(() => muestra.value?.incidentes?.find((i) => i.status === 'Abierta'))

async function buscar() {
  if (!/^\d{4}-\d{4}$/.test(codigoNormalizado.value)) {
    error.value = 'Escribe el código con el formato 0042-2026.'
    errorFormato.value = true
    muestra.value = null
    return
  }

  cargando.value = true
  error.value = ''
  errorFormato.value = false
  enviado.value = false
  router.replace(`/seguimiento/${codigoNormalizado.value}`)

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

onMounted(() => {
  if (route.params.codigo) buscar()
})
</script>

<template>
  <main class="public-page">
    <div class="row justify-between items-center">
      <router-link to="/login" class="row items-center no-wrap q-gutter-sm text-decoration-none text-black">
        <img :src="logo" alt="Logo" width="38" height="38" />
        <span>
          <strong>Laboratorio SENA</strong><br />
          <small class="muted">Consulta de muestras</small>
        </span>
      </router-link>
    </div>

    <div class="public-container">
      <section class="q-mb-xl">
        <div class="text-overline text-primary">Consulta sin cuenta</div>
        <h1 class="q-mt-sm q-mb-sm">Sigue el estado de tu muestra</h1>
        <p class="muted">Escribe el código que recibiste al entregar tu muestra.</p>

        <form class="row q-col-gutter-sm items-start q-mt-md" @submit.prevent="buscar">
          <div class="col">
            <q-input
              v-model="code"
              autofocus
              outlined
              label="Código de seguimiento"
              placeholder="0042-2026"
              maxlength="9"
              input-class="mono"
              :error="errorFormato"
              :error-message="errorFormato ? error : ''"
            />
          </div>
          <div class="col-auto">
            <q-btn type="submit" unelevated class="btn-primary" size="lg" icon="search" label="Consultar" />
          </div>
        </form>
      </section>

      <div v-if="cargando" class="q-card tarjeta panel" aria-live="polite">
        <q-skeleton type="text" width="35%" />
        <q-skeleton type="rect" height="86px" class="q-mt-md" />
        <p class="muted q-mb-none">Buscando tu muestra…</p>
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

      <template v-if="muestra">
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

            <section class="q-card tarjeta panel">
              <h2 class="panel-title">Resultados e informe</h2>
              <p class="muted">Cuando los resultados estén validados, podrás consultar aquí su disponibilidad.</p>
              <StatusBadge :status="muestra.resultStatus === 'Validado' ? 'Resultados disponibles' : 'En preparación'" />
              <template v-if="muestra.informeDisponible">
                <q-banner class="status-success q-mt-md" rounded>
                  <template #avatar><q-icon name="description" /></template>
                  Tu informe está disponible para descarga.
                </q-banner>
                <q-btn class="btn-primary q-mt-sm" label="Ver informe" icon="description" @click="$q.notify({ type: 'info', message: 'Descarga demostrativa: el PDF real se habilitará próximamente.' })" />
              </template>
            </section>
          </div>

          <div class="col-12 col-md-5">
            <section class="q-card tarjeta panel q-mb-lg">
              <h2 class="panel-title">Facturación</h2>
              <p class="muted">Información de facturación compartida por el laboratorio.</p>
              <StatusBadge :status="muestra.invoiceStatus === 'Generada' ? 'Factura generada' : 'Factura pendiente'" />
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
      </template>

      <p class="text-caption muted q-mt-xl">La consulta muestra únicamente información autorizada para compartir.</p>
    </div>
  </main>
</template>
