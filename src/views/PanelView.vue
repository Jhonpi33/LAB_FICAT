<script setup>
/**
 * /views/PanelView.vue
 * Dashboard glassmorphism con dinamismo: contadores animados, porcentajes
 * reales por KPI con mini-barras, gráficos animados al cargar, auto-refresco
 * cada 30 segundos e indicador "en vivo". Todo con CSS/JS puro (sin librerías).
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { get } from '@/services/api.service'
import { useAuthStore } from '@/store/Auth'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { formatDate } from '@/utils/formatDate'

const auth = useAuthStore()
const general = useGeneralStore()
const { notificarError } = useNotificar()

// --- Utilidades de animación ---------------------------------------------------
/** Anima un número de "desde" a "hasta" con easing easeOutCubic. */
function animarNumero(desde, hasta, duracion, callback) {
  const inicio = performance.now()
  const paso = (ahora) => {
    const progreso = Math.min((ahora - inicio) / duracion, 1)
    const suavizado = 1 - Math.pow(1 - progreso, 3)
    callback(Math.round(desde + (hasta - desde) * suavizado))
    if (progreso < 1) requestAnimationFrame(paso)
  }
  requestAnimationFrame(paso)
}

/** Porcentaje seguro (evita dividir por cero). */
const pctDe = (parte, total) => (total ? Math.round((parte / total) * 100) : 0)

// --- Etiqueta legible del rol -------------------------------------------------
const etiquetaRol = computed(() => {
  if (auth.esAdmin) return 'Administrador'
  if (auth.rol === 'encargado') return 'Encargado'
  return auth.rol || ''
})

// --- Gradientes por color de módulo -------------------------------------------
const COLOR_GRADIENT = {
  primary: 'linear-gradient(135deg, #66bb6a, #1b5e20)',
  blue: 'linear-gradient(135deg, #64b5f6, #1565c0)',
  orange: 'linear-gradient(135deg, #ffb74d, #e65100)',
  teal: 'linear-gradient(135deg, #4db6ac, #00695c)',
  'deep-orange': 'linear-gradient(135deg, #ff8a65, #bf360c)',
  green: 'linear-gradient(135deg, #81c784, #2e7d32)',
  purple: 'linear-gradient(135deg, #ba68c8, #6a1b9a)',
  indigo: 'linear-gradient(135deg, #7986cb, #283593)',
  cyan: 'linear-gradient(135deg, #4dd0e1, #00838f)',
  brown: 'linear-gradient(135deg, #a1887f, #4e342e)',
  red: 'linear-gradient(135deg, #e57373, #b71c1c)',
  'blue-grey': 'linear-gradient(135deg, #90a4ae, #37474f)',
  'light-blue': 'linear-gradient(135deg, #4fc3f7, #01579b)',
}

const gradienteDe = (color) => COLOR_GRADIENT[color] || COLOR_GRADIENT.primary

