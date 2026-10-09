import axios from 'axios'

/**
 * Cliente HTTP del frontend.
 *
 * Para qué: RNF-001 y RNF-002 exigen arquitectura cliente-servidor donde el
 * frontend habla con el backend mediante peticiones HTTP. Este archivo es el
 * ÚNICO punto por el que salen esas peticiones, para que:
 *   - la URL del backend viva en un solo lugar,
 *   - cada petición lleve el token de sesión automáticamente,
 *   - un 401 cierre la sesión en vez de dejar al usuario en una pantalla rota.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

const TOKEN_KEY = 'lab-token'

export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (t) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
}

// Adjunta el token a cada petición si existe.
api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si el token expiró o es inválido (401), se limpia la sesión.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    if (status === 401) tokenStore.clear()
    return Promise.reject(error)
  },
)

/**
 * Traduce el error de Axios a un mensaje comprensible para la persona.
 * RNF-014: los errores se muestran en pantalla con texto claro y sin
 * términos técnicos, sin redirigir a una página de error.
 */
export function mensajeDeError(error, porDefecto = 'No se pudo completar la operación. Intenta de nuevo.') {
  const datos = error?.response?.data
  if (datos?.mensaje) return datos.mensaje
  if (Array.isArray(datos?.errores) && datos.errores.length) return datos.errores[0].msg || datos.errores[0]
  if (error?.code === 'ECONNABORTED') return 'La solicitud tardó demasiado. Revisa tu conexión.'
  if (!error?.response) return 'No hay conexión con el servidor del laboratorio.'
  return porDefecto
}

export default api
