<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="col">
        <div class="text-h5 text-weight-bold">Cotizaciones</div>
        <div class="text-body2 text-grey">{{ cotizaciones.length }} cotizaciones registradas</div>
      </div>
      <q-select
        v-model="filtroEstado"
        :options="estadosCotizacion"
        emit-value
        map-options
        dense
        outlined
        clearable
        label="Estado"
        style="min-width: 160px"
      />
      <q-btn color="primary" icon="add" label="Nueva cotizacion" no-caps @click="abrirCrear" />
    </div>

    <ErrorBanner :error="error" class="q-mb-md" />

    <q-table
      :rows="cotizacionesFiltradas"
      :columns="columnas"
      row-key="_id"
      :loading="cargando"
      flat
      bordered
      rows-per-page-label="Filas por pagina"
      :rows-per-page-options="[10, 20, 50]"
      no-data-label="No hay cotizaciones"
    >
      <template v-slot:body-solicitud="props">
        {{ props.row.solicitud?.cliente?.nombre || '—' }}
      </template>
      <template v-slot:body-subtotal="props">
        {{ formatearMoneda(props.row.subtotal) }}
      </template>
      <template v-slot:body-total="props">
        <span class="text-weight-medium">{{ formatearMoneda(props.row.total) }}</span>
      </template>
      <template v-slot:body-estado="props">
        <EstadoChip :estado="props.row.estado" tipo="cotizacion" />
      </template>
      <template v-slot:body-acciones="props">
        <q-btn flat dense round icon="visibility" color="primary" size="sm" @click="verDetalle(props.row)">
          <q-tooltip>Ver detalle y totales</q-tooltip>
        </q-btn>
        <q-btn
          v-if="props.row.estado === 'borrador'"
          flat
          dense
          round
          icon="send"
          color="blue"
          size="sm"
          @click="cambiarEstado(props.row, 'enviada')"
        >
          <q-tooltip>Enviar al cliente</q-tooltip>
        </q-btn>
        <template v-if="props.row.estado === 'enviada'">
          <q-btn flat dense round icon="thumb_up" color="positive" size="sm" @click="cambiarEstado(props.row, 'aceptada')">
            <q-tooltip>Registrar aceptacion</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="thumb_down" color="negative" size="sm" @click="cambiarEstado(props.row, 'rechazada')">
            <q-tooltip>Registrar rechazo</q-tooltip>
          </q-btn>
        </template>
        <q-btn
          v-if="props.row.estado === 'borrador'"
          flat
          dense
          round
          icon="delete"
          color="negative"
          size="sm"
          @click="confirmarEliminar(props.row)"
        >
          <q-tooltip>Eliminar (solo borrador)</q-tooltip>
        </q-btn>
      </template>
    </q-table>

    <!-- Dialogo crear desde solicitud -->
    <q-dialog v-model="dialogo" persistent>
      <q-card style="min-width: 560px; max-width: 760px">
        <q-card-section class="text-h6">Nueva cotizacion</q-card-section>

        <q-card-section class="q-gutter-md">
          <ErrorBanner :error="errorFormulario" />

          <q-select
            v-model="form.solicitud"
            :options="opcionesSolicitudes"
            emit-value
            map-options
            dense
            outlined
            label="Solicitud *"
            :rules="[(v) => !!v || 'La solicitud es obligatoria']"
          />

          <div class="text-subtitle2 q-mt-md">Items de la cotizacion</div>
          <div v-for="(item, indice) in form.items" :key="indice" class="row q-col-gutter-sm items-start q-mb-sm">
            <div class="col-12 col-sm-4">
              <q-select
                v-model="item.parametro"
                :options="opcionesParametros"
                emit-value
                map-options
                dense
                outlined
                label="Parametro *"
                :rules="[(v) => !!v || 'Requerido']"
                @update:model-value="(valor) => alElegirParametro(item, valor)"
              />
            </div>
            <div class="col-4 col-sm-2">
              <q-input v-model.number="item.cantidad" type="number" dense outlined label="Cant. *" min="1" :rules="[
                (v) => (Number.isInteger(v) && v >= 1) || 'Entero >= 1'
              ]" />
            </div>
            <div class="col-4 col-sm-3">
              <q-input v-model.number="item.precio_unitario" type="number" dense outlined label="Precio unit. *" min="0" />
            </div>
            <div class="col-3 col-sm-2">
              <div class="text-caption text-grey-7 q-mt-xs">{{ formatearMoneda(subtotalItem(item)) }}</div>
            </div>
            <div class="col-1 col-sm-1 column flex-center">
              <q-btn flat dense round icon="close" color="negative" size="sm" :disable="form.items.length === 1" @click="form.items.splice(indice, 1)" />
            </div>
          </div>

          <q-btn dense flat color="primary" icon="add" label="Agregar item" no-caps @click="agregarItem" />

          <q-banner dense class="bg-blue-1 text-blue-9" rounded>
            Subtotal: <strong>{{ formatearMoneda(subtotalPrevisto) }}</strong>
            · IVA 19%: <strong>{{ formatearMoneda(ivaPrevisto) }}</strong>
            · Total: <strong>{{ formatearMoneda(totalPrevisto) }}</strong>
            <div class="text-caption">El servidor recalcula subtotal y total; el precio por defecto se toma del catalogo.</div>
          </q-banner>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup no-caps />
          <q-btn color="primary" label="Crear cotizacion" :loading="guardando" @click="guardar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialogo detalle con totales -->
    <q-dialog v-model="dialogoDetalle">
      <q-card style="min-width: 520px; max-width: 720px">
        <q-card-section class="text-h6">
          Cotizacion #{{ seleccionada?.numero }}
          <EstadoChip :estado="seleccionada?.estado" tipo="cotizacion" class="q-ml-sm" />
        </q-card-section>

        <q-card-section v-if="seleccionada" class="q-gutter-sm">
          <div class="row">
            <div class="col-5 text-grey-7">Cliente</div>
            <div class="col-7 text-weight-medium">{{ seleccionada.solicitud?.cliente?.nombre || '—' }}</div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Solicitud</div>
            <div class="col-7">{{ seleccionada.solicitud?.descripcion || '—' }}</div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Creada</div>
            <div class="col-7">{{ formatearFecha(seleccionada.fecha_creacion) }}</div>
          </div>

          <q-table
            :rows="seleccionada.items"
            :columns="columnasItems"
            row-key="descripcion"
            flat
            bordered
            dense
            hide-pagination
            :rows-per-page-options="[0]"
          >
            <template v-slot:body-precio_unitario="props">
              {{ formatearMoneda(props.row.precio_unitario) }}
            </template>
            <template v-slot:body-subtotal="props">
              {{ formatearMoneda(props.row.subtotal) }}
            </template>
          </q-table>

          <div class="row justify-end q-mt-sm">
            <div class="col-6">
              <div class="row justify-between q-pa-sm">
                <span class="text-grey-7">Subtotal</span>
                <span>{{ formatearMoneda(seleccionada.subtotal) }}</span>
              </div>
              <div class="row justify-between q-pa-sm">
                <span class="text-grey-7">IVA 19%</span>
                <span>{{ formatearMoneda(seleccionada.total - seleccionada.subtotal) }}</span>
              </div>
              <div class="row justify-between q-pa-sm text-weight-bold text-primary">
                <span>Total</span>
                <span>{{ formatearMoneda(seleccionada.total) }}</span>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cerrar" v-close-popup no-caps />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import api, { mensajeDeError } from '../../services/api.js'
