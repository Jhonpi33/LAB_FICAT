import axios from 'axios'
import { obtenerToken, limpiarSesion } from '../utils/session.js'

/**
 * Cliente HTTP único del frontend.
 * Contrato API.md §1.1: toda respuesta es { ok, mensaje, datos[, errores] }
 * y la autenticación es `Authorization: Bearer <token>` (clave `lab_token`).
 */
const api = axios.create({
  // VITE_API_URL manda (producción o backend en otro host). Sin ella:
  //  - en dev usa '/api' → proxy de Vite hacia el backend (API.md §1, sin CORS);
  //  - en build apunta directo al backend local por defecto.
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? '/api' : 'http://localhost:3100/api'),
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor de request: adjunta el JWT si existe.
api.interceptors.request.use((config) => {
  const token = obtenerToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de respuesta: ante un 401 limpia la sesión y redirige a /login
// (API.md §2 y §15.3). Se excluye el propio /auth/login: un 401 ahí significa
// "Credenciales incorrectas" y el formulario debe conservar lo digitado (RNF-014).
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const url = error.config?.url || ''
    const esLogin = url.includes('/auth/login')

    if (error.response?.status === 401 && !esLogin) {
      limpiarSesion()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  }
)

/** Extrae el mensaje real del backend para mostrarlo en pantalla. */
export function mensajeDeError(error, fallback = 'Ocurrio un error inesperado') {
  return error?.response?.data?.mensaje || error?.message || fallback
}

/** Extrae la lista de errores de validación (HTTP 400): [{ campo, msg }]. */
export function erroresDeValidacion(error) {
  return error?.response?.data?.errores || []
}

export { api }
export default api
