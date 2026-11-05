/**
 * @fileoverview /composables/useNotificar.js
 * Centraliza cómo se le avisa al usuario, para que todas las pantallas muestren
 * los mensajes igual.
 */
import { useQuasar } from 'quasar'

export function useNotificar() {
  const $q = useQuasar()

  /** Mensaje de éxito (verde). */
  const notificarOk = (mensaje) => {
    $q.notify({ type: 'positive', message: mensaje, icon: 'check_circle' })
  }

  /**
   * Mensaje de error (rojo).
   * Recibe el error YA normalizado por /plugins/axios.js:
   *   { status, mensaje, errores: string[] }
   */
  const notificarError = (error) => {
    if (typeof error === 'string') {
      $q.notify({ type: 'negative', message: error, icon: 'error' })
      return
    }

    const detalle = error?.errores?.length ? error.errores.join(' · ') : ''

    $q.notify({
      type: 'negative',
      icon: 'error',
      message: error?.mensaje || 'Ocurrió un error inesperado',
      caption: detalle,
      timeout: detalle ? 6000 : 3000,
    })
  }

  /** Aviso informativo (azul). */
  const notificarInfo = (mensaje) => {
    $q.notify({ type: 'info', message: mensaje, icon: 'info' })
  }

  return { notificarOk, notificarError, notificarInfo }
}
