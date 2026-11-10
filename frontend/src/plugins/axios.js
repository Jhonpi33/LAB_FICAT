/**
 * @fileoverview /plugins/axios.js
 * UNA sola instancia de axios para toda la aplicación.
 *
 * Cadena de responsabilidad del proyecto:
 *   componente -> store (Pinia) -> service -> ESTE archivo -> backend
 *
 * Adaptado al backend real de LAB_FICAT (Express + Mongoose):
 *   - baseURL desde VITE_API_URL (por defecto http://localhost:4000/api)
 *   - cabecera "Authorization: Bearer <token>" (la revisa middlewares/auth.js)
 *   - respuestas con forma { ok, mensaje, datos }
 *   - errores con forma { ok: false, mensaje, errores: [{ campo, msg }] }
 */
import axios from 'axios'

import { router } from '@/router'
import { useAuthStore } from '@/store/Auth'

const api = axios.create({
  baseURL: apiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

/**
 * INTERCEPTOR DE PETICIÓN: inyecta el token Bearer en TODAS las peticiones.
 * useAuthStore() se llama DENTRO del interceptor porque al cargar este archivo
 * Pinia todavía no existe.
 */
api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`
  return config
})

/**
 * INTERCEPTOR DE RESPUESTA: normaliza el error para que los stores reciban
 * siempre lo mismo: { status, mensaje, errores: string[] }.
 */
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const data = error.response?.data

    // El validador del backend devuelve errores: [{ campo, msg }]; aquí se
    // convierten a strings para poder unirlos con " · " en las notificaciones.
    const errores = Array.isArray(data?.errores)
      ? data.errores.map((e) => (typeof e === 'string' ? e : e.msg))
      : []

    const normalizado = {
      status: error.response?.status ?? 0,
      mensaje: data?.mensaje || mensajeSegunFallo(error),
      errores,
    }

    // 401 = token ausente o vencido: se cierra la sesión desde un solo lugar.
    if (normalizado.status === 401) cerrarSesionYSalir()

    return Promise.reject(normalizado)
  },
)

function cerrarSesionYSalir() {
  const auth = useAuthStore()
  auth.cerrarSesion()
  if (router.currentRoute.value.name !== 'login') router.push({ name: 'login' })
}

function apiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
  const base = configured.replace(/\/+$/, '')
  return base.endsWith('/api') ? base : `${base}/api`
}

function mensajeSegunFallo(error) {
  if (error.code === 'ECONNABORTED') return 'El servidor tardó demasiado en responder'
  if (!error.response) return 'No hay conexión con el servidor del laboratorio'
  return 'Ocurrió un error inesperado'
}

export default api
