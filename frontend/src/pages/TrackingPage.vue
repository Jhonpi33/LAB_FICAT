<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import ThemeToggle from '../components/ThemeToggle.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { laboratoryService } from '../services/laboratory'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const code = ref(route.params.codigo || '')
const sample = ref(null)
const error = ref('')
const errorIsFormat = ref(false)
const loading = ref(false)
const reply = ref('')
const files = ref([])
const sent = ref(false)
const normalizedCode = computed(() => code.value.trim().toUpperCase())
const steps = ['Ingresada', 'En proceso', 'En análisis', 'Resultados validados', 'Informe disponible']
const stepIndex = computed(() => {
  const index = steps.findIndex((step) => step.toLowerCase() === sample.value?.status.toLowerCase())
  return index >= 0 ? index : Math.min(steps.findIndex((step) => step === 'En análisis'), 2)
})
const responseIncident = computed(() => sample.value?.incidents?.find((item) => item.public && item.status === 'Abierta'))

async function lookup() {
  if (!/^\d{4}-\d{4}$/.test(normalizedCode.value)) {
    error.value = 'Escribe el código con el formato 0042-2026.'
    errorIsFormat.value = true
    sample.value = null
    return
  }
  loading.value = true
  error.value = ''
  errorIsFormat.value = false
  sent.value = false
  router.replace(`/seguimiento/${normalizedCode.value}`)
  try {
    sample.value = await laboratoryService.getPublicSample(normalizedCode.value)
  } catch (cause) {
    sample.value = null
    error.value = cause.message
  } finally {
    loading.value = false
  }
}

function validateFiles(selected) {
  const oversized = [...selected].find((file) => file.size > 5 * 1024 * 1024)
  if (oversized) {
    $q.notify({ type: 'negative', message: `${oversized.name} supera el límite de 5 MB.` })
    files.value = files.value.filter((file) => file.size <= 5 * 1024 * 1024)
    return
  }
  files.value = [...files.value, ...selected]
}

async function sendReply() {
  if (!reply.value.trim()) return
  await laboratoryService.performAction('Respuesta recibida del cliente', { code: sample.value.code, message: reply.value, files: files.value.map((file) => file.name) })
  sent.value = true
}

watch(() => route.params.codigo, (value) => {
  if (value && value !== code.value) {
    code.value = value
    lookup()
  }
})
onMounted(() => { if (route.params.codigo) lookup() })
</script>