// --- Accesos a módulos -------------------------------------------------------
const accesos = [
  { name: 'clientes', titulo: 'Clientes', descripcion: 'Quién solicita los análisis', icono: 'groups', color: 'primary', grupo: 'Gestión comercial', soloStaff: true },
  { name: 'solicitudes', titulo: 'Solicitudes', descripcion: 'Solicitudes de servicio', icono: 'assignment', color: 'blue', grupo: 'Gestión comercial', soloStaff: true },
  { name: 'cotizaciones', titulo: 'Cotizaciones', descripcion: 'Ofertas desde las solicitudes', icono: 'request_quote', color: 'orange', grupo: 'Gestión comercial', soloStaff: true },
  { name: 'pagos', titulo: 'Pagos', descripcion: 'Pagos registrados', icono: 'payments', color: 'teal', grupo: 'Gestión comercial', soloStaff: true },
  { name: 'facturas', titulo: 'Facturación', descripcion: 'Facturación electrónica · Factus', icono: 'receipt', color: 'deep-orange', grupo: 'Gestión comercial', soloStaff: true },
  { name: 'muestras', titulo: 'Muestras', descripcion: 'Recepción e inventario', icono: 'science', color: 'green', grupo: 'Laboratorio', soloStaff: true },
  { name: 'parametros', titulo: 'Parámetros', descripcion: 'Catálogo de análisis', icono: 'tune', color: 'purple', grupo: 'Laboratorio', soloStaff: true },
  { name: 'resultados', titulo: 'Resultados', descripcion: 'Análisis y validación', icono: 'fact_check', color: 'indigo', grupo: 'Laboratorio', soloStaff: true },
  { name: 'informes', titulo: 'Informes', descripcion: 'Informes de resultados', icono: 'description', color: 'cyan', grupo: 'Laboratorio', soloStaff: true },
  { name: 'disposiciones', titulo: 'Disposición', descripcion: 'Devolución o desecho de muestras', icono: 'archive', color: 'brown', grupo: 'Laboratorio', soloStaff: true },
  { name: 'incidencias', titulo: 'Incidencias', descripcion: 'Novedades y demoras', icono: 'report_problem', color: 'red', grupo: 'Atención al cliente', soloStaff: true },
  { name: 'notificaciones', titulo: 'Notificaciones', descripcion: 'Bandeja de correo simulado', icono: 'mail', color: 'blue-grey', grupo: 'Atención al cliente', soloStaff: true },
  { name: 'usuarios', titulo: 'Usuarios', descripcion: 'Cuentas del personal', icono: 'manage_accounts', color: 'primary', grupo: 'Sistema', soloAdmin: true },
  { name: 'seguimiento', titulo: 'Consulta pública', descripcion: 'Así ve el cliente su muestra', icono: 'travel_explore', color: 'light-blue', grupo: 'Sistema' },
]

const accesosVisibles = computed(() =>
  accesos.filter((a) => (!a.soloAdmin || auth.esAdmin) && (!a.soloStaff || auth.esStaff)),
)

const grupos = computed(() => {
  const orden = []
  const mapa = new Map()
  for (const a of accesosVisibles.value) {
    if (!mapa.has(a.grupo)) {
      mapa.set(a.grupo, [])
      orden.push(a.grupo)
    }
    mapa.get(a.grupo).push(a)
  }
  return orden.map((nombre) => ({ nombre, accesos: mapa.get(nombre) }))
})

// --- Resumen en vivo -----------------------------------------------------------
const clientes = ref([])
const solicitudes = ref([])
const muestras = ref([])
const incidencias = ref([])
const pagos = ref([])
const facturas = ref([])
const cargando = ref(false)
const error = ref(null)

/** Números y porcentajes animados de cada KPI. */
const kpiValores = ref([])
const kpiPcts = ref([])

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

/** Dispara los contadores animados de valores y porcentajes. */
function animarContadores() {
  const tarjetas = tarjetasResumen.value
  const previosValores = kpiValores.value
  const previosPcts = kpiPcts.value

  kpiValores.value = tarjetas.map((t, i) => previosValores[i] ?? 0)
  kpiPcts.value = tarjetas.map((t, i) => previosPcts[i] ?? 0)

  tarjetas.forEach((t, i) => {
    animarNumero(kpiValores.value[i], t.valor, 900 + i * 90, (v) => {
      kpiValores.value[i] = v
    })
    animarNumero(kpiPcts.value[i], t.pct, 900 + i * 90, (v) => {
      kpiPcts.value[i] = v
    })
  })
}

// Reloj "hace X segundos" y auto-refresco cada 30 s.
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

// --- Contadores ---------------------------------------------------------------
const incidenciasActivas = computed(() =>
  incidencias.value.filter((i) => ['abierta', 'en_revision'].includes(i.estado)),
)

