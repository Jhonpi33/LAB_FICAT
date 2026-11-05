<script setup>
/**
 * /views/NotFoundView.vue
 * 404. Se pinta dentro del AdminLayout.
 */
import { useAuthStore } from '@/store/Auth'

const auth = useAuthStore()
</script>

<template>
  <q-page>
    <div class="contenedor-app column flex-center text-center q-py-xl">
      <q-icon name="search_off" size="88px" color="grey-4" />
      <h1 class="titulo-vista q-mt-md q-mb-sm">Página no encontrada</h1>
      <p class="texto-suave q-mb-lg">La dirección que buscas no existe o fue movida.</p>
      <q-btn
        unelevated
        no-caps
        color="primary"
        :label="auth.estaAutenticado ? 'Volver al panel' : 'Ir al inicio de sesión'"
        :to="{ name: auth.estaAutenticado ? 'panel' : 'login' }"
      />
    </div>
  </q-page>
</template>
