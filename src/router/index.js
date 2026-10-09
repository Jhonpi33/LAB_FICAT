import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/', redirect: '/seguimiento' },
  { path: '/login', component: () => import('../pages/LoginPage.vue'), meta: { public: true } },
  { path: '/seguimiento', component: () => import('../pages/TrackingPage.vue'), meta: { public: true } },
  { path: '/seguimiento/:codigo', component: () => import('../pages/TrackingPage.vue'), meta: { public: true } },
  { path: '/encuesta/:codigo', component: () => import('../pages/SurveyPage.vue'), meta: { public: true } },
  { path: '/app/:pathMatch(.*)*', component: () => import('../layouts/AppLayout.vue'), meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', redirect: '/seguimiento' },
]

const router = createRouter({ history: createWebHistory(), routes, scrollBehavior: () => ({ top: 0 }) })
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.user) return { path: '/login', query: { aviso: 'iniciar-sesion' } }
  if (to.path === '/login' && auth.user) return '/app/panel'
  return true
})

export default router
