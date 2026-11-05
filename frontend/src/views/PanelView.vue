<script setup>
/**
 * /views/PanelView.vue
 * Dashboard profesional estilo SENA (verde + claro, como el login).
 *
 * Estructura inspirada en dashboards SaaS modernos:
 *   encabezado con selector de período → KPIs con deltas → gráfica de área de
 *   ingresos → donut de solicitudes → heatmap de actividad → últimas
 *   solicitudes con filtros → muestras por estado → accesos a módulos.
 *
 * Los datos salen de los mismos listados que usan las vistas; aquí se cuentan,
 * se agrupan y se comparan (últimos 30 días vs. los 30 anteriores).
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import ActivityHeatmap from '@/components/ActivityHeatmap.vue'
import { get } from '@/services/api.service'
import { useAuthStore } from '@/store/Auth'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { formatDate } from '@/utils/formatDate'

const auth = useAuthStore()
const general = useGeneralStore()
const { notificarError } = useNotificar()

// --- Utilidades -----------------------------------------------------------------
/** Anima un número de "desde" a "hasta" (easeOutCubic). */
function animarNumero(desde, hasta, duracion, callback) {
  const inicio = performance.now()
  let terminado = false

  const terminar = () => {
    if (!terminado) {
      terminado = true
      callback(hasta)
    }
  }

  const paso = (ahora) => {
    if (terminado) return
    const progreso = Math.min((ahora - inicio) / duracion, 1)
    const suavizado = 1 - Math.pow(1 - progreso, 3)
    callback(Math.round(desde + (hasta - desde) * suavizado))
    if (progreso < 1) requestAnimationFrame(paso)
  }

  requestAnimationFrame(paso)

  // Respaldo: si requestAnimationFrame no avanza (pestaña sin foco u oculta),
  // garantizamos que el valor final se muestre igualmente.
  setTimeout(terminar, duracion + 250)
}

