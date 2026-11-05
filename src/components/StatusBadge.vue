<script setup>
/**
 * /components/StatusBadge.vue
 * Etiqueta de estado con color e icono según el texto recibido.
 * Se usa en el seguimiento público y en las listas internas.
 */
import { computed } from 'vue'

const props = defineProps({ status: { type: String, required: true } })

const estilos = [
  { match: /pendient|espera|demora|vencer|borrador|no iniciado|preparación/i, tone: 'warning', icon: 'schedule' },
  { match: /confirmad|aceptad|validado|generada|disponible|cerrad|respondid|activo/i, tone: 'success', icon: 'check_circle' },
  { match: /análisis|proceso|ingresada|recibid|informativ|no requiere|enviado/i, tone: 'info', icon: 'science' },
  { match: /requiere acción|prioridad|sena|urgente/i, tone: 'accent', icon: 'priority_high' },
  { match: /rechaz|fallida|vencid|inmediata|error|eliminad|inactivo/i, tone: 'danger', icon: 'error' },
]

const tema = computed(() => estilos.find(({ match }) => match.test(props.status)) || { tone: 'neutral', icon: 'radio_button_unchecked' })
</script>

<template>
  <span class="status-badge" :class="`status-${tema.tone}`">
    <q-icon :name="tema.icon" size="15px" aria-hidden="true" />
    <span>{{ status }}</span>
  </span>
</template>
