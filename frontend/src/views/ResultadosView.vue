<script setup>
/**
 * /views/ResultadosView.vue
 * Resultados por parámetro (RF-052/053/054/055/056): maestro-detalle.
 * Izquierda: muestras en proceso. Derecha: análisis del parámetro seleccionado
 * con registro de resultado, validación, devolución y avance de etapa.
 */
import { computed, onMounted, ref } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'

import { get, put, patch } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { useConfirmar } from '@/composables/useConfirmar'
import { requerido } from '@/utils/reglas'

const general = useGeneralStore()
const { notificarOk, notificarError } = useNotificar()
const { confirmar } = useConfirmar()

const ETAPAS = ['ingresada', 'en_proceso', 'en_analisis', 'resultados_validados']
const ETAPA_LABEL = { ingresada: 'Ingresada', en_proceso: 'En proceso', en_analisis: 'En análisis', resultados_validados: 'Resultados validados' }
const ETAPA_COLOR = { ingresada: 'grey-6', en_proceso: 'info', en_analisis: 'purple-9', resultados_validados: 'positive' }
const ESTADO_ANALISIS_LABEL = { en_curso: 'En curso', completado: 'Completado', validado: 'Validado' }

const muestras = ref([])
const muestraSeleccionada = ref(null)
const analisis = ref([])
const busqueda = ref('')
const cargando = ref(false)
const cargandoAnalisis = ref(false)

const muestrasFiltradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return muestras.value
  return muestras.value.filter((m) => [m.codigo, m.nombre_muestra, m.cliente_id?.nombre].some((v) => String(v || '').toLowerCase().includes(q)))
})

const indiceEtapa = computed(() => {
  const idx = ETAPAS.indexOf(muestraSeleccionada.value?.estado)
  return idx >= 0 ? idx : 0
})
const etapaSiguiente = computed(() => ETAPAS[indiceEtapa.value + 1] || null)
const hayEtapaSiguiente = computed(() => Boolean(etapaSiguiente.value))

const cargar = async () => {
  cargando.value = true
  try {
    muestras.value = await get('/muestras')
    general.marcarSincronizacion()
  } catch (e) {
    notificarError(e)
  } finally {
    cargando.value = false
  }
}

const cargarAnalisis = async () => {
  if (!muestraSeleccionada.value) return
  cargandoAnalisis.value = true
  try {
    analisis.value = await get(`/analisis/muestra/${muestraSeleccionada.value._id}`)
  } catch (e) {
    notificarError(e)
  } finally {
    cargandoAnalisis.value = false
  }
}

const seleccionar = async (muestra) => {
  muestraSeleccionada.value = muestra
  await cargarAnalisis()
}

onMounted(cargar)

// --- Registro de resultado ---------------------------------------------------
const dialogoResultado = ref(false)
const guardando = ref(false)
const analisisEditando = ref(null)
const formulario = ref({ resultado: '', valor: null })

const abrirResultado = (item) => {
  analisisEditando.value = item
  formulario.value = { resultado: item.resultado || '', valor: item.valor }
  dialogoResultado.value = true
}

const guardarResultado = async () => {
  guardando.value = true
  try {
    const respuesta = await put(`/analisis/${analisisEditando.value._id}/resultado`, {
      resultado: formulario.value.resultado.trim(),
      valor: formulario.value.valor,
    })
    notificarOk(respuesta.mensaje)
    dialogoResultado.value = false
    await cargarAnalisis()
  } catch (e) {
    notificarError(e)
  } finally {
    guardando.value = false
  }
}

// --- Validación / devolución --------------------------------------------------
const validar = async (item) => {
  const aceptado = await confirmar({
    titulo: 'Validar resultado',
    mensaje: `¿Confirmas validar el resultado del parámetro ${item.parametro_id?.nombre || ''}?`,
    textoOk: 'Validar',
    color: 'positive',
  })
  if (!aceptado) return
  await enviarEstado(item, { estado: 'validado' })
}

const dialogoDevolver = ref(false)
const motivo = ref('')
const analisisParaDevolver = ref(null)

const abrirDevolver = (item) => {
  analisisParaDevolver.value = item
  motivo.value = ''
  dialogoDevolver.value = true
}

const confirmarDevolver = async () => {
  if (!motivo.value.trim()) return
  await enviarEstado(analisisParaDevolver.value, { estado: 'en_curso', motivo: motivo.value.trim() })
  dialogoDevolver.value = false
}

