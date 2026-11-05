<script setup>
/**
 * /views/NotificacionesView.vue
 * Bandeja de correo SIMULADO (RF-111/112, RNF-019). Muestra las notificaciones
 * automáticas del sistema y permite encolar manuales, simular el resultado del
 * envío y reenviar las fallidas (máx. 3 intentos).
 */
import { computed, onMounted, ref } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'

import { get, post, patch } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { useConfirmar } from '@/composables/useConfirmar'
import { formatDateTime } from '@/utils/formatDate'
import { requerido, seleccionRequerida } from '@/utils/reglas'

const general = useGeneralStore()
const { notificarOk, notificarError } = useNotificar()
const { confirmar } = useConfirmar()

const TIPO_LABEL = {
  cambio_etapa: 'Cambio de etapa',
  incidencia: 'Incidencia',
  cambio_fecha: 'Cambio de fecha',
  resultados_disponibles: 'Resultados',
  conservacion: 'Conservación',
  otro: 'Manual',
}

const columnas = [
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'center', sortable: true },
  { name: 'asunto', label: 'Asunto', field: 'asunto', align: 'left' },
  { name: 'destino', label: 'Destinatario', field: 'correo_destino', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
  { name: 'intentos', label: 'Intentos', field: 'intentos', align: 'center' },
  { name: 'fecha', label: 'Programada', field: 'fecha_programada', align: 'left', sortable: true, format: (v) => formatDateTime(v) },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'right' },
]

const notificaciones = ref([])
const clientes = ref([])
const cargando = ref(false)
const error = ref(null)

const opcionesCliente = computed(() => clientes.value.map((c) => ({ label: `${c.nombre} (${c.email})`, value: c._id })))

