<script setup>
/**
 * /views/DisposicionesView.vue
 * Salida final de la muestra (RF-086 a RF-093): devolución al cliente o
 * desecho. Es 1:1 con la muestra y actualiza su estado.
 */
import { computed, onMounted, ref } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'

import { get, post } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { formatDateTime } from '@/utils/formatDate'
import { requerido, seleccionRequerida } from '@/utils/reglas'

const general = useGeneralStore()
const { notificarOk, notificarError } = useNotificar()

const TIPOS = [
  { label: 'Devolución al cliente', value: 'devolucion' },
  { label: 'Desecho', value: 'desecho' },
]

const columnas = [
  { name: 'muestra', label: 'Muestra', field: (row) => row.muestra_id?.codigo || '', align: 'left', sortable: true },
  { name: 'cliente', label: 'Cliente', field: (row) => row.muestra_id?.cliente_id?.nombre || '', align: 'left' },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'center', sortable: true },
  { name: 'motivo', label: 'Motivo', field: 'motivo', align: 'left' },
  { name: 'fecha_salida', label: 'Salida', field: 'fecha_salida', align: 'left', sortable: true, format: (v) => formatDateTime(v) },
  { name: 'realizada_por', label: 'Realizada por', field: 'realizada_por', align: 'left' },
]

const disposiciones = ref([])
const muestras = ref([])
const cargando = ref(false)
const error = ref(null)

// Muestras que aún no tienen disposición registrada.
const opcionesMuestra = computed(() =>
  muestras.value
    .filter((m) => !disposiciones.value.some((d) => d.muestra_id?._id === m._id))
    .map((m) => ({ label: `${m.codigo} · ${m.nombre_muestra}`, value: m._id })),
)

const cargar = async () => {
  cargando.value = true
  error.value = null
  try {
    const [d, m] = await Promise.all([get('/disposiciones'), get('/muestras')])
    disposiciones.value = d
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
const formulario = ref({ muestra_id: null, tipo: 'devolucion', motivo: '', observacion: '', notificacion_cliente: false })

const abrirCreacion = () => {
  formulario.value = { muestra_id: null, tipo: 'devolucion', motivo: '', observacion: '', notificacion_cliente: false }
  dialogo.value = true
}

const guardar = async () => {
  guardando.value = true
  try {
    const respuesta = await post('/disposiciones', {
      muestra_id: formulario.value.muestra_id,
      tipo: formulario.value.tipo,
      motivo: formulario.value.motivo.trim(),
      observacion: formulario.value.observacion.trim(),
      notificacion_cliente: formulario.value.notificacion_cliente,
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
</script>

<template>
  <q-page>
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Disposición de muestras"
        subtitulo="Devolución al cliente o desecho final"
        icono="archive"
      >
        <template #acciones>
          <q-btn unelevated no-caps color="primary" icon="add" label="Registrar disposición" @click="abrirCreacion" />
        </template>
      </EncabezadoPagina>

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" @click="cargar" /></template>
      </q-banner>

      <TablaDatos :filas="disposiciones" :columnas="columnas" :cargando="cargando" mensaje-vacio="Aún no hay disposiciones registradas">
        <template #body-cell-muestra="celda">
          <q-td :props="celda">
            <span class="mono text-weight-bold text-primary">{{ celda.row.muestra_id?.codigo }}</span>
            <div class="text-caption texto-suave">{{ celda.row.muestra_id?.nombre_muestra }}</div>
          </q-td>
        </template>

        <template #body-cell-tipo="celda">
          <q-td :props="celda" class="text-center">
            <q-badge
              :color="celda.row.tipo === 'devolucion' ? 'green-2' : 'orange-2'"
              :text-color="celda.row.tipo === 'devolucion' ? 'green-10' : 'orange-9'"
              :label="celda.row.tipo === 'devolucion' ? 'Devolución' : 'Desecho'"
            />
          </q-td>
        </template>
      </TablaDatos>
    </div>

    <!-- Formulario -->
    <q-dialog v-model="dialogo" persistent>
      <q-card class="dialog-card" style="width: 640px">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="archive" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Registrar disposición</div>
            <div class="text-caption text-green-2">Salida final de la muestra</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

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
            outlined dense :options="TIPOS" emit-value map-options label="Tipo de salida *"
            :rules="[seleccionRequerida('el tipo')]" lazy-rules
          />

          <q-input
            v-model="formulario.motivo"
            type="textarea" outlined label="Motivo *" rows="2"
            :rules="[requerido('El motivo')]" lazy-rules
          />

          <q-input
            v-model="formulario.observacion"
            type="textarea" outlined label="Observación" rows="2"
          />

          <q-toggle v-model="formulario.notificacion_cliente" label="Notificar al cliente (correo simulado)" color="primary" left-label />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
          <q-btn unelevated no-caps color="primary" label="Registrar" :loading="guardando" @click="guardar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
