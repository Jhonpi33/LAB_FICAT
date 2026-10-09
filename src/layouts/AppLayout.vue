<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import ThemeToggle from '../components/ThemeToggle.vue'
import StatusBadge from '../components/StatusBadge.vue'
import ModulePage from '../pages/ModulePage.vue'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import { laboratoryService } from '../services/laboratory'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const auth = useAuthStore()
const theme = useThemeStore()
const isDevelopment = import.meta.env.DEV
const drawerOpen = ref(false)
const globalSearch = ref('')
const alerts = ref(2)
const currentPath = computed(() => route.path.replace(/^\/app\/?/, '') || 'panel')
const isReader = computed(() => auth.activeRole === 'reader')
const navSections = [
  { label: 'Trabajo diario', items: [
    ['panel', 'Panel principal', 'dashboard'],
    ['clientes', 'Clientes', 'groups'],
    ['solicitudes', 'Solicitudes', 'assignment'],
    ['cotizaciones', 'Cotizaciones', 'request_quote'],
    ['recepcion/nueva', 'Recibir muestra', 'move_to_inbox'],
    ['muestras', 'Inventario de muestras', 'inventory_2'],
    ['incidencias', 'Incidencias', 'report_problem'],
    ['resultados', 'Resultados', 'biotech'],
  ] },
  { label: 'Cierre del servicio', items: [
    ['informes', 'Informes', 'description'],
    ['facturacion', 'Facturación', 'receipt_long'],
    ['disposicion', 'Disposición final', 'delete_sweep'],
    ['notificaciones', 'Notificaciones', 'notifications'],
  ] },
  { label: 'Administración', items: [
    ['catalogo-parametros', 'Catálogo de análisis', 'science'],
    ['usuarios', 'Usuarios y permisos', 'manage_accounts'],
    ['auditoria', 'Auditoría', 'history'],
    ['eliminados', 'Registros eliminados', 'restore_from_trash'],
    ['respaldo', 'Respaldo manual', 'backup'],
  ] },
]
const roleOptions = [
  { label: 'Encargado', value: 'editor' },
  { label: 'Administrador', value: 'admin' },
  { label: 'Usuario / Cliente', value: 'reader' },
]
// El perfil Usuario / Cliente no ve secciones internas ni ajenas (RF-049)
const visibleNavSections = computed(() => {
  if (!auth.isClient) return navSections
  return navSections
    .filter((section) => section.label !== 'Administración')
    .map((section) => ({ ...section, items: section.items.filter(([to]) => auth.canAccessSection(to)) }))
    .filter((section) => section.items.length)
})

function isActive(to) {
  return currentPath.value === to || currentPath.value.startsWith(`${to}/`)
}
function openGlobalSearch() {
  const term = globalSearch.value.trim().toUpperCase()
  if (!term) return
  if (/^\d{4}-\d{4}$/.test(term)) router.push(`/app/muestras/${term}`)
  else router.push('/app/solicitudes')
  globalSearch.value = ''
}
function signOut() {
  auth.signOut()
  router.push('/login')
}
async function acknowledgeAlerts() {
  alerts.value = 0
  await laboratoryService.performAction('Notificaciones revisadas', { module: 'Notificaciones' })
  router.push('/app/notificaciones')
}
</script>

<template>
  <q-layout view="hHh Lpr fFf" class="app-shell">
    <q-header class="app-header no-print">
      <q-toolbar class="q-px-md" style="min-height:70px">
        <q-btn flat round dense icon="menu" class="q-mr-sm" aria-label="Abrir navegación" @click="drawerOpen = !drawerOpen" />
        <router-link to="/app/panel" class="row items-center no-wrap q-gutter-sm" style="text-decoration:none">
          <span class="brand-mark">S</span><span class="gt-xs"><strong>Laboratorio SENA</strong><br><small class="muted">Gestión de análisis</small></span>
        </router-link>
        <q-space />
        <q-form class="gt-sm" @submit.prevent="openGlobalSearch">
          <q-input v-model="globalSearch" dense outlined rounded placeholder="Buscar código o solicitud" aria-label="Buscar por código de muestra">
            <template #append><q-icon name="search" /></template>
          </q-input>
        </q-form>
        <q-btn flat round icon="notifications_none" aria-label="Ver notificaciones" @click="acknowledgeAlerts">
          <q-badge v-if="alerts" color="negative" floating>{{ alerts }}</q-badge>
        </q-btn>
        <ThemeToggle />
        <q-btn flat round icon="account_circle" aria-label="Cerrar sesión" @click="signOut"><q-tooltip>{{ auth.user?.name }} · Cerrar sesión</q-tooltip></q-btn>
      </q-toolbar>
      <q-toolbar class="lt-md q-pt-none">
        <q-form class="full-width" @submit.prevent="openGlobalSearch">
          <q-input v-model="globalSearch" dense outlined rounded placeholder="Buscar por código de muestra">
            <template #append><q-icon name="search" /></template>
          </q-input>
        </q-form>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawerOpen" show-if-above :width="258" bordered class="app-drawer no-print">
      <div class="q-pa-md">
        <div class="text-caption muted">Sesión activa</div>
        <div class="text-weight-bold q-mt-xs">{{ auth.user?.name }}</div>
        <StatusBadge :status="roleOptions.find((item) => item.value === auth.activeRole)?.label || 'Sin permiso'" />
      </div>
      <q-separator />
      <q-list padding>
        <template v-for="section in visibleNavSections" :key="section.label">
          <div class="mobile-nav-title">{{ section.label }}</div>
          <q-item v-for="[to, label, icon] in section.items" :key="to" clickable v-ripple :active="isActive(to)" active-class="nav-active" :to="`/app/${to}`" @click="drawerOpen = false">
            <q-item-section avatar><q-icon :name="icon" /></q-item-section>
            <q-item-section>{{ label }}</q-item-section>
          </q-item>
        </template>      </q-list>
      <q-separator />
      <div v-if="isDevelopment" class="q-pa-md">
        <q-select :model-value="auth.activeRole" dense outlined label="Probar como…" :options="roleOptions" emit-value map-options @update:model-value="auth.setSimulatedRole" />
      </div>
      <div class="q-pa-md text-caption muted">Conectado como {{ auth.user?.email }}</div>
    </q-drawer>

    <q-page-container>
      <q-page>
        <ModulePage :path="currentPath" />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.nav-active { color: var(--primary); background: color-mix(in srgb, var(--primary), transparent 90%); font-weight: 600; }
</style>