const enviarEstado = async (item, body) => {
  try {
    const respuesta = await patch(`/analisis/${item._id}/estado`, body)
    notificarOk(respuesta.mensaje)
    await cargarAnalisis()
  } catch (e) {
    notificarError(e)
  }
}

// --- Avance de etapa ----------------------------------------------------------
const avanzarEtapa = async () => {
  const siguiente = etapaSiguiente.value
  const aceptado = await confirmar({
    titulo: 'Avanzar etapa',
    mensaje: `La muestra pasará a la etapa "${ETAPA_LABEL[siguiente]}". ${siguiente === 'resultados_validados' ? 'Deben estar TODOS los análisis validados.' : ''}`,
    textoOk: `Pasar a ${ETAPA_LABEL[siguiente]}`,
    color: 'primary',
  })
  if (!aceptado) return

  try {
    const respuesta = await patch(`/muestras/${muestraSeleccionada.value._id}/etapa`, { etapa: siguiente })
    notificarOk(respuesta.mensaje)
    await cargar()
    muestraSeleccionada.value = respuesta.datos
    await cargarAnalisis()
  } catch (e) {
    notificarError(e)
  }
}
</script>

<template>
  <q-page>
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Resultados"
        subtitulo="Registro y validación de resultados por parámetro"
        icono="fact_check"
      />

      <div class="row q-col-gutter-md">
        <!-- Lista de muestras -->
        <div class="col-12 col-md-4">
          <q-card flat class="tarjeta">
            <q-card-section class="q-pb-none">
              <q-input v-model="busqueda" dense outlined clearable debounce="300" placeholder="Buscar muestra...">
                <template #prepend><q-icon name="search" /></template>
              </q-input>
            </q-card-section>

            <q-card-section class="q-pt-sm">
              <q-list separator>
                <q-item
                  v-for="m in muestrasFiltradas"
                  :key="m._id"
                  clickable
                  v-ripple
                  :active="muestraSeleccionada?._id === m._id"
                  active-class="text-primary"
                  @click="seleccionar(m)"
                >
                  <q-item-section avatar>
                    <q-icon name="science" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <div class="row items-center q-gutter-x-sm">
                      <span class="mono text-weight-bold">{{ m.codigo }}</span>
                      <q-badge :color="ETAPA_COLOR[m.estado] || 'grey-6'" :label="ETAPA_LABEL[m.estado] || m.estado" />
                    </div>
                    <div class="text-caption texto-suave">{{ m.nombre_muestra }} · {{ m.cliente_id?.nombre || '' }}</div>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-if="!muestras.length && !cargando" class="empty-state q-pa-lg">
                <q-icon name="inbox" size="48px" color="grey-4" />
                <div class="empty-title q-mt-sm">Aún no hay muestras</div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Detalle -->
        <div class="col-12 col-md-8">
          <template v-if="muestraSeleccionada">
            <q-card flat class="tarjeta q-mb-md">
              <q-card-section class="row items-center no-wrap">
                <div>
                  <div class="row items-center q-gutter-x-sm">
                    <span class="mono text-h6 text-weight-bold text-primary">{{ muestraSeleccionada.codigo }}</span>
                    <q-badge :color="ETAPA_COLOR[muestraSeleccionada.estado] || 'grey-6'" :label="ETAPA_LABEL[muestraSeleccionada.estado] || muestraSeleccionada.estado" />
                  </div>
                  <div class="text-subtitle1 style-text">{{ muestraSeleccionada.nombre_muestra }}</div>
                  <div class="text-caption texto-suave">
                    {{ muestraSeleccionada.cliente_id?.nombre || '' }} · {{ muestraSeleccionada.cantidad }} {{ muestraSeleccionada.unidad }} · {{ muestraSeleccionada.tipo_fisico }}
                  </div>
                </div>
                <q-space />
                <q-btn
                  v-if="hayEtapaSiguiente"
                  unelevated
                  no-caps
                  color="primary"
                  icon="arrow_forward"
                  :label="`Pasar a ${ETAPA_LABEL[etapaSiguiente]}`"
                  @click="avanzarEtapa"
                />
              </q-card-section>
            </q-card>

            <q-card flat class="tarjeta">
              <q-card-section class="row items-center no-wrap q-pb-none">
                <div class="text-subtitle2 text-weight-bold">
                  Análisis por parámetro
                  <q-badge color="green-1" text-color="green-10" :label="analisis.length" class="q-ml-xs" />
                </div>
                <q-space />
                <q-spinner v-if="cargandoAnalisis" color="primary" size="24px" />
              </q-card-section>

              <q-card-section>
                <q-list separator>
                  <q-item v-for="item in analisis" :key="item._id">
                    <q-item-section>
                      <div class="row items-center q-gutter-x-sm">
                        <span class="text-weight-bold style-text">{{ item.parametro_id?.nombre || 'Parámetro' }}</span>
                        <q-badge
                          :color="item.estado === 'validado' ? 'positive' : item.estado === 'completado' ? 'info' : 'grey-6'"
                          :label="ESTADO_ANALISIS_LABEL[item.estado] || item.estado"
                        />
                      </div>
                      <div class="text-caption texto-suave">
                        Ejecución #{{ item.numero_ejecucion }} · {{ item.parametro_id?.unidad || 'sin unidad' }}
                        <template v-if="item.resultado"> · <span class="mono">{{ item.resultado }}<template v-if="item.valor !== null && item.valor !== undefined"> ({{ item.valor }})</template></span></template>
                      </div>
                      <div v-if="item.realizado_por || item.validado_por" class="text-caption texto-suave">
                        Realizado por {{ item.realizado_por }}<template v-if="item.validado_por"> · Validado por {{ item.validado_por }}</template>
                      </div>
                    </q-item-section>

                    <q-item-section side>
                      <template v-if="item.estado === 'en_curso'">
                        <q-btn unelevated no-caps dense color="primary" icon="edit_note" label="Resultado" @click="abrirResultado(item)" />
                      </template>
                      <template v-else-if="item.estado === 'completado'">
                        <q-btn flat dense round size="sm" icon="check" color="positive" class="action-secondary" @click="validar(item)">
                          <q-tooltip>Validar</q-tooltip>
                        </q-btn>
                        <q-btn flat dense round size="sm" icon="replay" color="negative" class="action-secondary" @click="abrirDevolver(item)">
                          <q-tooltip>Devolver</q-tooltip>
                        </q-btn>
                      </template>
                      <q-icon v-else name="verified" color="positive" size="20px" />
                    </q-item-section>
                  </q-item>
                </q-list>

                <div v-if="!analisis.length && !cargandoAnalisis" class="empty-state q-pa-lg">
                  <q-icon name="tune" size="48px" color="grey-4" />
                  <div class="empty-title q-mt-sm">
                    La muestra no tiene parámetros asignados o aún no pasa a "En análisis".
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </template>

          <q-card v-else flat class="tarjeta">
            <q-card-section class="empty-state q-pa-xl">
              <q-icon name="fact_check" size="64px" color="grey-4" />
              <div class="empty-title q-mt-sm">Selecciona una muestra para gestionar sus resultados</div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <!-- Diálogo: registrar resultado -->
    <q-dialog v-model="dialogoResultado" persistent>
      <q-card class="dialog-card">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="edit_note" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Registrar resultado</div>
            <div class="text-caption text-green-2">{{ analisisEditando?.parametro_id?.nombre }}</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input
            v-model="formulario.resultado"
            type="textarea" outlined label="Resultado *" rows="3"
            :rules="[requerido('El resultado')]" lazy-rules
          />
          <q-input
            v-model.number="formulario.valor"
            outlined dense type="number" label="Valor numérico" step="any"
            :hint="`Unidad: ${analisisEditando?.parametro_id?.unidad || 'sin unidad'}`"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
          <q-btn unelevated no-caps color="primary" label="Guardar resultado" :loading="guardando" @click="guardarResultado" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Diálogo: devolver -->
    <q-dialog v-model="dialogoDevolver" persistent>
      <q-card class="dialog-card">
        <q-card-section class="bg-negative text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="replay" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Devolver resultado</div>
            <div class="text-caption">{{ analisisParaDevolver?.parametro_id?.nombre }}</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="motivo"
            type="textarea" outlined label="Motivo de la devolución *" rows="3"
            :rules="[requerido('El motivo')]" lazy-rules
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
          <q-btn unelevated no-caps color="negative" label="Devolver a análisis" :disable="!motivo.trim()" @click="confirmarDevolver" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