import ErrorBanner from '../../components/ErrorBanner.vue'
import EstadoChip from '../../components/EstadoChip.vue'
import { formatearFecha, formatearMoneda } from '../../utils/format.js'

const $q = useQuasar()

const cotizaciones = ref([])
const solicitudes = ref([])
const parametros = ref([])
const cargando = ref(true)
const error = ref(null)

const filtroEstado = ref(null)

const dialogo = ref(false)
const guardando = ref(false)
const errorFormulario = ref(null)

const dialogoDetalle = ref(false)
const seleccionada = ref(null)

const estadosCotizacion = [
  { label: 'Borrador', value: 'borrador' },
  { label: 'Enviada', value: 'enviada' },
  { label: 'Aceptada', value: 'aceptada' },
  { label: 'Rechazada', value: 'rechazada' }
]

const form = ref({ solicitud: null, items: [] })

const opcionesSolicitudes = computed(() =>
  solicitudes.value.map((s) => ({
    label: `#${s._id.slice(-6)} · ${s.cliente?.nombre || 'sin cliente'} — ${s.descripcion.slice(0, 60)}`,
    value: s._id
  }))
)

const opcionesParametros = computed(() =>
  parametros.value
    .filter((p) => p.activo)
    .map((p) => ({
      label: `${p.nombre} — ${formatearMoneda(p.precio)} / ${p.unidad || 'und'}`,
      value: p._id
    }))
)

const columnas = [
  { name: 'numero', label: '#', field: 'numero', align: 'center', sortable: true },
  { name: 'solicitud', label: 'Cliente', field: (r) => r.solicitud?.cliente?.nombre, align: 'left', sortable: true },
  { name: 'items', label: 'Items', field: (r) => r.items?.length || 0, align: 'center' },
  { name: 'subtotal', label: 'Subtotal', field: 'subtotal', align: 'right', sortable: true },
  { name: 'total', label: 'Total (IVA incl.)', field: 'total', align: 'right', sortable: true },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
  { name: 'fecha_creacion', label: 'Creada', field: 'fecha_creacion', align: 'left', format: (v) => formatearFecha(v) },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'center' }
]

