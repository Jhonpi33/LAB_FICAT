import { defineStore } from 'pinia'
import api, { tokenStore, mensajeDeError } from '../services/api'

/**
 * Secciones que el perfil Usuario / Cliente no puede consultar (RF-049 / RNF-004).
 * Se conserva el comportamiento que ya tenía la interfaz.
 */
const CLIENT_DENIED_SECTIONS = [
  'clientes',
  'solicitudes',
  'cotizaciones',
  'muestras',
  'incidencias',
  'catalogo-parametros',
  'usuarios',
  'auditoria',
  'eliminados',
  'respaldo',
]

const DEFAULT_CLIENT_CUSTOMER_ID = 'cli-001'

/**
 * El backend maneja los roles admin | encargado | usuario.
 * La interfaz ya trabajaba con admin | editor | reader, así que se traducen
 * para no reescribir las vistas que ya están diseñadas.
 */
const A_ROL_INTERFAZ = { admin: 'admin', encargado: 'editor', usuario: 'reader' }
const A_ROTULO = { admin: 'Administrador', encargado: 'Encargado', usuario: 'Usuario / Cliente' }

// Solo auto-relleno en desarrollo: el botón "Probar como…" completa el formulario
// con credenciales reales; la autenticación siempre la valida el backend.
const CUENTAS_DEMO = {
  editor: ['lab@sena.edu.co', 'Laboratorio2026'],
  admin: ['admin@sena.edu.co', 'Admin2026'],
  reader: ['lectura@sena.edu.co', 'Lectura2026'],
}

const activo = (state) => state.simulatedRole || state.user?.role || null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(sessionStorage.getItem('lab-user') || 'null'),
    simulatedRole: null,
    errorMessage: '',
    cargando: false,
  }),

  getters: {
    activeRole: (state) => activo(state),
    canEdit: (state) => Boolean(state.user?.permisoEditar),
    isAdmin: (state) => activo(state) === 'admin',
    isClient: (state) => activo(state) === 'reader',
    customerId: (state) => (activo(state) === 'reader' ? state.user?.customerId || DEFAULT_CLIENT_CUSTOMER_ID : null),
    deniedSections: (state) => (activo(state) === 'reader' ? [...CLIENT_DENIED_SECTIONS] : []),
    demoAccounts: () => CUENTAS_DEMO,
  },

  actions: {
    canAccessSection(section) {
      return !this.deniedSections.includes(String(section || '').split('/')[0])
    },

    ownsRecord(record) {
      if (!this.isClient) return true
      if (!record) return false
      return record.customerId === this.customerId
    },

    /** Autentica contra el backend real (POST /api/auth/login). */
    async signIn(email, password) {
      this.cargando = true
      this.errorMessage = ''
      try {
        const { data } = await api.post('/auth/login', { email, password })
        const u = data.datos.usuario
        tokenStore.set(data.datos.token)
        this.user = {
          id: u.id,
          email: u.email,
          name: u.nombre,
          role: A_ROL_INTERFAZ[u.rol] || 'reader',
          label: A_ROTULO[u.rol] || u.rol,
          permisoEditar: Boolean(u.permiso_editar),
          customerId: null,
        }
        sessionStorage.setItem('lab-user', JSON.stringify(this.user))
        return true
      } catch (error) {
        this.errorMessage = mensajeDeError(error, 'El correo o la contraseña no coinciden.')
        return false
      } finally {
        this.cargando = false
      }
    },

    signOut() {
      this.user = null
      this.simulatedRole = null
      this.errorMessage = ''
      tokenStore.clear()
      sessionStorage.removeItem('lab-user')
    },

    setSimulatedRole(role) {
      if (import.meta.env.DEV && ['admin', 'editor', 'reader'].includes(role)) this.simulatedRole = role
    },
  },
})
