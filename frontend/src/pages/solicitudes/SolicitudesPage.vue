<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="col">
        <div class="text-h5 text-weight-bold">Solicitudes</div>
        <div class="text-body2 text-grey">{{ solicitudes.length }} solicitudes registradas</div>
      </div>
      <q-select
        v-model="filtroEstado"
        :options="estadosSolicitud"
        emit-value
        map-options
        dense
        outlined
        clearable
        label="Estado"
        style="min-width: 160px"
      />
      <q-select
        v-model="filtroPrioridad"
        :options="prioridades"
        emit-value
        map-options
        dense
        outlined
        clearable
        label="Prioridad"
        style="min-width: 150px"
      />
      <q-input v-model="busqueda" outlined dense placeholder="Buscar descripcion..." clearable style="min-width: 220px">
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>
      <q-btn color="primary" icon="add" label="Nueva solicitud" no-caps @click="abrirCrear" />
    </div>

    <ErrorBanner :error="error" class="q-mb-md" />

    <q-table
      :rows="solicitudesFiltradas"
      :columns="columnas"
      row-key="_id"
      :loading="cargando"
      flat
      bordered
      rows-per-page-label="Filas por pagina"
      :rows-per-page-options="[10, 20, 50]"
      no-data-label="No hay solicitudes con estos filtros"
    >
      <template v-slot:body-cliente="props">
        {{ props.row.cliente?.nombre || '—' }}
      </template>
      <template v-slot:body-prioridad="props">
        <q-badge :color="coloresPrioridad[props.row.prioridad]" :label="props.row.prioridad" />
      </template>
      <template v-slot:body-atencion_inmediata="props">
        <q-icon v-if="props.row.atencion_inmediata" name="priority_high" color="negative" size="sm">
          <q-tooltip>{{ props.row.motivo_atencion_inmediata || 'Atencion inmediata' }}</q-tooltip>
        </q-icon>
        <span v-else class="text-grey">—</span>
      </template>
      <template v-slot:body-estado="props">
        <EstadoChip :estado="props.row.estado" tipo="solicitud" />
      </template>
      <template v-slot:body-acciones="props">
        <q-btn flat dense round icon="visibility" color="primary" size="sm" @click="verDetalle(props.row)">
          <q-tooltip>Ver detalle</q-tooltip>
        </q-btn>
        <q-btn flat dense round icon="edit" color="primary" size="sm" @click="abrirEditar(props.row)">
          <q-tooltip>Editar</q-tooltip>
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
          <q-tooltip>Enviar al laboratorio</q-tooltip>
        </q-btn>
        <q-btn
          v-if="props.row.estado === 'enviada'"
          flat
          dense
          round
          icon="check_circle"
          color="positive"
          size="sm"
          @click="cambiarEstado(props.row, 'aprobada')"
        >
          <q-tooltip>Aprobar</q-tooltip>
        </q-btn>
        <q-btn flat dense round icon="delete" color="negative" size="sm" @click="confirmarEliminar(props.row)">
          <q-tooltip>Eliminar (borrado logico)</q-tooltip>
        </q-btn>
      </template>
    </q-table>

    <!-- Dialogo crear / editar -->
    <q-dialog v-model="dialogo" persistent>
      <q-card style="min-width: 440px; max-width: 600px">
        <q-card-section class="text-h6">
          {{ editando ? 'Editar solicitud' : 'Nueva solicitud' }}
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <ErrorBanner :error="errorFormulario" />

          <q-select
            v-model="form.cliente"
            :options="opcionesClientes"
            emit-value
            map-options
            use-input
            input-debounce="0"
            dense
            outlined
            label="Cliente *"
            :rules="[(v) => !!v || 'El cliente es obligatorio']"
            @filter="filtrarClientes"
          />

          <q-input
            v-model="form.descripcion"
            type="textarea"
            label="Descripcion del analisis solicitado *"
            outlined
            autogrow
            :rules="[
              (v) => !!v || 'La descripcion es obligatoria',
              (v) => (v || '').length <= 2000 || 'Maximo 2000 caracteres'
            ]"
          />

          <q-select
            v-model="form.prioridad"
            :options="prioridades"
            emit-value
            map-options
            dense
            outlined
            label="Prioridad"
          />

          <q-toggle v-model="form.atencion_inmediata" label="Atencion inmediata" color="negative" />
          <q-input
            v-if="form.atencion_inmediata"
            v-model="form.motivo_atencion_inmediata"
            label="Motivo de atencion inmediata *"
            outlined
            dense
            :rules="[
              (v) => (!!v && v.trim().length > 0) || 'El motivo es obligatorio con atencion inmediata',
              (v) => (v || '').length <= 300 || 'Maximo 300 caracteres'
            ]"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup no-caps />
          <q-btn color="primary" :label="editando ? 'Guardar cambios' : 'Crear solicitud'" :loading="guardando" @click="guardar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialogo detalle -->
    <q-dialog v-model="dialogoDetalle">
      <q-card style="min-width: 440px; max-width: 640px">
        <q-card-section class="text-h6">Detalle de la solicitud</q-card-section>
        <q-card-section v-if="seleccionada" class="q-gutter-sm">
          <div class="row">
            <div class="col-5 text-grey-7">Cliente</div>
            <div class="col-7 text-weight-medium">{{ seleccionada.cliente?.nombre }} ({{ seleccionada.cliente?.numero_documento }})</div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Tipo de cliente</div>
            <div class="col-7">{{ seleccionada.tipo_cliente }}</div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Descripcion</div>
            <div class="col-7">{{ seleccionada.descripcion }}</div>
          </div>
          <div class="row items-center">
            <div class="col-5 text-grey-7">Prioridad</div>
            <div class="col-7"><q-badge :color="coloresPrioridad[seleccionada.prioridad]" :label="seleccionada.prioridad" /></div>
          </div>
          <div class="row items-center">
            <div class="col-5 text-grey-7">Atencion inmediata</div>
            <div class="col-7">
              <span v-if="seleccionada.atencion_inmediata">
                Si — {{ seleccionada.motivo_atencion_inmediata || 'sin motivo registrado' }}
              </span>
              <span v-else>No</span>
            </div>
          </div>
          <div class="row items-center">
            <div class="col-5 text-grey-7">Estado</div>
            <div class="col-7"><EstadoChip :estado="seleccionada.estado" tipo="solicitud" /></div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Creada</div>
            <div class="col-7">{{ formatearFecha(seleccionada.fecha_creacion) }}</div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Ultima actualizacion</div>
            <div class="col-7">{{ formatearFecha(seleccionada.fecha_actualizacion) }}</div>
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
import { formatearFecha } from '../../utils/format.js'

