<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="col">
        <div class="text-h5 text-weight-bold">Muestras</div>
        <div class="text-body2 text-grey">{{ muestras.length }} muestras registradas</div>
      </div>
      <q-select
        v-model="filtroEstado"
        :options="estadosMuestra"
        emit-value
        map-options
        dense
        outlined
        clearable
        label="Estado"
        style="min-width: 160px"
      />
      <q-input v-model="busqueda" outlined dense placeholder="Buscar codigo o nombre..." clearable style="min-width: 230px">
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>
      <q-btn color="primary" icon="add" label="Recepcionar muestra" no-caps @click="abrirCrear" />
    </div>

    <ErrorBanner :error="error" class="q-mb-md" />

    <q-table
      :rows="muestrasFiltradas"
      :columns="columnas"
      row-key="_id"
      :loading="cargando"
      flat
      bordered
      rows-per-page-label="Filas por pagina"
      :rows-per-page-options="[10, 20, 50]"
      no-data-label="No hay muestras con estos filtros"
    >
      <template v-slot:body-codigo="props">
        <span v-if="props.row.codigo" class="text-mono text-weight-medium">{{ props.row.codigo }}</span>
        <span v-else class="text-grey">Sin generar</span>
      </template>
      <template v-slot:body-cliente="props">
        {{ props.row.cliente?.nombre || '—' }}
      </template>
      <template v-slot:body-cantidad="props">
        {{ props.row.cantidad }} {{ props.row.unidad }}
      </template>
      <template v-slot:body-estado="props">
        <EstadoChip :estado="props.row.estado" tipo="muestra" />
      </template>
      <template v-slot:body-acciones="props">
        <q-btn flat dense round icon="visibility" color="primary" size="sm" @click="verDetalle(props.row)">
          <q-tooltip>Ver detalle</q-tooltip>
        </q-btn>
        <q-btn
          v-if="props.row.estado === 'pendiente'"
          flat
          dense
          round
          icon="check_circle"
          color="positive"
          size="sm"
          @click="cambiarEstado(props.row, 'aceptada')"
        >
          <q-tooltip>Aceptar (genera codigo y seguimiento)</q-tooltip>
        </q-btn>
        <q-btn
          v-if="props.row.estado === 'pendiente'"
          flat
          dense
          round
          icon="cancel"
          color="negative"
          size="sm"
          @click="abrirRechazo(props.row)"
        >
          <q-tooltip>Rechazar (motivo obligatorio)</q-tooltip>
        </q-btn>
        <q-btn
          v-if="props.row.estado === 'aceptada'"
          flat
          dense
          round
          icon="science"
          color="orange"
          size="sm"
          @click="cambiarEstado(props.row, 'en_analisis')"
        >
          <q-tooltip>Iniciar analisis</q-tooltip>
        </q-btn>
        <q-btn
          v-if="props.row.estado === 'en_analisis'"
          flat
          dense
          round
          icon="task_alt"
          color="teal"
          size="sm"
          @click="cambiarEstado(props.row, 'finalizada')"
        >
          <q-tooltip>Finalizar</q-tooltip>
        </q-btn>
        <q-btn
          v-if="props.row.estado === 'pendiente'"
          flat
          dense
          round
          icon="delete"
          color="negative"
          size="sm"
          @click="confirmarEliminar(props.row)"
        >
          <q-tooltip>Eliminar (solo pendientes)</q-tooltip>
        </q-btn>
      </template>
    </q-table>

    <!-- Dialogo recepcion -->
    <q-dialog v-model="dialogo" persistent>
      <q-card style="min-width: 520px; max-width: 720px">
        <q-card-section class="text-h6">Recepcion de muestra</q-card-section>

        <q-card-section class="q-gutter-md">
          <ErrorBanner :error="errorFormulario" />

          <q-select
            v-model="form.solicitud"
            :options="opcionesSolicitudes"
            emit-value
            map-options
            dense
            outlined
            label="Solicitud de origen *"
            :rules="[(v) => !!v || 'La solicitud es obligatoria']"
          />

          <q-input
            v-model="form.nombre_muestra"
            label="Nombre de la muestra *"
            outlined
            dense
            :rules="[
              (v) => !!v || 'El nombre es obligatorio',
              (v) => (v || '').length <= 150 || 'Maximo 150 caracteres'
            ]"
          />

          <q-input
            v-model="form.descripcion"
            type="textarea"
            label="Descripcion *"
            outlined
            autogrow
            :rules="[
              (v) => !!v || 'La descripcion es obligatoria',
              (v) => (v || '').length <= 2000 || 'Maximo 2000 caracteres'
            ]"
          />

          <div class="row q-col-gutter-md">
            <div class="col-4">
              <q-select
                v-model="form.tipo_fisico"
                :options="[
                  { label: 'Solido', value: 'solido' },
                  { label: 'Liquido', value: 'liquido' }
                ]"
                map-options
                emit-value
                dense
                outlined
                label="Tipo fisico *"
              />
            </div>
            <div class="col-4">
              <q-input
                v-model.number="form.cantidad"
                type="number"
                dense
                outlined
                label="Cantidad *"
                min="0"
                :rules="[(v) => (v !== null && v >= 0) || 'Requerida']"
              />
            </div>
            <div class="col-4">
              <q-select
                v-model="form.unidad"
                :options="['g', 'ml']"
                dense
                outlined
                label="Unidad *"
              />
            </div>
          </div>

          <q-banner v-if="form.cantidad > 0 && form.cantidad < 300" dense class="bg-amber-1 text-amber-9" rounded>
            La cantidad es menor a 300 {{ form.unidad }}: se registra como advertencia, no bloquea la recepcion.
          </q-banner>

          <q-select
            v-model="form.parametros"
            :options="opcionesParametros"
            multiple
            use-chips
            dense
            outlined
            label="Parametros de analisis"
          />

          <q-input v-model="form.ubicacion" label="Ubicacion (inventario)" outlined dense :rules="[
            (v) => (v || '').length <= 150 || 'Maximo 150 caracteres'
          ]" />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup no-caps />
          <q-btn color="primary" label="Registrar recepcion" :loading="guardando" @click="guardar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialogo rechazo (motivo obligatorio) -->
    <q-dialog v-model="dialogoRechazo" persistent>
      <q-card style="min-width: 400px; max-width: 520px">
        <q-card-section class="text-h6">Rechazar muestra</q-card-section>
        <q-card-section class="q-gutter-sm">
          <div class="text-body2">
            Muestra <strong>{{ muestraRechazo?.nombre_muestra }}</strong> (cliente:
            {{ muestraRechazo?.cliente?.nombre || '—' }}).
          </div>
          <q-input
            v-model="motivoRechazo"
            type="textarea"
            outlined
            label="Motivo de rechazo *"
            autogrow
            :rules="[
              (v) => !!v || 'El motivo es obligatorio al rechazar',
              (v) => (v || '').length <= 300 || 'Maximo 300 caracteres'
            ]"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup no-caps />
          <q-btn color="negative" label="Confirmar rechazo" :loading="guardando" @click="confirmarRechazo" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialogo detalle -->
    <q-dialog v-model="dialogoDetalle">
      <q-card style="min-width: 520px; max-width: 720px">
        <q-card-section class="text-h6 row items-center">
          <span>Detalle de la muestra</span>
          <EstadoChip v-if="seleccionada" :estado="seleccionada.estado" tipo="muestra" class="q-ml-sm" />
        </q-card-section>

        <q-card-section v-if="seleccionada" class="q-gutter-sm">
          <div class="row">
            <div class="col-5 text-grey-7">Codigo</div>
            <div class="col-7">
              <span v-if="seleccionada.codigo" class="text-mono text-weight-medium">{{ seleccionada.codigo }}</span>
              <span v-else class="text-grey">Se genera al aceptar la muestra</span>
            </div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Codigo de seguimiento</div>
            <div class="col-7">
              <span v-if="seleccionada.codigo_seguimiento" class="text-mono text-caption">{{ seleccionada.codigo_seguimiento }}</span>
              <span v-else class="text-grey">Se genera al aceptar la muestra</span>
            </div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Cliente</div>
            <div class="col-7">{{ seleccionada.cliente?.nombre || '—' }}</div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Solicitud</div>
            <div class="col-7">{{ seleccionada.solicitud?._id || '—' }}</div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Nombre</div>
            <div class="col-7">{{ seleccionada.nombre_muestra }}</div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Descripcion</div>
            <div class="col-7">{{ seleccionada.descripcion }}</div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Tipo / cantidad</div>
            <div class="col-7">{{ seleccionada.tipo_fisico }} · {{ seleccionada.cantidad }} {{ seleccionada.unidad }}</div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Ubicacion</div>
            <div class="col-7">{{ seleccionada.ubicacion || '—' }}</div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Parametros</div>
            <div class="col-7">
              <q-chip
                v-for="p in seleccionada.parametros || []"
                :key="p._id"
                dense
                size="sm"
                color="primary"
                text-color="white"
              >
                {{ p.nombre }}
              </q-chip>
              <span v-if="!(seleccionada.parametros || []).length" class="text-grey">—</span>
            </div>
          </div>
          <div v-if="seleccionada.estado === 'rechazada'" class="row">
            <div class="col-5 text-grey-7">Motivo de rechazo</div>
            <div class="col-7 text-negative">{{ seleccionada.motivo_rechazo || '—' }}</div>
          </div>
          <div class="row">
            <div class="col-5 text-grey-7">Fecha de recepcion</div>
            <div class="col-7">{{ formatearFecha(seleccionada.fecha_recepcion) }}</div>
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

