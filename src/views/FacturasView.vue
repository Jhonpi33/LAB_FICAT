<script setup>
/**
 * /views/FacturasView.vue
 * Facturación electrónica (RF-099 a RF-106). Se genera desde un pago
 * confirmado y se emite contra FACTUS SANDBOX (simulado, RNF-017). La
 * respuesta de Factus se guarda pero nunca se expone al cliente.
 */
import { computed, onMounted, ref } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'

import { get, post, patch } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { useConfirmar } from '@/composables/useConfirmar'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import { seleccionRequerida, requerido } from '@/utils/reglas'

const general = useGeneralStore()
const { notificarOk, notificarError } = useNotificar()
const { confirmar } = useConfirmar()

const formatPeso = (v) => Number(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const ESTADOS = [
  { label: 'Generada', value: 'generada' },
  { label: 'Enviada', value: 'enviada' },
  { label: 'Anulada', value: 'anulada' },
  { label: 'Error', value: 'error' },
]
const ESTADO_COLOR = { generada: 'blue-2', enviada: 'green-2', anulada: 'red-2', error: 'orange-2' }
const ESTADO_TEXTO = { generada: 'blue-9', enviada: 'green-10', anulada: 'red-10', error: 'orange-10' }

const columnas = [
  { name: 'numero', label: 'Factura', field: 'numero', align: 'left', sortable: true },
  { name: 'cliente', label: 'Cliente', field: (row) => row.solicitud_id?.cliente_id?.nombre || '', align: 'left' },
  { name: 'pago', label: 'Pago', field: (row) => row.pago_id?.referencia || '', align: 'left' },
  { name: 'valor_total', label: 'Valor', field: 'valor_total', align: 'right', sortable: true, format: (v) => formatPeso(v) },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
  { name: 'fecha_generacion', label: 'Generada', field: 'fecha_generacion', align: 'left', sortable: true, format: (v) => formatDate(v) },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'right' },
]

const facturas = ref([])
const pagos = ref([])
const cargando = ref(false)
const error = ref(null)

// Pagos confirmados que todavía no tienen factura.
const opcionesPago = computed(() =>
  pagos.value
    .filter((p) => p.estado === 'confirmado')
    .filter((p) => !facturas.value.some((f) => f.pago_id?._id === p._id))
    .map((p) => ({
      label: `${p.referencia} · ${formatPeso(p.monto)} · ${p.cotizacion_id?.solicitud_id?.cliente_id?.nombre || ''}`,
      value: p._id,
    })),
)

