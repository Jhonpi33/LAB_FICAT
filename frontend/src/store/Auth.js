/**
 * @fileoverview /store/Auth.js
 * Store de la SESIÓN: guarda el token y los datos del usuario que inició sesión.
 *
 * PERSISTENCIA: el tercer argumento de defineStore son las OPCIONES del store.
 * Ahí va "persist: true", que activa pinia-plugin-persistedstate (registrado en
 * main.js). El plugin escribe el estado en localStorage con la clave "auth" y lo
 * vuelve a cargar al abrir la aplicación.
 *
 * Este store NO importa services ni axios: quien hace la petición de login es la
 * vista (LoginView.vue) y luego llama a guardarSesion(). Así se evita un import
 * circular (axios necesita importar este store para sacar el token).
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useAuthStore = defineStore(
  'auth',
  () => {
    // --- state --------------------------------------------------------------
    /** Token JWT que devolvió el backend al iniciar sesión. */
    const token = ref(null)

    /** Datos del usuario ({ id, nombre, email, rol, activo, permiso_* }). */
    const usuario = ref(null)

    // --- getters ------------------------------------------------------------
    const estaAutenticado = computed(() => !!token.value)
    const nombreUsuario = computed(() => usuario.value?.nombre || 'Invitado')
    const esAdmin = computed(() => usuario.value?.rol === 'admin')
    const esStaff = computed(() => ['admin', 'encargado'].includes(usuario.value?.rol))
    const rol = computed(() => usuario.value?.rol || null)

    // --- actions ------------------------------------------------------------
    /**
     * Guarda lo que respondió POST /auth/login.
     * @param {{token: string, usuario: Object}} respuesta
     */
    function guardarSesion({ token: t, usuario: u }) {
      token.value = t
      usuario.value = u
    }

    function cerrarSesion() {
      token.value = null
      usuario.value = null
    }

    return {
      token,
      usuario,
      estaAutenticado,
      nombreUsuario,
      esAdmin,
      esStaff,
      rol,
      guardarSesion,
      cerrarSesion,
    }
  },
  { persist: true },
)