const muestras = ref([])
const solicitudes = ref([])
const parametros = ref([])
const cargando = ref(true)
const error = ref(null)

const busqueda = ref('')
const filtroEstado = ref(null)

const dialogo = ref(false)
const guardando = ref(false)
const errorFormulario = ref(null)

const dialogoRechazo = ref(false)
const muestraRechazo = ref(null)
const motivoRechazo = ref('')

const dialogoDetalle = ref(false)
const seleccionada = ref(null)

const estadosMuestra = [
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Aceptada', value: 'aceptada' },
  { label: 'Rechazada', value: 'rechazada' },
  { label: 'En analisis', value: 'en_analisis' },
  { label: 'Finalizada', value: 'finalizada' }
]

const formVacio = () => ({
  solicitud: null,
  nombre_muestra: '',
  descripcion: '',
  tipo_fisico: 'solido',
  cantidad: 0,
  unidad: 'g',
  parametros: [],
  ubicacion: ''
})
const form = ref(formVacio())

const opcionesSolicitudes = computed(() =>
  solicitudes.value.map((s) => ({
    label: `${s.cliente?.nombre || 'sin cliente'} — ${s.descripcion.slice(0, 60)} (${s.estado})`,
    value: s._id
  }))
)

const opcionesParametros = computed(() =>
  parametros.value.filter((p) => p.activo).map((p) => ({ label: p.nombre, value: p._id }))
)

