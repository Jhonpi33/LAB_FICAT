/**
 * @fileoverview /utils/reglas.js
 * REGLAS DE VALIDACIÓN PARA LOS FORMULARIOS (prop :rules de Quasar).
 *
 * Como funcionan las rules de Quasar:
 *   - Se pasan como un ARRAY de funciones a <q-input :rules="[...]">.
 *   - Cada función recibe el valor y devuelve:
 *       true      -> el campo es válido
 *       "texto"   -> el campo es inválido y ese texto se pinta en rojo
 *   - <q-form @submit> ejecuta TODAS las reglas y solo dispara el submit si
 *     todas pasan.
 *
 * Aquí se escriben como "fábricas": funciones que devuelven la regla ya
 * personalizada con el nombre del campo.
 *
 * IMPORTANTE: estas validaciones son de EXPERIENCIA DE USUARIO. El backend
 * siempre vuelve a validar (el navegador se puede manipular).
 */
import { validateEmail } from './validateEmail'

/** El campo no puede ir vacío. */
export const requerido =
  (campo = 'Este campo') =>
  (v) =>
    (v !== null && v !== undefined && String(v).trim() !== '') || `${campo} es obligatorio`

/** Formato de correo válido. */
export const esEmail = () => (v) => validateEmail(v) || 'El email no es válido'

/** Longitud mínima de texto. */
export const minimo =
  (min, campo = 'Este campo') =>
  (v) =>
    String(v ?? '').trim().length >= min || `${campo} debe tener al menos ${min} caracteres`

/** Longitud máxima de texto. */
export const maximo =
  (max, campo = 'Este campo') =>
  (v) =>
    String(v ?? '').trim().length <= max || `${campo} no puede superar los ${max} caracteres`

/** Solo dígitos (documentos, teléfonos). El documento se maneja como TEXTO. */
export const soloNumeros = () => (v) => /^\d+$/.test(String(v ?? '').trim()) || 'Solo se permiten números'

/** Número entero estrictamente mayor que un mínimo. */
export const enteroMayorA =
  (min, campo = 'El valor') =>
  (v) => {
    const n = Number(v)
    return (Number.isInteger(n) && n > min) || `${campo} debe ser un número entero mayor a ${min}`
  }

/** Obliga a elegir una opción en un q-select. */
export const seleccionRequerida =
  (campo = 'Este campo') =>
  (v) =>
    (v !== null && v !== undefined && v !== '') || `Debe seleccionar ${campo}`

/**
 * El valor debe ser igual a otro (p. ej. "confirmar contraseña").
 * El valor esperado se pasa como FUNCIÓN (() => formulario.password) para que
 * se compare contra el valor actual en cada validación.
 */
export const igualA =
  (obtenerEsperado, mensaje = 'Los valores no coinciden') =>
  (v) =>
    v === obtenerEsperado() || mensaje

/**
 * La contraseña debe cumplir el mínimo que exige el backend:
 * 8 caracteres y al menos un número.
 */
export const contrasenaValida =
  (campo = 'La contraseña') =>
  (v) => {
    const valor = String(v ?? '')
    if (valor.length < 8) return `${campo} debe tener al menos 8 caracteres`
    if (!/\d/.test(valor)) return `${campo} debe incluir al menos un número`
    return true
  }
