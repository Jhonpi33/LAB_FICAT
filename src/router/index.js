/**
 * @fileoverview /router/index.js
 * TODA la configuración de rutas de la aplicación, en un solo archivo.
 *
 * Mapa de la aplicación:
 *   /                    -> Login        (pública, solo invitados)
 *   /seguimiento[/:cod]  -> Consulta pública de muestra   (pública)
 *   /encuesta/:codigo    -> Encuesta de satisfacción      (pública)
 *   /panel               -> Panel        (privada, dentro de AdminLayout)
 *   /usuarios            -> Usuarios     (privada, solo admin)
 *   cualquier otra       -> 404          (dentro de AdminLayout)
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import { Notify } from 'quasar'

import { useAuthStore } from '@/store/Auth'

// CODE SPLITTING: cada vista se carga bajo demanda (import dinámico). Así el
// bundle principal queda liviano y solo se descarga la vista que se visita.
const AdminLayout = () => import('@/layouts/AdminLayout.vue')
const LoginView = () => import('@/views/LoginView.vue')
const PanelView = () => import('@/views/PanelView.vue')
const UsuariosView = () => import('@/views/UsuariosView.vue')
const ClientesView = () => import('@/views/ClientesView.vue')
const SolicitudesView = () => import('@/views/SolicitudesView.vue')
const MuestrasView = () => import('@/views/MuestrasView.vue')
const ParametrosView = () => import('@/views/ParametrosView.vue')
const CotizacionesView = () => import('@/views/CotizacionesView.vue')
const PagosView = () => import('@/views/PagosView.vue')
const ResultadosView = () => import('@/views/ResultadosView.vue')
const IncidenciasView = () => import('@/views/IncidenciasView.vue')
const InformesView = () => import('@/views/InformesView.vue')
const NotificacionesView = () => import('@/views/NotificacionesView.vue')
const FacturasView = () => import('@/views/FacturasView.vue')
const DisposicionesView = () => import('@/views/DisposicionesView.vue')
const SeguimientoView = () => import('@/views/SeguimientoView.vue')
const EncuestaView = () => import('@/views/EncuestaView.vue')
const NotFoundView = () => import('@/views/NotFoundView.vue')

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginView,
    meta: { titulo: 'Iniciar sesión', soloInvitados: true },
  },
  {
    path: '/seguimiento',
    name: 'seguimiento',
    component: SeguimientoView,
    meta: { titulo: 'Consulta de muestras' },
  },
  {
    path: '/seguimiento/:codigo',
    name: 'seguimiento-codigo',
    component: SeguimientoView,
    meta: { titulo: 'Consulta de muestras' },
  },
  {
    path: '/encuesta/:codigo',
    name: 'encuesta',
    component: EncuestaView,
    meta: { titulo: 'Encuesta de satisfacción' },
  },
  {
    path: '/',
    component: AdminLayout,
    children: [
      {
        path: 'panel',
        name: 'panel',
        component: PanelView,
        meta: { titulo: 'Panel', requiereAuth: true },
      },
      {
        path: 'clientes',
        name: 'clientes',
        component: ClientesView,
        meta: { titulo: 'Clientes', requiereAuth: true, requiereStaff: true },
      },
      {
        path: 'solicitudes',
        name: 'solicitudes',
        component: SolicitudesView,
        meta: { titulo: 'Solicitudes', requiereAuth: true, requiereStaff: true },
      },
      {
        path: 'muestras',
        name: 'muestras',
        component: MuestrasView,
        meta: { titulo: 'Muestras', requiereAuth: true, requiereStaff: true },
      },
      {
        path: 'parametros',
        name: 'parametros',
        component: ParametrosView,
        meta: { titulo: 'Parámetros', requiereAuth: true, requiereStaff: true },
      },
      {
        path: 'cotizaciones',
        name: 'cotizaciones',
        component: CotizacionesView,
        meta: { titulo: 'Cotizaciones', requiereAuth: true, requiereStaff: true },
      },
      {
        path: 'pagos',
        name: 'pagos',
        component: PagosView,
        meta: { titulo: 'Pagos', requiereAuth: true, requiereStaff: true },
      },
      {
        path: 'resultados',
        name: 'resultados',
        component: ResultadosView,
        meta: { titulo: 'Resultados', requiereAuth: true, requiereStaff: true },
      },
      {
        path: 'incidencias',
        name: 'incidencias',
        component: IncidenciasView,
        meta: { titulo: 'Incidencias', requiereAuth: true, requiereStaff: true },
      },
      {
        path: 'informes',
        name: 'informes',
        component: InformesView,
        meta: { titulo: 'Informes', requiereAuth: true, requiereStaff: true },
      },
      {
        path: 'notificaciones',
        name: 'notificaciones',
        component: NotificacionesView,
        meta: { titulo: 'Notificaciones', requiereAuth: true, requiereStaff: true },
      },
      {
        path: 'facturas',
        name: 'facturas',
        component: FacturasView,
        meta: { titulo: 'Facturación', requiereAuth: true, requiereStaff: true },
      },
      {
        path: 'disposiciones',
        name: 'disposiciones',
        component: DisposicionesView,
        meta: { titulo: 'Disposición', requiereAuth: true, requiereStaff: true },
      },
      {
        path: 'usuarios',
        name: 'usuarios',
        component: UsuariosView,
        meta: { titulo: 'Usuarios', requiereAuth: true, requiereAdmin: true },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'no-encontrado',
        component: NotFoundView,
        meta: { titulo: 'Página no encontrada' },
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ left: 0, top: 0 }),
})

/**
 * PROTECCIÓN DE RUTAS (guard global).
 */
function protegerRutas(to) {
  const auth = useAuthStore()

  // 1. Ruta privada sin sesión.
  if (to.meta.requiereAuth && !auth.estaAutenticado) {
    Notify.create({
      type: 'negative',
      message: 'Debes iniciar sesión para entrar a esa página',
      icon: 'lock',
      position: 'top-right',
    })
    return { name: 'login' }
  }

  // 2. Sección exclusiva de administrador.
  if (to.meta.requiereAdmin && !auth.esAdmin) {
    Notify.create({
      type: 'negative',
      message: 'Solo el administrador puede ver esta sección',
      icon: 'shield',
      position: 'top-right',
    })
    return { name: 'panel' }
  }

  // 2b. Sección de personal (encargado / administrador).
  if (to.meta.requiereStaff && !auth.esStaff) {
    Notify.create({
      type: 'negative',
      message: 'Esta sección es solo para el personal del laboratorio',
      icon: 'shield',
      position: 'top-right',
    })
    return { name: 'panel' }
  }

  // 3. Login con sesión abierta.
  if (to.meta.soloInvitados && auth.estaAutenticado) {
    return { name: 'panel' }
  }

  return true
}

router.beforeEach(protegerRutas)

router.afterEach((to) => {
  const base = import.meta.env.VITE_APP_TITULO || 'Laboratorio de Alimentos · SENA'
  document.title = to.meta.titulo ? `${to.meta.titulo} | ${base}` : base
})
