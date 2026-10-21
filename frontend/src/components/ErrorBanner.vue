<template>
  <q-banner v-if="mostrar" dense rounded class="bg-red-1 text-negative">
    <template v-slot:avatar>
      <q-icon name="error" color="negative" />
    </template>
    <div class="text-body2">{{ mensaje }}</div>
    <ul v-if="errores.length" class="q-mt-xs q-mb-none text-caption">
      <li v-for="(e, i) in errores" :key="i">
        <strong>{{ e.campo }}:</strong> {{ e.msg }}
      </li>
    </ul>
  </q-banner>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Bloque de mensajes de error (RNF-009/RNF-014): muestra el `mensaje` del
 * backend y, si vienen, cada `errores[]` de validación junto a su campo.
 */
const props = defineProps({
  error: { type: [Object, Error, null], default: null },
  mensajeFallback: { type: String, default: 'Ocurrio un error inesperado' }
})

const mensaje = computed(() => props.error?.response?.data?.mensaje || props.error?.message || props.mensajeFallback)
const errores = computed(() => props.error?.response?.data?.errores || [])
const mostrar = computed(() => Boolean(props.error))
</script>
