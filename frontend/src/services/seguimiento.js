/**
 * /services/seguimiento.js
 * Servicio de la consulta PÚBLICA de muestras y de la encuesta.
 * Consume los endpoints reales del backend (/api/publico), sin token.
 */
import { get, post } from '@/services/api.service'

/** Datos públicos de una muestra, proyectados para el cliente (RF-082). */
export async function obtenerMuestraPublica(codigo) {
  return get(`/publico/muestras/${encodeURIComponent(codigo)}`)
}

/** Registra la respuesta del cliente a una incidencia (RF-069/070). */
export async function responderIncidencia(id, mensaje) {
  return post(`/publico/incidencias/${id}/respuesta`, { mensaje })
}

/** Envía la encuesta de satisfacción (RF-098). */
export async function enviarEncuesta({ codigo, calificacion, comentario }) {
  return post('/publico/encuestas', { codigo, calificacion, comentario })
}
