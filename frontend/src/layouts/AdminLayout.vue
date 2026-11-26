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
import { mostrarSalpicadura } from '@/splash/controlador'
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

/**
 * BANDEJA RÁPIDA DE LA CAMPANA:
 * al abrir el menú se consultan las notificaciones más recientes (sin importar
 * el estado) para mostrarlas en el cuadro estilo YouTube/Facebook.
 */
const notificacionesRecientes = ref([])
const cargandoBandeja = ref(false)
const menuNotificaciones = ref(false)

const TIPO_INFO = {
  cambio_etapa: { icono: 'swap_horiz', color: 'blue' },
  incidencia: { icono: 'report_problem', color: 'orange' },
  cambio_fecha: { icono: 'event', color: 'purple' },
  resultados_disponibles: { icono: 'fact_check', color: 'green' },
  conservacion: { icono: 'ac_unit', color: 'cyan' },
  otro: { icono: 'mail', color: 'grey' },
}

const infoTipo = (tipo) => TIPO_INFO[tipo] || TIPO_INFO.otro

const cargarBandeja = async () => {
  if (!auth.esStaff) return
  cargandoBandeja.value = true
  try {
    const lista = await get('/notificaciones')
    notificacionesRecientes.value = lista.slice(0, 6)
  } catch {
    // Silencioso: el menú muestra su estado vacío.
    notificacionesRecientes.value = []
  } finally {
    cargandoBandeja.value = false
  }
}

const verTodasLasNotificaciones = () => {
  menuNotificaciones.value = false
  router.push({ name: 'notificaciones' })
}

/** Fecha amigable para la bandeja rápida: "Hace 5 min", "Hace 2 h"... */
const tiempoRelativo = (fecha) => {
  if (!fecha) return ''
  const minutos = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000)
  if (minutos < 1) return 'Ahora'
  if (minutos < 60) return `Hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `Hace ${horas} h`
  const dias = Math.floor(horas / 24)
  if (dias < 7) return `Hace ${dias} d`
  return formatDateTime(fecha)
}

onMounted(() => {
  cargarPendientes()
  timerNotificaciones = setInterval(cargarPendientes, 30000)
})

onBeforeUnmount(() => clearInterval(timerNotificaciones))

watch(() => route.name, cargarPendientes)

const salir = () => {
  auth.cerrarSesion()

  // --- PANTALLA DE CARGA — 3.er USO ----------------------------------------
  // Sale aquí para cubrir la transición al login: se queda en pantalla hasta
  // que la ruta esté resuelta.
  // Sin `apiUrl` NO se llama a /health (no aporta nada al salir), así que
  // dura el mínimo de 1 s. El aviso se emite al FINAL: mientras la pintura
  // cubre la pantalla no se llegaría a ver.
  mostrarSalpicadura({
    router,
    contexto: { estado: 'Cerrando la sesión…' },
    alTerminar: () => notificarInfo('Sesión cerrada'),
  })

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
        <q-toolbar-title class="titulo-cabecera">
          <span class="marca-cabecera">LABFICAT</span>
          <q-icon name="chevron_right" size="16px" class="separador-cabecera" />
          <span class="seccion-cabecera">{{ tituloSeccion }}</span>
        </q-toolbar-title>

        <q-space />

        <template v-if="auth.estaAutenticado">
          <!-- Campana: abre la bandeja rápida (estilo YouTube/Facebook) -->
          <q-btn
            v-if="auth.esStaff"
            flat
            dense
            round
            icon="notifications"
            aria-label="Notificaciones"
            class="boton-menu q-mr-sm boton-campana"
          >
            <q-badge v-if="pendientes" floating color="negative" :label="pendientes > 99 ? '99+' : pendientes" />

            <q-menu
              v-model="menuNotificaciones"
              anchor="bottom right"
              self="top right"
              :offset="[0, 12]"
              class="menu-notificaciones"
              @before-show="cargarBandeja"
            >
              <div class="menu-notificaciones__cabecera">
                <span class="menu-notificaciones__titulo">Notificaciones</span>
                <q-badge v-if="pendientes" color="negative" class="q-ml-sm" :label="`${pendientes} pendiente(s)`" />
              </div>

              <q-separator />

              <div v-if="cargandoBandeja" class="menu-notificaciones__estado">
                <q-spinner color="primary" size="26px" />
                <span>Cargando notificaciones...</span>
              </div>

              <q-list v-else-if="notificacionesRecientes.length" class="menu-notificaciones__lista">
                <q-item v-for="notificacion in notificacionesRecientes" :key="notificacion._id" class="menu-notificaciones__item">
                  <q-item-section avatar>
                    <q-avatar size="38px" :color="`${infoTipo(notificacion.tipo).color}-1`" :text-color="`${infoTipo(notificacion.tipo).color}-9`">
                      <q-icon :name="infoTipo(notificacion.tipo).icono" size="20px" />
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="menu-notificaciones__asunto">{{ notificacion.asunto }}</q-item-label>
                    <q-item-label caption lines="2" class="menu-notificaciones__mensaje">
                      {{ notificacion.mensaje }}
                    </q-item-label>
                    <q-item-label caption class="menu-notificaciones__fecha">
                      {{ tiempoRelativo(notificacion.fecha_programada) }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side top>
                    <q-badge
                      :color="notificacion.estado === 'fallida' ? 'red-2' : notificacion.estado === 'pendiente' ? 'orange-2' : 'green-2'"
                      :text-color="notificacion.estado === 'fallida' ? 'red-10' : notificacion.estado === 'pendiente' ? 'orange-10' : 'green-10'"
                      :label="notificacion.estado === 'fallida' ? 'Fallida' : notificacion.estado === 'pendiente' ? 'Pendiente' : 'Enviada'"
                    />
                  </q-item-section>
                </q-item>
              </q-list>

              <div v-else class="menu-notificaciones__estado menu-notificaciones__estado--vacio">
                <q-icon name="notifications_none" size="40px" color="grey-4" />
                <span>No hay notificaciones recientes</span>
              </div>

              <q-separator />

              <q-item clickable class="menu-notificaciones__ver-todas" @click="verTodasLasNotificaciones">
                <q-item-section class="text-center text-primary text-weight-bold">
                  Ver todas las notificaciones
                </q-item-section>
                <q-item-section side>
                  <q-icon name="arrow_forward" size="18px" color="primary" />
                </q-item-section>
              </q-item>
            </q-menu>
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
    <q-drawer :model-value="true" :breakpoint="0" bordered :width="268" class="app-drawer bg-white">
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

// main.scss reserva una franja fija para el scrollbar (`scrollbar-gutter:
// stable`); en páginas sin scroll esa franja queda vacía a la derecha de la
// cabecera, el contenido y el pie. Aquí se desactiva para que todo llegue
// hasta el borde (si la página sí tiene scroll, el scrollbar aparece normal).
:global(html) {
  scrollbar-gutter: auto;
}

