<script setup>
/**
 * /layouts/AdminLayout.vue
 * Plantilla ÚNICA de la aplicación interna (con sesión).
 * El login, el seguimiento y la encuesta NO usan este layout: son pantallas
 * públicas sueltas.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { get } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useAuthStore } from '@/store/Auth'
import { useNotificar } from '@/composables/useNotificar'
import { formatDateTime } from '@/utils/formatDate'
import logoSena from '@/assets/logo-sena.svg'

const general = useGeneralStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { notificarInfo } = useNotificar()

/**
 * BADGE DE NOTIFICACIONES PENDIENTES:
 * consulta la bandeja (GET /notificaciones?estado=pendiente) al entrar, al
 * cambiar de página y cada 30 segundos. Si hay pendientes, el menú y la
 * campana de la cabecera muestran el contador en rojo.
 */
const pendientes = ref(0)
let timerNotificaciones = null

const cargarPendientes = async () => {
  if (!auth.esStaff) return
  try {
    const lista = await get('/notificaciones?estado=pendiente')
    pendientes.value = lista.length
  } catch {
    // Silencioso: si la API no responde, el badge simplemente no se actualiza.
  }
}

onMounted(() => {
  cargarPendientes()
  timerNotificaciones = setInterval(cargarPendientes, 30000)
})

onBeforeUnmount(() => clearInterval(timerNotificaciones))

watch(() => route.name, cargarPendientes)

const salir = () => {
  auth.cerrarSesion()
  notificarInfo('Sesión cerrada')
  router.push({ name: 'login' })
}

/**
 * Opciones del menú lateral. "soloAdmin" oculta la opción para perfiles que no
 * sean administrador. Para agregar un módulo nuevo, se suma una línea aquí.
 */
const opcionesMenu = [
  { name: 'panel', titulo: 'Panel', icono: 'dashboard' },
  { name: 'clientes', titulo: 'Clientes', icono: 'groups', soloStaff: true },
  { name: 'solicitudes', titulo: 'Solicitudes', icono: 'assignment', soloStaff: true },
  { name: 'muestras', titulo: 'Muestras', icono: 'science', soloStaff: true },
  { name: 'parametros', titulo: 'Parámetros', icono: 'tune', soloStaff: true },
  { name: 'cotizaciones', titulo: 'Cotizaciones', icono: 'request_quote', soloStaff: true },
  { name: 'pagos', titulo: 'Pagos', icono: 'payments', soloStaff: true },
  { name: 'resultados', titulo: 'Resultados', icono: 'fact_check', soloStaff: true },
  { name: 'incidencias', titulo: 'Incidencias', icono: 'report_problem', soloStaff: true },
  { name: 'informes', titulo: 'Informes', icono: 'description', soloStaff: true },
  { name: 'notificaciones', titulo: 'Notificaciones', icono: 'mail', soloStaff: true },
  { name: 'facturas', titulo: 'Facturación', icono: 'receipt', soloStaff: true },
  { name: 'disposiciones', titulo: 'Disposición', icono: 'archive', soloStaff: true },
  { name: 'usuarios', titulo: 'Usuarios', icono: 'manage_accounts', soloAdmin: true },
  { name: 'seguimiento', titulo: 'Consulta pública', icono: 'travel_explore' },
]

const menuVisible = computed(() =>
  opcionesMenu
    .filter((o) => (!o.soloAdmin || auth.esAdmin) && (!o.soloStaff || auth.esStaff))
    .map((o) => (o.name === 'notificaciones' ? { ...o, badge: pendientes.value } : o)),
)

const tituloSeccion = computed(() => route.meta?.titulo || 'Panel')

// Etiqueta legible del rol para mostrar en la cabecera.
const etiquetaRol = computed(() => {
  if (auth.esAdmin) return 'Administrador'
  if (auth.rol === 'encargado') return 'Encargado'
  return auth.rol || ''
})
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Abrir menú"
          @click="general.alternarMenu()"
        />

        <q-toolbar-title class="text-weight-bold text-subtitle1">
          {{ tituloSeccion }}
        </q-toolbar-title>

        <template v-if="auth.estaAutenticado">
          <!-- Campana de notificaciones con contador de pendientes -->
          <q-btn
            v-if="auth.esStaff"
            flat
            dense
            round
            icon="notifications"
            aria-label="Notificaciones"
            class="q-mr-xs"
            :to="{ name: 'notificaciones' }"
          >
            <q-badge v-if="pendientes" floating color="negative" :label="pendientes > 99 ? '99+' : pendientes" />
            <q-tooltip>Notificaciones pendientes</q-tooltip>
          </q-btn>

          <q-badge
            v-if="auth.rol"
            class="q-mr-sm gt-xs"
            :color="auth.esAdmin ? 'white' : 'green-2'"
            :text-color="auth.esAdmin ? 'primary' : 'green-10'"
            :label="etiquetaRol"
          />

          <div class="text-caption q-mr-sm gt-xs">
            {{ auth.nombreUsuario }}
          </div>

          <q-btn flat dense round icon="logout" aria-label="Cerrar sesión" @click="salir">
            <q-tooltip>Cerrar sesión</q-tooltip>
          </q-btn>
        </template>

        <q-btn v-else flat dense no-caps icon="login" label="Entrar" :to="{ name: 'login' }" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="general.menuAbierto" show-if-above bordered :width="248" class="bg-white">
      <div class="q-pa-md row items-center no-wrap">
        <img :src="logoSena" alt="Logo SENA" width="38" height="38" class="q-mr-sm" />
        <div>
          <div class="marca-panel">LAB<span class="marca-panel--acento">FICAT</span></div>
          <div class="text-caption texto-suave">Laboratorio · SENA</div>
        </div>
      </div>

      <q-separator />

      <q-list padding>
        <q-item-label header class="text-uppercase text-caption text-weight-bold">
          Menú
        </q-item-label>

        <q-item
          v-for="opcion in menuVisible"
          :key="opcion.name"
          v-ripple
          clickable
          class="enlace-menu"
          :to="{ name: opcion.name }"
        >
          <q-item-section avatar>
            <q-icon :name="opcion.icono" />
          </q-item-section>
          <q-item-section>{{ opcion.titulo }}</q-item-section>
          <q-item-section v-if="opcion.badge" side>
            <q-badge color="negative" :label="opcion.badge" />
          </q-item-section>
        </q-item>
      </q-list>

      <div class="absolute-bottom q-pa-md text-caption texto-suave">
        <div>
          <q-icon name="dns" size="14px" class="q-mr-xs" />
          {{ general.urlApi }}
        </div>
        <div v-if="general.ultimaSincronizacion" class="q-mt-xs">
          <q-icon name="schedule" size="14px" class="q-mr-xs" />
          {{ formatDateTime(general.ultimaSincronizacion) }}
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<style scoped lang="scss">
// Wordmark del proyecto en el menú lateral, a juego con el login.
.marca-panel {
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.1;
  color: #1b5e20;
}

.marca-panel--acento {
  color: #2e7d32;
}
</style>
