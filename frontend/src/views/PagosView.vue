<script setup>
/**
 * /views/PagosView.vue
 * Pagos SIMULADOS (RNF-018): se registran desde una cotización aceptada y su
 * resultado (confirmado / fallido) se simula sin información de tarjeta.
 *
 * La tabla se presenta como la BANDEJA de Notificaciones (mismo lenguaje
 * visual): barra verde con buscador y pestañas, filas con avatar, chip de
 * estado en columna fija, meta a la derecha y acciones al hover.
 */
import { computed, onMounted, ref, watch } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'

import { get, post, patch } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { useConfirmar } from '@/composables/useConfirmar'
import { formatDate } from '@/utils/formatDate'
import { seleccionRequerida } from '@/utils/reglas'

const general = useGeneralStore()
const { notificarOk, notificarError } = useNotificar()
const { confirmar } = useConfirmar()

const formatPeso = (v) => Number(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

/**
 * Normaliza texto para buscar sin distinguir mayúsculas ni acentos
 * (misma utilidad que en Notificaciones).
 */
const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

// Colores y etiquetas de estado (misma píldora de la bandeja de notificaciones)
const ESTADO_PAGO = {
  pendiente: { label: 'Pendiente', color: '#f59e0b', fondo: '#fef3c7', texto: '#92400e' },
  confirmado: { label: 'Confirmado', color: '#2e7d32', fondo: '#e8f5e9', texto: '#1b5e20' },
  fallido: { label: 'Fallido', color: '#e53935', fondo: '#fdecea', texto: '#b71c1c' },
}
const estadoPago = (estado) =>
  ESTADO_PAGO[estado] || { label: estado || '—', color: '#9e9e9e', fondo: '#eceff1', texto: '#546e7a' }

const nombreCliente = (p) => p.cotizacion_id?.solicitud_id?.cliente_id?.nombre || 'Sin cliente'

const pagos = ref([])
const cotizaciones = ref([])
const cargando = ref(false)
const error = ref(null)

// Cotizaciones aceptadas que todavía no tienen un pago pendiente/confirmado.
const opcionesCotizacion = computed(() =>
  cotizaciones.value
    .filter((c) => c.estado === 'aceptada')
    .filter((c) => !pagos.value.some((p) => p.cotizacion_id?._id === c._id && ['pendiente', 'confirmado'].includes(p.estado)))
    .map((c) => ({
      label: `#${c.numero} · ${c.solicitud_id?.cliente_id?.nombre || ''} (${formatPeso(c.total)})`,
      value: c._id,
    })),
)

const cargar = async () => {
  cargando.value = true
  error.value = null
  try {
    const [p, c] = await Promise.all([get('/pagos'), get('/cotizaciones')])
    pagos.value = p
    cotizaciones.value = c
    general.marcarSincronizacion()
  } catch (e) {
    error.value = e.mensaje
    notificarError(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

// --- Buscador, pestañas y paginación (misma lógica de Notificaciones) ---------
const busqueda = ref('')
const pestana = ref('todas')
const pagina = ref(1)
const porPagina = ref(10)

const opcionesPorPagina = [
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: 'Todos', value: 0 },
]

const conteos = computed(() => ({
  todas: pagos.value.length,
  pendientes: pagos.value.filter((p) => p.estado === 'pendiente').length,
  confirmados: pagos.value.filter((p) => p.estado === 'confirmado').length,
  fallidos: pagos.value.filter((p) => p.estado === 'fallido').length,
}))

// Coincide la búsqueda con un pago (ignora acentos y mayúsculas).
const coincide = (p, q) =>
  [p.referencia, nombreCliente(p), `#${p.cotizacion_id?.numero ?? ''}`, formatPeso(p.monto), estadoPago(p.estado).label]
    .some((campo) => normalizar(campo).includes(q))

/**
 * Vista previa para la segunda línea de la fila: llena el ancho de la
 * columna y se lleva el espacio en blanco que sobraba a la derecha.
 */
const previsualizacion = (p) =>
  `Cotización #${p.cotizacion_id?.numero ?? '—'} · ${formatPeso(p.monto)} · pago 100% simulado, sin datos de tarjeta`

const filtradas = computed(() => {
  const q = normalizar(busqueda.value)
  return pagos.value.filter((p) => {
    if (pestana.value === 'pendientes' && p.estado !== 'pendiente') return false
    if (pestana.value === 'confirmados' && p.estado !== 'confirmado') return false
    if (pestana.value === 'fallidos' && p.estado !== 'fallido') return false
    if (!q) return true
    return coincide(p, q)
  })
})

const totalPaginas = computed(() => {
  if (porPagina.value <= 0) return 1
  return Math.max(1, Math.ceil(filtradas.value.length / porPagina.value))
})

const paginaEfectiva = computed(() => Math.min(pagina.value, totalPaginas.value))

const filasVisibles = computed(() => {
  if (porPagina.value <= 0) return filtradas.value
  const inicio = (paginaEfectiva.value - 1) * porPagina.value
  return filtradas.value.slice(inicio, inicio + porPagina.value)
})

const rango = computed(() => {
  const total = filtradas.value.length
  if (total === 0) return '0 de 0'
  const inicio = (paginaEfectiva.value - 1) * porPagina.value + 1
  const fin = porPagina.value <= 0 ? total : Math.min(paginaEfectiva.value * porPagina.value, total)
  return `${inicio}-${fin} de ${total}`
})

const sinResultados = computed(() => !cargando.value && filasVisibles.value.length === 0)

// Al cambiar de pestaña, de búsqueda o de tamaño de página, vuelta a la 1.
watch([busqueda, pestana, porPagina], () => {
  pagina.value = 1
})

const cambiarPestana = (nombre) => {
  pestana.value = nombre
}

// --- Registro de pago --------------------------------------------------------
const dialogo = ref(false)
const guardando = ref(false)
const cotizacionSeleccionada = ref(null)
const formularioRef = ref(null) // q-form: valida antes de registrar

const abrirCreacion = () => {
  cotizacionSeleccionada.value = null
  dialogo.value = true
}

const guardar = async () => {
  guardando.value = true
  try {
    const respuesta = await post('/pagos', { cotizacion_id: cotizacionSeleccionada.value })
    notificarOk(`Pago registrado: ${respuesta.datos.referencia}`)
    dialogo.value = false
    await cargar()
  } catch (e) {
    notificarError(e)
  } finally {
    guardando.value = false
  }
}

// --- Simulación del resultado -------------------------------------------------
const confirmarPago = async (pago) => {
  const aceptado = await confirmar({
    titulo: 'Confirmar pago',
    mensaje: `Se simulará la confirmación del pago ${pago.referencia} por ${formatPeso(pago.monto)}. No se captura información de tarjeta.`,
    textoOk: 'Confirmar pago',
    color: 'positive',
    icono: 'task_alt',
  })
  if (!aceptado) return
  await enviarEstado(pago, 'confirmado')
}

const marcarFallido = async (pago) => {
  const aceptado = await confirmar({
    titulo: 'Marcar como fallido',
    mensaje: `¿Confirmas marcar el pago ${pago.referencia} como fallido?`,
    textoOk: 'Marcar fallido',
    color: 'negative',
    icono: 'error_outline',
  })
  if (!aceptado) return
  await enviarEstado(pago, 'fallido')
}

const enviarEstado = async (pago, estado) => {
  try {
    const respuesta = await patch(`/pagos/${pago._id}/estado`, { estado })
    notificarOk(respuesta.mensaje)
    await cargar()
  } catch (e) {
    notificarError(e)
  }
}
</script>

<template>
  <q-page class="pagina-pagos">
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Pagos"
        subtitulo="Pagos simulados de las cotizaciones aceptadas"
        icono="payments"
      >
        <template #acciones>
          <q-btn unelevated no-caps class="btn-nueva" @click="abrirCreacion">
            <span class="btn-nueva__icono"><q-icon name="add" size="20px" /></span>
            <span class="btn-nueva__texto">Registrar pago</span>
          </q-btn>
        </template>
      </EncabezadoPagina>

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" @click="cargar" /></template>
      </q-banner>

      <!-- Bandeja de pagos -->
      <div class="bandeja">
        <!-- Buscador + pestañas -->
        <div class="bandeja__barra">
          <q-input
            v-model="busqueda"
            dense outlined clearable
            placeholder="Buscar referencia, cliente, cotización..."
            class="bandeja__buscar"
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>

          <div class="pestanas" role="tablist" aria-label="Filtrar pagos">
            <button
              type="button" class="pestana" :class="{ 'pestana--activa': pestana === 'todas' }"
              role="tab" :aria-selected="pestana === 'todas'" @click="cambiarPestana('todas')"
            >
              Todas <span class="pestana__contador">{{ conteos.todas }}</span>
            </button>
            <button
              type="button" class="pestana" :class="{ 'pestana--activa': pestana === 'pendientes' }"
              role="tab" :aria-selected="pestana === 'pendientes'" @click="cambiarPestana('pendientes')"
            >
              Pendientes <span class="pestana__contador">{{ conteos.pendientes }}</span>
            </button>
            <button
              type="button" class="pestana" :class="{ 'pestana--activa': pestana === 'confirmados' }"
              role="tab" :aria-selected="pestana === 'confirmados'" @click="cambiarPestana('confirmados')"
            >
              Confirmados <span class="pestana__contador">{{ conteos.confirmados }}</span>
            </button>
            <button
              type="button" class="pestana" :class="{ 'pestana--activa': pestana === 'fallidos' }"
              role="tab" :aria-selected="pestana === 'fallidos'" @click="cambiarPestana('fallidos')"
            >
              Fallidos <span class="pestana__contador">{{ conteos.fallidos }}</span>
            </button>
          </div>
        </div>

        <!-- Lista -->
        <div class="bandeja__lista">
          <q-linear-progress
            v-if="cargando"
            indeterminate
            color="grey-8"
            track-color="transparent"
            class="bandeja__progreso"
          />

          <q-inner-loading :active="cargando" label="Consultando al servidor..." color="primary" />

          <template v-if="filasVisibles.length">
            <div
              v-for="p in filasVisibles"
              :key="p._id"
              class="fila"
              :class="`fila--${p.estado}`"
            >
              <!-- 1. Icono de pago en círculo con color de su estado -->
              <div class="fila__avatar" :style="{ background: estadoPago(p.estado).fondo, color: estadoPago(p.estado).color }">
                <q-icon name="payments" size="20px" />
                <q-tooltip>Estado: {{ estadoPago(p.estado).label }}</q-tooltip>
              </div>

              <!-- 2. Referencia en negrita + cliente y detalle debajo -->
              <div class="fila__cuerpo">
                <div class="fila__asunto">{{ p.referencia }}</div>
                <div class="fila__destino">
                  <span class="fila__tipo" :style="{ color: estadoPago(p.estado).color }">
                    Cotización #{{ p.cotizacion_id?.numero ?? '—' }}
                  </span>
                  <span class="fila__sep">·</span>
                  <span class="fila__correo">{{ nombreCliente(p) }}</span>
                  <span class="fila__sep">·</span>
                  <span class="fila__preview">{{ previsualizacion(p) }}</span>
                </div>
              </div>

              <!-- 3. Estado: chip con punto de color (columna fija 110px) -->
              <span
                class="fila__estado"
                :style="{ background: estadoPago(p.estado).fondo, color: estadoPago(p.estado).texto }"
              >
                <i class="fila__punto" :style="{ background: estadoPago(p.estado).color }"></i>
                {{ estadoPago(p.estado).label }}
              </span>

              <!-- 4. Registrado y monto -->
              <div class="fila__meta">
                <span class="fila__fecha" :title="p.fecha_creacion">{{ formatDate(p.fecha_creacion) }}</span>
                <span class="fila__monto">{{ formatPeso(p.monto) }}</span>
              </div>

              <!-- 5. Acciones: solo existe si hay botones (así NUNCA se pinta
                   el contenedor blanco sobre la fecha y el monto) -->
              <div v-if="p.estado === 'pendiente'" class="fila__acciones">
                <q-btn flat dense round size="sm" icon="check" color="positive" class="action-secondary" @click="confirmarPago(p)">
                  <q-tooltip>Simular confirmación</q-tooltip>
                </q-btn>
                <q-btn flat dense round size="sm" icon="close" color="negative" class="action-secondary" @click="marcarFallido(p)">
                  <q-tooltip>Marcar fallido</q-tooltip>
                </q-btn>
              </div>
            </div>
          </template>

          <!-- Estado vacío -->
          <div v-else-if="sinResultados" class="bandeja__vacia">
            <q-icon name="account_balance_wallet" size="56px" color="grey-4" class="q-mb-sm" />
            <span class="empty-title">
              {{ busqueda || pestana !== 'todas' ? 'Ningún pago coincide con el filtro' : 'Aún no hay pagos registrados' }}
            </span>
          </div>
        </div>

        <!-- Paginación -->
        <div class="bandeja__pie">
          <div class="pie__paginas">
            <span class="pie__texto">Registros por página</span>
            <q-select
              v-model="porPagina" dense outlined :options="opcionesPorPagina"
              emit-value map-options class="pie__select" aria-label="Registros por página"
            />
          </div>

          <div class="pie__rango">
            <span class="pie__texto">{{ rango }}</span>
            <q-btn
              flat dense round icon="chevron_left" size="sm" aria-label="Página anterior"
              :disable="paginaEfectiva <= 1" @click="pagina = paginaEfectiva - 1"
            />
            <q-btn
              flat dense round icon="chevron_right" size="sm" aria-label="Página siguiente"
              :disable="paginaEfectiva >= totalPaginas" @click="pagina = paginaEfectiva + 1"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Registrar pago: mismo estilo del diálogo "Nueva notificación" -->
    <q-dialog v-model="dialogo" persistent @show="formularioRef?.resetValidation()">
      <q-card class="dlg-pago">
        <div class="dlg-pago__cabecera">
          <span class="dlg-pago__decoracion dlg-pago__decoracion--1" aria-hidden="true"></span>
          <span class="dlg-pago__decoracion dlg-pago__decoracion--2" aria-hidden="true"></span>

          <span class="dlg-pago__icono"><q-icon name="payments" size="26px" /></span>
          <div class="dlg-pago__textos">
            <div class="dlg-pago__titulo">Registrar pago</div>
            <div class="dlg-pago__subtitulo">Pago simulado, sin datos de tarjeta</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" class="dlg-pago__cerrar" />
        </div>

        <q-form ref="formularioRef" greedy class="dlg-pago__cuerpo" @submit="guardar">
          <div class="dlg-pago__seccion">
            <div class="dlg-pago__seccion-titulo">
              <q-icon name="request_quote" size="14px" />
              <span>Cotización</span>
              <i class="dlg-pago__linea"></i>
            </div>

            <q-select
              v-model="cotizacionSeleccionada"
              outlined dense :options="opcionesCotizacion" emit-value map-options
              label="Cotización aceptada *"
              :rules="[seleccionRequerida('la cotización')]" lazy-rules
              class="dlg-pago__campo"
            >
              <template #prepend><q-icon name="request_quote" /></template>
            </q-select>

            <div class="dlg-pago__nota">
              <q-icon name="info" size="18px" />
              <span>
                Al confirmar el pago, la solicitud pasa a estado <strong>pagada</strong>.
                El proceso es 100% simulado (RNF-018) y no se captura información de tarjeta.
              </span>
            </div>
          </div>

          <div class="dlg-pago__pie">
            <span class="dlg-pago__pista">
              <q-icon name="info" size="14px" />
              El pago se registra al instante
            </span>
            <div class="dlg-pago__acciones">
              <q-btn v-close-popup flat no-caps label="Cancelar" class="dlg-pago__cancelar" />
              <q-btn
                unelevated no-caps type="submit" label="Registrar pago" icon="check_circle"
                class="dlg-pago__guardar" :loading="guardando"
              />
            </div>
          </div>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

// --- Botón "Registrar pago" (mismo que "Nueva notificación") ------------------
.btn-nueva {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  height: 44px;
  padding: 0 20px 0 14px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.01em;
  color: #fff;
  // Sombra neutra (sin tinte verde): eleva sin dejar resplandor verde.
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.14);
  background-image: linear-gradient(135deg, #43a047, #2e7d32) !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.14);
  }
}

.btn-nueva__icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-right: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.45);
  color: #fff; // el "+" siempre blanco
  transition: transform 0.15s ease;
}