const cargar = async () => {
  cargando.value = true
  error.value = null
  try {
    const [n, c] = await Promise.all([get('/notificaciones'), get('/clientes')])
    notificaciones.value = n
    clientes.value = c
    general.marcarSincronizacion()
  } catch (e) {
    error.value = e.mensaje
    notificarError(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

// --- Crear manual ------------------------------------------------------------
const dialogo = ref(false)
const guardando = ref(false)
const formulario = ref({ cliente_id: null, asunto: '', mensaje: '' })

const abrirCreacion = () => {
  formulario.value = { cliente_id: null, asunto: '', mensaje: '' }
  dialogo.value = true
}

const guardar = async () => {
  guardando.value = true
  try {
    const respuesta = await post('/notificaciones', {
      cliente_id: formulario.value.cliente_id || null,
      asunto: formulario.value.asunto.trim(),
      mensaje: formulario.value.mensaje.trim(),
    })
    notificarOk(respuesta.mensaje)
    dialogo.value = false
    await cargar()
  } catch (e) {
    notificarError(e)
  } finally {
    guardando.value = false
  }
}

// --- Simular envío / fallo / reenvío -----------------------------------------
const simularEnvio = async (notificacion) => {
  const aceptado = await confirmar({
    titulo: 'Simular envío exitoso',
    mensaje: `Se marcará "${notificacion.asunto}" como enviada (simulado, RNF-019).`,
    textoOk: 'Marcar enviada',
    color: 'positive',
  })
  if (!aceptado) return
  await enviarEstado(notificacion, { estado: 'enviada' })
}

const simularFallo = async (notificacion) => {
  const aceptado = await confirmar({
    titulo: 'Simular envío fallido',
    mensaje: `Se marcará "${notificacion.asunto}" como fallida con un error simulado.`,
    textoOk: 'Marcar fallida',
    color: 'negative',
  })
  if (!aceptado) return
  await enviarEstado(notificacion, { estado: 'fallida', error: 'Error simulado del servidor de correo' })
}

const reenviar = async (notificacion) => {
  try {
    const respuesta = await post(`/notificaciones/${notificacion._id}/reenviar`)
    notificarOk(respuesta.mensaje)
    await cargar()
  } catch (e) {
    notificarError(e)
  }
}

const enviarEstado = async (notificacion, body) => {
  try {
    const respuesta = await patch(`/notificaciones/${notificacion._id}/estado`, body)
    notificarOk(respuesta.mensaje)
    await cargar()
  } catch (e) {
    notificarError(e)
  }
}
</script>

<template>
  <q-page>
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Notificaciones"
        subtitulo="Bandeja de correo simulado"
        icono="mail"
      >
        <template #acciones>
          <q-btn unelevated no-caps color="primary" icon="add" label="Nueva notificación" @click="abrirCreacion" />
        </template>
      </EncabezadoPagina>

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" @click="cargar" /></template>
      </q-banner>

      <TablaDatos :filas="notificaciones" :columnas="columnas" :cargando="cargando" mensaje-vacio="La bandeja está vacía">
        <template #body-cell-tipo="celda">
          <q-td :props="celda" class="text-center">
            <q-badge color="green-1" text-color="green-10" :label="TIPO_LABEL[celda.row.tipo] || celda.row.tipo" />
          </q-td>
        </template>

        <template #body-cell-destino="celda">
          <q-td :props="celda">
            <span class="mono">{{ celda.row.correo_destino || '—' }}</span>
          </q-td>
        </template>

        <template #body-cell-estado="celda">
          <q-td :props="celda" class="text-center">
            <q-badge
              :color="celda.row.estado === 'enviada' ? 'positive' : celda.row.estado === 'fallida' ? 'negative' : 'grey-6'"
              :label="{ pendiente: 'Pendiente', enviada: 'Enviada', fallida: 'Fallida' }[celda.row.estado] || celda.row.estado"
            />
          </q-td>
        </template>

        <template #body-cell-acciones="celda">
          <q-td :props="celda" class="text-right">
            <template v-if="celda.row.estado === 'pendiente'">
              <q-btn flat dense round size="sm" icon="check" color="positive" class="action-secondary" @click="simularEnvio(celda.row)">
                <q-tooltip>Simular envío exitoso</q-tooltip>
              </q-btn>
              <q-btn flat dense round size="sm" icon="close" color="negative" class="action-secondary" @click="simularFallo(celda.row)">
                <q-tooltip>Simular envío fallido</q-tooltip>
              </q-btn>
            </template>
            <q-btn
              v-if="celda.row.estado === 'fallida' && celda.row.intentos < 3"
              flat dense round size="sm" icon="refresh" color="info" class="action-secondary"
              @click="reenviar(celda.row)"
            >
              <q-tooltip>Reenviar (intento {{ celda.row.intentos + 1 }}/3)</q-tooltip>
            </q-btn>
            <span v-if="celda.row.estado === 'enviada'" class="text-caption texto-suave">—</span>
          </q-td>
        </template>
      </TablaDatos>
    </div>

    <!-- Nueva notificación -->
    <q-dialog v-model="dialogo" persistent>
      <q-card class="dialog-card" style="width: 640px">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="mail" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Nueva notificación</div>
            <div class="text-caption text-green-2">Se encola en la bandeja de correo simulado</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-select
            v-model="formulario.cliente_id"
            outlined dense :options="opcionesCliente" emit-value map-options label="Destinatario (cliente)"
            :rules="[seleccionRequerida('el destinatario')]" lazy-rules
          >
            <template #prepend><q-icon name="person" /></template>
          </q-select>

          <q-input
            v-model="formulario.asunto"
            outlined dense label="Asunto *"
            :rules="[requerido('El asunto')]" lazy-rules
          />

          <q-input
            v-model="formulario.mensaje"
            type="textarea" outlined label="Mensaje *" rows="4"
            :rules="[requerido('El mensaje')]" lazy-rules
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
          <q-btn unelevated no-caps color="primary" label="Encolar" :loading="guardando" @click="guardar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
