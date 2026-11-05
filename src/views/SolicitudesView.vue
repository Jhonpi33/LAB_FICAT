<script setup>
/**
 * /views/SolicitudesView.vue
 * Solicitudes de servicio. El tipo de cliente (interno/externo) lo deriva el
 * backend a partir del cliente seleccionado (RF-003).
 */
import { computed, onMounted, ref } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'

import { get, post, put, patch } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { formatDate } from '@/utils/formatDate'
import { requerido, seleccionRequerida } from '@/utils/reglas'

const general = useGeneralStore()
const { notificarOk, notificarError } = useNotificar()

const PRIORIDADES = [
  { label: 'Baja', value: 'baja' },
  { label: 'Media', value: 'media' },
  { label: 'Alta', value: 'alta' },
]
const ESTADOS = [
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Cotizada', value: 'cotizada' },
  { label: 'Aceptada', value: 'aceptada' },
  { label: 'Pagada', value: 'pagada' },
  { label: 'Rechazada', value: 'rechazada' },
]
const ESTADO_COLOR = { pendiente: 'grey-4', cotizada: 'blue-2', aceptada: 'green-2', pagada: 'green-9', rechazada: 'red-2' }
const ESTADO_TEXTO = { pendiente: 'grey-9', cotizada: 'blue-9', aceptada: 'green-10', pagada: 'white', rechazada: 'red-10' }

const columnas = [
  { name: 'cliente', label: 'Cliente', field: (row) => row.cliente_id?.nombre || '', align: 'left', sortable: true },
  { name: 'descripcion', label: 'Descripción', field: 'descripcion', align: 'left' },
  { name: 'prioridad', label: 'Prioridad', field: 'prioridad', align: 'center', sortable: true },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
  { name: 'fecha_creacion', label: 'Creada', field: 'fecha_creacion', align: 'left', sortable: true, format: (v) => formatDate(v) },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'right' },
]

const solicitudes = ref([])
const clientes = ref([])
const cargando = ref(false)
const error = ref(null)

const opcionesCliente = computed(() => clientes.value.map((c) => ({ label: c.nombre, value: c._id })))

