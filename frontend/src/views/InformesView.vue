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
const formularioRef = ref(null)

const abrirGenerar = async () => {
  muestraSeleccionada.value = null
  dialogo.value = true
  if (!cargando.value) await cargar()
}

const generar = async () => {
  if (!muestraSeleccionada.value) return

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
const cargandoResultados = ref(false)
const errorResultados = ref(null)

const abrirVista = async (informe) => {
  informeVisto.value = informe
  resultados.value = []
  errorResultados.value = null
  dialogoVista.value = true
  cargandoResultados.value = true
  try {
    resultados.value = await get(`/analisis/muestra/${informe.muestra_id?._id}`)
  } catch (e) {
    errorResultados.value = e.mensaje
    notificarError(e)
  } finally {
    cargandoResultados.value = false
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
    <q-dialog v-model="dialogo" persistent @show="formularioRef?.resetValidation()">
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

        <q-form ref="formularioRef" greedy @submit="generar">
          <q-card-section class="informe-form-fields">
            <q-select
              v-model="muestraSeleccionada"
              outlined dense hide-bottom-space :options="opcionesMuestra" emit-value map-options label="Muestra *"
              :rules="[seleccionRequerida('la muestra')]" lazy-rules
              :loading="cargando"
              :disable="cargando || !opcionesMuestra.length"
              @update:model-value="formularioRef?.resetValidation()"
            >
              <template #prepend><q-icon name="science" /></template>
            </q-select>

            <q-banner v-if="!cargando && !opcionesMuestra.length && !error" dense class="bg-orange-1 text-orange-10 rounded-borders">
              <template #avatar><q-icon name="info_outline" /></template>
              No hay muestras con resultados validados disponibles para generar un informe.
            </q-banner>
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
            <q-btn unelevated no-caps type="submit" color="primary" label="Generar" :loading="guardando" :disable="cargando || !opcionesMuestra.length" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Vista previa -->
    <q-dialog v-model="dialogoVista" persistent>
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

        <q-card-section class="informe-preview">
          <div class="informe-resumen">
            <div class="informe-resumen__dato">
              <div class="data-label">Muestra</div>
              <div class="data-value mono">{{ informeVisto?.muestra_id?.codigo }}</div>
            </div>
            <div class="informe-resumen__dato">
              <div class="data-label">Cliente</div>
              <div class="data-value">{{ informeVisto?.muestra_id?.cliente_id?.nombre }}</div>
            </div>
          </div>

          <div class="section-box informe-resultados">
            <div class="section-box__title">
              <q-icon name="fact_check" size="18px" class="q-mr-sm" />
              Resultados
            </div>
            <q-linear-progress v-if="cargandoResultados" indeterminate color="primary" />
            <q-banner v-else-if="errorResultados" dense class="bg-red-1 text-negative">
              {{ errorResultados }}
            </q-banner>
            <div v-else-if="resultados.length" class="resultados-tabla">
              <div class="resultados-tabla__encabezado">
                <span>Parámetro</span>
                <span>Resultado</span>
                <span>Valor</span>
              </div>
              <div v-for="item in resultados" :key="item._id" class="resultados-tabla__fila">
                <div class="text-weight-bold style-text resultados-tabla__parametro">
                  {{ item.parametro_id?.nombre || 'Parámetro' }}
                </div>
                <div class="resultados-tabla__resultado">{{ item.resultado || '—' }}</div>
                <div class="mono text-weight-bold resultados-tabla__valor">
                  {{ item.valor ?? '—' }}<template v-if="item.valor !== null && item.valor !== undefined"> {{ item.parametro_id?.unidad || '' }}</template>
                </div>
              </div>
            </div>
            <div v-else class="informe-sin-resultados">
              <q-icon name="science" size="32px" color="grey-5" />
              <div class="text-weight-bold">No hay análisis registrados para esta muestra.</div>
              <div class="text-caption texto-suave">Registra y valida los resultados antes de generar el informe.</div>
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

<style scoped>
.informe-form-fields {
  display: grid;
  gap: 12px;
}

.informe-preview {
  display: grid;
  gap: 14px;
}

.informe-resumen {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.informe-resumen__dato {
  min-width: 0;
  padding: 11px 14px;
  border: 1px solid #dfe8df;
  border-radius: 8px;
  background: #fbfdfb;
}

.informe-resultados {
  min-width: 0;
}

.resultados-tabla {
  padding: 4px 14px;
}

.resultados-tabla__encabezado,
.resultados-tabla__fila {
  display: grid;
  grid-template-columns: minmax(110px, 1fr) minmax(0, 1.5fr) minmax(80px, 0.7fr);
  align-items: start;
  gap: 12px;
}

.resultados-tabla__encabezado {
  padding: 9px 4px;
  border-bottom: 1px solid #dfe8df;
  color: #607466;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.resultados-tabla__fila {
  padding: 11px 4px;
  border-bottom: 1px solid #edf1ed;
}

.resultados-tabla__fila:last-child {
  border-bottom: 0;
}

.resultados-tabla__parametro,
.resultados-tabla__resultado,
.resultados-tabla__valor {
  min-width: 0;
  overflow-wrap: anywhere;
}

.resultados-tabla__valor {
  text-align: right;
}

.informe-sin-resultados {
  display: grid;
  justify-items: center;
  gap: 7px;
  padding: 24px 16px;
  text-align: center;
}

@media (max-width: 600px) {
  .informe-resumen {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .resultados-tabla__encabezado,
  .resultados-tabla__fila {
    grid-template-columns: minmax(82px, 0.9fr) minmax(0, 1.3fr) minmax(64px, 0.7fr);
    gap: 8px;
  }
}
</style>
