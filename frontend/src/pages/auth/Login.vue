<template>
  <div class="window-bg column flex-center q-pa-md">
    <q-card class="login-card q-pa-md">
      <q-card-section class="text-center q-pt-md">
        <q-icon name="science" size="56px" color="primary" />
        <div class="text-h5 q-mt-sm text-weight-bold">SEENA · Laboratorio FICAT</div>
        <div class="text-body2 text-grey">Sistema de gestion del servicio de analisis</div>
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <ErrorBanner :error="error" />

        <q-form class="q-gutter-md" @submit="onSubmit">
          <q-input
            v-model="email"
            type="email"
            label="Correo electronico"
            outlined
            dense
            autocomplete="username"
            :rules="[
              (v) => !!v || 'El correo es obligatorio',
              (v) => /.+@.+\..+/.test(v) || 'Ingrese un correo valido'
            ]"
          />

          <q-input
            v-model="password"
            type="password"
            label="Contrasena"
            outlined
            dense
            autocomplete="current-password"
            :rules="[(v) => !!v || 'La contrasena es obligatoria']"
          />

          <q-btn
            label="Ingresar"
            type="submit"
            color="primary"
            class="full-width"
            :loading="cargando"
            no-caps
          />
        </q-form>
      </q-card-section>

      <q-card-section class="text-center text-caption text-grey q-pb-md">
        Credenciales de prueba del seed:<br />
        admin@labficat.test · Admin2026!
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../../stores/auth.js'
import ErrorBanner from '../../components/ErrorBanner.vue'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const cargando = ref(false)
const error = ref(null)

async function onSubmit() {
  error.value = null
  cargando.value = true
  try {
    await auth.login(email.value, password.value)
    $q.notify({ type: 'positive', message: `Bienvenido(a), ${auth.nombre}` })
    // Si vino de un guard con ?redirigir=, regresa ahí.
    router.push(typeof route.query.redirigir === 'string' ? route.query.redirigir : { name: 'inicio' })
  } catch (e) {
    // Muestra el mensaje real del backend ("Credenciales incorrectas", 403 desactivado, etc.).
    error.value = e
  } finally {
    cargando.value = false
  }
}
</script>

<style scoped>
.window-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f0e3 0%, #f4f6f8 60%);
}

.login-card {
  width: 100%;
  max-width: 420px;
  border-radius: 12px;
}
</style>