const $q = useQuasar()

const solicitudes = ref([])
const clientes = ref([])
const cargando = ref(true)
const error = ref(null)

const busqueda = ref('')
const filtroEstado = ref(null)
const filtroPrioridad = ref(null)

const dialogo = ref(false)
const editando = ref(false)
const guardando = ref(false)
const errorFormulario = ref(null)
const idEditando = ref(null)

const dialogoDetalle = ref(false)
const seleccionada = ref(null)

const estadosSolicitud = [
  { label: 'Borrador', value: 'borrador' },
  { label: 'Enviada', value: 'enviada' },
  { label: 'Aprobada', value: 'aprobada' }
]

const prioridades = [
  { label: 'Baja', value: 'baja' },
  { label: 'Media', value: 'media' },
  { label: 'Alta', value: 'alta' }
]

const coloresPrioridad = { baja: 'grey', media: 'blue', alta: 'red' }

const formVacio = () => ({
  cliente: null,
  descripcion: '',
  prioridad: 'media',
  atencion_inmediata: false,
  motivo_atencion_inmediata: ''
})
const form = ref(formVacio())

const opcionesClientes = ref([])
const baseOpcionesClientes = ref([])

function refrescarOpcionesClientes() {
  baseOpcionesClientes.value = clientes.value.map((c) => ({
    label: `${c.nombre} (${c.numero_documento})`,
    value: c._id
  }))
  opcionesClientes.value = baseOpcionesClientes.value
}

function filtrarClientes(valor, actualizacion) {
  const texto = (valor || '').toLowerCase()
  opcionesClientes.value = texto
    ? baseOpcionesClientes.value.filter((c) => c.label.toLowerCase().includes(texto))
    : baseOpcionesClientes.value
  actualizacion()
}

const columnas = [
  { name: 'cliente', label: 'Cliente', field: (r) => r.cliente?.nombre, align: 'left', sortable: true },
  { name: 'descripcion', label: 'Descripcion', field: 'descripcion', align: 'left', sortable: true },
  { name: 'tipo_cliente', label: 'Tipo', field: 'tipo_cliente', align: 'center' },
  { name: 'prioridad', label: 'Prioridad', field: 'prioridad', align: 'center', sortable: true },
  { name: 'atencion_inmediata', label: 'Inm.', field: 'atencion_inmediata', align: 'center' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
  { name: 'fecha_creacion', label: 'Creada', field: 'fecha_creacion', align: 'left', format: (v) => formatearFecha(v) },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'center' }
]

