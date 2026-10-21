import { defineStore } from 'pinia'
import api from '../services/api.js'
import {
  obtenerToken,
  obtenerUsuarioGuardado,
  guardarToken,
  guardarUsuario,
  limpiarSesion
} from '../utils/session.js'

/**
 * Store de autenticación (Pinia).
 * - login: POST /api/auth/login → { token, usuario } (API.md §6).
 * - cargarSesion: GET /api/auth/me para refrescar el perfil (API.md §6).
 * - logout: limpia localStorage.
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: obtenerToken(),
    usuario: obtenerUsuarioGuardado()
  }),

  getters: {
    estaAutenticado: (state) => Boolean(state.token),
    nombre: (state) => state.usuario?.nombre || '',
    email: (state) => state.usuario?.email || '',
    rol: (state) => state.usuario?.rol || '',
    puedeEditar: (state) => Boolean(state.usuario?.permiso_editar),
    puedeEliminar: (state) => Boolean(state.usuario?.permiso_eliminar)
  },

  actions: {
    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password })
      this.token = data.datos.token
      this.usuario = data.datos.usuario
      guardarToken(this.token)
      guardarUsuario(this.usuario)
      return data
    },

    /** Refresca el perfil desde GET /api/auth/me (no falla la app si expiró: el guard manda al login). */
    async cargarSesion() {
      if (!this.token) return
      try {
        const { data } = await api.get('/auth/me')
        this.usuario = data.datos
        guardarUsuario(this.usuario)
      } catch {
        // 401: el interceptor ya limpió localStorage.
        this.token = null
        this.usuario = null
      }
    },

    logout() {
      limpiarSesion()
      this.token = null
      this.usuario = null
    }
  }
})
