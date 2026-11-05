<script setup>
/**
 * /views/CotizacionesView.vue
 * Cotizaciones: se generan desde una solicitud con ítems de parámetros
 * (cantidad × precio). Estados: borrador → enviada → aceptada / rechazada.
 */
import { computed, onMounted, ref } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'

import { get, post, patch } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { formatDate } from '@/utils/formatDate'
import { seleccionRequerida } from '@/utils/reglas'

const general = useGeneralStore()
const { notificarOk, notificarError } = useNotificar()

const ESTADOS = [
  { label: 'Borrador', value: 'borrador' },
  { label: 'Enviada', value: 'enviada' },
  { label: 'Envío fallido', value: 'envio_fallido' },
  { label: 'Aceptada', value: 'aceptada' },
  { label: 'Rechazada', value: 'rechazada' },
]
const ESTADO_COLOR = { borrador: 'grey-4', enviada: 'blue-2', envio_fallido: 'red-2', aceptada: 'green-2', rechazada: 'orange-2' }
const ESTADO_TEXTO = { borrador: 'grey-9', enviada: 'blue-9', envio_fallido: 'red-10', aceptada: 'green-10', rechazada: 'orange-10' }

const formatPeso = (v) => Number(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const columnas = [
  { name: 'numero', label: 'N°', field: 'numero', align: 'left', sortable: true },
  { name: 'cliente', label: 'Cliente', field: (row) => row.solicitud_id?.cliente_id?.nombre || '', align: 'left', sortable: true },
  { name: 'items', label: 'Parámetros', field: 'items', align: 'center' },
  { name: 'total', label: 'Total', field: 'total', align: 'right', sortable: true, format: (v) => formatPeso(v) },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
  { name: 'fecha_creacion', label: 'Generada', field: 'fecha_creacion', align: 'left', sortable: true, format: (v) => formatDate(v) },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'right' },
]

const cotizaciones = ref([])
const solicitudes = ref([])
const parametros = ref([])
const cargando = ref(false)
const error = ref(null)

// Solo se cotizan solicitudes que no están pagadas/rechazadas.
const opcionesSolicitud = computed(() =>
  solicitudes.value
    .filter((s) => !['pagada', 'rechazada'].includes(s.estado))
    .map((s) => ({ label: `${s.cliente_id?.nombre || 'Cliente'} · ${s.descripcion}`, value: s._id })),
)
const opcionesParametro = computed(() => parametros.value.map((p) => ({ label: `${p.nombre} (${formatPeso(p.precio)})`, value: p._id })))

