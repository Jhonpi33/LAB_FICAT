/**
 * @fileoverview /splash/controlador.js — muestra y retira la pantalla de
 * carga con salpicadura de pintura declarada en /index.html.
 *
 * No dibuja nada: decide CUÁNDO sale la pintura, qué textos muestra y se
 * encarga de que no quede ni un signo de ella.
 *
 * PUEDE LANZARSE MÁS DE UNA VEZ
 *   1. Al abrir la aplicación  → /src/main.js
 *   2. Tras iniciar sesión     → /views/LoginView.vue (cubre la transición
 *                                 al panel mientras este carga sus datos)
 *   3. Al cerrar la sesión     → /layouts/AdminLayout.vue (botón) y
 *                                 /plugins/axios.js (token vencido, 401)
 *
 *   La PRIMERA vez el nodo vive en el propio index.html, así que se pinta
 *   antes de que exista el más mínimo JavaScript. Al retirarse se guarda una
 *   copia en un <template id="plantilla-salpicadura">; en los usos siguientes
 *   se clona de ahí. Al terminar, el DOM queda exactamente como estaba:
 *   sin la pintura, sin el bloqueo de scroll y sin la plantilla visible.
 *
 * CUÁNDO SALE
 *   Cuando estén listos, en paralelo:
 *     - la ruta         (chunk bajo demanda ya descargado)
 *     - la API          (ida y vuelta real a /health → mide la velocidad de
 *                        internet, es la señal que más pesa)
 *     - fuentes e imágenes
 *     - las "senales" extra que pase quien la lanza (p. ej. los datos del panel)
 *   con un mínimo de 1 s para que la animación se perciba y un máximo de
 *   6 s para que la aplicación nunca quede bloqueada si la red falla.
 *
 * CÓMO SALE
 *   Pone data-salida="1" en el nodo, lo que dispara en CSS el deslizamiento
 *   hacia abajo. Al terminar, ELIMINA el nodo y restaura el scroll.
 *
 * USO
 *   import { mostrarSalpicadura } from '@/splash/controlador'
 *
 *   mostrarSalpicadura({
 *     router,
 *     apiUrl: api.defaults.baseURL,
 *     contexto: { estado: 'Preparando tu panel…',
 *                  sesion: { nombre: auth.nombreUsuario, rol: auth.rol } },
 *     senales: [datosDelPanel],
 *     alTerminar: () => notificarOk('Bienvenido'),
 *   })
 */

/** Duración mínima de la pantalla, aunque la conexión sea instantánea. */
const MINIMO_MS = 1000

/** Duración máxima: si a esto no está lista, sale igual y no bloquea. */
const MAXIMO_MS = 6000

/** Animación de salida (debe coincidir con salpicadura-salida en index.html). */
const SALIDA_MS = 750

/** Tope para la petición de salud, por si el servidor no responde. */
const TIMEOUT_SALUD_MS = 5000

/** Evita que dos pinturas queden superpuestas al mismo tiempo. */
let enCurso = false

/**
 * Muestra la pantalla de salpicadura y la retira cuando todo esté listo.
 *
 * @param {object} [opciones]
 * @param {import('vue-router').Router} [opciones.router]  Ruta a esperar.
 * @param {string} [opciones.apiUrl]  Base de la API; con ella se llama a /health.
 * @param {{estado?: string, sesion?: {nombre?: string, rol?: string}}} [opciones.contexto]
 *   Textos que se pintan en la pantalla. `sesion` solo se usa tras el login.
 * @param {Promise<unknown>} [opciones.senales]  Señales adicionales de "cargado".
 * @param {() => void} [opciones.alTerminar]  Se ejecuta cuando ya no queda nada.
 * @returns {void}
 */
export function mostrarSalpicadura({ router, apiUrl, contexto, senales = [], alTerminar } = {}) {
  // Primero el guardia: si ya hay una pintura en marcha NO se inyecta nada,
  // o quedaría un nodo huérfano en el DOM.
  if (enCurso) return

  const nodo = inyectar()
  if (!nodo) return

  enCurso = true
  aplicarContexto(nodo, contexto)

  // La pintura cubre la pantalla: mientras esté, el scroll no debería moverla.
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'

  const inicio = performance.now()
  let fuera = false

  /** Idempotente: lo llaman tanto el tope de 6 s como la promesa. */
  const salir = () => {
    if (fuera) return
    fuera = true

    despedir(nodo, () => {
      enCurso = false
      try {
        alTerminar?.()
      } catch {
        // Un fallo en el callback no debe dejar la aplicación bloqueada.
      }
    })
  }

  // Límite duro: pase lo que pase, a los MAXIMO_MS la pintura sale.
  const tope = setTimeout(salir, MAXIMO_MS)

  Promise.all([rutaLista(router), apiLista(apiUrl), recursosListos(), ...senales])
    // Un fallo en cualquier señal no debe impedir salir: el tope cubre eso.
    .catch(() => undefined)
    .then(() => dormir(Math.max(0, MINIMO_MS - (performance.now() - inicio))))
    .then(() => {
      clearTimeout(tope)
      salir()
    })
}

/* --------------------------------------------------------------------------
 * Montaje
 * ------------------------------------------------------------------------ */

/**
 * Devuelve el nodo de la pintura, creándolo si hace falta.
 *
 * En el primer uso el nodo ya está en index.html. En los siguientes —porque
 * el anterior se eliminó— se clona de la plantilla que dejó ese uso.
 *
 * @returns {HTMLElement | null}
 */
