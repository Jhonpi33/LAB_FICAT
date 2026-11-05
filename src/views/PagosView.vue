<script setup>
/**
 * /views/PagosView.vue
 * Pagos SIMULADOS (RNF-018): se registran desde una cotización aceptada y su
 * resultado (confirmado / fallido) se simula sin información de tarjeta.
 */
import { computed, onMounted, ref } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'

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

const columnas = [
  { name: 'referencia', label: 'Referencia', field: 'referencia', align: 'left', sortable: true },
  { name: 'cliente', label: 'Cliente', field: (row) => row.cotizacion_id?.solicitud_id?.cliente_id?.nombre || '', align: 'left' },
  { name: 'cotizacion', label: 'Cotización', field: (row) => row.cotizacion_id?.numero || '', align: 'center' },
  { name: 'monto', label: 'Monto', field: 'monto', align: 'right', sortable: true, format: (v) => formatPeso(v) },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
  { name: 'fecha_creacion', label: 'Registrado', field: 'fecha_creacion', align: 'left', sortable: true, format: (v) => formatDate(v) },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'right' },
]

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

// --- Registro de pago --------------------------------------------------------
const dialogo = ref(false)
const guardando = ref(false)
const cotizacionSeleccionada = ref(null)

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
  <q-page>
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Pagos"
        subtitulo="Pagos simulados de las cotizaciones aceptadas"
        icono="payments"
      >
        <template #acciones>
          <q-btn unelevated no-caps color="primary" icon="add" label="Registrar pago" @click="abrirCreacion" />
        </template>
      </EncabezadoPagina>

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" @click="cargar" /></template>
      </q-banner>

      <TablaDatos :filas="pagos" :columnas="columnas" :cargando="cargando" mensaje-vacio="Aún no hay pagos registrados">
        <template #body-cell-referencia="celda">
          <q-td :props="celda"><span class="mono">{{ celda.row.referencia }}</span></q-td>
        </template>

        <template #body-cell-cotizacion="celda">
          <q-td :props="celda" class="text-center"><span class="mono">#{{ celda.row.cotizacion_id?.numero }}</span></q-td>
        </template>

        <template #body-cell-estado="celda">
          <q-td :props="celda" class="text-center">
            <q-badge
              :color="celda.row.estado === 'confirmado' ? 'positive' : celda.row.estado === 'fallido' ? 'negative' : 'grey-6'"
              :label="{ pendiente: 'Pendiente', confirmado: 'Confirmado', fallido: 'Fallido' }[celda.row.estado] || celda.row.estado"
            />
          </q-td>
        </template>

        <template #body-cell-acciones="celda">
          <q-td :props="celda" class="text-right">
            <template v-if="celda.row.estado === 'pendiente'">
              <q-btn flat dense round size="sm" icon="check" color="positive" class="action-secondary" @click="confirmarPago(celda.row)">
                <q-tooltip>Simular confirmación</q-tooltip>
              </q-btn>
              <q-btn flat dense round size="sm" icon="close" color="negative" class="action-secondary" @click="marcarFallido(celda.row)">
                <q-tooltip>Marcar fallido</q-tooltip>
              </q-btn>
            </template>
            <span v-else class="text-caption texto-suave">—</span>
          </q-td>
        </template>
      </TablaDatos>
    </div>

    <!-- Registrar pago -->
    <q-dialog v-model="dialogo" persistent>
      <q-card class="dialog-card">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="payments" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Registrar pago</div>
            <div class="text-caption text-green-2">Pago simulado, sin datos de tarjeta</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-select
            v-model="cotizacionSeleccionada"
            outlined dense :options="opcionesCotizacion" emit-value map-options label="Cotización aceptada *"
            :rules="[seleccionRequerida('la cotización')]" lazy-rules
          >
            <template #prepend><q-icon name="request_quote" /></template>
          </q-select>

          <q-banner dense class="bg-blue-1 text-blue-9 rounded-borders">
            <template #avatar><q-icon name="info" /></template>
            Al confirmar el pago, la solicitud pasa a estado <strong>pagada</strong>.
            El proceso es 100% simulado (RNF-018).
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
          <q-btn unelevated no-caps color="primary" label="Registrar pago" :loading="guardando" @click="guardar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
