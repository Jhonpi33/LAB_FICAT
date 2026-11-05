<script setup>
/**
 * /views/EncuestaView.vue
 * Encuesta pública de satisfacción vinculada a una muestra (por código).
 * En esta fase el envío es simulado (servicio mock).
 */
import { ref } from 'vue'
import { useRoute } from 'vue-router'

import { enviarEncuesta } from '@/services/seguimiento'
import logo from '@/assets/logo.svg'

const route = useRoute()
const codigo = ref(route.params.codigo || '')
const score = ref(null)
const comments = ref('')
const sent = ref(false)
const enviando = ref(false)
const error = ref('')

const enviar = async () => {
  enviando.value = true
  error.value = ''
  try {
    await enviarEncuesta({
      codigo: codigo.value,
      calificacion: score.value,
      comentario: comments.value.trim(),
    })
    sent.value = true
  } catch (causa) {
    error.value = causa.mensaje
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <main class="public-page">
    <div class="row justify-end">
      <router-link to="/login" class="row items-center no-wrap q-gutter-sm text-decoration-none text-black">
        <img :src="logo" alt="Logo" width="30" height="30" />
        <small class="muted">Laboratorio SENA</small>
      </router-link>
    </div>

    <section class="public-container q-card tarjeta panel">
      <span class="brand-mark">S</span>
      <div class="text-overline q-mt-lg text-primary">Servicio de laboratorio</div>
      <h1>¿Cómo fue tu experiencia?</h1>
      <p class="muted">
        Tu opinión nos ayuda a mejorar el servicio.
        <template v-if="codigo">Muestra <span class="mono">{{ codigo }}</span>.</template>
      </p>

      <q-banner v-if="sent" class="status-success q-mb-md" rounded aria-live="polite">
        Gracias por compartir tu opinión.
      </q-banner>

      <q-banner v-if="error" class="status-danger q-mb-md" rounded aria-live="polite">
        {{ error }}
      </q-banner>

      <div class="q-my-lg">
        <div class="text-weight-medium q-mb-sm">Califica tu experiencia de 1 a 5</div>
        <q-rating v-model="score" size="42px" color="warning" icon="star_border" icon-selected="star" :max="5" :disable="sent" aria-label="Calificación de 1 a 5" />
      </div>

      <q-input v-model="comments" type="textarea" outlined label="Comentarios (opcional)" rows="4" :disable="sent" />

      <q-btn class="btn-primary q-mt-lg" label="Enviar opinión" icon="send" :disable="!score || sent" :loading="enviando" @click="enviar" />
    </section>
  </main>
</template>
