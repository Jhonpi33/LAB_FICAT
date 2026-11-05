/**
 * @fileoverview /utils/validateEmail.js
 * Función pura: recibe un valor y devuelve un booleano. No sabe nada de Vue,
 * ni de Quasar, ni del backend. Por eso vive en /utils y no en /composables.
 */

const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Valida el formato de un correo electrónico.
 * @param {string} valor - texto a validar
 * @returns {boolean} true si el formato es válido
 */
export function validateEmail(valor) {
  return PATRON_EMAIL.test(String(valor ?? '').trim())
}