const columnas = [
  { name: 'codigo', label: 'Codigo', field: 'codigo', align: 'left', sortable: true },
  { name: 'nombre_muestra', label: 'Muestra', field: 'nombre_muestra', align: 'left', sortable: true },
  { name: 'cliente', label: 'Cliente', field: (r) => r.cliente?.nombre, align: 'left', sortable: true },
  { name: 'tipo_fisico', label: 'Tipo', field: 'tipo_fisico', align: 'center' },
  { name: 'cantidad', label: 'Cantidad', field: 'cantidad', align: 'center' },
  { name: 'ubicacion', label: 'Ubicacion', field: 'ubicacion', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
  { name: 'fecha_recepcion', label: 'Recepcion', field: 'fecha_recepcion', align: 'left', format: (v) => formatearFecha(v) },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'center' }
]

const muestrasFiltradas = computed(() => {
  let lista = muestras.value
  if (filtroEstado.value) lista = lista.filter((m) => m.estado === filtroEstado.value)
  const texto = (busqueda.value || '').trim().toLowerCase()
  if (texto) {
    lista = lista.filter(
      (m) =>
        (m.codigo || '').toLowerCase().includes(texto) ||
        (m.codigo_seguimiento || '').toLowerCase().includes(texto) ||
        (m.nombre_muestra || '').toLowerCase().includes(texto)
    )
  }
  return lista
})