// --- Cabecera ------------------------------------------------------------------
.cabecera {
  // OJO: NO poner `position: relative` aquí. Quasar fija la cabecera con
  // `fixed-top`; con `relative` + `left: 268px` la cabecera se corre 268px a
  // la derecha y la campana, el usuario y el botón de salir quedan fuera de
  // la pantalla.
  background: rgba(255, 255, 255, 0.94);
  color: #14261a;
  border-bottom: 1px solid #e4e9e4;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

// La cabecera es fija: el espacio lo da la página (no el contenedor) para que
// no se cuente dos veces y el contenido quede pegado en su sitio.
:deep(.q-page-container) {
  padding-top: 0 !important;
  padding-left: 268px !important;
  overflow-x: hidden;
}

:deep(.q-header) {
  left: 268px !important;
}

:deep(.q-page) {
  padding-top: 68px;
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

// --- Bandeja rápida de notificaciones (campana) --------------------------------
.menu-notificaciones {
  width: 380px;
  max-width: calc(100vw - 24px);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 18px 48px rgba(20, 38, 26, 0.18);
}

.menu-notificaciones__cabecera {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  background: #fff;
}

.menu-notificaciones__titulo {
  font-size: 15px;
  font-weight: 800;
  color: #14261a;
}

.menu-notificaciones__lista {
  max-height: 360px;
  overflow-y: auto;
  padding: 4px 0;
}

.menu-notificaciones__item {
  align-items: flex-start;
  padding: 10px 16px;

  &:hover {
    background: #f4f9f4;
  }
}

.menu-notificaciones__asunto {
  font-size: 13px;
  font-weight: 700;
  color: #1c2b20;
  white-space: normal;
  line-height: 1.3;
}

.menu-notificaciones__mensaje {
  font-size: 12px;
  color: #6c7a6f;
  margin-top: 2px;
}

.menu-notificaciones__fecha {
  font-size: 11px;
  color: #93a096;
  margin-top: 4px;
}

.menu-notificaciones__estado {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 18px;
  font-size: 13px;
  color: #8a978d;
}

.menu-notificaciones__estado--vacio {
  padding: 34px 18px;
}

.menu-notificaciones__ver-todas {
  padding: 12px 16px;
  color: #2e7d32;

  &:hover {
    background: #edf7ee;
  }
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
  height: 69px;
  padding: 0 18px;
  background: #fff;
  border-bottom: 1px solid #e4e9e4;
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