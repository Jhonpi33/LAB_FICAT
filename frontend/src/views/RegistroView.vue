<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { post } from '@/services/api.service'

const route = useRoute()
const confirmar = computed(() => Boolean(route.params.token))
const email = ref('')
const nombre = ref('')
const password = ref('')
const aprendiz = ref(false)
const ficha = ref('')
const ocupado = ref(false)
const mensaje = ref('')
const listo = ref(false)
async function guardar() {
  ocupado.value = true
  try {
    const respuesta = confirmar.value
      ? await post('/auth/confirmar', { nombre: nombre.value, password: password.value, token: route.params.token,
          ...(aprendiz.value ? { ficha: ficha.value } : {}) })
      : await post('/auth/registro', { email: email.value })
    mensaje.value = respuesta.mensaje
    listo.value = true
    password.value = ''
  } catch (e) { mensaje.value = e.errores?.join(' · ') || e.mensaje }
  finally { ocupado.value = false }
}
</script>
<template>
  <main class="contenedor-app">
    <q-card class="tarjeta q-pa-lg q-mx-auto" style="max-width: 520px">
      <h1 class="titulo-vista">Crear cuenta</h1>
      <q-form v-if="!listo" class="q-gutter-md q-mt-sm" @submit="guardar">
        <template v-if="confirmar">
          <q-input outlined v-model="nombre" label="Nombre completo" :rules="[v => v.trim().length >= 3 || 'Escribe tu nombre completo']" maxlength="120"/>
          <q-input outlined v-model="password" type="password" autocomplete="new-password" label="Contraseña" :rules="[v => v.length >= 8 && /\d/.test(v) || 'Usa al menos 8 caracteres y un número']"/>
          <q-checkbox v-model="aprendiz" label="Soy aprendiz del SENA"/>
          <q-input outlined v-if="aprendiz" v-model="ficha" label="Número de ficha" hint="El laboratorio verificará tu ficha." :rules="[v => /^\d{3,15}$/.test(v) || 'Revisa el número de ficha']"/>
        </template>
        <q-input outlined v-else v-model="email" type="email" autocomplete="email" label="Correo electrónico" :rules="[v => !!v || 'Escribe tu correo']"/>
        <q-btn color="primary" type="submit" :loading="ocupado" :label="confirmar ? 'Confirmar correo y crear cuenta' : 'Recibir enlace de registro'"/>
      </q-form>
      <p role="status" class="q-mt-md">{{ mensaje }}</p>
      <router-link to="/">Volver al inicio de sesión</router-link>
    </q-card>
  </main>
</template>