.btn-nueva :deep(.q-btn__content) {
  gap: 12px;
}

.btn-nueva:hover .btn-nueva__icono {
  transform: rotate(90deg);
}

.btn-nueva__texto {
  color: #fff;
}

// --- Encabezado de la página (mismo rediseño de Notificaciones) ---------------
.encabezado-pagina {
  :deep(.encabezado-pagina__icono) {
    width: 50px !important;
    height: 50px !important;
    border-radius: 14px !important;
    background-image: linear-gradient(135deg, #43a047, #2e7d32);
    box-shadow: 0 8px 18px rgba(46, 125, 50, 0.28);
  }

  :deep(.encabezado-pagina__icono .q-icon) {
    font-size: 26px !important;
  }

  :deep(.titulo-vista) {
    color: #1b5e20;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  :deep(.encabezado-pagina__subtitulo) {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-top: 8px;
    padding: 5px 13px;
    border-radius: 999px;
    background: #e8f5e9;
    color: #1b5e20;
    font-size: 12.5px;
    font-weight: 600;
  }

  :deep(.encabezado-pagina__subtitulo)::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #2e7d32;
  }
}

// --- Contenedor de la bandeja -------------------------------------------------
.bandeja {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #d7ead7;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: none; // sin sombra verde
  min-height: 340px; // solo para estados vacíos/carga; el alto lo da la lista
}

