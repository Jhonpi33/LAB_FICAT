<script setup>
/**
 * /views/MuestrasView.vue
 * Recepción de muestras: registro, código automático y aceptación/rechazo.
 */
import { computed, onMounted, ref, watch } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'

import { get, post, patch } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { useConfirmar } from '@/composables/useConfirmar'
import { formatDate } from '@/utils/formatDate'
import { requerido, seleccionRequerida, enteroMayorA } from '@/utils/reglas'

const general = useGeneralStore()
const { notificarOk, notificarError } = useNotificar()
const { confirmar } = useConfirmar()

const TIPO_FISICO = [
  { label: 'Sólido', value: 'solido' },
  { label: 'Líquido', value: 'liquido' },
]
const RECEPCION_LABEL = { pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada' }
const ETAPA_SIGUIENTE = { ingresada: 'en_proceso', en_proceso: 'en_analisis', en_analisis: 'resultados_validados' }
const ETAPA_LABEL = { ingresada: 'Ingresada', en_proceso: 'En proceso', en_analisis: 'En análisis', resultados_validados: 'Resultados validados' }

const columnas = [
  { name: 'codigo', label: 'Código', field: 'codigo', align: 'left', sortable: true },
  { name: 'nombre_muestra', label: 'Muestra', field: 'nombre_muestra', align: 'left', sortable: true },
  { name: 'cliente', label: 'Cliente', field: (row) => row.cliente_id?.nombre || '', align: 'left' },
  { name: 'cantidad', label: 'Cantidad', field: 'cantidad', align: 'right' },
  { name: 'recepcion', label: 'Recepción', field: 'estado_recepcion', align: 'center', sortable: true },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
  { name: 'fecha', label: 'Recibida', field: 'fecha_recepcion', align: 'left', sortable: true, format: (v) => formatDate(v) },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'right' },
]

const muestras = ref([])
const solicitudes = ref([])
const parametros = ref([])
const cargando = ref(false)
const error = ref(null)

const opcionesSolicitud = computed(() => solicitudes.value.map((s) => ({ label: `#${s.descripcion}`, value: s._id })))
const opcionesParametro = computed(() => parametros.value.map((p) => ({ label: p.nombre, value: p._id })))

const cargar = async () => {
  cargando.value = true
  error.value = null
  try {
    const [m, s, p] = await Promise.all([
      get('/muestras'),
      get('/solicitudes'),
      get('/parametros?activos=true'),
    ])
    muestras.value = m
    solicitudes.value = s
    parametros.value = p
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
  solicitud_id: null,
  nombre_muestra: '',
  descripcion: '',
  tipo_fisico: 'solido',
  cantidad: null,
  unidad: 'g',
  parametros_ids: [],
  verificacion_fisica: false,
})
const formulario = ref(formularioVacio())

// RF-018: la unidad se ajusta al tipo físico (sólido -> g, líquido -> ml).
watch(() => formulario.value.tipo_fisico, (valor) => {
  formulario.value.unidad = valor === 'liquido' ? 'ml' : 'g'
})

// RF-019: aviso cuando la cantidad es menor a 300 g/ml.
const cantidadBaja = computed(() => Number(formulario.value.cantidad) > 0 && Number(formulario.value.cantidad) < 300)

const abrirCreacion = () => {
  formulario.value = formularioVacio()
  dialogo.value = true
}

const guardar = async () => {
  guardando.value = true
  try {
    const datos = {
      solicitud_id: formulario.value.solicitud_id,
      nombre_muestra: formulario.value.nombre_muestra.trim(),
      descripcion: formulario.value.descripcion.trim(),
      tipo_fisico: formulario.value.tipo_fisico,
      cantidad: Number(formulario.value.cantidad),
      unidad: formulario.value.unidad,
      parametros_ids: formulario.value.parametros_ids,
      verificacion_fisica: formulario.value.verificacion_fisica,
    }

    const respuesta = await post('/muestras', datos)
    notificarOk(`Muestra registrada con el código ${respuesta.datos.codigo}`)
    dialogo.value = false
    await cargar()
  } catch (e) {
    notificarError(e)
  } finally {
    guardando.value = false
  }
}