/** KPI cards: valor total + porcentaje significativo + contexto real. */
const tarjetasResumen = computed(() => {
  const totalClientes = clientes.value.length
  const totalSolicitudes = solicitudes.value.length
  const totalMuestras = muestras.value.length
  const totalIncidencias = incidencias.value.length
  const totalPagos = pagos.value.length

  const externos = clientes.value.filter((c) => c.tipo_cliente === 'externo').length
  const pendientes = solicitudes.value.filter((s) => s.estado === 'pendiente').length
  const enAnalisis = muestras.value.filter((m) => ['en_proceso', 'en_analisis'].includes(m.estado)).length
  const activas = incidenciasActivas.value.length
  const confirmados = pagos.value.filter((p) => p.estado === 'confirmado').length
  const totalFacturas = facturas.value.length

  return [
    {
      label: 'Clientes',
      valor: totalClientes,
      pct: pctDe(externos, totalClientes),
      pctTexto: 'externos',
      icono: 'groups',
      ruta: 'clientes',
      gradient: 'linear-gradient(135deg, #66bb6a, #1b5e20)',
      contexto: `${externos} externos registrados`,
    },
    {
      label: 'Solicitudes',
      valor: totalSolicitudes,
      pct: pctDe(pendientes, totalSolicitudes),
      pctTexto: 'pendientes',
      icono: 'assignment',
      ruta: 'solicitudes',
      gradient: 'linear-gradient(135deg, #64b5f6, #1565c0)',
      contexto: `${pendientes} pendientes por atender`,
    },
    {
      label: 'Muestras',
      valor: totalMuestras,
      pct: pctDe(enAnalisis, totalMuestras),
      pctTexto: 'en análisis',
      icono: 'science',
      ruta: 'muestras',
      gradient: 'linear-gradient(135deg, #4db6ac, #00695c)',
      contexto: `${enAnalisis} en análisis ahora`,
    },
    {
      label: 'Incidencias activas',
      valor: activas,
      pct: pctDe(activas, totalIncidencias),
      pctTexto: 'del total',
      icono: 'report_problem',
      ruta: 'incidencias',
      gradient: 'linear-gradient(135deg, #ffb74d, #e65100)',
      contexto: `${incidencias.value.filter((i) => i.estado === 'en_revision').length} en revisión`,
      pulso: activas > 0,
    },
    {
      label: 'Pagos',
      valor: totalPagos,
      pct: pctDe(confirmados, totalPagos),
      pctTexto: 'confirmados',
      icono: 'payments',
      ruta: 'pagos',
      gradient: 'linear-gradient(135deg, #26a69a, #004d40)',
      contexto: `${confirmados} confirmados de ${totalPagos}`,
    },
    {
      label: 'Facturas',
      valor: totalFacturas,
      pct: pctDe(totalFacturas, confirmados),
      pctTexto: 'emitidas',
      icono: 'receipt',
      ruta: 'facturas',
      gradient: 'linear-gradient(135deg, #ff8a65, #bf360c)',
      contexto: `${totalFacturas} emitidas de ${confirmados} pagos`,
    },
  ]
})

// --- Gráfico 1: solicitudes por estado (donut SVG) ----------------------------
const ESTADOS_SOLICITUD = [
  { value: 'pendiente', label: 'Pendiente', color: '#bdbdbd' },
  { value: 'cotizada', label: 'Cotizada', color: '#64b5f6' },
  { value: 'aceptada', label: 'Aceptada', color: '#a5d6a7' },
  { value: 'pagada', label: 'Pagada', color: '#66bb6a' },
  { value: 'rechazada', label: 'Rechazada', color: '#ef5350' },
]

const ESTADO_COLOR = { pendiente: 'grey-4', cotizada: 'blue-2', aceptada: 'green-2', pagada: 'green-9', rechazada: 'red-2' }
const ESTADO_TEXTO = { pendiente: 'grey-9', cotizada: 'blue-9', aceptada: 'green-10', pagada: 'white', rechazada: 'red-10' }

const distribucionSolicitudes = computed(() => {
  const total = solicitudes.value.length
  let inicio = 0
  return ESTADOS_SOLICITUD.map((e) => {
    const cantidad = solicitudes.value.filter((s) => s.estado === e.value).length
    const pct = total ? (cantidad / total) * 100 : 0
    const segmento = { ...e, cantidad, pct, inicio }
    inicio += pct
    return segmento
  })
})

