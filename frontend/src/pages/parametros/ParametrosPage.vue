<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="col">
        <div class="text-h5 text-weight-bold">Parametros de analisis</div>
        <div class="text-body2 text-grey">Catalogo de pruebas y precios (COP)</div>
      </div>
      <q-select
        v-model="filtroActivo"
        :options="[
          { label: 'Activos', value: 'true' },
          { label: 'Inactivos', value: 'false' }
        ]"
        emit-value
        map-options
        dense
        outlined
        clearable
        label="Catalogo"
        style="min-width: 140px"
      />
      <q-input v-model="busqueda" outlined dense placeholder="Buscar nombre o descripcion..." clearable style="min-width: 240px">
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>
      <q-btn color="primary" icon="add" label="Nuevo parametro" no-caps @click="abrirCrear" />
    </div>

    <ErrorBanner :error="error" class="q-mb-md" />

    <q-table
      :rows="parametrosFiltrados"
      :columns="columnas"
      row-key="_id"
      :loading="cargando"
      flat
      bordered
      rows-per-page-label="Filas por pagina"
      :rows-per-page-options="[10, 20, 50]"
      no-data-label="No hay parametros en el catalogo"
    >
      <template v-slot:body-precio="props">
        <span class="text-weight-medium">{{ formatearMoneda(props.row.precio) }}</span>
      </template>
      <template v-slot:body-unidad="props">
        {{ props.row.unidad || '—' }}
      </template>
      <template v-slot:body-activo="props">
        <q-toggle
          :model-value="props.row.activo"
          color="positive"
          dense
          @update:model-value="(valor) => cambiarActivo(props.row, valor)"
        />
      </template>
      <template v-slot:body-acciones="props">
        <q-btn flat dense round icon="edit" color="primary" size="sm" @click="abrirEditar(props.row)">
          <q-tooltip>Editar</q-tooltip>
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
          {{ editando ? 'Editar parametro' : 'Nuevo parametro' }}
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <ErrorBanner :error="errorFormulario" />

          <q-input
            v-model="form.nombre"
            label="Nombre *"
            outlined
            dense
            :rules="[
              (v) => !!v || 'El nombre es obligatorio',
              (v) => (v || '').length <= 100 || 'Maximo 100 caracteres'
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
            <div class="col-6">
              <q-input
                v-model.number="form.precio"
                type="number"
                label="Precio (COP) *"
                outlined
                dense
                min="0"
                :rules="[
                  (v) => v !== null && v !== '' || 'El precio es obligatorio',
                  (v) => v >= 0 || 'No puede ser negativo'
                ]"
              />
            </div>
            <div class="col-6">
              <q-input v-model="form.unidad" label="Unidad (%, cP, pH...)" outlined dense :rules="[
                (v) => (v || '').length <= 20 || 'Maximo 20 caracteres'
              ]" />
            </div>
          </div>

          <q-toggle v-model="form.activo" label="Activo en el catalogo" color="positive" />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup no-caps />
          <q-btn color="primary" :label="editando ? 'Guardar cambios' : 'Crear parametro'" :loading="guardando" @click="guardar" />
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
import { formatearMoneda } from '../../utils/format.js'

const $q = useQuasar()

const parametros = ref([])
const cargando = ref(true)
const error = ref(null)

const busqueda = ref('')
const filtroActivo = ref(null)

const dialogo = ref(false)
const editando = ref(false)
const guardando = ref(false)
const errorFormulario = ref(null)
const idEditando = ref(null)

const formVacio = () => ({
  nombre: '',
  descripcion: '',
  precio: 0,
  unidad: '',
  activo: true
})
const form = ref(formVacio())

const columnas = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left', sortable: true },
  { name: 'descripcion', label: 'Descripcion', field: 'descripcion', align: 'left' },
  { name: 'precio', label: 'Precio', field: 'precio', align: 'right', sortable: true },
  { name: 'unidad', label: 'Unidad', field: 'unidad', align: 'center' },
  { name: 'activo', label: 'Activo', field: 'activo', align: 'center' },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'center' }
]

const parametrosFiltrados = computed(() => {
  let lista = parametros.value
  if (filtroActivo.value !== null && filtroActivo.value !== '') {
    lista = lista.filter((p) => String(p.activo) === filtroActivo.value)
  }
  const texto = (busqueda.value || '').trim().toLowerCase()
  if (texto) {
    lista = lista.filter(
      (p) => p.nombre.toLowerCase().includes(texto) || (p.descripcion || '').toLowerCase().includes(texto)
    )
  }
  return lista
})

async function cargar() {
  cargando.value = true
  error.value = null
  try {
    const { data } = await api.get('/parametros')
    parametros.value = data.datos || []
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
  dialogo.value = true
}

function abrirEditar(parametro) {
  editando.value = true
  idEditando.value = parametro._id
  form.value = {
    nombre: parametro.nombre,
    descripcion: parametro.descripcion,
    precio: parametro.precio,
    unidad: parametro.unidad || '',
    activo: parametro.activo
  }
  errorFormulario.value = null
  dialogo.value = true
}

async function guardar() {
  guardando.value = true
  errorFormulario.value = null
  try {
    if (editando.value) {
      await api.put(`/parametros/${idEditando.value}`, form.value)
      $q.notify({ type: 'positive', message: 'Parametro actualizado correctamente' })
    } else {
      await api.post('/parametros', form.value)
      $q.notify({ type: 'positive', message: 'Parametro creado correctamente' })
    }
    dialogo.value = false
    await cargar()
  } catch (e) {
    errorFormulario.value = e
  } finally {
    guardando.value = false
  }
}

async function cambiarActivo(parametro, activo) {
  try {
    const { data } = await api.patch(`/parametros/${parametro._id}/estado`, { activo })
    const indice = parametros.value.findIndex((p) => p._id === parametro._id)
    if (indice !== -1) parametros.value[indice] = data.datos
    $q.notify({ type: 'positive', message: data.mensaje })
  } catch (e) {
    $q.notify({ type: 'negative', message: mensajeDeError(e) })
  }
}

function confirmarEliminar(parametro) {
  $q.dialog({
    title: 'Eliminar parametro',
    message: `Se eliminara logicamente "${parametro.nombre}". No se puede eliminar si ya aparece en cotizaciones.`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/parametros/${parametro._id}`)
      $q.notify({ type: 'positive', message: 'Parametro eliminado correctamente' })
      await cargar()
    } catch (e) {
      $q.notify({ type: 'negative', message: mensajeDeError(e) })
    }
  })
}

onMounted(cargar)
</script>
