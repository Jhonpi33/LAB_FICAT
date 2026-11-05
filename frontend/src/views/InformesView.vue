<script setup>
/**
 * /views/InformesView.vue
 * Informes de resultados (RF-094 a RF-097). Se generan desde muestras con
 * resultados validados; la vista previa muestra los resultados y la descarga
 * es DEMOSTRATIVA (RF-095, RNF-019).
 */
import { computed, onMounted, ref } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'

import { get, post, patch } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { formatDate } from '@/utils/formatDate'
import { seleccionRequerida } from '@/utils/reglas'

const general = useGeneralStore()
const { notificarOk, notificarError, notificarInfo } = useNotificar()

const ESTADOS = [
  { label: 'Generado', value: 'generado' },
  { label: 'Disponible', value: 'disponible' },
  { label: 'Enviado', value: 'enviado' },
]
const ESTADO_COLOR = { generado: 'blue-2', disponible: 'green-2', enviado: 'green-9' }
const ESTADO_TEXTO = { generado: 'blue-9', disponible: 'green-10', enviado: 'white' }

const columnas = [
  { name: 'numero_informe', label: 'Informe', field: 'numero_informe', align: 'left', sortable: true },
  { name: 'muestra', label: 'Muestra', field: (row) => row.muestra_id?.codigo || '', align: 'left', sortable: true },
  { name: 'cliente', label: 'Cliente', field: (row) => row.muestra_id?.cliente_id?.nombre || '', align: 'left' },
  { name: 'version', label: 'Versión', field: 'version', align: 'center' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
  { name: 'fecha_generacion', label: 'Generado', field: 'fecha_generacion', align: 'left', sortable: true, format: (v) => formatDate(v) },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'right' },
]

const informes = ref([])
const muestras = ref([])
const cargando = ref(false)
const error = ref(null)

// Solo muestras con resultados validados y sin informe vigente.
const opcionesMuestra = computed(() =>
  muestras.value
    .filter((m) => m.estado === 'resultados_validados')
    .filter((m) => !informes.value.some((i) => i.muestra_id?._id === m._id))
    .map((m) => ({ label: `${m.codigo} · ${m.nombre_muestra}`, value: m._id })),
)

