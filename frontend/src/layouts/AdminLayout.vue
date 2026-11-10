<script setup>
/**
 * /layouts/AdminLayout.vue
 * Plantilla ÚNICA de la aplicación interna (con sesión).
 * El login, el seguimiento y la encuesta NO usan este layout.
 *
 * Diseño: cabecera blanca y limpia (estilo SaaS) con acentos en el verde de
 * marca, menú lateral claro y pie de página con los datos del entorno.
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
 * cambiar de página y cada 30 segundos.
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

const etiquetaRol = computed(() => {
  if (auth.esAdmin) return 'Administrador'
  if (auth.rol === 'encargado') return 'Encargado'
  return auth.rol || ''
})

/** Iniciales para el avatar del usuario (hasta 2). */
const iniciales = computed(() => {
  const nombre = auth.nombreUsuario || ''
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
})
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <!-- ================= CABECERA (blanca, estilo SaaS) ================= -->
    <q-header class="cabecera">
      <q-toolbar class="q-px-md">
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Abrir menú"
          class="boton-menu"
          @click="general.alternarMenu()"
        />

        <q-toolbar-title class="titulo-cabecera">
          <span class="marca-cabecera">LABFICAT</span>
          <q-icon name="chevron_right" size="16px" class="separador-cabecera" />
          <span class="seccion-cabecera">{{ tituloSeccion }}</span>
        </q-toolbar-title>

        <q-space />

        <template v-if="auth.estaAutenticado">
          <!-- Campana de notificaciones con contador -->
          <q-btn
            v-if="auth.esStaff"
            flat
            dense
            round
            icon="notifications"
            aria-label="Notificaciones"
            class="boton-menu q-mr-sm"
            :to="{ name: 'notificaciones' }"
          >
            <q-badge v-if="pendientes" floating color="negative" :label="pendientes > 99 ? '99+' : pendientes" />
            <q-tooltip>Notificaciones pendientes</q-tooltip>
          </q-btn>

          <!-- Usuario: avatar + nombre + rol -->
          <div class="usuario">
            <q-avatar size="34px" class="avatar-usuario">{{ iniciales }}</q-avatar>
            <div class="usuario__datos gt-xs">
              <div class="usuario__nombre">{{ auth.nombreUsuario }}</div>
              <div class="usuario__rol">{{ etiquetaRol }}</div>
            </div>
          </div>

          <q-separator vertical class="q-mx-sm separador-cabecera-vertical" />

          <q-btn
            flat
            dense
            round
            icon="logout"
            aria-label="Cerrar sesión"
            class="boton-menu"
            @click="salir"
          >
            <q-tooltip>Cerrar sesión</q-tooltip>
          </q-btn>
        </template>

        <q-btn v-else flat dense no-caps icon="login" label="Entrar" class="boton-menu" :to="{ name: 'login' }" />
      </q-toolbar>
    </q-header>

    <!-- ================= MENÚ LATERAL ================= -->
    <q-drawer v-model="general.menuAbierto" show-if-above bordered :width="268" class="app-drawer bg-white">
      <!-- Marca -->
      <div class="bloque-marca">
        <img :src="logoSena" alt="Logo SENA" width="40" height="40" class="q-mr-sm" />
        <div>
          <div class="marca-panel">LAB<span class="marca-panel--acento">FICAT</span></div>
          <div class="marca-panel__sub">Laboratorio de Alimentos</div>
        </div>
      </div>

      <q-separator />

      <q-list padding>
        <q-item-label header class="text-uppercase text-caption text-weight-bold texto-suave">
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

      <!-- Etiqueta de entorno académico (RNF-017) -->
      <div class="absolute-bottom q-pa-md">
        <div class="tarjeta-entorno">
          <q-icon name="school" size="18px" />
          <div>
            <div class="tarjeta-entorno__titulo">Entorno académico de pruebas</div>
            <div class="tarjeta-entorno__sub">LABFICAT · v1.0.0 · SENA</div>
          </div>
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view v-slot="{ Component, route: pagina }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="pagina.name || pagina.path" />
        </Transition>
      </router-view>
    </q-page-container>

    <!-- ================= PIE DE PÁGINA ================= -->
    <q-footer class="pie">
      <div class="pie__izq">
        <img :src="logoSena" alt="Logo SENA" width="16" height="16" />
        <span>LABFICAT · Laboratorio de Alimentos y Grasas — SENA</span>
      </div>
      <div class="pie__der">
        <span class="pie__item">
          <q-icon name="dns" size="13px" />
          {{ general.urlApi }}
        </span>
        <span class="pie__separador">·</span>
        <span class="pie__item">
          <q-icon name="schedule" size="13px" />
          {{ general.ultimaSincronizacion ? formatDateTime(general.ultimaSincronizacion) : 'sin sincronizar' }}
        </span>
      </div>
    </q-footer>
  </q-layout>
</template>

