<template>
  <q-badge :color="color" :label="texto" class="text-weight-medium text-caption" rounded />
</template>

<script setup>
import { computed } from 'vue'
import { textoEstado } from '../utils/format.js'

/**
 * Indicador visual de estados de negocio (API.md §15.7):
 * - solicitudes: borrador (gris) · enviada (azul) · aprobada (verde)
 * - cotizaciones: borrador (gris) · enviada (azul) · aceptada (verde) · rechazada (rojo)
 * - muestras: pendiente (gris) · aceptada (azul) · en_analisis (naranja) · finalizada (verde) · rechazada (rojo)
 */
const props = defineProps({
  estado: { type: String, default: '' },
  tipo: {
    type: String,
    default: 'solicitud',
    validator: (v) => ['solicitud', 'cotizacion', 'muestra'].includes(v)
  }
})

const COLORES = {
  solicitud: {
    borrador: 'grey',
    enviada: 'primary',
    aprobada: 'positive'
  },
  cotizacion: {
    borrador: 'grey',
    enviada: 'primary',
    aceptada: 'positive',
    rechazada: 'negative'
  },
  muestra: {
    pendiente: 'grey',
    aceptada: 'primary',
    rechazada: 'negative',
    en_analisis: 'orange',
    finalizada: 'positive'
  }
}

const color = computed(() => COLORES[props.tipo]?.[props.estado] || 'grey')
const texto = computed(() => textoEstado(props.estado))
</script>