function inyectar() {
  const existente = document.getElementById('salpicadura')
  if (existente) return existente

  const plantilla = document.getElementById('plantilla-salpicadura')
  const original = plantilla?.content.firstElementChild
  if (!original) return null

  const nodo = original.cloneNode(true)
  document.body.prepend(nodo) // misma posición que en el HTML original
  return nodo
}

/**
 * Guarda una copia del nodo en un <template> para poder volver a mostrar la
 * pintura más adelante (p. ej. tras iniciar sesión).
 *
 * Se hace UNA sola vez: a partir de ahí ese <template> es la fuente de
 * verdad. No se ve en pantalla: el contenido de un <template> es inerte.
 *
 * @param {HTMLElement} nodo
 */
function guardarPlantilla(nodo) {
  if (document.getElementById('plantilla-salpicadura')) return

  const copia = nodo.cloneNode(true)
  copia.removeAttribute('data-salida') // deja la copia lista para reusarse

  const plantilla = document.createElement('template')
  plantilla.id = 'plantilla-salpicadura'
  plantilla.content.appendChild(copia)
  document.head.appendChild(plantilla)
}

/**
 * Escribe los textos de contexto en la pantalla y los REINICIA, para que un
 * uso no herede los datos del anterior.
 *
 * @param {HTMLElement} nodo
 * @param {{estado?: string, sesion?: {nombre?: string, rol?: string}}} [contexto]
 */
function aplicarContexto(nodo, contexto = {}) {
  const estado = nodo.querySelector('[data-estado]')
  if (estado) estado.textContent = contexto.estado || 'Preparando el sistema…'

  const sesion = nodo.querySelector('[data-sesion]')
  if (!sesion) return

  const nombre = sesion.querySelector('[data-sesion-nombre]')
  const rol = sesion.querySelector('[data-sesion-rol]')

  if (contexto.sesion) {
    sesion.setAttribute('data-visible', '1')
    sesion.removeAttribute('aria-hidden')
    if (nombre) nombre.textContent = contexto.sesion.nombre || ''
    if (rol) rol.textContent = contexto.sesion.rol ? `· ${contexto.sesion.rol}` : ''
  } else {
    sesion.removeAttribute('data-visible')
    sesion.setAttribute('aria-hidden', 'true')
    if (nombre) nombre.textContent = ''
    if (rol) rol.textContent = ''
  }
}

/* --------------------------------------------------------------------------
 * Señales de "cargado"
 * ------------------------------------------------------------------------ */

/** Espera a que vue-router resuelva la ruta (descarga su chunk). */
function rutaLista(router) {
  if (!router) return Promise.resolve()
  return router.isReady().catch(() => undefined)
}

/**
 * Ida y vuelta real al backend. Es lo que traduce la velocidad del internet
 * en tiempo de pantalla: conexión lenta → tarda más → la pintura dura más.
 * Si no hay conexión devuelve rápido (no tiene sentido colgarse 6 s).
 */
async function apiLista(apiUrl) {
  if (!apiUrl) return

  const controlador = new AbortController()
  const tope = setTimeout(() => controlador.abort(), TIMEOUT_SALUD_MS)

  try {
    await fetch(`${apiUrl}/health`, {
      signal: controlador.signal,
      cache: 'no-store',
    })
  } catch {
    // Sin red o sin CORS: seguimos igual; el máximo de 6 s cubre el caso.
  } finally {
    clearTimeout(tope)
  }
}

/** Fuentes e imágenes de la página. */
function recursosListos() {
  const pendientes = []

  if (document.fonts && document.fonts.ready) pendientes.push(document.fonts.ready)

  if (document.readyState !== 'complete') {
    pendientes.push(
      new Promise((resolver) => window.addEventListener('load', resolver, { once: true })),
    )
  }

  return Promise.all(pendientes)
}

/* --------------------------------------------------------------------------
 * Salida y limpieza
 * ------------------------------------------------------------------------ */

/**
 * Dispara el deslizamiento hacia abajo y, al terminar, borra todo rastro.
 *
 * @param {HTMLElement} nodo
 * @param {() => void} [alTerminar]  Se llama cuando ya no queda nada.
 */
function despedir(nodo, alTerminar) {
  nodo.setAttribute('data-salida', '1')

  let limpiado = false

  function limpiar() {
    if (limpiado) return
    limpiado = true
    nodo.removeEventListener('animationend', alTerminarSalida)

    guardarPlantilla(nodo)

    // El respaldo de 9 s de index.html ya no debe tocar nada: a partir de
    // aquí quien retira la pintura es este módulo.
    window.__salpicaduraRespaldo = false

    // --- NINGÚN SIGNO DE LA PANTALLA DE CARGA ---
    nodo.remove() // 1. el nodo sale del DOM
    document.documentElement.style.overflow = '' // 2. scroll restaurado
    document.body.style.overflow = '' //    en <html> y <body>

    alTerminar?.()
  }

  /**
   * animationend BURBUJA desde los hijos (logo, goteos y barra también
   * animan), así que solo cuenta la del propio nodo: sin ese filtro se
   * borraría la pantalla a mitad del deslizamiento hacia abajo.
   */
  function alTerminarSalida(evento) {
    if (evento.target === nodo && evento.animationName === 'salpicadura-salida') limpiar()
  }

  nodo.addEventListener('animationend', alTerminarSalida)

  // Red por si animationend no llega (animaciones deshabilitadas, por ejemplo).
  setTimeout(limpiar, SALIDA_MS + 300)
}

/** Espera `ms` milisegundos. */
function dormir(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms))
}
