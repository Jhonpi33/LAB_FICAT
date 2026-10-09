<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import ThemeToggle from '../components/ThemeToggle.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const reveal = ref(false)
const notice = route.query.aviso ? 'Inicia sesión para consultar la información del laboratorio.' : ''
const demoRole = ref('editor')
const isDevelopment = import.meta.env.DEV

async function login() {
  if (await auth.signIn(email.value, password.value)) router.push('/app/panel')
}
function tryAsRole() {
  if (!import.meta.env.DEV) return
  const accountsByRole = {
    editor: ['lab@sena.edu.co', 'Laboratorio2026'],
    admin: ['admin@sena.edu.co', 'Admin2026'],
    reader: ['lectura@sena.edu.co', 'Lectura2026'],
  }
  ;[email.value, password.value] = accountsByRole[demoRole.value]
}
</script>

<template>
  <main class="public-page">
    <div class="row justify-end"><ThemeToggle /></div>
    <div class="public-container login-container">
      <section class="q-card login-grid">
        <div class="login-brand">
          <div>
            <div class="row items-center q-gutter-sm">
              <span class="brand-mark" style="background:var(--lime);color:#080808">S</span>
              <div><strong>SENA</strong><div class="text-caption">Centro Agroturístico</div></div>
            </div>
            <h1 class="q-mt-xl">Análisis que cuidan lo que consumimos.</h1>
            <p class="text-body1">Gestión de muestras y resultados del laboratorio de alimentos.</p>
          </div>
          <div class="demo-note" style="color:#fff;border-color:rgb(255 255 255 / 45%)">
            <span class="mono">0042-2026</span> · Queso campesino · En análisis
          </div>
        </div>
        <div class="login-form">
          <div class="row justify-between items-center">
            <div><div class="muted text-caption">Bienvenido al laboratorio</div><h2 class="q-mt-sm">Iniciar sesión</h2></div>
          </div>
          <q-tabs dense align="left" indicator-color="primary" active-color="primary" class="login-tabs q-mb-lg">
            <q-route-tab to="/login" label="Personal del laboratorio" />
            <q-route-tab to="/seguimiento" label="Consultar mi muestra" />
          </q-tabs>
          <q-banner v-if="notice" class="status-info q-mb-md" rounded aria-live="polite">{{ notice }}</q-banner>
          <form @submit.prevent="login" class="q-gutter-md">
            <q-input v-model="email" label="Correo institucional" type="email" autocomplete="username" outlined :error="Boolean(auth.errorMessage)" />
            <q-input v-model="password" label="Contraseña" :type="reveal ? 'text' : 'password'" autocomplete="current-password" outlined :error="Boolean(auth.errorMessage)">
              <template #append><q-btn flat round dense :icon="reveal ? 'visibility_off' : 'visibility'" :aria-label="reveal ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="reveal = !reveal" /></template>
            </q-input>
            <div v-if="auth.errorMessage" class="form-error" role="alert" aria-live="assertive">{{ auth.errorMessage }}</div>
            <q-btn type="submit" unelevated class="btn-primary full-width" size="lg" :label="auth.cargando ? 'Verificando…' : 'Ingresar'" :loading="auth.cargando" :disable="auth.cargando" />
          </form>
          <div class="q-mt-lg demo-note">
            <strong>Cuentas de demostración</strong>
            <div class="q-mt-xs">lab@sena.edu.co · Laboratorio2026</div>
            <div>admin@sena.edu.co · Admin2026</div>
            <div>lectura@sena.edu.co · Lectura2026</div>
            <div class="q-mt-xs text-caption">Estas cuentas deben existir en la base de datos (ejecuta <span class="mono">npm run seed</span> en <span class="mono">backend/</span>).</div>
          </div>
          <div v-if="isDevelopment" class="q-mt-md">
            <q-select v-model="demoRole" dense outlined label="Probar como…" :options="[{label:'Encargado',value:'editor'},{label:'Administrador',value:'admin'},{label:'Usuario / Cliente',value:'reader'}]" emit-value map-options @update:model-value="tryAsRole" />
          </div>
        </div>
      </section>
      <p class="text-center muted text-caption q-mt-md">Servicio de Análisis de Laboratorio · SENA</p>
    </div>
  </main>
</template>