const solicitudesFiltradas = computed(() => {
  let lista = solicitudes.value
  if (filtroEstado.value) lista = lista.filter((s) => s.estado === filtroEstado.value)
  if (filtroPrioridad.value) lista = lista.filter((s) => s.prioridad === filtroPrioridad.value)
  const texto = (busqueda.value || '').trim().toLowerCase()
  if (texto) lista = lista.filter((s) => (s.descripcion || '').toLowerCase().includes(texto))
  return lista
})

async function cargar() {
  cargando.value = true
  error.value = null
  try {
    const [rSolicitudes, rClientes] = await Promise.all([api.get('/solicitudes'), api.get('/clientes')])
    solicitudes.value = rSolicitudes.data.datos || []
    clientes.value = rClientes.data.datos || []
    refrescarOpcionesClientes()
  } catch (e) {
    error.value = e
  } finally {
    cargando.value = false
  }
}

function abrirCrear() {
  editando.value = false
  idEditando.value = null
  form.value = formVacio()
  errorFormulario.value = null
  refrescarOpcionesClientes()
  dialogo.value = true
}

function abrirEditar(solicitud) {
  editando.value = true
  idEditando.value = solicitud._id
  form.value = {
    cliente: solicitud.cliente?._id || null,
    descripcion: solicitud.descripcion,
    prioridad: solicitud.prioridad,
    atencion_inmediata: solicitud.atencion_inmediata,
    motivo_atencion_inmediata: solicitud.motivo_atencion_inmediata || ''
  }
  errorFormulario.value = null
  refrescarOpcionesClientes()
  dialogo.value = true
}

async function guardar() {
  guardando.value = true
  errorFormulario.value = null
  const payload = {
    cliente: form.value.cliente,
    descripcion: form.value.descripcion,
    prioridad: form.value.prioridad,
    atencion_inmediata: form.value.atencion_inmediata,
    motivo_atencion_inmediata: form.value.atencion_inmediata ? form.value.motivo_atencion_inmediata : ''
  }
  try {
    if (editando.value) {
      await api.put(`/solicitudes/${idEditando.value}`, payload)
      $q.notify({ type: 'positive', message: 'Solicitud actualizada correctamente' })
    } else {
      await api.post('/solicitudes', payload)
      $q.notify({ type: 'positive', message: 'Solicitud creada en borrador' })
    }
    dialogo.value = false
    await cargar()
  } catch (e) {
    errorFormulario.value = e
  } finally {
    guardando.value = false
  }
}

function verDetalle(solicitud) {
  seleccionada.value = solicitud
  dialogoDetalle.value = true
}

async function cambiarEstado(solicitud, nuevoEstado) {
  // Transiciones permitidas (API.md §3.1): borrador → enviada → aprobada.
  const etiquetas = { enviada: 'Enviar al laboratorio', aprobada: 'Aprobar' }
  $q.dialog({
    title: 'Cambiar estado',
    message: `${etiquetas[nuevoEstado]} la solicitud de "${solicitud.cliente?.nombre}"?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const { data } = await api.patch(`/solicitudes/${solicitud._id}/estado`, { estado: nuevoEstado })
      // PATCH devuelve el recurso completo: refresca la fila sin volver a consultar (API.md §15.8).
      const indice = solicitudes.value.findIndex((s) => s._id === solicitud._id)
      if (indice !== -1) solicitudes.value[indice] = data.datos
      $q.notify({ type: 'positive', message: data.mensaje })
    } catch (e) {
      $q.notify({ type: 'negative', message: mensajeDeError(e) })
    }
  })
}

function confirmarEliminar(solicitud) {
  $q.dialog({
    title: 'Eliminar solicitud',
    message: 'Se eliminara logicamente la solicitud. No se puede eliminar si tiene cotizaciones o muestras.',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/solicitudes/${solicitud._id}`)
      $q.notify({ type: 'positive', message: 'Solicitud eliminada correctamente' })
      await cargar()
    } catch (e) {
      $q.notify({ type: 'negative', message: mensajeDeError(e) })
    }
  })
}

onMounted(cargar)
</script>