const cargar = async () => {
  cargando.value = true
  error.value = null
  try {
    const [c, s, p] = await Promise.all([get('/cotizaciones'), get('/solicitudes'), get('/parametros?activos=true')])
    cotizaciones.value = c
    solicitudes.value = s
    parametros.value = p
    general.marcarSincronizacion()
  } catch (e) {
    error.value = e.mensaje
    notificarError(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

// --- Formulario --------------------------------------------------------------
const dialogo = ref(false)
const guardando = ref(false)
const formularioRef = ref(null)

const formularioVacio = () => ({ solicitud_id: null, items: [{ parametro_id: null, cantidad: 1 }] })
const formulario = ref(formularioVacio())

const abrirCreacion = () => {
  formulario.value = formularioVacio()
  dialogo.value = true
}

const agregarItem = () => {
  formulario.value.items.push({ parametro_id: null, cantidad: 1 })
}

const quitarItem = (index) => {
  if (formulario.value.items.length > 1) formulario.value.items.splice(index, 1)
}

const precioDe = (parametro_id) => Number(parametros.value.find((p) => p._id === parametro_id)?.precio) || 0

const subtotalDe = (item) => precioDe(item.parametro_id) * (Number(item.cantidad) || 0)

const totalForm = computed(() => formulario.value.items.reduce((acc, item) => acc + subtotalDe(item), 0))

const guardar = async () => {
  guardando.value = true
  try {
    const respuesta = await post('/cotizaciones', {
      solicitud_id: formulario.value.solicitud_id,
      items: formulario.value.items.map((item) => ({
        parametro_id: item.parametro_id,
        cantidad: Number(item.cantidad),
      })),
    })

    notificarOk(`Cotización N° ${respuesta.datos.numero} generada`)
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
const cotizacionParaEstado = ref(null)
const estadoNuevo = ref('borrador')

const abrirCambioEstado = (cotizacion) => {
  cotizacionParaEstado.value = cotizacion
  estadoNuevo.value = cotizacion.estado
  dialogoEstado.value = true
}

const guardarEstado = async () => {
  cambiando.value = true
  try {
    const respuesta = await patch(`/cotizaciones/${cotizacionParaEstado.value._id}/estado`, { estado: estadoNuevo.value })
    notificarOk(respuesta.mensaje)
    dialogoEstado.value = false
    await cargar()
  } catch (e) {
    notificarError(e)
  } finally {
    cambiando.value = false
  }
}
</script>

<template>
  <q-page>
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Cotizaciones"
        subtitulo="Cotizaciones generadas desde las solicitudes"
        icono="request_quote"
      >
        <template #acciones>
          <q-btn unelevated no-caps color="primary" icon="add" label="Generar cotización" @click="abrirCreacion" />
        </template>
      </EncabezadoPagina>

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" @click="cargar" /></template>
      </q-banner>

      <TablaDatos :filas="cotizaciones" :columnas="columnas" :cargando="cargando" mensaje-vacio="Aún no hay cotizaciones generadas">
        <template #body-cell-numero="celda">
          <q-td :props="celda"><span class="mono text-weight-bold text-primary">#{{ celda.row.numero }}</span></q-td>
        </template>

        <template #body-cell-items="celda">
          <q-td :props="celda" class="text-center">
            <q-badge color="green-1" text-color="green-10" :label="`${celda.row.items.length} parámetro(s)`" />
          </q-td>
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
            <q-btn flat dense round size="sm" icon="swap_horiz" color="info" class="action-secondary" @click="abrirCambioEstado(celda.row)">
              <q-tooltip>Cambiar estado</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </TablaDatos>
    </div>

    <!-- Formulario: generar cotización -->
    <q-dialog v-model="dialogo" persistent @show="formularioRef?.resetValidation()">
      <q-card class="dialog-card" style="width: 720px">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="request_quote" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Generar cotización</div>
            <div class="text-caption text-green-2">Parámetros, cantidades y total</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-form ref="formularioRef" greedy @submit="guardar">
          <q-card-section class="q-gutter-md">
            <q-select
              v-model="formulario.solicitud_id"
              outlined dense :options="opcionesSolicitud" emit-value map-options label="Solicitud *"
              :rules="[seleccionRequerida('la solicitud')]" lazy-rules
            >
              <template #prepend><q-icon name="assignment" /></template>
            </q-select>

            <div class="section-box">
              <div class="section-box__title">
                <q-icon name="tune" size="18px" class="q-mr-sm" />
                Parámetros a cotizar
              </div>
              <div class="q-pa-md q-gutter-sm">
                <div v-for="(item, index) in formulario.items" :key="index" class="row items-center q-col-gutter-sm">
                  <div class="col-12 col-sm-6">
                    <q-select
                      v-model="item.parametro_id"
                      outlined dense :options="opcionesParametro" emit-value map-options label="Parámetro *"
                      :rules="[seleccionRequerida('el parámetro')]" lazy-rules
                    />
                  </div>
                  <div class="col-6 col-sm-3">
                    <q-input
                      v-model.number="item.cantidad"
                      outlined dense type="number" label="Cantidad *" min="1"
                      :rules="[(v) => Number(v) >= 1 || 'Mínimo 1']" lazy-rules
                    />
                  </div>
                  <div class="col-5 col-sm-2">
                    <div class="data-label">Subtotal</div>
                    <div class="data-value mono">{{ formatPeso(subtotalDe(item)) }}</div>
                  </div>
                  <div class="col-1 col-sm-1 text-right">
                    <q-btn flat dense round size="sm" icon="delete_outline" color="negative" @click="quitarItem(index)">
                      <q-tooltip>Quitar</q-tooltip>
                    </q-btn>
                  </div>
                </div>

                <q-btn flat dense no-caps color="primary" icon="add" label="Agregar parámetro" @click="agregarItem" />
              </div>
            </div>

            <div class="row justify-end items-center q-gutter-x-md">
              <div class="data-label q-mb-none">Total</div>
              <div class="text-h6 mono text-primary">{{ formatPeso(totalForm) }}</div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
            <q-btn unelevated no-caps type="submit" color="primary" class="btn-ok" label="Generar cotización" :loading="guardando" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Cambio de estado -->
    <q-dialog v-model="dialogoEstado" persistent>
      <q-card class="dialog-card">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="swap_horiz" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Cambiar estado</div>
            <div class="text-caption text-green-2">Cotización #{{ cotizacionParaEstado?.numero }}</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-select v-model="estadoNuevo" outlined dense :options="ESTADOS" emit-value map-options label="Estado *" />
          <q-banner v-if="estadoNuevo === 'aceptada'" dense class="bg-green-1 text-green-10 rounded-borders">
            <template #avatar><q-icon name="info" /></template>
            Al aceptar, la solicitud pasa a estado <strong>aceptada</strong> y podrá registrarse el pago.
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
          <q-btn unelevated no-caps color="primary" label="Guardar estado" :loading="cambiando" @click="guardarEstado" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
