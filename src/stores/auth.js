import { defineStore } from 'pinia'

// Secciones que el perfil Usuario / Cliente no puede consultar (RF-049 / RNF-004):
// información de terceros y módulos internos del laboratorio.
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
// Cliente demo vinculado a la ficha cli-001 cuando solo se simula el rol
const DEFAULT_CLIENT_CUSTOMER_ID = 'cli-001'

const accounts = {
  'lab@sena.edu.co': { password: 'Laboratorio2026', name: 'Laura Gómez', role: 'editor', label: 'Encargado' },
  'admin@sena.edu.co': { password: 'Admin2026', name: 'Andrés Rojas', role: 'admin', label: 'Administrador' },
  'lectura@sena.edu.co': { password: 'Lectura2026', name: 'Camila Díaz', role: 'reader', label: 'Usuario / Cliente', customerId: 'cli-001' },
}

const activeRoleOf = (state) => state.simulatedRole || state.user?.role || null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(sessionStorage.getItem('lab-user') || 'null'),
    simulatedRole: null,
    errorMessage: '',
  }),
  getters: {
    activeRole: (state) => activeRoleOf(state),
    canEdit: (state) => ['admin', 'editor'].includes(activeRoleOf(state)),
    isAdmin: (state) => activeRoleOf(state) === 'admin',
    isClient: (state) => activeRoleOf(state) === 'reader',
    // Ficha de cliente que posee la sesión (solo aplica al perfil cliente)
    customerId: (state) => (activeRoleOf(state) === 'reader' ? state.user?.customerId || DEFAULT_CLIENT_CUSTOMER_ID : null),
    // Módulos vetados para el perfil cliente
    deniedSections: (state) => (activeRoleOf(state) === 'reader' ? [...CLIENT_DENIED_SECTIONS] : []),
  },
  actions: {
    canAccessSection(section) {
      return !this.deniedSections.includes(String(section || '').split('/')[0])
    },
    // Solo el perfil cliente ve registros propios; los demás ven todo
    ownsRecord(record) {
      if (!this.isClient) return true
      if (!record) return false
      return record.customerId === this.customerId
    },
    signIn(email, password) {
      const account = accounts[email.trim().toLowerCase()]
      if (!account || account.password !== password) {
        this.errorMessage = 'El correo o la contraseña no coinciden.'
        return false
      }
      this.user = { email: email.trim().toLowerCase(), name: account.name, role: account.role, label: account.label, customerId: account.customerId || null }
      this.errorMessage = ''
      sessionStorage.setItem('lab-user', JSON.stringify(this.user))
      return true
    },
    signOut() {
      this.user = null
      this.simulatedRole = null
      sessionStorage.removeItem('lab-user')
    },
    setSimulatedRole(role) {
      if (import.meta.env.DEV && ['admin', 'editor', 'reader'].includes(role)) this.simulatedRole = role
    },
  },
})
