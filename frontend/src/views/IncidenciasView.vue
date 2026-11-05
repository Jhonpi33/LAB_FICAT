<script setup>
/**
 * /views/IncidenciasView.vue
 * Incidencias del proceso (RF-063 a RF-074): informativas, demoras y
 * solicitudes de información al cliente. Las respuestas del cliente llegan
 * desde el seguimiento público.
 */
import { computed, onMounted, ref } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'

import { get, post, patch } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import { requerido, seleccionRequerida } from '@/utils/reglas'

const general = useGeneralStore()
const { notificarOk, notificarError } = useNotificar()

const TIPOS = [
  { label: 'Informativa', value: 'informativa' },
  { label: 'Demora', value: 'demora' },
  { label: 'Requiere acción del cliente', value: 'requiere_accion_cliente' },
]
const ESTADOS = [
  { label: 'Abierta', value: 'abierta' },
  { label: 'En revisión', value: 'en_revision' },
  { label: 'Esperando cliente', value: 'esperando_cliente' },
  { label: 'Aprobada', value: 'aprobada' },
  { label: 'Cerrada', value: 'cerrada' },
]
const ESTADO_COLOR = { abierta: 'orange-2', en_revision: 'blue-2', esperando_cliente: 'purple-2', aprobada: 'green-2', cerrada: 'grey-5' }
const ESTADO_TEXTO = { abierta: 'orange-9', en_revision: 'blue-9', esperando_cliente: 'purple-9', aprobada: 'green-10', cerrada: 'white' }

const columnas = [
  { name: 'muestra', label: 'Muestra', field: (row) => row.muestra_id?.codigo || '', align: 'left', sortable: true },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'center', sortable: true },
  { name: 'titulo', label: 'Título', field: 'titulo', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
  { name: 'visible', label: 'Cliente', field: 'visible_cliente', align: 'center' },
  { name: 'fecha', label: 'Creada', field: 'fecha_creacion', align: 'left', sortable: true, format: (v) => formatDate(v) },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'right' },
]

const incidencias = ref([])
const muestras = ref([])
const cargando = ref(false)
const error = ref(null)

const opcionesMuestra = computed(() =>
  muestras.value.map((m) => ({ label: `${m.codigo} · ${m.nombre_muestra}`, value: m._id })),
)