const formatPeso = (v) =>
  Number(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const haceDias = (n) => new Date(Date.now() - n * 86400000)

/** Compara dos períodos y devuelve el % de variación (null si no hay datos). */
function deltaDe(actual, previo) {
  if (!previo && !actual) return null
  if (!previo) return 100
  return Math.round(((actual - previo) / previo) * 100)
}

// --- Etiqueta del rol -----------------------------------------------------------
const etiquetaRol = computed(() => {
  if (auth.esAdmin) return 'Administrador'
  if (auth.rol === 'encargado') return 'Encargado'
  return auth.rol || ''
})

// --- Selector de período (define la ventana del heatmap de actividad) ------------
const PERIODOS = [
  { label: '7D', semanas: 1 },
  { label: '30D', semanas: 5 },
  { label: '90D', semanas: 13 },
  { label: '12M', semanas: 53 },
]
const periodo = ref(PERIODOS[3])

// --- Accesos a módulos ------------------------------------------------------------
const accesos = [
  { name: 'clientes', titulo: 'Clientes', descripcion: 'Quién solicita los análisis', icono: 'groups', soloStaff: true },
  { name: 'solicitudes', titulo: 'Solicitudes', descripcion: 'Solicitudes de servicio', icono: 'assignment', soloStaff: true },
  { name: 'cotizaciones', titulo: 'Cotizaciones', descripcion: 'Ofertas desde las solicitudes', icono: 'request_quote', soloStaff: true },
  { name: 'pagos', titulo: 'Pagos', descripcion: 'Pagos registrados', icono: 'payments', soloStaff: true },
  { name: 'facturas', titulo: 'Facturación', descripcion: 'Facturación electrónica · Factus', icono: 'receipt', soloStaff: true },
  { name: 'muestras', titulo: 'Muestras', descripcion: 'Recepción e inventario', icono: 'science', soloStaff: true },
  { name: 'parametros', titulo: 'Parámetros', descripcion: 'Catálogo de análisis', icono: 'tune', soloStaff: true },
  { name: 'resultados', titulo: 'Resultados', descripcion: 'Análisis y validación', icono: 'fact_check', soloStaff: true },
  { name: 'informes', titulo: 'Informes', descripcion: 'Informes de resultados', icono: 'description', soloStaff: true },
  { name: 'disposiciones', titulo: 'Disposición', descripcion: 'Devolución o desecho de muestras', icono: 'archive', soloStaff: true },
  { name: 'incidencias', titulo: 'Incidencias', descripcion: 'Novedades y demoras', icono: 'report_problem', soloStaff: true },
  { name: 'notificaciones', titulo: 'Notificaciones', descripcion: 'Bandeja de correo simulado', icono: 'mail', soloStaff: true },
  { name: 'usuarios', titulo: 'Usuarios', descripcion: 'Cuentas del personal', icono: 'manage_accounts', soloAdmin: true },
  { name: 'seguimiento', titulo: 'Consulta pública', descripcion: 'Así ve el cliente su muestra', icono: 'travel_explore' },
]

const accesosVisibles = computed(() =>
  accesos.filter((a) => (!a.soloAdmin || auth.esAdmin) && (!a.soloStaff || auth.esStaff)),
)

// --- Datos en vivo ----------------------------------------------------------------
const clientes = ref([])
const solicitudes = ref([])
const muestras = ref([])
const incidencias = ref([])
const pagos = ref([])
const facturas = ref([])
const cargando = ref(false)
const error = ref(null)

/** Números animados de cada KPI. */
const kpiValores = ref([])

const cargar = async (silencioso = false) => {
  if (!auth.esStaff) return
  if (!silencioso) cargando.value = true
  error.value = null
  try {
    const [listaClientes, listaSolicitudes, listaMuestras, listaIncidencias, listaPagos, listaFacturas] = await Promise.all([
      get('/clientes'),
      get('/solicitudes'),
      get('/muestras'),
      get('/incidencias'),
      get('/pagos'),
      get('/facturas'),
    ])
    clientes.value = listaClientes
    solicitudes.value = listaSolicitudes
    muestras.value = listaMuestras
    incidencias.value = listaIncidencias
    pagos.value = listaPagos
    facturas.value = listaFacturas
    general.marcarSincronizacion()
    animarContadores()
  } catch (e) {
    error.value = e.mensaje
    notificarError(e)
  } finally {
    if (!silencioso) cargando.value = false
  }
}

function animarContadores() {
  const kpis = tarjetasResumen.value
  const previos = kpiValores.value
  kpiValores.value = kpis.map((k, i) => previos[i] ?? 0)
  kpis.forEach((k, i) => {
    animarNumero(kpiValores.value[i], k.valor, 900 + i * 90, (v) => {
      kpiValores.value[i] = v
    })
  })
}

// Reloj "hace X segundos" + auto-refresco cada 30 s.
const haceSegundos = ref(0)
let timerReloj = null
let timerRefresco = null

onMounted(() => {
  cargar()
  timerReloj = setInterval(() => {
    if (general.ultimaSincronizacion) {
      haceSegundos.value = Math.max(0, Math.floor((Date.now() - new Date(general.ultimaSincronizacion).getTime()) / 1000))
    }
  }, 1000)
  timerRefresco = setInterval(() => {
    if (auth.esStaff) cargar(true)
  }, 30000)
})

onBeforeUnmount(() => {
  clearInterval(timerReloj)
  clearInterval(timerRefresco)
})

// --- KPIs con deltas (30 días vs. los 30 anteriores) ------------------------------
const incidenciasActivas = computed(() =>
  incidencias.value.filter((i) => ['abierta', 'en_revision'].includes(i.estado)),
)

const tarjetasResumen = computed(() => {
  const desde = haceDias(30)
  const previoDesde = haceDias(60)
  const hoy = new Date()

  const enRango = (fecha) => {
    const f = new Date(fecha)
    return f >= desde && f <= hoy
  }
  const enPrevio = (fecha) => {
    const f = new Date(fecha)
    return f >= previoDesde && f < desde
  }

  const solicitudes30 = solicitudes.value.filter((s) => enRango(s.fecha_creacion)).length
  const solicitudesPrev = solicitudes.value.filter((s) => enPrevio(s.fecha_creacion)).length

  const muestras30 = muestras.value.filter((m) => enRango(m.fecha_creacion)).length
  const muestrasPrev = muestras.value.filter((m) => enPrevio(m.fecha_creacion)).length

  const incidencias30 = incidencias.value.filter((i) => enRango(i.fecha_creacion)).length
  const incidenciasPrev = incidencias.value.filter((i) => enPrevio(i.fecha_creacion)).length

  const pagosConfirmados = pagos.value.filter((p) => p.estado === 'confirmado')
  const ingresosTotales = pagosConfirmados.reduce((acc, p) => acc + (Number(p.monto) || 0), 0)
  const ingresos30 = pagosConfirmados.filter((p) => enRango(p.fecha_creacion)).reduce((acc, p) => acc + (Number(p.monto) || 0), 0)
  const ingresosPrev = pagosConfirmados.filter((p) => enPrevio(p.fecha_creacion)).reduce((acc, p) => acc + (Number(p.monto) || 0), 0)

  const pendientes = solicitudes.value.filter((s) => s.estado === 'pendiente').length
  const enAnalisis = muestras.value.filter((m) => ['en_proceso', 'en_analisis'].includes(m.estado)).length
  const enRevision = incidencias.value.filter((i) => i.estado === 'en_revision').length

  return [
    {
      label: 'Ingresos',
      valor: ingresosTotales,
      esPeso: true,
      icono: 'payments',
      delta: deltaDe(ingresos30, ingresosPrev),
      contexto: `${pagosConfirmados.length} pagos confirmados`,
      ruta: 'pagos',
    },
    {
      label: 'Solicitudes',
      valor: solicitudes.value.length,
      icono: 'assignment',
      delta: deltaDe(solicitudes30, solicitudesPrev),
      contexto: `${pendientes} pendientes por atender`,
      ruta: 'solicitudes',
    },
    {
      label: 'Muestras',
      valor: muestras.value.length,
      icono: 'science',
      delta: deltaDe(muestras30, muestrasPrev),
      contexto: `${enAnalisis} en análisis ahora`,
      ruta: 'muestras',
    },
    {
      label: 'Incidencias activas',
      valor: incidenciasActivas.value.length,
      icono: 'report_problem',
      delta: deltaDe(incidencias30, incidenciasPrev),
      contexto: `${enRevision} en revisión`,
      ruta: 'incidencias',
      alerta: incidenciasActivas.value.length > 0,
    },
  ]
})

const valorKpi = (kpi, i) => {
  const v = cargando.value ? 0 : kpiValores.value[i] ?? 0
  return kpi.esPeso ? formatPeso(v) : v
}

// --- Gráfica 1: ingresos por mes (área SVG) ---------------------------------------
const MESES_LABEL = { 0: 'Ene', 1: 'Feb', 2: 'Mar', 3: 'Abr', 4: 'May', 5: 'Jun', 6: 'Jul', 7: 'Ago', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dic' }

const ingresosPorMes = computed(() => {
  const ahora = new Date()
  const meses = []
  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    meses.push({
      clave: `${fecha.getFullYear()}-${fecha.getMonth()}`,
      etiqueta: MESES_LABEL[fecha.getMonth()],
      total: 0,
    })
  }
  for (const p of pagos.value) {
    if (p.estado !== 'confirmado') continue
    const fecha = new Date(p.fecha_creacion)
    const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`
    const mes = meses.find((m) => m.clave === clave)
    if (mes) mes.total += Number(p.monto) || 0
  }
  return meses
})

const maxIngreso = computed(() => Math.max(...ingresosPorMes.value.map((m) => m.total), 1))

// Dimensiones de la gráfica
const ANCHO = 640
const ALTO = 220
const PAD_X = 10
const PAD_Y_TOP = 16
const PAD_Y_BAJO = 30

const puntosIngresos = computed(() => {
  const datos = ingresosPorMes.value
  const ancho = ANCHO - PAD_X * 2
  const alto = ALTO - PAD_Y_TOP - PAD_Y_BAJO
  return datos.map((m, i) => ({
    ...m,
    x: PAD_X + (datos.length === 1 ? ancho / 2 : (i * ancho) / (datos.length - 1)),
    y: PAD_Y_TOP + alto - (m.total / maxIngreso.value) * alto,
  }))
})

const lineaIngresos = computed(() => puntosIngresos.value.map((p) => `${p.x},${p.y}`).join(' '))

const areaIngresos = computed(() => {
  const pts = puntosIngresos.value
  if (!pts.length) return ''
  const base = PAD_Y_TOP + (ALTO - PAD_Y_TOP - PAD_Y_BAJO)
  return `M ${pts[0].x} ${base} L ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${pts[pts.length - 1].x} ${base} Z`
})

const ticksIngresos = computed(() => {
  const max = maxIngreso.value
  const alto = ALTO - PAD_Y_TOP - PAD_Y_BAJO
  const cantidad = 4
  return Array.from({ length: cantidad }, (_, i) => {
    const valor = (max / (cantidad - 1)) * i
    const y = PAD_Y_TOP + alto - (valor / max) * alto
    return { y, label: `$${valor >= 1000 ? Math.round(valor / 1000) + 'K' : valor}` }
  })
})

// --- Gráfica 2: solicitudes por estado (donut SVG) ---------------------------------
const ESTADOS_SOLICITUD = [
  { value: 'pendiente', label: 'Pendiente', color: '#b0b7b1' },
  { value: 'cotizada', label: 'Cotizada', color: '#81c784' },
  { value: 'aceptada', label: 'Aceptada', color: '#4caf50' },
  { value: 'pagada', label: 'Pagada', color: '#2e7d32' },
  { value: 'rechazada', label: 'Rechazada', color: '#e57373' },
]

const ESTADO_CHIP = {
  pendiente: { bg: '#f1f3f1', texto: '#5f6b61' },
  cotizada: { bg: '#e8f5e9', texto: '#1b5e20' },
  aceptada: { bg: '#e8f5e9', texto: '#1b5e20' },
  pagada: { bg: '#dceddd', texto: '#144d17' },
  rechazada: { bg: '#fdecea', texto: '#b71c1c' },
}

const distribucionSolicitudes = computed(() => {
  const total = solicitudes.value.length
  let inicio = 0
  return ESTADOS_SOLICITUD.map((e) => {
    const cantidad = solicitudes.value.filter((s) => s.estado === e.value).length
    const pct = total ? Math.round((cantidad / total) * 100) : 0
    const segmento = { ...e, cantidad, pct, inicio }
    inicio += pct
    return segmento
  })
})

const totalSolicitudes = computed(() => solicitudes.value.length)

// --- Muestras por estado (barras) ----------------------------------------------------
const ETIQUETAS_MUESTRA = {
  ingresada: 'Ingresada',
  en_proceso: 'En proceso',
  en_analisis: 'En análisis',
  resultados_validados: 'Resultados validados',
  cerrada: 'Cerrada',
  rechazada: 'Rechazada',
  en_almacen: 'En almacén',
  devuelta: 'Devuelta',
  desechada: 'Desechada',
}

const PALETA_MUESTRAS = ['#2e7d32', '#43a047', '#66bb6a', '#81c784', '#a5d6a7', '#1b5e20', '#388e3c', '#4caf50', '#c8e6c9']

const distribucionMuestras = computed(() => {
  const total = muestras.value.length || 1
  return Object.entries(ETIQUETAS_MUESTRA)
    .map(([value, label]) => ({
      value,
      label,
      cantidad: muestras.value.filter((m) => m.estado === value).length,
    }))
    .filter((f) => f.cantidad > 0)
    .map((f, i) => ({
      ...f,
      color: PALETA_MUESTRAS[i % PALETA_MUESTRAS.length],
      pct: Math.round((f.cantidad / total) * 100),
    }))
})

// --- Últimas solicitudes con filtros ---------------------------------------------------
const filtroSolicitudes = ref('todas')

const ultimasSolicitudes = computed(() => {
  const lista = [...solicitudes.value].sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion))
  const filtradas = filtroSolicitudes.value === 'todas' ? lista : lista.filter((s) => s.estado === filtroSolicitudes.value)
  return filtradas.slice(0, 8)
})

const estadoLabel = (e) => ESTADOS_SOLICITUD.find((x) => x.value === e)?.label || e
const prioridadLabel = (p) => ({ alta: 'Alta', media: 'Media', baja: 'Baja' }[p] || p)
const prioridadColor = (p) => ({ alta: 'texto-alta', media: 'texto-media', baja: 'texto-baja' }[p] || 'texto-baja')
</script>

<template>
  <q-page class="pagina-panel">
    <div class="contenedor-app">
      <!-- Encabezado -->
      <header class="animar q-mb-lg">
        <div class="row items-center justify-between q-col-gutter-md">
          <div>
            <div class="kicker">Panel de control</div>
            <div class="row items-center q-gutter-x-sm">
              <h1 class="titulo-vista style-text q-my-sm titulo-panel">Hola, {{ auth.nombreUsuario }}</h1>
              <span v-if="etiquetaRol" class="chip-rol">{{ etiquetaRol }}</span>
            </div>
            <p class="subtitulo q-mb-none">
              Resumen del laboratorio · comparado con los 30 días anteriores
            </p>
            <p v-if="auth.esStaff" class="linea-viva text-caption q-mt-sm q-mb-none">
              <span class="vivo__punto" aria-hidden="true" />
              Datos en vivo · hace {{ haceSegundos }} s · se actualiza cada 30 s
            </p>
          </div>

          <div v-if="auth.esStaff" class="row items-center q-gutter-sm">
            <!-- Selector de período -->
            <div class="segmento" role="tablist" aria-label="Período">
              <button
                v-for="p in PERIODOS"
                :key="p.label"
                type="button"
                class="segmento__item"
                :class="{ 'segmento__item--activo': periodo.label === p.label }"
                @click="periodo = p"
              >
                {{ p.label }}
              </button>
            </div>

            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="refresh"
              label="Actualizar"
              :loading="cargando"
              @click="cargar()"
            />
          </div>
        </div>
      </header>

      <!-- Aviso si la API falló -->
      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" @click="cargar()" /></template>
      </q-banner>

      <!-- KPIs -->
      <template v-if="auth.esStaff">
        <div class="row q-col-gutter-md q-mb-lg">
          <div class="col-12 col-sm-6 col-lg-3" v-for="(kpi, i) in tarjetasResumen" :key="kpi.label">
            <q-card flat class="tarjeta-luz kpi animar" :class="{ 'kpi--alerta': kpi.alerta }" :style="{ animationDelay: `${70 + i * 70}ms` }" :to="{ name: kpi.ruta }">
              <q-card-section>
                <div class="row items-center justify-between no-wrap q-mb-md">
                  <span class="kpi__icono"><q-icon :name="kpi.icono" size="20px" /></span>
                  <span v-if="kpi.delta !== null" class="delta" :class="kpi.delta > 0 ? 'delta--sube' : kpi.delta < 0 ? 'delta--baja' : 'delta--neutra'">
                    <q-icon :name="kpi.delta > 0 ? 'arrow_upward' : kpi.delta < 0 ? 'arrow_downward' : 'remove'" size="13px" />
                    {{ Math.abs(kpi.delta) }}%
                  </span>
                  <span v-else class="delta delta--neutra">—</span>
                </div>

                <div class="kpi__label">{{ kpi.label }}</div>
                <div class="kpi__valor">{{ valorKpi(kpi, i) }}</div>
                <div class="kpi__contexto">{{ kpi.contexto }} · vs. 30 días anteriores</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Gráficas principales -->
        <div class="row q-col-gutter-md q-mb-lg">
          <!-- Ingresos (área) -->
          <div class="col-12 col-lg-7">
            <q-card flat class="tarjeta-luz full-height animar" style="animation-delay: 340ms">
              <q-card-section>
                <div class="row items-center no-wrap q-mb-md">
                  <div>
                    <div class="titulo-seccion">Ingresos</div>
                    <div class="subtitulo-seccion">{{ formatPeso(maxIngreso === 1 ? 0 : maxIngreso) }} máx. en los últimos 6 meses</div>
                  </div>
                  <q-space />
                  <span class="chip-verde">Pagos confirmados</span>
                </div>

                <div class="grafica-scroll">
                  <svg :viewBox="`0 0 ${ANCHO} ${ALTO}`" class="grafica-area" preserveAspectRatio="xMidYMid meet" aria-label="Gráfica de ingresos por mes">
                    <defs>
                      <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#2e7d32" stop-opacity="0.25" />
                        <stop offset="100%" stop-color="#2e7d32" stop-opacity="0" />
                      </linearGradient>
                    </defs>

                    <!-- Líneas de la cuadrícula -->
                    <g v-for="tick in ticksIngresos" :key="tick.y">
                      <line :x1="PAD_X" :y1="tick.y" :x2="ANCHO - PAD_X" :y2="tick.y" stroke="#e9ede9" stroke-width="1" />
                      <text :x="0" :y="tick.y + 4" font-size="10" fill="#8a978d">{{ tick.label }}</text>
                    </g>

                    <path :d="areaIngresos" fill="url(#gradIngresos)" />
                    <polyline :points="lineaIngresos" fill="none" stroke="#2e7d32" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

                    <!-- Puntos y etiquetas -->
                    <g v-for="p in puntosIngresos" :key="p.clave">
                      <circle :cx="p.x" :cy="p.y" r="4" fill="#2e7d32" stroke="#ffffff" stroke-width="1.5">
                        <title>{{ p.etiqueta }}: {{ formatPeso(p.total) }}</title>
                      </circle>
                      <text :x="p.x" :y="ALTO - 8" font-size="11" text-anchor="middle" fill="#6b786d">{{ p.etiqueta }}</text>
                    </g>
                  </svg>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Donut: solicitudes por estado -->
          <div class="col-12 col-lg-5">
            <q-card flat class="tarjeta-luz full-height animar" style="animation-delay: 400ms">
              <q-card-section>
                <div class="titulo-seccion q-mb-md">Solicitudes por estado</div>

                <div class="row items-center">
                  <div class="donut-contenedor">
                    <svg viewBox="0 0 42 42" class="donut">
                      <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="#eef1ee" stroke-width="5" />
                      <circle
                        v-for="(seg, i) in distribucionSolicitudes"
                        :key="i"
                        class="donut-seg"
                        cx="21"
                        cy="21"
                        r="15.9155"
                        fill="transparent"
                        :stroke="seg.color"
                        stroke-width="5"
                        :stroke-dasharray="`${seg.pct} ${100 - seg.pct}`"
                        :stroke-dashoffset="25 - seg.inicio"
                      />
                    </svg>
                    <div class="donut-centro">
                      <div class="donut-centro__numero">{{ totalSolicitudes }}</div>
                      <div class="donut-centro__texto">solicitudes</div>
                    </div>
                  </div>

                  <ul class="leyenda q-ml-md">
                    <li v-for="seg in distribucionSolicitudes" :key="seg.value">
                      <span class="leyenda__punto" :style="{ background: seg.color }" />
                      <span class="leyenda__label">{{ seg.label }}</span>
                      <span class="leyenda__valor">{{ seg.cantidad }}</span>
                      <span class="leyenda__pct">{{ seg.pct }}%</span>
                    </li>
                  </ul>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Actividad (heatmap) -->
        <q-card flat class="tarjeta-luz q-mb-lg animar" style="animation-delay: 460ms">
          <q-card-section>
            <div class="titulo-seccion q-mb-md">Actividad del laboratorio</div>
            <ActivityHeatmap :semanas="periodo.semanas" />
          </q-card-section>
        </q-card>

        <!-- Últimas solicitudes -->
        <q-card flat class="tarjeta-luz q-mb-lg animar" style="animation-delay: 520ms">
          <q-card-section>
            <div class="row items-center no-wrap q-mb-md">
              <div class="titulo-seccion q-mb-none">Últimas solicitudes</div>
              <q-space />
              <q-btn flat dense no-caps color="primary" icon="arrow_forward" icon-right label="Ver todas" :to="{ name: 'solicitudes' }" />
            </div>

            <!-- Filtros por estado -->
            <div class="filtros q-mb-md">
              <button type="button" class="filtro" :class="{ 'filtro--activo': filtroSolicitudes === 'todas' }" @click="filtroSolicitudes = 'todas'">
                Todas
              </button>
              <button
                v-for="estado in ESTADOS_SOLICITUD"
                :key="estado.value"
                type="button"
                class="filtro"
                :class="{ 'filtro--activo': filtroSolicitudes === estado.value }"
                @click="filtroSolicitudes = estado.value"
              >
                {{ estado.label }}
              </button>
            </div>

            <!-- Tabla -->
            <div class="tabla">
              <div class="tabla__fila tabla__fila--head">
                <span>Cliente</span>
                <span>Descripción</span>
                <span class="text-center">Prioridad</span>
                <span class="text-center">Estado</span>
                <span class="text-right">Fecha</span>
              </div>
              <div class="tabla__fila" v-for="s in ultimasSolicitudes" :key="s._id">
                <span class="tabla__cliente">{{ s.cliente_id?.nombre || '—' }}</span>
                <span class="tabla__desc">{{ s.descripcion }}</span>
                <span class="text-center" :class="prioridadColor(s.prioridad)">{{ prioridadLabel(s.prioridad) }}</span>
                <span class="text-center">
                  <span class="chip-estado" :style="{ background: ESTADO_CHIP[s.estado]?.bg, color: ESTADO_CHIP[s.estado]?.texto }">
                    {{ estadoLabel(s.estado) }}
                  </span>
                </span>
                <span class="text-right tabla__fecha">{{ formatDate(s.fecha_creacion) }}</span>
              </div>
              <div v-if="!ultimasSolicitudes.length" class="tabla__vacio">No hay solicitudes con este filtro.</div>
              <div class="tabla__pie">1–{{ ultimasSolicitudes.length }} de {{ ultimasSolicitudes.length }}</div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Muestras por estado + accesos -->
        <div class="row q-col-gutter-md">
          <div class="col-12 col-lg-5">
            <q-card flat class="tarjeta-luz full-height animar" style="animation-delay: 580ms">
              <q-card-section>
                <div class="titulo-seccion q-mb-md">Muestras por estado</div>
                <div v-if="distribucionMuestras.length" class="barras">
                  <div class="barra" v-for="(m, idx) in distribucionMuestras" :key="m.value">
                    <div class="barra__etiqueta">{{ m.label }}</div>
                    <div class="barra__track">
                      <div class="barra__fill" :style="{ width: `${m.pct}%`, background: m.color, transitionDelay: `${idx * 70}ms` }" />
                    </div>
                    <div class="barra__valor">{{ m.cantidad }}</div>
                  </div>
                </div>
                <div v-else class="text-center q-py-lg empty-title">Aún no hay muestras registradas</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-lg-7">
            <q-card flat class="tarjeta-luz full-height animar" style="animation-delay: 640ms">
              <q-card-section>
                <div class="titulo-seccion q-mb-md">Accesos a módulos</div>
                <div class="row q-col-gutter-sm">
                  <div class="col-6 col-md-4" v-for="acceso in accesosVisibles" :key="acceso.name">
                    <q-card flat class="modulo cursor-pointer" :to="{ name: acceso.name }">
                      <q-card-section class="row items-center no-wrap q-pa-sm">
                        <span class="modulo__icono"><q-icon :name="acceso.icono" size="18px" /></span>
                        <div class="modulo__texto">
                          <div class="text-subtitle2 text-weight-bold">{{ acceso.titulo }}</div>
                          <div class="text-caption modulo__desc">{{ acceso.descripcion }}</div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </template>
    </div>
  </q-page>
</template>

<style scoped lang="scss">
// =============================================================================
// Dashboard claro estilo SENA: fondo neutro, tarjetas blancas y acentos en el
// verde de marca (#2e7d32), como el login.
// =============================================================================

.pagina-panel {
  min-height: calc(100vh - 50px);
  background: #f6f8f6;
  color: #212121;
}

// --- Encabezado --------------------------------------------------------------
.kicker {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.6px;
  color: #2e7d32;
}

.titulo-panel {
  color: #14261a;
}

.subtitulo {
  color: #5f6b61;
  font-size: 14px;
}

.linea-viva {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #7d8a80;
  font-weight: 600;
}

.vivo__punto {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #43a047;
  box-shadow: 0 0 8px rgba(67, 160, 71, 0.6);
  animation: parpadeo 1.6s ease-in-out infinite;
}

@keyframes parpadeo {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.chip-rol {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #1b5e20;
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
}

.chip-verde {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  color: #1b5e20;
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
}

// --- Selector de período -------------------------------------------------------
.segmento {
  display: inline-flex;
  background: #eef1ee;
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}

.segmento__item {
  border: 0;
  background: transparent;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 700;
  color: #6b786d;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.segmento__item--activo {
  background: #ffffff;
  color: #1b5e20;
  box-shadow: 0 1px 3px rgba(16, 42, 18, 0.14);
}

// --- Tarjeta base ---------------------------------------------------------------
.tarjeta-luz {
  background: #ffffff;
  border: 1px solid #e4e9e4;
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(16, 42, 18, 0.05);
}

// --- KPIs -----------------------------------------------------------------------
.kpi {
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: #c8e6c9;
    box-shadow: 0 6px 18px rgba(16, 42, 18, 0.08);
  }

  &--alerta {
    border-color: #ffe0b2;
  }

  &__icono {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #2e7d32;
    background: #e8f5e9;
    flex-shrink: 0;
  }

  &__label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #7d8a80;
  }

  &__valor {
    font-size: 28px;
    font-weight: 800;
    color: #14261a;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
  }

  &__contexto {
    margin-top: 8px;
    font-size: 12px;
    color: #8a978d;
  }
}

.delta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;

  &--sube {
    background: #e8f5e9;
    color: #1b5e20;
  }

  &--baja {
    background: #fdecea;
    color: #b71c1c;
  }

  &--neutra {
    background: #f1f3f1;
    color: #6b786d;
  }
}

// --- Títulos de sección ------------------------------------------------------------
.titulo-seccion {
  font-size: 15px;
  font-weight: 800;
  color: #14261a;
  letter-spacing: 0.2px;
}

.subtitulo-seccion {
  font-size: 12px;
  color: #8a978d;
  margin-top: 2px;
}

// --- Gráfica de área ---------------------------------------------------------------
.grafica-scroll {
  overflow-x: auto;
}

.grafica-area {
  width: 100%;
  min-width: 520px;
  height: auto;
}

// --- Donut ----------------------------------------------------------------------------
.donut-contenedor {
  position: relative;
  width: 165px;
  height: 165px;
  flex-shrink: 0;
}

.donut {
  width: 100%;
  height: 100%;
}

.donut circle {
  transition:
    stroke-dasharray 0.9s cubic-bezier(0.22, 0.9, 0.35, 1),
    stroke-dashoffset 0.9s cubic-bezier(0.22, 0.9, 0.35, 1);
}

.donut-centro {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.donut-centro__numero {
  font-size: 26px;
  font-weight: 800;
  color: #14261a;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.donut-centro__texto {
  font-size: 11px;
  color: #8a978d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.leyenda {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
  flex: 1;
  min-width: 0;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }
}

.leyenda__punto {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}

.leyenda__label {
  flex: 1;
  color: #4d594f;
}

.leyenda__valor {
  font-weight: 700;
  color: #14261a;
}

.leyenda__pct {
  width: 42px;
  text-align: right;
  font-size: 12px;
  font-weight: 700;
  color: #8a978d;
  font-variant-numeric: tabular-nums;
}

// --- Barras de muestras ----------------------------------------------------------------
.barras {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.barra {
  display: grid;
  grid-template-columns: 140px 1fr 26px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.barra__etiqueta {
  color: #4d594f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.barra__track {
  height: 9px;
  background: #eef1ee;
  border-radius: 999px;
  overflow: hidden;
}

.barra__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.8s cubic-bezier(0.22, 0.9, 0.35, 1);
}

.barra__valor {
  text-align: right;
  font-weight: 700;
  color: #14261a;
  font-variant-numeric: tabular-nums;
}

// --- Tabla de solicitudes ---------------------------------------------------------------
.filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filtro {
  border: 1px solid #e4e9e4;
  background: #ffffff;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  color: #5f6b61;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filtro:hover {
  border-color: #c8e6c9;
  color: #1b5e20;
}

.filtro--activo {
  background: #e8f5e9;
  border-color: #2e7d32;
  color: #1b5e20;
  font-weight: 700;
}

.tabla {
  border: 1px solid #eef1ee;
  border-radius: 12px;
  overflow: hidden;
}

.tabla__fila {
  display: grid;
  grid-template-columns: 1.2fr 2fr 0.7fr 0.8fr 0.7fr;
  gap: 12px;
  align-items: center;
  padding: 11px 16px;
  font-size: 13.5px;
  border-bottom: 1px solid #f1f4f1;

  &:last-of-type {
    border-bottom: 0;
  }

  &--head {
    background: #fafcfa;
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #8a978d;
    border-bottom: 1px solid #e9ede9;
  }

  &:not(.tabla__fila--head):hover {
    background: #f7faf7;
  }
}

.tabla__cliente {
  font-weight: 700;
  color: #14261a;
}

.tabla__desc {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #4d594f;
}

.tabla__fecha {
  color: #8a978d;
  font-variant-numeric: tabular-nums;
}

.tabla__vacio {
  padding: 26px;
  text-align: center;
  color: #8a978d;
  font-size: 13px;
}

.tabla__pie {
  padding: 9px 16px;
  font-size: 12px;
  color: #8a978d;
  border-top: 1px solid #f1f4f1;
  background: #fafcfa;
}

.chip-estado {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
}

.texto-alta {
  color: #c2410c;
  font-weight: 700;
}

.texto-media {
  color: #1d4ed8;
  font-weight: 700;
}

.texto-baja {
  color: #6b786d;
  font-weight: 600;
}

// --- Módulos --------------------------------------------------------------------------
.modulo {
  border: 1px solid #eef1ee;
  border-radius: 12px;
  box-shadow: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    border-color: #c8e6c9;
    box-shadow: 0 3px 10px rgba(16, 42, 18, 0.07);

    .modulo__icono {
      background: #2e7d32;
      color: #ffffff;
    }
  }
}

.modulo__icono {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2e7d32;
  background: #e8f5e9;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;
}

.modulo__texto {
  flex: 1;
  min-width: 0;
  margin-left: 10px;
  color: #14261a;
}

.modulo__desc {
  color: #8a978d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// --- Animación de entrada ---------------------------------------------------------------
.animar {
  animation: aparecer 0.5s cubic-bezier(0.22, 0.9, 0.35, 1) both;
}

@keyframes aparecer {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// --- Responsive --------------------------------------------------------------------------
@media (max-width: 600px) {
  .barra {
    grid-template-columns: 110px 1fr 24px;
    gap: 8px;
  }

  .tabla__fila {
    grid-template-columns: 1fr 1.6fr 0.8fr;
    gap: 8px;
  }

  .tabla__fila--head span:nth-child(4),
  .tabla__fila:not(.tabla__fila--head) span:nth-child(4) {
    display: none;
  }

  .kpi__valor {
    font-size: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .animar,
  .vivo__punto {
    animation: none !important;
  }

  .donut circle,
  .barra__fill {
    transition: none !important;
  }
}
</style>