const cargar = async () => {
  cargando.value = true
  error.value = null
  try {
    const [i, m] = await Promise.all([get('/informes'), get('/muestras')])
    informes.value = i
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

// --- Generar -----------------------------------------------------------------
const dialogo = ref(false)
const guardando = ref(false)
const muestraSeleccionada = ref(null)

const abrirGenerar = () => {
  muestraSeleccionada.value = null
  dialogo.value = true
}

const generar = async () => {
  guardando.value = true
  try {
    const respuesta = await post('/informes', { muestra_id: muestraSeleccionada.value })
    notificarOk(`Informe ${respuesta.datos.numero_informe} generado`)
    dialogo.value = false
    await cargar()
  } catch (e) {
    notificarError(e)
  } finally {
    guardando.value = false
  }
}

// --- Cambio de estado --------------------------------------------------------
const siguienteEstado = (informe) => ({ generado: 'disponible', disponible: 'enviado' })[informe.estado] || null

const cambiarEstado = async (informe) => {
  const siguiente = siguienteEstado(informe)
  if (!siguiente) return

  try {
    const respuesta = await patch(`/informes/${informe._id}/estado`, { estado: siguiente })
    notificarOk(respuesta.mensaje)
    await cargar()
  } catch (e) {
    notificarError(e)
  }
}

// --- Vista previa (demostrativa) ---------------------------------------------
const dialogoVista = ref(false)
const informeVisto = ref(null)
const resultados = ref([])

const abrirVista = async (informe) => {
  informeVisto.value = informe
  resultados.value = []
  dialogoVista.value = true
  try {
    resultados.value = await get(`/analisis/muestra/${informe.muestra_id?._id}`)
  } catch (e) {
    notificarError(e)
  }
}

const descargarSimulado = () => {
  notificarInfo('Descarga demostrativa: el PDF real se generará con la integración de GridFS.')
}
</script>

<template>
  <q-page>
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Informes"
        subtitulo="Informes de resultados por muestra"
        icono="description"
      >
        <template #acciones>
          <q-btn unelevated no-caps color="primary" icon="add" label="Generar informe" @click="abrirGenerar" />
        </template>
      </EncabezadoPagina>

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" @click="cargar" /></template>
      </q-banner>

      <TablaDatos :filas="informes" :columnas="columnas" :cargando="cargando" mensaje-vacio="Aún no hay informes generados">
        <template #body-cell-numero_informe="celda">
          <q-td :props="celda"><span class="mono text-weight-bold text-primary">{{ celda.row.numero_informe }}</span></q-td>
        </template>

        <template #body-cell-muestra="celda">
          <q-td :props="celda">
            <span class="mono">{{ celda.row.muestra_id?.codigo }}</span>
            <div class="text-caption texto-suave">{{ celda.row.muestra_id?.nombre_muestra }}</div>
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
            <q-btn flat dense round size="sm" icon="visibility" color="info" class="action-secondary" @click="abrirVista(celda.row)">
              <q-tooltip>Vista previa</q-tooltip>
            </q-btn>
            <q-btn
              v-if="siguienteEstado(celda.row)"
              flat dense round size="sm" icon="arrow_forward" color="primary" class="action-secondary"
              @click="cambiarEstado(celda.row)"
            >
              <q-tooltip>Pasar a {{ siguienteEstado(celda.row) }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </TablaDatos>
    </div>

    <!-- Generar -->
    <q-dialog v-model="dialogo" persistent>
      <q-card class="dialog-card">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="description" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Generar informe</div>
            <div class="text-caption text-green-2">Solo muestras con resultados validados</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-card-section>
          <q-select
            v-model="muestraSeleccionada"
            outlined dense :options="opcionesMuestra" emit-value map-options label="Muestra *"
            :rules="[seleccionRequerida('la muestra')]" lazy-rules
          >
            <template #prepend><q-icon name="science" /></template>
          </q-select>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
          <q-btn unelevated no-caps color="primary" label="Generar" :loading="guardando" @click="generar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Vista previa -->
    <q-dialog v-model="dialogoVista">
      <q-card class="dialog-card" style="width: 720px">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="description" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Informe {{ informeVisto?.numero_informe }}</div>
            <div class="text-caption text-green-2">{{ informeVisto?.muestra_id?.nombre_muestra }}</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <div class="data-label">Muestra</div>
              <div class="data-value mono">{{ informeVisto?.muestra_id?.codigo }}</div>
            </div>
            <div class="col-6">
              <div class="data-label">Cliente</div>
              <div class="data-value">{{ informeVisto?.muestra_id?.cliente_id?.nombre }}</div>
            </div>
          </div>

          <div class="section-box">
            <div class="section-box__title">
              <q-icon name="fact_check" size="18px" class="q-mr-sm" />
              Resultados
            </div>
            <div class="q-pa-md">
              <q-list separator>
                <q-item v-for="item in resultados" :key="item._id">
                  <q-item-section>
                    <div class="text-weight-bold style-text">{{ item.parametro_id?.nombre }}</div>
                    <div class="text-caption texto-suave">{{ item.resultado }}</div>
                  </q-item-section>
                  <q-item-section side>
                    <span class="mono text-weight-bold">{{ item.valor ?? '-' }} {{ item.parametro_id?.unidad || '' }}</span>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-if="!resultados.length" class="empty-state">Sin resultados registrados.</div>
            </div>
          </div>

          <q-banner dense class="bg-blue-1 text-blue-9 rounded-borders">
            <template #avatar><q-icon name="info" /></template>
            La descarga del PDF es demostrativa en esta fase (RF-095).
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn v-close-popup flat no-caps label="Cerrar" color="dark" class="btn-cancel" />
          <q-btn unelevated no-caps color="primary" icon="download" label="Descargar (demo)" @click="descargarSimulado" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
