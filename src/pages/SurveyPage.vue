<script setup>
import { ref } from 'vue'
import ThemeToggle from '../components/ThemeToggle.vue'
const score = ref(null)
const comments = ref('')
const sent = ref(false)
</script>

<template>
  <main class="public-page">
    <div class="row justify-end"><ThemeToggle /></div>
    <section class="public-container q-card panel">
      <span class="brand-mark">S</span>
      <div class="text-overline q-mt-lg" style="color:var(--primary)">Servicio de laboratorio</div>
      <h1>¿Cómo fue tu experiencia?</h1>
      <p class="muted">Tu opinión nos ayuda a mejorar el servicio.</p>
      <q-banner v-if="sent" class="status-success q-mb-md" rounded aria-live="polite">Gracias por compartir tu opinión.</q-banner>
      <div class="q-my-lg">
        <div class="text-weight-medium q-mb-sm">Califica tu experiencia de 1 a 5</div>
        <q-rating v-model="score" size="42px" color="warning" icon="star_border" icon-selected="star" :max="5" :disable="sent" aria-label="Calificación de 1 a 5" />
      </div>
      <q-input v-model="comments" type="textarea" outlined label="Comentarios (opcional)" rows="4" :disable="sent" />
      <q-btn class="btn-primary q-mt-lg" label="Enviar opinión" icon="send" :disable="!score || sent" @click="sent = true" />
      <div class="row justify-end q-mt-md"><ThemeToggle /></div>
    </section>
  </main>
</template>
