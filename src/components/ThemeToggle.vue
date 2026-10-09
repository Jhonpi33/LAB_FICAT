<script setup>
import { useThemeStore } from '../stores/theme'
const theme = useThemeStore()
</script>

<template>
  <q-btn
    flat round
    :icon="theme.isDark ? 'light_mode' : 'dark_mode'"
    :aria-label="theme.isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
    :aria-pressed="theme.isDark"
    @click="theme.toggle()"
  >
    <q-tooltip>{{ theme.isDark ? 'Tema oscuro · cambiar a claro' : 'Tema claro · cambiar a oscuro' }}</q-tooltip>
  </q-btn>
</template>