const totalSolicitudes = computed(() => solicitudes.value.length)

// --- Gráfico 2: muestras por estado (barras horizontales) ---------------------
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

const PALETA_VERDE = ['#a5d6a7', '#81c784', '#66bb6a', '#4caf50', '#43a047', '#388e3c', '#2e7d32', '#1b5e20', '#c8e6c9']

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
      color: PALETA_VERDE[i % PALETA_VERDE.length],
      pct: Math.round((f.cantidad / total) * 100),
    }))
})

// --- Gráfico 3: ingresos confirmados por mes (últimos 6 meses) ------------------
const formatPeso = (v) =>
  Number(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const MESES_LABEL = { 0: 'Ene', 1: 'Feb', 2: 'Mar', 3: 'Abr', 4: 'May', 5: 'Jun', 6: 'Jul', 7: 'Ago', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dic' }

const pagosPorMes = computed(() => {
  const ahora = new Date()
  const meses = []

  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    meses.push({
      clave: `${fecha.getFullYear()}-${fecha.getMonth()}`,
      etiqueta: MESES_LABEL[fecha.getMonth()],
      total: 0,
      cantidad: 0,
    })
  }

  for (const p of pagos.value) {
    if (p.estado !== 'confirmado') continue
    const fecha = new Date(p.fecha_creacion)
    const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`
    const mes = meses.find((m) => m.clave === clave)
    if (mes) {
      mes.total += Number(p.monto) || 0
      mes.cantidad += 1
    }
  }

  return meses
})

const maxIngreso = computed(() => Math.max(...pagosPorMes.value.map((m) => m.total), 1))

// --- Últimas solicitudes --------------------------------------------------------
const columnasUltimas = [
  { name: 'cliente', label: 'Cliente', field: (row) => row.cliente_id?.nombre || '', align: 'left' },
  { name: 'descripcion', label: 'Descripción', field: 'descripcion', align: 'left' },
  { name: 'prioridad', label: 'Prioridad', field: 'prioridad', align: 'center' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center' },
  { name: 'fecha_creacion', label: 'Fecha', field: (row) => formatDate(row.fecha_creacion), align: 'left' },
]

const ultimasSolicitudes = computed(() =>
  [...solicitudes.value]
    .sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion))
    .slice(0, 5),
)

const PRIORIDAD_COLOR = { alta: 'orange-2', media: 'blue-1', baja: 'grey-3' }
const PRIORIDAD_TEXTO = { alta: 'orange-9', media: 'blue-9', baja: 'grey-8' }
const PRIORIDAD_LABEL = { alta: 'Alta', media: 'Media', baja: 'Baja' }

const prioridadLabel = (p) => PRIORIDAD_LABEL[p] || p
const estadoLabel = (e) => ESTADOS_SOLICITUD.find((x) => x.value === e)?.label || e
</script>

<template>
  <q-page class="pagina-panel">
    <!-- Destellos decorativos de fondo -->
    <div class="orbs" aria-hidden="true">
      <span class="orb orb--1" />
      <span class="orb orb--2" />
      <span class="orb orb--3" />
    </div>

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
            <p class="texto-panel q-mb-none">
              Bienvenido a LABFICAT, el sistema de gestión del laboratorio de análisis.
            </p>
            <p v-if="auth.esStaff" class="texto-panel-suave text-caption q-mt-sm q-mb-none">
              <span class="vivo">
                <span class="vivo__punto" aria-hidden="true" />
                Datos en vivo · hace {{ haceSegundos }} s
              </span>
              <span class="q-mx-xs">·</span>
              Actualización automática cada 30 s
            </p>
          </div>

          <q-btn
            v-if="auth.esStaff"
            unelevated
            no-caps
            color="white"
            text-color="green-10"
            icon="refresh"
            label="Actualizar"
            :loading="cargando"
            @click="cargar()"
          />
        </div>
      </header>

      <!-- Aviso si la API falló -->
      <q-banner v-if="error" dense class="aviso-error q-mb-md">
        <template #avatar><q-icon name="error_outline" color="red-2" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" color="red-2" @click="cargar()" /></template>
      </q-banner>

      <!-- Resumen en cifras -->
      <template v-if="auth.esStaff">
        <div class="row q-col-gutter-md q-mb-lg">
          <div
            class="col-6 col-sm-4 col-xl-2"
            v-for="(tarjeta, i) in tarjetasResumen"
            :key="tarjeta.label"
          >
            <q-card
              flat
              class="vidrio vidrio--hover kpi-card cursor-pointer animar"
              :class="{ 'kpi-alerta': tarjeta.pulso }"
              :style="{ animationDelay: `${80 + i * 70}ms` }"
              :to="{ name: tarjeta.ruta }"
            >
              <q-card-section>
                <div class="row items-center justify-between no-wrap">
                  <span class="kpi-card__icono" :style="{ background: tarjeta.gradient }">
                    <q-icon :name="tarjeta.icono" size="22px" />
                  </span>
                  <q-icon name="arrow_outward" class="kpi-card__flecha" size="20px" />
                </div>

                <div class="row items-baseline justify-between no-wrap q-mt-md">
                  <div class="kpi-card__valor">{{ cargando ? '…' : (kpiValores[i] ?? 0) }}</div>
                  <div class="kpi-card__pct">
                    <q-icon name="trending_up" size="14px" />
                    {{ cargando ? '—' : `${kpiPcts[i] ?? 0}%` }}
                  </div>
                </div>

                <div class="kpi-card__label">{{ tarjeta.label }}</div>

                <div class="kpi-card__barra">
                  <div
                    class="kpi-card__barra-fill"
                    :style="{ width: `${cargando ? 0 : kpiPcts[i] ?? 0}%`, background: tarjeta.gradient }"
                  />
                </div>

                <div class="kpi-card__contexto">
                  <span class="kpi-card__pcttexto">{{ tarjeta.pctTexto }}</span>
                  <span>{{ tarjeta.contexto }}</span>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Gráficos -->
        <div class="row q-col-gutter-md q-mb-lg">
          <!-- Donut: solicitudes por estado -->
          <div class="col-12 col-md-5">
            <q-card flat class="vidrio panel-vidrio full-height animar" style="animation-delay: 320ms">
              <q-card-section>
                <div class="titulo-seccion-panel">
                  <q-icon name="donut_small" size="20px" />
                  Solicitudes por estado
                </div>

                <div class="row items-center">
                  <div class="donut-contenedor">
                    <svg viewBox="0 0 42 42" class="donut">
                      <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="rgba(255,255,255,0.12)" stroke-width="5" />
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
                    </li>
                  </ul>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Barras: muestras por estado -->
          <div class="col-12 col-md-7">
            <q-card flat class="vidrio panel-vidrio full-height animar" style="animation-delay: 400ms">
              <q-card-section>
                <div class="titulo-seccion-panel">
                  <q-icon name="science" size="20px" />
                  Muestras por estado
                </div>

                <div v-if="distribucionMuestras.length" class="barras">
                  <div class="barra" v-for="(m, idx) in distribucionMuestras" :key="m.value">
                    <div class="barra__etiqueta">{{ m.label }}</div>
                    <div class="barra__track">
                      <div
                        class="barra__fill"
                        :style="{ width: `${m.pct}%`, background: m.color, transitionDelay: `${idx * 80}ms` }"
                      />
                    </div>
                    <div class="barra__valor">{{ m.cantidad }}</div>
                  </div>
                </div>
                <div v-else class="text-center q-py-lg texto-panel-suave">
                  Aún no hay muestras registradas
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Ingresos confirmados por mes -->
        <q-card flat class="vidrio panel-vidrio q-mb-lg animar" style="animation-delay: 440ms">
          <q-card-section>
            <div class="titulo-seccion-panel">
              <q-icon name="bar_chart" size="20px" />
              Ingresos confirmados por mes
            </div>

            <div class="grafico-meses">
              <div class="mes" v-for="(m, idx) in pagosPorMes" :key="m.clave">
                <div class="mes__valor">{{ formatPeso(m.total) }}</div>
                <div class="mes__columna">
                  <div
                    class="mes__barra"
                    :style="{
                      height: `${Math.round((m.total / maxIngreso) * 100)}%`,
                      transitionDelay: `${idx * 90}ms`,
                    }"
                  />
                </div>
                <div class="mes__etiqueta">{{ m.etiqueta }}</div>
                <div class="mes__cantidad">{{ m.cantidad }} pago(s)</div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Últimas solicitudes -->
        <q-card flat class="vidrio panel-vidrio q-mb-lg animar" style="animation-delay: 480ms">
          <q-card-section class="row items-center no-wrap">
            <div class="titulo-seccion-panel q-mb-none">
              <q-icon name="history" size="20px" />
              Últimas solicitudes
            </div>
            <q-space />
            <q-btn
              flat
              dense
              no-caps
              color="green-3"
              icon="arrow_forward"
              icon-right
              label="Ver todas"
              :to="{ name: 'solicitudes' }"
            />
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-table
              flat
              dark
              hide-bottom
              :rows="ultimasSolicitudes"
              :columns="columnasUltimas"
              row-key="_id"
              no-data-label="Aún no hay solicitudes registradas"
            >
              <template #body-cell-descripcion="celda">
                <q-td :props="celda" class="celda-descripcion">{{ celda.row.descripcion }}</q-td>
              </template>

              <template #body-cell-prioridad="celda">
                <q-td :props="celda" class="text-center">
                  <q-badge
                    :color="PRIORIDAD_COLOR[celda.row.prioridad] || 'grey-3'"
                    :text-color="PRIORIDAD_TEXTO[celda.row.prioridad] || 'grey-8'"
                    :label="prioridadLabel(celda.row.prioridad)"
                  />
                </q-td>
              </template>

              <template #body-cell-estado="celda">
                <q-td :props="celda" class="text-center">
                  <q-badge
                    :color="ESTADO_COLOR[celda.row.estado] || 'grey-4'"
                    :text-color="ESTADO_TEXTO[celda.row.estado] || 'grey-9'"
                    :label="estadoLabel(celda.row.estado)"
                  />
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </template>

      <!-- Accesos a módulos, agrupados por sección -->
      <div
        v-for="(grupo, gi) in grupos"
        :key="grupo.nombre"
        class="q-mb-md animar"
        :style="{ animationDelay: `${560 + gi * 80}ms` }"
      >
        <div class="grupo-titulo">{{ grupo.nombre }}</div>
        <div class="row q-col-gutter-md">
          <div
            class="col-12 col-sm-6 col-lg-4 col-xl-3"
            v-for="acceso in grupo.accesos"
            :key="acceso.name"
          >
            <q-card flat class="vidrio vidrio--hover modulo-card cursor-pointer" :to="{ name: acceso.name }">
              <q-card-section class="row items-center no-wrap">
                <q-avatar square size="42px" class="modulo-card__icono" :style="{ background: gradienteDe(acceso.color) }">
                  <q-icon :name="acceso.icono" size="22px" color="white" />
                </q-avatar>
                <div class="modulo-card__texto">
                  <div class="text-subtitle2 text-weight-bold">{{ acceso.titulo }}</div>
                  <div class="text-caption modulo-card__desc">{{ acceso.descripcion }}</div>
                </div>
                <q-icon name="chevron_right" class="modulo-card__flecha" />
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<style scoped lang="scss">
// =============================================================================
// Dashboard glassmorphism con dinamismo: contadores, porcentajes, gráficos
// animados, auto-refresco y efectos de pulso. Todo CSS/JS puro.
// =============================================================================

.pagina-panel {
  position: relative;
  overflow: hidden;
  min-height: calc(100vh - 50px);
  color: #e8f5e9;
  background:
    radial-gradient(900px 520px at 88% -10%, rgba(46, 125, 50, 0.5), transparent 60%),
    radial-gradient(700px 420px at -10% 32%, rgba(38, 166, 154, 0.28), transparent 60%),
    radial-gradient(600px 400px at 55% 115%, rgba(129, 199, 132, 0.22), transparent 65%),
    linear-gradient(165deg, #0c2312 0%, #102d18 55%, #081710 100%);
}

// Destellos flotantes de fondo
.orbs {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.45;
  animation: flotar 14s ease-in-out infinite;
}

.orb--1 {
  width: 340px;
  height: 340px;
  top: -80px;
  right: -60px;
  background: rgba(46, 125, 50, 0.55);
}

.orb--2 {
  width: 260px;
  height: 260px;
  top: 40%;
  left: -90px;
  background: rgba(38, 166, 154, 0.4);
  animation-delay: -5s;
}

.orb--3 {
  width: 300px;
  height: 300px;
  bottom: -110px;
  right: 18%;
  background: rgba(129, 199, 132, 0.3);
  animation-delay: -9s;
}

@keyframes flotar {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(12px, -18px) scale(1.05);
  }
}

// --- Textos del panel ----------------------------------------------------------
.kicker {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.6px;
  color: #81c784;
}

.titulo-panel {
  color: #ffffff;
}

.texto-panel {
  color: rgba(255, 255, 255, 0.68);
}

.texto-panel-suave {
  color: rgba(255, 255, 255, 0.5);
}

.chip-rol {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #c8e6c9;
  background: rgba(102, 187, 106, 0.16);
  border: 1px solid rgba(102, 187, 106, 0.35);
}

// Indicador "en vivo" con punto que parpadea
.vivo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #a5d6a7;
}

.vivo__punto {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #66bb6a;
  box-shadow: 0 0 8px #66bb6a;
  animation: parpadeo 1.6s ease-in-out infinite;
}

@keyframes parpadeo {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

// --- Tarjeta de vidrio base ----------------------------------------------------
.vidrio {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.vidrio--hover:hover {
  transform: translateY(-5px);
  border-color: rgba(255, 255, 255, 0.24);
  box-shadow: 0 16px 42px rgba(0, 0, 0, 0.38);
}

// --- KPI cards -----------------------------------------------------------------
.kpi-card {
  &__icono {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  }

  &__flecha {
    color: rgba(255, 255, 255, 0.4);
    transition: transform 0.2s ease, color 0.2s ease;
  }

  &:hover .kpi-card__flecha {
    transform: translate(3px, -3px);
    color: #a5d6a7;
  }

  &__valor {
    font-size: 30px;
    font-weight: 800;
    color: #fff;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  &__pct {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 15px;
    font-weight: 800;
    color: #a5d6a7;
    font-variant-numeric: tabular-nums;
  }

  &__label {
    color: rgba(255, 255, 255, 0.72);
    font-weight: 600;
    font-size: 14px;
  }

  // Mini-barra de progreso del porcentaje
  &__barra {
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    margin-top: 12px;
    overflow: hidden;
  }

  &__barra-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.9s cubic-bezier(0.22, 0.9, 0.35, 1);
  }

  &__contexto {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-top: 10px;
    font-size: 12.5px;
    color: rgba(255, 255, 255, 0.6);
  }

  &__pcttexto {
    font-weight: 700;
    color: #a5d6a7;
    text-transform: uppercase;
    font-size: 10.5px;
    letter-spacing: 0.4px;
  }
}

// Pulso de alerta (incidencias activas)
.kpi-alerta {
  position: relative;
}

.kpi-alerta::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  border: 2px solid rgba(255, 152, 0, 0.55);
  animation: pulso 2.2s ease-out infinite;
  pointer-events: none;
}

@keyframes pulso {
  0% {
    opacity: 0.9;
    transform: scale(1);
  }
  70%,
  100% {
    opacity: 0;
    transform: scale(1.035);
  }
}

// --- Títulos de sección ----------------------------------------------------------
.titulo-seccion-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #e8f5e9;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 16px;

  .q-icon {
    color: #81c784;
  }
}

.grupo-titulo {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.55);
  border-left: 3px solid #66bb6a;
  padding-left: 10px;
  margin-bottom: 12px;
}

// --- Donut ------------------------------------------------------------------------
.donut-contenedor {
  position: relative;
  width: 170px;
  height: 170px;
  flex-shrink: 0;
}

.donut {
  width: 100%;
  height: 100%;
}

// Los segmentos se dibujan animados cuando llegan los datos.
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
  color: #fff;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.donut-centro__texto {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.leyenda {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  color: rgba(255, 255, 255, 0.75);
}

.leyenda__valor {
  font-weight: 700;
  color: #fff;
}

// --- Barras de muestras ------------------------------------------------------------
.barras {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.barra {
  display: grid;
  grid-template-columns: 150px 1fr 32px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.barra__etiqueta {
  color: rgba(255, 255, 255, 0.75);
}

.barra__track {
  height: 10px;
  background: rgba(255, 255, 255, 0.12);
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
  color: #fff;
  font-variant-numeric: tabular-nums;
}

// --- Gráfico de ingresos por mes ---------------------------------------------------
.grafico-meses {
  display: flex;
  align-items: stretch;
  gap: 14px;
}

.mes {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.mes__valor {
  font-size: 12px;
  font-weight: 700;
  color: #a5d6a7;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.mes__columna {
  width: 100%;
  height: 130px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 6px;
}

.mes__barra {
  width: 60%;
  max-width: 42px;
  border-radius: 8px 8px 4px 4px;
  background: linear-gradient(180deg, #81c784, #2e7d32);
  box-shadow: 0 0 14px rgba(102, 187, 106, 0.35);
  transition: height 0.9s cubic-bezier(0.22, 0.9, 0.35, 1);
}

.mes__etiqueta {
  font-size: 12px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mes__cantidad {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

// --- Tabla de últimas solicitudes ---------------------------------------------------
.panel-vidrio :deep(.q-table) {
  background: transparent;
}

.panel-vidrio :deep(.q-table th) {
  color: rgba(255, 255, 255, 0.62);
  font-size: 12.5px;
}

.panel-vidrio :deep(.q-table td) {
  color: rgba(255, 255, 255, 0.92);
}

.panel-vidrio :deep(.q-table thead tr th),
.panel-vidrio :deep(.q-table tbody td) {
  border-color: rgba(255, 255, 255, 0.08);
}

.celda-descripcion {
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// --- Tarjetas de acceso ---------------------------------------------------------------
.modulo-card {
  &__icono {
    border-radius: 12px;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
    flex-shrink: 0;
  }

  &__texto {
    flex: 1;
    min-width: 0;
    color: #fff;
    margin-left: 12px;
  }

  &__desc {
    color: rgba(255, 255, 255, 0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__flecha {
    color: rgba(255, 255, 255, 0.35);
    flex-shrink: 0;
    transition: transform 0.2s ease, color 0.2s ease;
  }

  &:hover .modulo-card__flecha {
    transform: translateX(4px);
    color: #a5d6a7;
  }
}

// --- Aviso de error ---------------------------------------------------------------
.aviso-error {
  background: rgba(239, 83, 80, 0.12);
  border: 1px solid rgba(239, 83, 80, 0.4);
  color: #ffcdd2;
  border-radius: 14px;
}

// --- Animación de entrada -------------------------------------------------------------
.animar {
  animation: aparecer 0.55s cubic-bezier(0.22, 0.9, 0.35, 1) both;
}

@keyframes aparecer {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// --- Responsive -------------------------------------------------------------------------
@media (max-width: 600px) {
  .barra {
    grid-template-columns: 110px 1fr 26px;
    gap: 8px;
  }

  .donut-contenedor {
    width: 140px;
    height: 140px;
  }

  .kpi-card__valor {
    font-size: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .animar,
  .orb,
  .vivo__punto,
  .kpi-alerta::after {
    animation: none !important;
  }

  .vidrio--hover:hover {
    transform: none;
  }

  .donut circle,
  .barra__fill,
  .kpi-card__barra-fill,
  .mes__barra {
    transition: none !important;
  }
}
</style>
