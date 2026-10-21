<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="col">
        <div class="text-h5 text-weight-bold">Clientes</div>
        <div class="text-body2 text-grey">{{ clientes.length }} clientes registrados</div>
      </div>
      <q-input
        v-model="busqueda"
        outlined
        dense
        placeholder="Buscar por nombre, correo o documento..."
        clearable
        style="min-width: 280px"
      >
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>
      <q-btn color="primary" icon="add" label="Nuevo cliente" no-caps @click="abrirCrear" />
    </div>

    <ErrorBanner :error="error" class="q-mb-md" />

    <q-table
      :rows="clientesFiltrados"
      :columns="columnas"
      row-key="_id"
      :loading="cargando"
      flat
      bordered
      rows-per-page-label="Filas por pagina"
      :rows-per-page-options="[10, 20, 50]"
      no-data-label="No hay clientes registrados"
    >
      <template v-slot:body-tipo_cliente="props">
        <q-badge :color="props.row.tipo_cliente === 'interno' ? 'teal' : 'deep-purple'" :label="props.row.tipo_cliente" />
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
      <q-card style="min-width: 420px; max-width: 560px">
        <q-card-section class="text-h6">
          {{ editando ? 'Editar cliente' : 'Nuevo cliente' }}
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <ErrorBanner :error="errorFormulario" />

          <q-input v-model="form.nombre" label="Nombre *" outlined dense :rules="reglas.nombre" />

          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-select
                v-model="form.tipo_documento"
                :options="['CC', 'NIT', 'CE', 'TI']"
                label="Tipo de documento *"
                outlined
                dense
              />
            </div>
            <div class="col-6">
              <q-input
                v-model="form.numero_documento"
                label="Numero de documento *"
                outlined
                dense
                :rules="reglas.numero_documento"
              />
            </div>
          </div>

          <q-input v-model="form.email" type="email" label="Correo electronico *" outlined dense :rules="reglas.email" />
          <q-input v-model="form.telefono" label="Telefono" outlined dense />
          <q-input v-model="form.direccion" label="Direccion" outlined dense />

          <q-select
            v-model="form.tipo_cliente"
            :options="[
              { label: 'Interno (SENA)', value: 'interno' },
              { label: 'Externo', value: 'externo' }
            ]"
            map-options
            emit-value
            label="Tipo de cliente *"
            outlined
            dense
            :rules="[(v) => !!v || 'El tipo de cliente es obligatorio']"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup no-caps />
          <q-btn color="primary" :label="editando ? 'Guardar cambios' : 'Crear cliente'" :loading="guardando" @click="guardar" />
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
import { formatearFecha } from '../../utils/format.js'

const $q = useQuasar()

const clientes = ref([])
const cargando = ref(true)
const error = ref(null)
const busqueda = ref('')

const dialogo = ref(false)
const editando = ref(false)
const guardando = ref(false)
const errorFormulario = ref(null)
const idEditando = ref(null)

const formVacio = () => ({
  nombre: '',
  tipo_documento: 'CC',
  numero_documento: '',
  email: '',
  telefono: '',
  direccion: '',
  tipo_cliente: 'externo'
})
const form = ref(formVacio())

const reglas = {
  nombre: [
    (v) => !!v || 'El nombre es obligatorio',
    (v) => (v && v.trim().length >= 3) || 'Minimo 3 caracteres'
  ],
  numero_documento: [
    (v) => !!v || 'El numero de documento es obligatorio',
    (v) => (v || '').length <= 20 || 'Maximo 20 caracteres'
  ],
  email: [
    (v) => !!v || 'El correo es obligatorio',
    (v) => /.+@.+\..+/.test(v) || 'Ingrese un correo valido'
  ]
}

const columnas = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left', sortable: true },
  { name: 'tipo_documento', label: 'Tipo doc.', field: 'tipo_documento', align: 'center' },
  { name: 'numero_documento', label: 'Documento', field: 'numero_documento', align: 'left' },
  { name: 'email', label: 'Correo', field: 'email', align: 'left' },
  { name: 'telefono', label: 'Telefono', field: 'telefono', align: 'left' },
  { name: 'tipo_cliente', label: 'Tipo', field: 'tipo_cliente', align: 'center' },
  { name: 'fecha_creacion', label: 'Creado', field: 'fecha_creacion', align: 'left', format: (v) => formatearFecha(v) },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'center' }
]

const clientesFiltrados = computed(() => {
  const texto = (busqueda.value || '').trim().toLowerCase()
  if (!texto) return clientes.value
  return clientes.value.filter(
    (c) =>
      c.nombre.toLowerCase().includes(texto) ||
      c.email.toLowerCase().includes(texto) ||
      (c.numero_documento || '').toLowerCase().includes(texto)
  )
})

async function cargar() {
  cargando.value = true
  error.value = null
  try {
    const { data } = await api.get('/clientes')
    clientes.value = data.datos || []
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

function abrirEditar(cliente) {
  editando.value = true
  idEditando.value = cliente._id
  form.value = {
    nombre: cliente.nombre,
    tipo_documento: cliente.tipo_documento,
    numero_documento: cliente.numero_documento,
    email: cliente.email,
    telefono: cliente.telefono || '',
    direccion: cliente.direccion || '',
    tipo_cliente: cliente.tipo_cliente
  }
  errorFormulario.value = null
  dialogo.value = true
}

async function guardar() {
  guardando.value = true
  errorFormulario.value = null
  try {
    if (editando.value) {
      await api.put(`/clientes/${idEditando.value}`, form.value)
      $q.notify({ type: 'positive', message: 'Cliente actualizado correctamente' })
    } else {
      await api.post('/clientes', form.value)
      $q.notify({ type: 'positive', message: 'Cliente creado correctamente' })
    }
    dialogo.value = false
    await cargar()
  } catch (e) {
    // Muestra mensaje real del backend (400 validaciones, 409 documento duplicado).
    errorFormulario.value = e
  } finally {
    guardando.value = false
  }
}

function confirmarEliminar(cliente) {
  $q.dialog({
    title: 'Eliminar cliente',
    message: `Se eliminara logicamente a "${cliente.nombre}". Esta accion ya no aparecera en los listados.`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/clientes/${cliente._id}`)
      $q.notify({ type: 'positive', message: 'Cliente eliminado correctamente' })
      await cargar()
    } catch (e) {
      // 409: "No se puede eliminar un cliente con solicitudes registradas"
      $q.notify({ type: 'negative', message: mensajeDeError(e) })
    }
  })
}

onMounted(cargar)
</script>
