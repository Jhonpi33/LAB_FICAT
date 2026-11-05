<script setup>
/**
 * /views/ClientesView.vue
 * CRUD de clientes (internos y externos) del laboratorio.
 */
import { computed, onMounted, ref } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'

import { get, post, put } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { requerido, esEmail, minimo, maximo, seleccionRequerida } from '@/utils/reglas'

const general = useGeneralStore()
const { notificarOk, notificarError } = useNotificar()

const TIPO_DOC = [
  { label: 'CC - Cédula', value: 'CC' },
  { label: 'NIT', value: 'NIT' },
  { label: 'CE - Cédula extranjería', value: 'CE' },
  { label: 'TI - Tarjeta identidad', value: 'TI' },
]
const TIPO_CLIENTE = [
  { label: 'Interno SENA', value: 'interno' },
  { label: 'Externo', value: 'externo' },
]
const TIPO_CLIENTE_LABEL = { interno: 'Interno SENA', externo: 'Externo' }

const columnas = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left', sortable: true },
  { name: 'numero_documento', label: 'Documento', field: 'numero_documento', align: 'left', sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left', sortable: true },
  { name: 'telefono', label: 'Teléfono', field: 'telefono', align: 'left' },
  { name: 'tipo_cliente', label: 'Tipo', field: 'tipo_cliente', align: 'center', sortable: true },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'right' },
]

const clientes = ref([])
const cargando = ref(false)
const error = ref(null)

const cargar = async () => {
  cargando.value = true
  error.value = null
  try {
    clientes.value = await get('/clientes')
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
const clienteEditando = ref(null)
const formularioRef = ref(null)

const formularioVacio = () => ({
  nombre: '',
  tipo_documento: 'CC',
  numero_documento: '',
  email: '',
  telefono: '',
  direccion: '',
  tipo_cliente: 'externo',
})
const formulario = ref(formularioVacio())

const esEdicion = computed(() => clienteEditando.value !== null)

const abrirCreacion = () => {
  clienteEditando.value = null
  formulario.value = formularioVacio()
  dialogo.value = true
}

const abrirEdicion = (cliente) => {
  clienteEditando.value = cliente
  formulario.value = {
    nombre: cliente.nombre,
    tipo_documento: cliente.tipo_documento,
    numero_documento: cliente.numero_documento,
    email: cliente.email,
    telefono: cliente.telefono || '',
    direccion: cliente.direccion || '',
    tipo_cliente: cliente.tipo_cliente,
  }
  dialogo.value = true
}

const guardar = async () => {
  guardando.value = true
  try {
    const datos = {
      nombre: formulario.value.nombre.trim(),
      tipo_documento: formulario.value.tipo_documento,
      numero_documento: formulario.value.numero_documento.trim(),
      email: formulario.value.email.trim(),
      telefono: formulario.value.telefono.trim(),
      direccion: formulario.value.direccion.trim(),
      tipo_cliente: formulario.value.tipo_cliente,
    }

    const respuesta = esEdicion.value
      ? await put(`/clientes/${clienteEditando.value._id}`, datos)
      : await post('/clientes', datos)

    notificarOk(respuesta.mensaje)
    dialogo.value = false
    await cargar()
  } catch (e) {
    notificarError(e)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <q-page>
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Clientes"
        subtitulo="Personas y organizaciones que solicitan análisis"
        icono="groups"
      >
        <template #acciones>
          <q-btn unelevated no-caps color="primary" icon="person_add" label="Nuevo cliente" @click="abrirCreacion" />
        </template>
      </EncabezadoPagina>

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" @click="cargar" /></template>
      </q-banner>

      <TablaDatos :filas="clientes" :columnas="columnas" :cargando="cargando" mensaje-vacio="Aún no hay clientes registrados">
        <template #body-cell-numero_documento="celda">
          <q-td :props="celda">
            <span class="mono">{{ celda.row.tipo_documento }} · {{ celda.row.numero_documento }}</span>
          </q-td>
        </template>

        <template #body-cell-tipo_cliente="celda">
          <q-td :props="celda" class="text-center">
            <q-badge
              :color="celda.row.tipo_cliente === 'interno' ? 'green-2' : 'blue-1'"
              :text-color="celda.row.tipo_cliente === 'interno' ? 'green-10' : 'blue-9'"
              :label="TIPO_CLIENTE_LABEL[celda.row.tipo_cliente] || celda.row.tipo_cliente"
            />
          </q-td>
        </template>

        <template #body-cell-acciones="celda">
          <q-td :props="celda" class="text-right">
            <q-btn flat dense round size="sm" icon="edit" color="primary" class="action-secondary" @click="abrirEdicion(celda.row)">
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </TablaDatos>
    </div>

    <!-- Formulario crear/editar -->
    <q-dialog v-model="dialogo" persistent @show="formularioRef?.resetValidation()">
      <q-card class="dialog-card" style="width: 640px">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon :name="esEdicion ? 'edit' : 'person_add'" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">{{ esEdicion ? 'Editar cliente' : 'Nuevo cliente' }}</div>
            <div class="text-caption text-green-2">Quién solicita el análisis</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-form ref="formularioRef" greedy @submit="guardar">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model="formulario.nombre"
              outlined dense label="Nombre completo / razón social *"
              :rules="[requerido('El nombre'), minimo(3, 'El nombre'), maximo(120, 'El nombre')]"
              lazy-rules
            >
              <template #prepend><q-icon name="person" /></template>
            </q-input>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-5">
                <q-select
                  v-model="formulario.tipo_documento"
                  outlined dense :options="TIPO_DOC" emit-value map-options label="Tipo de documento *"
                  :rules="[seleccionRequerida('el tipo de documento')]" lazy-rules
                />
              </div>
              <div class="col-12 col-sm-7">
                <q-input
                  v-model="formulario.numero_documento"
                  outlined dense label="Número de documento *" input-class="mono"
                  :rules="[requerido('El número de documento'), maximo(30, 'El documento')]" lazy-rules
                />
              </div>
            </div>

            <q-input
              v-model="formulario.email"
              outlined dense type="email" label="Email *"
              :rules="[requerido('El email'), esEmail()]" lazy-rules
            >
              <template #prepend><q-icon name="mail" /></template>
            </q-input>

            <q-input v-model="formulario.telefono" outlined dense label="Teléfono">
              <template #prepend><q-icon name="phone" /></template>
            </q-input>

            <q-input v-model="formulario.direccion" outlined dense label="Dirección">
              <template #prepend><q-icon name="place" /></template>
            </q-input>

            <q-select
              v-model="formulario.tipo_cliente"
              outlined dense :options="TIPO_CLIENTE" emit-value map-options label="Tipo de cliente *"
              :rules="[seleccionRequerida('el tipo de cliente')]" lazy-rules
            >
              <template #prepend><q-icon name="badge" /></template>
            </q-select>
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
            <q-btn
              unelevated no-caps type="submit" color="primary" class="btn-ok"
              :label="esEdicion ? 'Guardar cambios' : 'Registrar cliente'"
              :loading="guardando"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>