<template>
  <main class="public-page">
    <div class="row justify-between items-center">
      <router-link to="/login" class="row items-center no-wrap q-gutter-sm text-decoration-none">
        <span class="brand-mark">S</span><span><strong>Laboratorio SENA</strong><br><small class="muted">Consulta de muestras</small></span>
      </router-link>
      <ThemeToggle />
    </div>
    <div class="public-container">
      <section class="q-mb-xl">
        <div class="text-overline" style="color:var(--primary)">Consulta sin cuenta</div>
        <h1 class="q-mt-sm q-mb-sm">Sigue el estado de tu muestra</h1>
        <p class="muted">Escribe el código que recibiste al entregar tu muestra.</p>
        <form class="row q-col-gutter-sm items-start q-mt-md" @submit.prevent="lookup">
          <div class="col"><q-input v-model="code" autofocus outlined label="Código de seguimiento" placeholder="0042-2026" maxlength="9" input-class="mono" :error="errorIsFormat" :error-message="errorIsFormat ? error : ''" /></div>
          <div class="col-auto"><q-btn type="submit" unelevated class="btn-primary" size="lg" icon="search" label="Consultar" /></div>
        </form>
      </section>
      <div v-if="loading" class="q-card panel" aria-live="polite"><q-skeleton type="text" width="35%" /><q-skeleton type="rect" height="86px" class="q-mt-md" /><p class="muted q-mb-none">Buscando tu muestra…</p></div>
      <q-banner v-else-if="error && !sample && !errorIsFormat" class="status-danger q-mb-lg" rounded role="alert" aria-live="assertive">
        <template #avatar><q-icon name="error_outline" /></template>{{ error }}
      </q-banner>
      <template v-if="sample">
        <section class="q-card panel q-mb-lg">
          <div class="row justify-between items-start q-gutter-md">
            <div><div class="muted text-caption">Código de seguimiento</div><div class="mono text-h5 q-mt-xs">{{ sample.code }}</div><div class="text-body1 q-mt-sm">{{ sample.food }}</div></div>
            <StatusBadge :status="sample.status" />
          </div>
          <div class="row items-center q-gutter-sm q-mt-xl" aria-label="Etapa actual">
            <template v-for="(step, index) in steps.slice(0, 3)" :key="step">
              <span class="step-dot" :class="{active:index <= stepIndex}" />
              <span class="text-caption" :class="{'text-weight-bold':index===stepIndex}">{{ step }}</span>
              <q-separator v-if="index < 2" class="col" />
            </template>
          </div>
          <q-banner v-if="sample.isDelayed" class="status-warning q-mt-lg" rounded>
            <template #avatar><q-icon name="schedule" /></template>Tu proceso presenta una demora. Nueva fecha estimada: {{ sample.dueDate }}.
          </q-banner>
        </section>

        <div class="row q-col-gutter-lg">
          <div class="col-12 col-md-7">
            <section class="q-card panel q-mb-lg">
              <h2 class="panel-title">Novedades de tu muestra</h2>
              <div v-if="sample.publicEvents.length" class="timeline">
                <article v-for="event in sample.publicEvents" :key="event.at + event.title" class="timeline-event">
                  <time>{{ new Date(event.at).toLocaleString('es-CO', {dateStyle:'medium',timeStyle:'short'}) }}</time>
                  <p><strong>{{ event.title }}</strong></p><p class="muted">{{ event.description }}</p>
                </article>
              </div>
              <div v-else class="empty-state">Aún no hay novedades para mostrar.</div>
            </section>
            <section class="q-card panel">
              <h2 class="panel-title">Resultados e informe</h2>
              <p class="muted">Cuando los resultados estén validados, podrás consultar aquí su disponibilidad.</p>
              <StatusBadge :status="sample.resultStatus === 'Validado' ? 'Resultados disponibles' : 'En preparación'" />
              <q-btn v-if="sample.resultStatus === 'Validado'" class="btn-primary q-ml-sm" label="Ver informe" icon="description" />
            </section>
          </div>
          <div class="col-12 col-md-5">
            <section class="q-card panel q-mb-lg">
              <h2 class="panel-title">Facturación</h2>
              <p class="muted">Información de facturación compartida por el laboratorio.</p>
              <StatusBadge :status="sample.invoiceStatus === 'Generada' ? 'Factura generada' : 'Factura pendiente'" />
            </section>
            <section v-if="responseIncident" class="q-card panel">
              <h2 class="panel-title">Necesitamos información</h2>
              <p>{{ responseIncident.text }}</p>
              <q-banner v-if="sent" class="status-success q-mb-md" rounded aria-live="polite">Tu respuesta quedó registrada. Gracias.</q-banner>
              <q-input v-model="reply" type="textarea" outlined label="Tu respuesta" rows="3" :disable="sent" />
              <div class="text-caption muted q-mt-sm">Adjuntos opcionales · máximo 5 MB por archivo.</div>
              <q-file multiple outlined dense class="q-mt-sm" label="Adjuntar documentos" :disable="sent" @update:model-value="validateFiles">
                <template #prepend><q-icon name="attach_file" /></template>
              </q-file>
              <div v-if="files.length" class="text-caption q-mt-xs">{{ files.map((file) => file.name).join(', ') }}</div>
              <q-btn class="btn-communicate full-width q-mt-md" label="Enviar respuesta" icon="send" :disable="!reply.trim() || sent" @click="sendReply" />
            </section>
          </div>
        </div>
      </template>
      <p class="text-caption muted q-mt-xl">La consulta muestra únicamente información autorizada para compartir.</p>
    </div>
  </main>
</template>