<style scoped lang="scss">
// =============================================================================
// Cabecera blanca limpia (estilo SaaS) + pie de página con datos del entorno.
// =============================================================================

// --- Cabecera ------------------------------------------------------------------
.cabecera {
  position: relative;
  background: rgba(255, 255, 255, 0.94);
  color: #14261a;
  border-bottom: 1px solid #e4e9e4;
  box-shadow: 0 8px 26px rgba(25, 55, 36, 0.055);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  &::after {
    content: '';
    position: absolute;
    inset: auto 0 -1px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(46, 125, 50, 0.38), transparent);
  }
}

.cabecera :deep(.q-toolbar) {
  min-height: 68px;
  padding-inline: clamp(14px, 2vw, 28px);
}

.marca-cabecera {
  font-weight: 900;
  font-size: 0.92rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2e7d32;
  transition: letter-spacing 0.25s ease, color 0.25s ease;

  &:hover {
    letter-spacing: 0.12em;
    color: #1b5e20;
  }
}

.separador-cabecera {
  color: #c2cbc3;
}

.seccion-cabecera {
  font-size: 0.92rem;
  font-weight: 600;
  color: #4d594f;
}

.titulo-cabecera {
  display: flex;
  align-items: center;
  gap: 6px;
}

.boton-menu {
  color: #4d594f;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: rgba(46, 125, 50, 0.08);
    color: #2e7d32;
  }
}

.separador-cabecera-vertical {
  background: #eef1ee;
}

// Usuario en la cabecera
.usuario {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 10px 5px 5px;
  border: 1px solid #edf1ed;
  border-radius: 999px;
  background: rgba(248, 251, 248, 0.82);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: #d3e5d4;
    box-shadow: 0 4px 14px rgba(27, 94, 32, 0.08);
  }
}

.avatar-usuario {
  background: linear-gradient(145deg, #e6f5e8, #c9e8ce);
  color: #155b2b;
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.5px;
}

.usuario__datos {
  line-height: 1.15;
}

.usuario__nombre {
  font-size: 13px;
  font-weight: 700;
  color: #14261a;
}

.usuario__rol {
  font-size: 11px;
  color: #8a978d;
}

// --- Marca del menú -------------------------------------------------------------
.bloque-marca {
  display: flex;
  align-items: center;
  padding: 20px 18px;
  background:
    radial-gradient(circle at 0 0, rgba(98, 175, 109, 0.14), transparent 58%),
    linear-gradient(135deg, #f5faf5, #ffffff 74%);
  border-bottom: 1px solid #eef1ee;
}

.marca-panel {
  font-size: 1.02rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.1;
  color: #1b5e20;
}

.marca-panel--acento {
  color: #2e7d32;
}

.marca-panel__sub {
  font-size: 11.5px;
  color: #8a978d;
}

// Tarjeta de entorno académico (parte inferior del menú)
.tarjeta-entorno {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f0f7f0;
  border: 1px solid #dbe7dc;
  border-radius: 14px;
  color: #2e7d32;
  box-shadow: 0 8px 22px rgba(29, 78, 38, 0.055);
}

.tarjeta-entorno__titulo {
  font-size: 12px;
  font-weight: 800;
  color: #1b5e20;
  line-height: 1.2;
}

.tarjeta-entorno__sub {
  font-size: 10.5px;
  color: #7d8a80;
}

// --- Pie de página ------------------------------------------------------------------
.pie {
  background: rgba(255, 255, 255, 0.9);
  color: #7d8a80;
  border-top: 1px solid #e4e9e4;
  padding: 8px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  min-height: auto;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.pie__izq {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #4d594f;
}

.pie__der {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pie__item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: min(38vw, 360px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pie__separador {
  color: #c2cbc3;
}

.enlace-menu {
  position: relative;
  min-height: 44px;
  margin: 3px 10px;
  border-radius: 13px;
  color: #4f5f52;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.2s ease;

  &:hover {
    background: #f0f7f0;
    color: #1b5e20;
    transform: translateX(3px);
  }

  &.router-link-active {
    background: linear-gradient(105deg, #e8f5e9, #f4faf4);
    color: #17632e;
    font-weight: 750;
    box-shadow: inset 3px 0 0 #2e7d32, 0 4px 14px rgba(27, 94, 32, 0.06);
  }

  &.router-link-active :deep(.q-icon) {
    color: #24733a;
  }
}

.enlace-menu :deep(.q-icon) {
  transition: transform 0.2s ease, color 0.2s ease;
}

.enlace-menu:hover :deep(.q-icon) {
  transform: scale(1.08);
}

@media (max-width: 600px) {
  .seccion-cabecera {
    font-size: 0.82rem;
  }

  .pie {
    padding: 10px 14px;
  }

  .pie__der {
    width: 100%;
    flex-wrap: wrap;
  }

  .pie__item {
    max-width: 78vw;
  }
}
</style>