async function cargar() {
  cargando.value = true
  error.value = null
  try {
    const [rMuestras, rSolicitudes, rParametros] = await Promise.all([
      api.get('/muestras'),
      api.get('/solicitudes'),
      api.get('/parametros')
    ])
    muestras.value = rMuestras.data.datos || []
    solicitudes.value = rSolicitudes.data.datos || []
    parametros.value = rParametros.data.datos || []
  } catch (e) {
    error.value = e
  } finally {
    cargando.value = false
  }
}

function abrirCrear() {
  form.value = formVacio()
  errorFormulario.value = null
  dialogo.value = true
}

async function guardar() {
  guardando.value = true
  errorFormulario.value = null
  try {
    await api.post('/muestras', form.value)
    $q.notify({ type: 'positive', message: 'Muestra registrada en estado pendiente' })
    dialogo.value = false
    await cargar()
  } catch (e) {
    errorFormulario.value = e
  } finally {
    guardando.value = false
  }
}

function verDetalle(muestra) {
  seleccionada.value = muestra
  dialogoDetalle.value = true
}

/**
 * Transiciones (API.md §3.3):
 * pendiente → aceptada → en_analisis → finalizada,  pendiente → rechazada.
 * Al aceptar el servidor genera `codigo` y `codigo_seguimiento`.
 */
async function cambiarEstado(muestra, nuevoEstado) {
  const etiquetas = {
    aceptada: 'Aceptar la muestra (se generara el codigo y el codigo de seguimiento)',
    en_analisis: 'Iniciar el analisis',
    finalizada: 'Finalizar el analisis'
  }
  $q.dialog({
    title: 'Cambiar estado',
    message: `${etiquetas[nuevoEstado]}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const { data } = await api.patch(`/muestras/${muestra._id}/estado`, { estado: nuevoEstado })
      const indice = muestras.value.findIndex((m) => m._id === muestra._id)
      if (indice !== -1) muestras.value[indice] = data.datos
      $q.notify({ type: 'positive', message: data.mensaje })
      if (data.datos?.codigo) {
        $q.notify({
          type: 'info',
          message: `Codigo ${data.datos.codigo} · Seguimiento ${data.datos.codigo_seguimiento}`,
          timeout: 6000
        })
      }
    } catch (e) {
      $q.notify({ type: 'negative', message: mensajeDeError(e) })
    }
  })
}

function abrirRechazo(muestra) {
  muestraRechazo.value = muestra
  motivoRechazo.value = ''
  dialogoRechazo.value = true
}

async function confirmarRechazo() {
  if (!motivoRechazo.value || !motivoRechazo.value.trim()) {
    $q.notify({ type: 'negative', message: 'El motivo de rechazo es obligatorio' })
    return
  }
  guardando.value = true
  try {
    const { data } = await api.patch(`/muestras/${muestraRechazo.value._id}/estado`, {
      estado: 'rechazada',
      motivo_rechazo: motivoRechazo.value.trim()
    })
    const indice = muestras.value.findIndex((m) => m._id === data.datos._id)
    if (indice !== -1) muestras.value[indice] = data.datos
    dialogoRechazo.value = false
    $q.notify({ type: 'positive', message: data.mensaje })
  } catch (e) {
    $q.notify({ type: 'negative', message: mensajeDeError(e) })
  } finally {
    guardando.value = false
  }
}

function confirmarEliminar(muestra) {
  $q.dialog({
    title: 'Eliminar muestra',
    message: 'Se eliminara logicamente la muestra. Solo se pueden eliminar muestras pendientes.',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/muestras/${muestra._id}`)
      $q.notify({ type: 'positive', message: 'Muestra eliminada correctamente' })
      await cargar()
    } catch (e) {
      $q.notify({ type: 'negative', message: mensajeDeError(e) })
    }
  })
}

onMounted(cargar)
</script>
