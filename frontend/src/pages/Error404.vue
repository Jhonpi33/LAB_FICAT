<template>
  <div class="window-bg column flex-center q-pa-lg text-center">
    <div class="text-h2 text-weight-bold text-primary">404</div>
    <div class="text-h6 q-mt-sm">Pagina no encontrada</div>
    <div class="text-grey q-mb-lg">La ruta solicitada no existe en el sistema.</div>
    <q-btn color="primary" icon="arrow_back" label="Volver al inicio" :to="{ name: 'inicio' }" />
  </div>
</template>

<script setup>
// Pagina 404 interna (RNF-014: sin redirecciones a paginas de error externas).
</script>

<style scoped>
.window-bg {
  min-height: 100vh;
}
</style>