const cargar = async () => {
  cargando.value = true
  error.value = null
  try {
    const [lista, listaClientes] = await Promise.all([get('/solicitudes'), get('/clientes')])
    solicitudes.value = lista
    clientes.value = listaClientes
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
const solicitudEditando = ref(null)
const formularioRef = ref(null)

const formularioVacio = () => ({
  cliente_id: null,
  descripcion: '',
  prioridad: 'media',
  atencion_inmediata: false,
  motivo_atencion_inmediata: '',
})
const formulario = ref(formularioVacio())

const esEdicion = computed(() => solicitudEditando.value !== null)

const abrirCreacion = () => {
  solicitudEditando.value = null
  formulario.value = formularioVacio()
  dialogo.value = true
}

const abrirEdicion = (solicitud) => {
  solicitudEditando.value = solicitud
  formulario.value = {
    cliente_id: solicitud.cliente_id?._id || null,
    descripcion: solicitud.descripcion,
    prioridad: solicitud.prioridad,
    atencion_inmediata: solicitud.atencion_inmediata,
    motivo_atencion_inmediata: solicitud.motivo_atencion_inmediata || '',
  }
  dialogo.value = true
}

const guardar = async () => {
  guardando.value = true
  try {
    const datos = {
      descripcion: formulario.value.descripcion.trim(),
      prioridad: formulario.value.prioridad,
      atencion_inmediata: formulario.value.atencion_inmediata,
      motivo_atencion_inmediata: formulario.value.motivo_atencion_inmediata.trim(),
    }

    const respuesta = esEdicion.value
      ? await put(`/solicitudes/${solicitudEditando.value._id}`, datos)
      : await post('/solicitudes', { ...datos, cliente_id: formulario.value.cliente_id })

    notificarOk(respuesta.mensaje)
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
const cambiandoEstado = ref(false)
const solicitudParaEstado = ref(null)
const estadoNuevo = ref('pendiente')

const abrirCambioEstado = (solicitud) => {
  solicitudParaEstado.value = solicitud
  estadoNuevo.value = solicitud.estado
  dialogoEstado.value = true
}

const guardarEstado = async () => {
  cambiandoEstado.value = true
  try {
    const respuesta = await patch(`/solicitudes/${solicitudParaEstado.value._id}/estado`, { estado: estadoNuevo.value })
    notificarOk(respuesta.mensaje)
    dialogoEstado.value = false
    await cargar()
  } catch (e) {
    notificarError(e)
  } finally {
    cambiandoEstado.value = false
  }
}
</script>

<template>
  <q-page>
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Solicitudes"
        subtitulo="Solicitudes de servicio de análisis"
        icono="assignment"
      >
        <template #acciones>
          <q-btn unelevated no-caps color="primary" icon="add" label="Nueva solicitud" @click="abrirCreacion" />
        </template>
      </EncabezadoPagina>

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" @click="cargar" /></template>
      </q-banner>

      <TablaDatos :filas="solicitudes" :columnas="columnas" :cargando="cargando" mensaje-vacio="Aún no hay solicitudes registradas">
        <template #body-cell-prioridad="celda">
          <q-td :props="celda" class="text-center">
            <q-badge
              :color="celda.row.prioridad === 'alta' ? 'orange-2' : celda.row.prioridad === 'media' ? 'blue-1' : 'grey-3'"
              :text-color="celda.row.prioridad === 'alta' ? 'orange-9' : celda.row.prioridad === 'media' ? 'blue-9' : 'grey-8'"
              :label="PRIORIDADES.find((p) => p.value === celda.row.prioridad)?.label || celda.row.prioridad"
            />
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
          <q-icon :name="esEdicion ? 'edit' : 'add'" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">{{ esEdicion ? 'Editar solicitud' : 'Nueva solicitud' }}</div>
            <div class="text-caption text-green-2">Qué análisis se necesita</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-form ref="formularioRef" greedy @submit="guardar">
          <q-card-section class="q-gutter-md">
            <q-select
              v-if="!esEdicion"
              v-model="formulario.cliente_id"
              outlined dense :options="opcionesCliente" emit-value map-options
              label="Cliente *" hint="El tipo (interno/externo) se toma del cliente"
              :rules="[seleccionRequerida('el cliente')]" lazy-rules
            >
              <template #prepend><q-icon name="groups" /></template>
            </q-select>

            <q-input
              v-model="formulario.descripcion"
              type="textarea" outlined label="Descripción del análisis *" rows="3"
              :rules="[requerido('La descripción')]" lazy-rules
            />

            <q-select
              v-model="formulario.prioridad"
              outlined dense :options="PRIORIDADES" emit-value map-options label="Prioridad *"
              :rules="[seleccionRequerida('la prioridad')]" lazy-rules
            />

            <q-toggle v-model="formulario.atencion_inmediata" label="Atención inmediata" color="primary" left-label />

            <q-input
              v-if="formulario.atencion_inmediata"
              v-model="formulario.motivo_atencion_inmediata"
              type="textarea" outlined label="Motivo de la atención inmediata" rows="2"
            />
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
            <q-btn
              unelevated no-caps type="submit" color="primary" class="btn-ok"
              :label="esEdicion ? 'Guardar cambios' : 'Registrar solicitud'"
              :loading="guardando"
            />
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
            <div class="text-caption text-green-2">{{ solicitudParaEstado?.descripcion }}</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-select v-model="estadoNuevo" outlined dense :options="ESTADOS" emit-value map-options label="Estado *" />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
          <q-btn unelevated no-caps color="primary" label="Guardar estado" :loading="cambiandoEstado" @click="guardarEstado" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
