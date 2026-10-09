<script setup>
import { computed } from 'vue'

const props = defineProps({ status: { type: String, required: true } })
const styles = [
  { match: /pendient|espera|demora|vencer|borrador|cotización enviada/i, tone: 'warning', icon: 'schedule' },
  { match: /confirmad|aceptad|validado|generada|disponible|cerrad|respondid|correo enviado/i, tone: 'success', icon: 'check_circle' },
  { match: /análisis|proceso|ingresada|recibid|informativ|no requiere|enviado/i, tone: 'info', icon: 'science' },
  { match: /requiere acción|prioridad|sena/i, tone: 'accent', icon: 'priority_high' },
  { match: /rechaz|fallida|vencid|inmediata|error|eliminad/i, tone: 'danger', icon: 'error' },
]
const theme = computed(() => styles.find(({ match }) => match.test(props.status)) || { tone: 'neutral', icon: 'radio_button_unchecked' })
</script>

<template>
  <span class="status-badge" :class="`status-${theme.tone}`">
    <q-icon :name="theme.icon" size="15px" aria-hidden="true" />
    <span>{{ status }}</span>
  </span>
</template>