// --- Recepción (aceptar / rechazar) -----------------------------------------
const aceptar = async (muestra) => {
  const ok = await confirmar({
    titulo: 'Aceptar muestra',
    mensaje: `¿Confirmas la recepción de la muestra ${muestra.codigo}?`,
    textoOk: 'Aceptar',
    color: 'positive',
  })
  if (!ok) return
  await enviarRecepcion(muestra, { aceptar: true })
}

const dialogoRechazo = ref(false)
const rechazando = ref(false)
const muestraParaRechazar = ref(null)
const motivoRechazo = ref('')

const abrirRechazo = (muestra) => {
  muestraParaRechazar.value = muestra
  motivoRechazo.value = ''
  dialogoRechazo.value = true
}

const confirmarRechazo = async () => {
  if (!motivoRechazo.value.trim()) return
  rechazando.value = true
  try {
    await enviarRecepcion(muestraParaRechazar.value, { aceptar: false, motivo_rechazo: motivoRechazo.value.trim() })
    dialogoRechazo.value = false
  } finally {
    rechazando.value = false
  }
}

const enviarRecepcion = async (muestra, body) => {
  try {
    const respuesta = await patch(`/muestras/${muestra._id}/recepcion`, body)
    notificarOk(respuesta.mensaje)
    await cargar()
  } catch (e) {
    notificarError(e)
  }
}