const cargar = async () => {
  cargando.value = true
  error.value = null
  try {
    const [f, p] = await Promise.all([get('/facturas'), get('/pagos')])
    facturas.value = f
    pagos.value = p
    general.marcarSincronizacion()
  } catch (e) {
    error.value = e.mensaje
    notificarError(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

// --- Generar -----------------------------------------------------------------
const dialogo = ref(false)
const guardando = ref(false)
const pagoSeleccionado = ref(null)

const abrirGenerar = () => {
  pagoSeleccionado.value = null
  dialogo.value = true
}

const generar = async () => {
  guardando.value = true
  try {
    const respuesta = await post('/facturas', { pago_id: pagoSeleccionado.value })
    notificarOk(`Factura ${respuesta.datos.numero} generada (Factus sandbox)`)
    dialogo.value = false
    await cargar()
  } catch (e) {
    notificarError(e)
  } finally {
    guardando.value = false
  }
}

// --- Cambio de estado --------------------------------------------------------
const dialogoEstado = ref(false)
const cambiando = ref(false)
const facturaParaEstado = ref(null)
const estadoNuevo = ref('enviada')
const motivo = ref('')

const abrirCambioEstado = (factura) => {
  facturaParaEstado.value = factura
  estadoNuevo.value = 'enviada'
  motivo.value = ''
  dialogoEstado.value = true
}

const guardarEstado = async () => {
  cambiando.value = true
  try {
    const respuesta = await patch(`/facturas/${facturaParaEstado.value._id}/estado`, {
      estado: estadoNuevo.value,
      motivo: motivo.value.trim(),
    })
    notificarOk(respuesta.mensaje)
    dialogoEstado.value = false
    await cargar()
  } catch (e) {
    notificarError(e)
  } finally {
    cambiando.value = false
  }
}

// --- Ver historial -----------------------------------------------------------
const dialogoHistorial = ref(false)
const facturaVista = ref(null)

const abrirHistorial = (factura) => {
  facturaVista.value = factura
  dialogoHistorial.value = true
}
</script>

<template>
  <q-page>
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Facturación"
        subtitulo="Facturación electrónica · Factus sandbox"
        icono="receipt"
      >
        <template #acciones>
          <q-btn unelevated no-caps color="primary" icon="add" label="Generar factura" @click="abrirGenerar" />
        </template>
      </EncabezadoPagina>

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" @click="cargar" /></template>
      </q-banner>

      <TablaDatos :filas="facturas" :columnas="columnas" :cargando="cargando" mensaje-vacio="Aún no hay facturas generadas">
        <template #body-cell-numero="celda">
          <q-td :props="celda"><span class="mono text-weight-bold text-primary">{{ celda.row.numero }}</span></q-td>
        </template>

        <template #body-cell-pago="celda">
          <q-td :props="celda"><span class="mono">{{ celda.row.pago_id?.referencia }}</span></q-td>
        </template>

        <template #body-cell-estado="celda">
          <q-td :props="celda" class="text-center">
            <q-badge
              :color="ESTADO_COLOR[celda.row.estado] || 'grey-4'"
              :text-color="ESTADO_TEXTO[celda.row.estado] || 'grey-9'"
              :label="ESTADOS.find((e) => e.value === celda.row.estado)?.label || celda.row.estado"
            />
          </q-td>
        </template>

        <template #body-cell-acciones="celda">
          <q-td :props="celda" class="text-right">
            <q-btn flat dense round size="sm" icon="history" color="info" class="action-secondary" @click="abrirHistorial(celda.row)">
              <q-tooltip>Ver historial</q-tooltip>
            </q-btn>
            <q-btn
              v-if="celda.row.estado === 'generada'"
              flat dense round size="sm" icon="arrow_forward" color="primary" class="action-secondary"
              @click="abrirCambioEstado(celda.row)"
            >
              <q-tooltip>Cambiar estado</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </TablaDatos>
    </div>

    <!-- Generar -->
    <q-dialog v-model="dialogo" persistent>
      <q-card class="dialog-card">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="receipt" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Generar factura</div>
            <div class="text-caption text-green-2">Se emite contra Factus en modo sandbox</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-card-section>
          <q-select
            v-model="pagoSeleccionado"
            outlined dense :options="opcionesPago" emit-value map-options label="Pago confirmado *"
            :rules="[seleccionRequerida('el pago')]" lazy-rules
          >
            <template #prepend><q-icon name="payments" /></template>
          </q-select>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
          <q-btn unelevated no-caps color="primary" label="Generar factura" :loading="guardando" @click="generar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Cambio de estado -->
    <q-dialog v-model="dialogoEstado" persistent>
      <q-card class="dialog-card">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="swap_horiz" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Cambiar estado</div>
            <div class="text-caption text-green-2">{{ facturaParaEstado?.numero }}</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-select v-model="estadoNuevo" outlined dense :options="ESTADOS" emit-value map-options label="Estado *" />
          <q-input
            v-if="['anulada', 'error'].includes(estadoNuevo)"
            v-model="motivo"
            type="textarea" outlined label="Motivo" rows="2"
            :rules="[requerido('El motivo')]" lazy-rules
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
          <q-btn unelevated no-caps color="primary" label="Guardar estado" :loading="cambiando" @click="guardarEstado" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Historial -->
    <q-dialog v-model="dialogoHistorial">
      <q-card class="dialog-card" style="width: 640px">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="history" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Historial</div>
            <div class="text-caption text-green-2">{{ facturaVista?.numero }}</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-card-section>
          <q-list separator>
            <q-item v-for="(h, index) in facturaVista?.historial || []" :key="index">
              <q-item-section avatar>
                <q-icon name="timeline" color="primary" />
              </q-item-section>
              <q-item-section>
                <div class="text-weight-bold style-text">{{ h.estado }}</div>
                <div class="text-caption texto-suave">
                  {{ formatDateTime(h.fecha) }} · {{ h.usuario || 'Sistema' }}
                  <template v-if="h.motivo"> · {{ h.motivo }}</template>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>