// Página con fondo degradado (verde muy claro → blanco).
.pagina-pagos {
  background-image: linear-gradient(180deg, #edf6ed 0%, #f9fdf9 45%, #ffffff 100%);
}

// --- Barra superior: buscador + pestañas (mismo degradado del diálogo) --------
.bandeja__barra {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background-image: linear-gradient(135deg, #43a047 0%, #2e7d32 55%, #1b5e20 100%);
  flex-shrink: 0;
  overflow: hidden;
}

.bandeja__barra::before,
.bandeja__barra::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.bandeja__barra::before {
  width: 180px;
  height: 180px;
  right: -50px;
  top: -110px;
}

.bandeja__barra::after {
  width: 130px;
  height: 130px;
  left: 36%;
  bottom: -100px;
  background: rgba(255, 255, 255, 0.06);
}

.bandeja__buscar {
  flex: 1 1 260px;
  min-width: 220px;
  position: relative;
  z-index: 1;

  // Sobre el degradado el campo debe ser BLANCO (.q-field--outlined está en
  // el MISMO elemento, por eso se apunta directo a .q-field__control).
  :deep(.q-field__control) {
    background-color: #fff;
    border-radius: 10px;
  }

  :deep(.q-field--focused .q-field__control) {
    border-color: #fff;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.35);
  }

  :deep(.q-field__input) {
    color: #1d1d1d;
  }

  :deep(.q-field__input::placeholder) {
    color: #9e9e9e;
  }

  :deep(.q-field__prepend) {
    color: #2e7d32;
  }

  // Sin línea amarilla: subrayado nativo, autofill del navegador y foco.
  :deep(.q-field__control::after) {
    display: none;
  }

  :deep(input:-webkit-autofill),
  :deep(input:-webkit-autofill:hover),
  :deep(input:-webkit-autofill:focus) {
    -webkit-box-shadow: 0 0 0 1000px #fff inset;
    -webkit-text-fill-color: #1d1d1d;
    caret-color: #2e7d32;
    transition: background-color 9999s ease-out;
  }

  :deep(input) {
    caret-color: #2e7d32;
  }

  :deep(.q-field--focused .q-field__control::before) {
    border-color: #2e7d32;
  }
}

.pestanas {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

// Pestañas sobre verde: píldoras translúcidas; la activa pasa a blanco.
.pestana {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.26);
    border-color: rgba(255, 255, 255, 0.55);
  }

  &--activa {
    background: #fff;
    border-color: #fff;
    color: #1b5e20;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);

    &:hover {
      background: #fff;
      border-color: #fff;
      color: #1b5e20;
    }
  }
}

.pestana__contador {
  background: rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 1px 7px;
  font-size: 12px;
  font-weight: 700;

  .pestana--activa & {
    background: rgba(46, 125, 50, 0.14);
    color: #1b5e20;
  }
}

// --- Lista de pagos -----------------------------------------------------------
.bandeja__lista {
  position: relative;
  flex: 1 1 auto; // crece para que el pie quede al fondo de la tarjeta
  min-height: 140px;
}

.bandeja__progreso {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3;
}

.fila {
  position: relative;
  display: grid;
  // avatar · referencia · estado (columna fija 110px) · meta a la derecha.
  // Las acciones se superponen al hover (estilo Gmail).
  grid-template-columns: 40px minmax(0, 1fr) 110px auto;
  align-items: center;
  gap: 14px;
  padding: 14px 16px 14px 13px;
  border-left: 3px solid transparent;
  border-bottom: 1px solid #eaf2ea;
  transition: background 0.15s ease;

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: rgba(46, 125, 50, 0.06);
  }
}

