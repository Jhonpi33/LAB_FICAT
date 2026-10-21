/**
 * Utilidades de sesión en localStorage.
 * Contrato API.md §2: el token se guarda con la clave `lab_token`.
 */

const CLAVE_TOKEN = 'lab_token'
const CLAVE_USUARIO = 'lab_usuario'

export function obtenerToken() {
  return localStorage.getItem(CLAVE_TOKEN)
}

export function guardarToken(token) {
  localStorage.setItem(CLAVE_TOKEN, token)
}

export function obtenerUsuarioGuardado() {
  try {
    const crudo = localStorage.getItem(CLAVE_USUARIO)
    return crudo ? JSON.parse(crudo) : null
  } catch {
    return null
  }
}

export function guardarUsuario(usuario) {
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario))
}

export function limpiarSesion() {
  localStorage.removeItem(CLAVE_TOKEN)
  localStorage.removeItem(CLAVE_USUARIO)
}