const columnasItems = [
  { name: 'descripcion', label: 'Parametro', field: (r) => r.parametro?.nombre || r.descripcion, align: 'left' },
  { name: 'cantidad', label: 'Cant.', field: 'cantidad', align: 'center' },
  { name: 'precio_unitario', label: 'Precio unit.', field: 'precio_unitario', align: 'right' },
  { name: 'subtotal', label: 'Subtotal', field: 'subtotal', align: 'right' }
]

const cotizacionesFiltradas = computed(() =>
  filtroEstado.value ? cotizaciones.value.filter((c) => c.estado === filtroEstado.value) : cotizaciones.value
)

const subtotalPrevisto = computed(() =>
  form.value.items.reduce((suma, item) => suma + subtotalItem(item), 0)
)
const ivaPrevisto = computed(() => Math.round(subtotalPrevisto.value * 0.19 * 100) / 100)
const totalPrevisto = computed(() => Math.round((subtotalPrevisto.value + ivaPrevisto.value) * 100) / 100)

function subtotalItem(item) {
  return (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0)
}

function alElegirParametro(item, parametroId) {
  // Precio tomado del catalogo de parametros (API.md §11: si no se envia, lo toma el servidor).
  const parametro = parametros.value.find((p) => p._id === parametroId)
  if (parametro) {
    item.precio_unitario = parametro.precio
    item.descripcion = parametro.nombre
  }
}

function agregarItem() {
  form.value.items.push({ parametro: null, cantidad: 1, precio_unitario: 0, descripcion: '' })
}

async function cargar() {
  cargando.value = true
  error.value = null
  try {
    const [rCotizaciones, rSolicitudes, rParametros] = await Promise.all([
      api.get('/cotizaciones'),
      api.get('/solicitudes'),
      api.get('/parametros')
    ])
    cotizaciones.value = rCotizaciones.data.datos || []
    solicitudes.value = rSolicitudes.data.datos || []
    parametros.value = rParametros.data.datos || []
  } catch (e) {
    error.value = e
  } finally {
    cargando.value = false
  }
}

function abrirCrear() {
  form.value = { solicitud: null, items: [{ parametro: null, cantidad: 1, precio_unitario: 0, descripcion: '' }] }
  errorFormulario.value = null
  dialogo.value = true
}

async function guardar() {
  if (!form.value.solicitud) {
    errorFormulario.value = { response: { data: { mensaje: 'Seleccione la solicitud de origen' } } }
    return
  }
  const itemsInvalidos = form.value.items.some((i) => !i.parametro || !Number.isInteger(i.cantidad) || i.cantidad < 1)
  if (itemsInvalidos) {
    errorFormulario.value = { response: { data: { mensaje: 'Cada item necesita un parametro y una cantidad entera mayor o igual a 1' } } }
    return
  }

  guardando.value = true
  errorFormulario.value = null
  try {
    await api.post('/cotizaciones', {
      solicitud: form.value.solicitud,
      items: form.value.items.map((i) => ({
        parametro: i.parametro,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        descripcion: i.descripcion || undefined
      }))
    })
    $q.notify({ type: 'positive', message: 'Cotizacion creada en borrador' })
    dialogo.value = false
    await cargar()
  } catch (e) {
    errorFormulario.value = e
  } finally {
    guardando.value = false
  }
}

function verDetalle(cotizacion) {
  seleccionada.value = cotizacion
  dialogoDetalle.value = true
}

async function cambiarEstado(cotizacion, nuevoEstado) {
  // Transiciones (API.md §3.2): borrador → enviada → aceptada | rechazada.
  const etiquetas = {
    enviada: 'Enviar al cliente',
    aceptada: 'Registrar como aceptada',
    rechazada: 'Registrar como rechazada'
  }
  $q.dialog({
    title: 'Cambiar estado',
    message: `${etiquetas[nuevoEstado]} la cotizacion #${cotizacion.numero}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const { data } = await api.patch(`/cotizaciones/${cotizacion._id}/estado`, { estado: nuevoEstado })
      const indice = cotizaciones.value.findIndex((c) => c._id === cotizacion._id)
      if (indice !== -1) cotizaciones.value[indice] = data.datos
      $q.notify({ type: 'positive', message: data.mensaje })
    } catch (e) {
      $q.notify({ type: 'negative', message: mensajeDeError(e) })
    }
  })
}

function confirmarEliminar(cotizacion) {
  $q.dialog({
    title: 'Eliminar cotizacion',
    message: `Se eliminara logicamente la cotizacion #${cotizacion.numero}. Solo se pueden eliminar cotizaciones en borrador.`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/cotizaciones/${cotizacion._id}`)
      $q.notify({ type: 'positive', message: 'Cotizacion eliminada correctamente' })
      await cargar()
    } catch (e) {
      $q.notify({ type: 'negative', message: mensajeDeError(e) })
    }
  })
}

onMounted(cargar)
</script>
