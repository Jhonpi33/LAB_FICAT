import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

/**
 * Rutas del sistema (versión mínima):
 * - /login (pública)
 * - resto dentro de MainLayout con meta.requiresAuth (guard redirige a /login sin token).
 */
const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/auth/Login.vue'),
    meta: { publica: true }
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'inicio',
        component: () => import('../pages/inicio/InicioPage.vue'),
        meta: { titulo: 'Inicio' }
      },
      {
        path: 'clientes',
        name: 'clientes',
        component: () => import('../pages/clientes/ClientesPage.vue'),
        meta: { titulo: 'Clientes' }
      },
      {
        path: 'solicitudes',
        name: 'solicitudes',
        component: () => import('../pages/solicitudes/SolicitudesPage.vue'),
        meta: { titulo: 'Solicitudes' }
      },
      {
        path: 'cotizaciones',
        name: 'cotizaciones',
        component: () => import('../pages/cotizaciones/CotizacionesPage.vue'),
        meta: { titulo: 'Cotizaciones' }
      },
      {
        path: 'muestras',
        name: 'muestras',
        component: () => import('../pages/muestras/MuestrasPage.vue'),
        meta: { titulo: 'Muestras' }
      },
      {
        path: 'parametros',
        name: 'parametros',
        component: () => import('../pages/parametros/ParametrosPage.vue'),
        meta: { titulo: 'Parametros de analisis' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'error404',
    component: () => import('../pages/Error404.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // Sin token y ruta protegida → login.
  if (to.meta.requiresAuth && !auth.estaAutenticado) {
    return { name: 'login' }
  }

  // Con token no se puede volver al login.
  if (to.name === 'login' && auth.estaAutenticado) {
    return { name: 'inicio' }
  }

  return true
})

export default router