const cargar = async () => {
  cargando.value = true
  error.value = null
  try {
    const [i, m] = await Promise.all([get('/incidencias'), get('/muestras')])
    incidencias.value = i
    muestras.value = m
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

const formularioVacio = () => ({
  muestra_id: null,
  tipo: 'informativa',
  titulo: '',
  descripcion: '',
  observaciones_internas: '',
  visible_cliente: false,
  requiere_respuesta: false,
  nueva_fecha_estimada: null,
})
const formulario = ref(formularioVacio())

const abrirCreacion = () => {
  formulario.value = formularioVacio()
  dialogo.value = true
}

const guardar = async () => {
  guardando.value = true
  try {
    const datos = {
      muestra_id: formulario.value.muestra_id,
      tipo: formulario.value.tipo,
      titulo: formulario.value.titulo.trim(),
      descripcion: formulario.value.descripcion.trim(),
      observaciones_internas: formulario.value.observaciones_internas.trim(),
      visible_cliente: formulario.value.visible_cliente,
      requiere_respuesta: formulario.value.requiere_respuesta,
    }
    if (formulario.value.tipo === 'demora') {
      datos.nueva_fecha_estimada = formulario.value.nueva_fecha_estimada
        ? new Date(formulario.value.nueva_fecha_estimada).toISOString()
        : null
    }

    const respuesta = await post('/incidencias', datos)
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
const cambiando = ref(false)
const incidenciaParaEstado = ref(null)
const estadoNuevo = ref('abierta')
const motivo = ref('')

const abrirCambioEstado = (incidencia) => {
  incidenciaParaEstado.value = incidencia
  estadoNuevo.value = incidencia.estado
  motivo.value = ''
  dialogoEstado.value = true
}

const guardarEstado = async () => {
  cambiando.value = true
  try {
    const respuesta = await patch(`/incidencias/${incidenciaParaEstado.value._id}/estado`, {
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

// --- Ver respuestas ----------------------------------------------------------
const dialogoRespuestas = ref(false)
const incidenciaParaRespuestas = ref(null)

const abrirRespuestas = (incidencia) => {
  incidenciaParaRespuestas.value = incidencia
  dialogoRespuestas.value = true
}
</script>

<template>
  <q-page>
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Incidencias"
        subtitulo="Novedades, demoras y solicitudes de información"
        icono="report_problem"
      >
        <template #acciones>
          <q-btn unelevated no-caps color="primary" icon="add" label="Nueva incidencia" @click="abrirCreacion" />
        </template>
      </EncabezadoPagina>

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" @click="cargar" /></template>
      </q-banner>

      <TablaDatos :filas="incidencias" :columnas="columnas" :cargando="cargando" mensaje-vacio="Aún no hay incidencias registradas">
        <template #body-cell-muestra="celda">
          <q-td :props="celda">
            <span class="mono text-weight-bold text-primary">{{ celda.row.muestra_id?.codigo }}</span>
            <div class="text-caption texto-suave">{{ celda.row.muestra_id?.nombre_muestra }}</div>
          </q-td>
        </template>

        <template #body-cell-tipo="celda">
          <q-td :props="celda" class="text-center">
            <q-badge
              :color="celda.row.tipo === 'demora' ? 'orange-2' : celda.row.tipo === 'requiere_accion_cliente' ? 'purple-2' : 'blue-1'"
              :text-color="celda.row.tipo === 'demora' ? 'orange-9' : celda.row.tipo === 'requiere_accion_cliente' ? 'purple-9' : 'blue-9'"
              :label="TIPOS.find((t) => t.value === celda.row.tipo)?.label || celda.row.tipo"
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

        <template #body-cell-visible="celda">
          <q-td :props="celda" class="text-center">
            <q-icon :name="celda.row.visible_cliente ? 'visibility' : 'visibility_off'" :color="celda.row.visible_cliente ? 'green-9' : 'grey-6'" size="18px" />
          </q-td>
        </template>

        <template #body-cell-acciones="celda">
          <q-td :props="celda" class="text-right">
            <q-btn
              v-if="celda.row.respuestas?.length"
              flat dense round size="sm" icon="forum" color="green-9" class="action-secondary"
              @click="abrirRespuestas(celda.row)"
            >
              <q-tooltip>Ver respuestas ({{ celda.row.respuestas.length }})</q-tooltip>
            </q-btn>
            <q-btn flat dense round size="sm" icon="swap_horiz" color="info" class="action-secondary" @click="abrirCambioEstado(celda.row)">
              <q-tooltip>Cambiar estado</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </TablaDatos>
    </div>

    <!-- Formulario -->
    <q-dialog v-model="dialogo" persistent @show="formularioRef?.resetValidation()">
      <q-card class="dialog-card" style="width: 640px">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="report_problem" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Nueva incidencia</div>
            <div class="text-caption text-green-2">Novedad del proceso de una muestra</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-form ref="formularioRef" greedy @submit="guardar">
          <q-card-section class="q-gutter-md">
            <q-select
              v-model="formulario.muestra_id"
              outlined dense :options="opcionesMuestra" emit-value map-options label="Muestra *"
              :rules="[seleccionRequerida('la muestra')]" lazy-rules
            >
              <template #prepend><q-icon name="science" /></template>
            </q-select>

            <q-select
              v-model="formulario.tipo"
              outlined dense :options="TIPOS" emit-value map-options label="Tipo *"
              :rules="[seleccionRequerida('el tipo')]" lazy-rules
            />

            <q-input
              v-model="formulario.titulo"
              outlined dense label="Título *"
              :rules="[requerido('El título')]" lazy-rules
            />

            <q-input
              v-model="formulario.descripcion"
              type="textarea" outlined label="Descripción *" rows="3"
              :rules="[requerido('La descripción')]" lazy-rules
            />

            <q-input
              v-if="formulario.tipo === 'demora'"
              v-model="formulario.nueva_fecha_estimada"
              outlined dense type="date" label="Nueva fecha estimada"
              hint="Se informará al cliente en el seguimiento público"
            />

            <q-input
              v-model="formulario.observaciones_internas"
              type="textarea" outlined label="Observaciones internas" rows="2"
              hint="Nunca son visibles para el cliente"
            />

            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-toggle v-model="formulario.visible_cliente" label="Visible al cliente" color="primary" left-label />
              </div>
              <div class="col-6">
                <q-toggle v-model="formulario.requiere_respuesta" label="Requiere respuesta" color="primary" left-label />
              </div>
            </div>

            <q-banner v-if="formulario.requiere_respuesta && !formulario.visible_cliente" dense class="bg-orange-1 text-orange-9 rounded-borders">
              <template #avatar><q-icon name="warning" /></template>
              Para que el cliente responda, la incidencia también debe ser visible.
            </q-banner>
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
            <q-btn unelevated no-caps type="submit" color="primary" class="btn-ok" label="Registrar incidencia" :loading="guardando" />
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
            <div class="text-caption text-green-2">{{ incidenciaParaEstado?.titulo }}</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-select v-model="estadoNuevo" outlined dense :options="ESTADOS" emit-value map-options label="Estado *" />
          <q-input
            v-if="estadoNuevo === 'cerrada'"
            v-model="motivo"
            type="textarea" outlined label="Motivo del cierre" rows="2"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
          <q-btn unelevated no-caps color="primary" label="Guardar estado" :loading="cambiando" @click="guardarEstado" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Respuestas -->
    <q-dialog v-model="dialogoRespuestas">
      <q-card class="dialog-card" style="width: 640px">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="forum" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Respuestas</div>
            <div class="text-caption text-green-2">{{ incidenciaParaRespuestas?.titulo }}</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-card-section>
          <q-list separator>
            <q-item v-for="(resp, index) in incidenciaParaRespuestas?.respuestas || []" :key="index">
              <q-item-section avatar>
                <q-avatar :color="resp.tipo_usuario === 'cliente' ? 'green-2' : 'blue-2'" :text-color="resp.tipo_usuario === 'cliente' ? 'green-10' : 'blue-9'" icon="person" />
              </q-item-section>
              <q-item-section>
                <div class="text-weight-bold style-text">{{ resp.tipo_usuario === 'cliente' ? 'Cliente' : 'Personal' }}</div>
                <div>{{ resp.mensaje }}</div>
                <div class="text-caption texto-suave">{{ formatDateTime(resp.fecha) }}</div>
              </q-item-section>
            </q-item>
          </q-list>
          <div v-if="!(incidenciaParaRespuestas?.respuestas || []).length" class="empty-state">Aún no hay respuestas.</div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>
