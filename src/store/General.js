/**
 * @fileoverview /store/General.js
 * Store GLOBAL de interfaz: lo que no pertenece a ningún modelo del backend
 * pero varias pantallas comparten (menú lateral, título, hora de la última
 * carga de datos).
 *
 * Escrito con COMPOSITION API ("setup store").
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useGeneralStore = defineStore('general', () => {
  const titulo = ref(import.meta.env.VITE_APP_TITULO || 'Laboratorio de Alimentos · SENA')

  // Si el menú lateral está abierto (lo controla el botón de hamburguesa).
  const menuAbierto = ref(false)

  // Última vez que una pantalla terminó de traer datos del backend.
  const ultimaSincronizacion = ref(null)

  /** URL de la API en uso (útil para depurar). */
  const urlApi = computed(() => import.meta.env.VITE_API_URL || 'http://localhost:4000/api')

  function alternarMenu() {
    menuAbierto.value = !menuAbierto.value
  }

  function marcarSincronizacion() {
    ultimaSincronizacion.value = new Date()
  }

  return { titulo, menuAbierto, ultimaSincronizacion, urlApi, alternarMenu, marcarSincronizacion }
})
