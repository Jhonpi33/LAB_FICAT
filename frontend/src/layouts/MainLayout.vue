<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="drawerAbierto = !drawerAbierto" />
        <q-toolbar-title class="text-weight-bold">
          <q-icon name="science" class="q-mr-xs" />
          SEENA · Laboratorio FICAT
        </q-toolbar-title>

        <div class="items-center row no-wrap q-gutter-sm">
          <div class="column items-end no-wrap" style="line-height: 1.1">
            <span class="text-caption text-blue-2">{{ auth.email }}</span>
            <span class="text-body2 text-weight-medium">
              {{ auth.nombre }}
              <q-badge :label="auth.rol" color="white" text-color="primary" class="q-ml-xs" />
            </span>
          </div>
          <q-btn flat dense icon="logout" label="Cerrar sesion" @click="cerrarSesion" />
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawerAbierto" show-if-above bordered :width="240">
      <q-list padding>
        <q-item-label header class="text-weight-bold text-grey-7">Modulos</q-item-label>

        <q-item
          v-for="item in menu"
          :key="item.ruta"
          :to="{ name: item.ruta }"
          clickable
          v-ripple
          exact
        >
          <q-item-section avatar>
            <q-icon :name="item.icono" />
          </q-item-section>
          <q-item-section>{{ item.nombre }}</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../stores/auth.js'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()

const drawerAbierto = ref(true)

const menu = [
  { nombre: 'Inicio', ruta: 'inicio', icono: 'dashboard' },
  { nombre: 'Clientes', ruta: 'clientes', icono: 'business' },
  { nombre: 'Solicitudes', ruta: 'solicitudes', icono: 'assignment' },
  { nombre: 'Cotizaciones', ruta: 'cotizaciones', icono: 'request_quote' },
  { nombre: 'Muestras', ruta: 'muestras', icono: 'biotech' },
  { nombre: 'Parametros', ruta: 'parametros', icono: 'list_alt' }
]

onMounted(() => {
  // Refresca el perfil (y detecta token expirado) vía GET /api/auth/me.
  auth.cargarSesion()
})

function cerrarSesion() {
  $q.dialog({
    title: 'Cerrar sesion',
    message: 'Desea salir del sistema?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    auth.logout()
    router.push({ name: 'login' })
  })
}
</script>