// --- Avance de etapa ---------------------------------------------------------
const avanzarEtapa = async (muestra) => {
  const siguiente = ETAPA_SIGUIENTE[muestra.estado]
  if (!siguiente) return

  const aceptado = await confirmar({
    titulo: 'Avanzar etapa',
    mensaje: `La muestra ${muestra.codigo} pasará a la etapa "${ETAPA_LABEL[siguiente]}".`,
    textoOk: `Pasar a ${ETAPA_LABEL[siguiente]}`,
    color: 'primary',
  })
  if (!aceptado) return

  try {
    const respuesta = await patch(`/muestras/${muestra._id}/etapa`, { etapa: siguiente })
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
        titulo="Muestras"
        subtitulo="Recepción e inventario de muestras"
        icono="science"
      >
        <template #acciones>
          <q-btn unelevated no-caps color="primary" icon="add" label="Registrar muestra" @click="abrirCreacion" />
        </template>
      </EncabezadoPagina>

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" @click="cargar" /></template>
      </q-banner>

      <TablaDatos :filas="muestras" :columnas="columnas" :cargando="cargando" mensaje-vacio="Aún no hay muestras registradas">
        <template #body-cell-codigo="celda">
          <q-td :props="celda"><span class="mono text-weight-bold text-primary">{{ celda.row.codigo }}</span></q-td>
        </template>

        <template #body-cell-cantidad="celda">
          <q-td :props="celda" class="text-right">
            {{ celda.row.cantidad }} {{ celda.row.unidad }}
            <span class="text-caption texto-suave">· {{ celda.row.tipo_fisico }}</span>
          </q-td>
        </template>

        <template #body-cell-recepcion="celda">
          <q-td :props="celda" class="text-center">
            <q-badge
              :color="celda.row.estado_recepcion === 'aceptada' ? 'positive' : celda.row.estado_recepcion === 'rechazada' ? 'negative' : 'grey-6'"
              :label="RECEPCION_LABEL[celda.row.estado_recepcion] || celda.row.estado_recepcion"
            />
          </q-td>
        </template>

        <template #body-cell-estado="celda">
          <q-td :props="celda" class="text-center">
            <q-badge color="green-2" text-color="green-10" :label="celda.row.estado" />
          </q-td>
        </template>

        <template #body-cell-acciones="celda">
          <q-td :props="celda" class="text-right">
            <template v-if="celda.row.estado_recepcion === 'pendiente'">
              <q-btn flat dense round size="sm" icon="check" color="positive" class="action-secondary" @click="aceptar(celda.row)">
                <q-tooltip>Aceptar recepción</q-tooltip>
              </q-btn>
              <q-btn flat dense round size="sm" icon="close" color="negative" class="action-secondary" @click="abrirRechazo(celda.row)">
                <q-tooltip>Rechazar</q-tooltip>
              </q-btn>
            </template>
            <template v-else>
              <q-btn
                v-if="ETAPA_SIGUIENTE[celda.row.estado]"
                flat dense round size="sm" icon="arrow_forward" color="primary" class="action-secondary"
                @click="avanzarEtapa(celda.row)"
              >
                <q-tooltip>Pasar a {{ ETAPA_LABEL[ETAPA_SIGUIENTE[celda.row.estado]] }}</q-tooltip>
              </q-btn>
              <span v-else class="text-caption texto-suave">—</span>
            </template>
          </q-td>
        </template>
      </TablaDatos>
    </div>

    <!-- Formulario de registro de muestra -->
    <q-dialog v-model="dialogo" persistent @show="formularioRef?.resetValidation()">
      <q-card class="dialog-card" style="width: 680px">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="science" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Registrar muestra</div>
            <div class="text-caption text-green-2">Recepción de la muestra para análisis</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-form ref="formularioRef" greedy @submit="guardar">
          <q-card-section class="q-gutter-md">
            <q-select
              v-model="formulario.solicitud_id"
              outlined dense :options="opcionesSolicitud" emit-value map-options label="Solicitud *"
              :rules="[seleccionRequerida('la solicitud')]" lazy-rules
            >
              <template #prepend><q-icon name="assignment" /></template>
            </q-select>

            <q-input
              v-model="formulario.nombre_muestra"
              outlined dense label="Nombre de la muestra *"
              :rules="[requerido('El nombre de la muestra')]" lazy-rules
            />

            <q-input
              v-model="formulario.descripcion"
              type="textarea" outlined label="Descripción del alimento *" rows="2"
              :rules="[requerido('La descripción')]" lazy-rules
            />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-5">
                <q-select
                  v-model="formulario.tipo_fisico"
                  outlined dense :options="TIPO_FISICO" emit-value map-options label="Tipo físico *"
                  :rules="[seleccionRequerida('el tipo físico')]" lazy-rules
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="formulario.cantidad"
                  outlined dense type="number" label="Cantidad *" step="any"
                  :rules="[requerido('La cantidad'), enteroMayorA(-1, 'La cantidad')]" lazy-rules
                />
              </div>
              <div class="col-12 col-sm-3">
                <q-input v-model="formulario.unidad" outlined dense label="Unidad" readonly />
              </div>
            </div>

            <q-banner v-if="cantidadBaja" dense class="bg-orange-1 text-orange-9 rounded-borders">
              <template #avatar><q-icon name="warning" /></template>
              La cantidad es menor a 300 {{ formulario.unidad }}. Verifica que sea suficiente para el análisis.
            </q-banner>

            <q-select
              v-model="formulario.parametros_ids"
              outlined dense multiple use-chips :options="opcionesParametro" emit-value map-options
              label="Parámetros a analizar" hint="Opcional: se pueden asignar luego"
            >
              <template #prepend><q-icon name="tune" /></template>
            </q-select>

            <q-toggle v-model="formulario.verificacion_fisica" label="Verificación física completada" color="primary" left-label />
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
            <q-btn unelevated no-caps type="submit" color="primary" class="btn-ok" label="Registrar muestra" :loading="guardando" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Rechazo -->
    <q-dialog v-model="dialogoRechazo" persistent>
      <q-card class="dialog-card">
        <q-card-section class="bg-negative text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="close" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Rechazar muestra</div>
            <div class="text-caption">{{ muestraParaRechazar?.codigo }}</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="motivoRechazo"
            type="textarea" outlined label="Motivo del rechazo *" rows="3"
            :rules="[requerido('El motivo de rechazo')]" lazy-rules
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
          <q-btn unelevated no-caps color="negative" label="Confirmar rechazo" :loading="rechazando" :disable="!motivoRechazo.trim()" @click="confirmarRechazo" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