// Barra lateral según estado: mismo color que el chip.
.fila--pendiente {
  border-left-color: #f59e0b;
}

.fila--confirmado {
  border-left-color: #2e7d32;
}

.fila--fallido {
  border-left-color: #e53935;
}

.fila__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fila__cuerpo {
  min-width: 0;
}

.fila__asunto {
  font-size: 14.5px;
  font-weight: 700;
  color: $texto-principal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fila__destino {
  margin-top: 3px;
  font-size: 12.5px;
  color: #9e9e9e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fila__tipo {
  font-weight: 600;
}

.fila__sep {
  margin: 0 5px;
  color: #bdbdbd;
}

.fila__correo {
  font-family: inherit; // nunca monoespaciada
}

// Vista previa en gris claro: llena la fila sin competir con la referencia.
.fila__preview {
  color: #b0bec5;
}

// Referencia según estado: pendientes destacan, confirmadas suavizan,
// fallidas en rojo.
.fila--confirmado .fila__asunto {
  color: #455a64;
  font-weight: 600;
}

.fila--fallido .fila__asunto {
  color: #b71c1c;
}

// Chip de estado: columna fija, todos miden igual y el texto va centrado.
.fila__estado {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 26px;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.fila__punto {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

// Meta: fecha y monto, alineados al borde derecho.
.fila__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 132px;
  text-align: right;
  margin-left: 120px; // corre el chip a la izquierda y la fecha al borde
}

.fila__fecha {
  font-size: 12.5px;
  color: $texto-secundario;
}

// Monto en verde (dato protagonista de esta vista).
.fila__monto {
  font-size: 12.5px;
  font-weight: 700;
  color: #1b5e20;
}

// Acciones: aparecen al hover. SIN cuadro blanco: la fecha y el monto son
// los protagonistas, así que se desvanecen ellos al pasar el mouse y los
// botones ocupan su lugar (nada queda tapado por un rectángulo blanco).
.fila__acciones {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.fila:hover .fila__acciones,
.fila:focus-within .fila__acciones {
  opacity: 1;
  pointer-events: auto;
}

// Solo las filas CON acciones desvanecen su meta al hover
// (en Confirmados/Fallidos la fecha y el monto nunca se ocultan).
.fila--pendiente .fila__meta {
  transition: opacity 0.15s ease;
}

.fila--pendiente:hover .fila__meta,
.fila--pendiente:focus-within .fila__meta {
  opacity: 0;
}

@media (hover: none) {
  // Sin hover (táctil): las acciones van en su propia zona derecha para no
  // encimarse con la fecha, y la meta queda visible todo el tiempo.
  .fila {
    padding-right: 130px;
  }

  .fila__acciones {
    opacity: 1;
    pointer-events: auto;
  }

  .fila--pendiente .fila__meta {
    opacity: 1;
  }
}

// --- Estado vacío -------------------------------------------------------------
.bandeja__vacia {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 18px;
}

// --- Pie: paginación ----------------------------------------------------------
.bandeja__pie {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid #e3eee3;
  background: #fff;
  flex-shrink: 0;
}

.pie__paginas,
.pie__rango {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pie__texto {
  font-size: 13px;
  color: $texto-secundario;
}

.pie__select {
  min-width: 88px;
}

// --- Diálogo "Registrar pago" (mismo estilo que "Nueva notificación") ---------
.dlg-pago {
  width: 560px;
  max-width: 95vw;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 24px 60px rgba(27, 94, 32, 0.32);
}

.dlg-pago__cabecera {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  overflow: hidden;
  color: #fff;
  background-image: linear-gradient(135deg, #43a047 0%, #2e7d32 55%, #1b5e20 100%);
}

.dlg-pago__decoracion {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.09);
  pointer-events: none;
}

.dlg-pago__decoracion--1 {
  width: 170px;
  height: 170px;
  right: -40px;
  top: -85px;
}

.dlg-pago__decoracion--2 {
  width: 110px;
  height: 110px;
  right: 110px;
  bottom: -70px;
  background: rgba(255, 255, 255, 0.06);
}

.dlg-pago__icono {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.dlg-pago__textos {
  position: relative;
  min-width: 0;
}

.dlg-pago__titulo {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}

.dlg-pago__subtitulo {
  margin-top: 2px;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.85);
}

.dlg-pago__cerrar {
  position: relative;
}

.dlg-pago__cuerpo {
  padding: 18px 22px 0;
  background-image: linear-gradient(180deg, #f3faf3 0%, #ffffff 130px);
}

.dlg-pago__seccion-titulo {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 10px;
  color: #2e7d32;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.dlg-pago__linea {
  flex: 1;
  height: 1px;
  background-image: linear-gradient(90deg, rgba(46, 125, 50, 0.35), rgba(46, 125, 50, 0.04));
}

.dlg-pago__campo {
  margin-bottom: 12px;
}

// Nota informativa (reemplaza el banner azul) en clave verde.
.dlg-pago__nota {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 13px;
  border-radius: 10px;
  border: 1px solid #d7ead7;
  border-left: 3px solid #2e7d32;
  background: #f4faf4;
  font-size: 12.5px;
  line-height: 1.5;
  color: #455a64;

  .q-icon {
    color: #2e7d32;
    margin-top: 1px;
  }

  strong {
    color: #1b5e20;
  }
}

// Campos: esquinas redondeadas, iconos verdes y foco con halo.
.dlg-pago {
  :deep(.q-field--outlined .q-field__control) {
    border-radius: 10px;
  }

  :deep(.q-field--outlined.q-field--focused .q-field__control) {
    border-color: #2e7d32;
    box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.15);
  }

  :deep(.q-field__prepend) {
    padding-right: 6px;
    color: #2e7d32;
  }
}

.dlg-pago__pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px -22px 0;
  padding: 14px 22px 18px;
  background: #fff;
  border-top: 1px solid #e8f1e8;
}

.dlg-pago__pista {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #9e9e9e;
}

.dlg-pago__acciones {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.dlg-pago__cancelar {
  padding: 8px 14px;
  border-radius: 8px;
  color: #455a64;
  font-weight: 600;
}

// Botón "Registrar pago": BLANCO con texto y borde verdes (igual que "Encolar").
.dlg-pago__guardar {
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  font-weight: 700;
  background: #fff !important;
  background-image: none !important;
  color: #1b5e20 !important;
  border: 1px solid #2e7d32;
  box-shadow: 0 6px 16px rgba(46, 125, 50, 0.18);
}

.dlg-pago__guardar:hover {
  background: #f0f8f0 !important;
  color: #1b5e20 !important;
}

// --- Responsive ---------------------------------------------------------------
@media (max-width: 700px) {
  .fila {
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 10px;
    padding-right: 16px;
  }

  .fila__estado {
    grid-column: 2;
    width: 110px;
    justify-self: start;
  }

  .fila__meta {
    grid-column: 2;
    align-items: flex-start;
    text-align: left;
    min-width: 0;
    margin-left: 0;
  }

  .fila__acciones {
    position: static;
    transform: none;
    padding: 0;
    background-image: none;
    grid-column: 2;
    justify-content: flex-start;
    opacity: 1;
    pointer-events: auto;
    min-width: 0;
  }
}
</style>
