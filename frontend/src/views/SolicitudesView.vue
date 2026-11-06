<script setup>
/**
 * /views/SolicitudesView.vue
 * Solicitudes de servicio, con estilo profesional SENA:
 *   - Resumen por estado en píldoras (clic = filtrar la tabla)
 *   - Tabla con cliente + tipo, prioridad (con aviso de atención inmediata),
 *     estado con chip de color y fecha
 * El tipo de cliente (interno/externo) lo deriva el backend (RF-003).
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

// Colores de la marca para los puntos de las píldoras.
const ESTADO_HEX = { pendiente: '#b0b7b1', cotizada: '#81c784', aceptada: '#4caf50', pagada: '#2e7d32', rechazada: '#e57373' }

// Chips de estado en la tabla (fondo suave + texto oscuro, como el panel).
const ESTADO_CHIP = {
  pendiente: { bg: '#f1f3f1', texto: '#5f6b61' },
  cotizada: { bg: '#e8f5e9', texto: '#1b5e20' },
  aceptada: { bg: '#e8f5e9', texto: '#1b5e20' },
  pagada: { bg: '#dceddd', texto: '#144d17' },
  rechazada: { bg: '#fdecea', texto: '#b71c1c' },
}

const TIPO_LABEL = { interno: 'Interno', externo: 'Externo' }

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

// Filtro por estado ('todas' o un valor de ESTADOS).
const filtroEstado = ref('todas')

const opcionesCliente = computed(() => clientes.value.map((c) => ({ label: c.nombre, value: c._id })))

const conteoPorEstado = computed(() => {
  const conteo = {}
  for (const e of ESTADOS) conteo[e.value] = solicitudes.value.filter((s) => s.estado === e.value).length
  return conteo
})

const solicitudesFiltradas = computed(() =>
  filtroEstado.value === 'todas' ? solicitudes.value : solicitudes.value.filter((s) => s.estado === filtroEstado.value),
)

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

const prioridadLabel = (p) => PRIORIDADES.find((x) => x.value === p)?.label || p
const estadoLabel = (e) => ESTADOS.find((x) => x.value === e)?.label || e
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

      <!-- Resumen por estado (clic = filtrar) -->
      <div class="resumen q-mb-md">
        <button
          type="button"
          class="pildora"
          :class="{ 'pildora--activa': filtroEstado === 'todas' }"
          @click="filtroEstado = 'todas'"
        >
          <span class="pildora__num">{{ solicitudes.length }}</span>
          <span class="pildora__label">Todas</span>
        </button>

        <button
          v-for="estado in ESTADOS"
          :key="estado.value"
          type="button"
          class="pildora"
          :class="{ 'pildora--activa': filtroEstado === estado.value }"
          @click="filtroEstado = estado.value"
        >
          <span class="pildora__punto" :style="{ background: ESTADO_HEX[estado.value] }" />
          <span class="pildora__num">{{ conteoPorEstado[estado.value] || 0 }}</span>
          <span class="pildora__label">{{ estado.label }}</span>
        </button>
      </div>

      <TablaDatos
        :filas="solicitudesFiltradas"
        :columnas="columnas"
        :cargando="cargando"
        :mensaje-vacio="filtroEstado === 'todas' ? 'Aún no hay solicitudes registradas' : 'No hay solicitudes con este estado'"
      >
        <template #body-cell-cliente="celda">
          <q-td :props="celda">
            <div class="row items-center no-wrap">
              <span class="cliente-nombre">{{ celda.row.cliente_id?.nombre || '—' }}</span>
              <span
                class="chip-tipo"
                :class="celda.row.tipo_cliente === 'interno' ? 'chip-tipo--interno' : 'chip-tipo--externo'"
              >
                {{ TIPO_LABEL[celda.row.tipo_cliente] || celda.row.tipo_cliente }}
              </span>
            </div>
          </q-td>
        </template>

        <template #body-cell-descripcion="celda">
          <q-td :props="celda" class="celda-descripcion">
            <span v-if="celda.row.atencion_inmediata" class="aviso-inmediato">
              <q-icon name="bolt" size="14px" class="q-mr-xs" />
            </span>
            {{ celda.row.descripcion }}
          </q-td>
        </template>

        <template #body-cell-prioridad="celda">
          <q-td :props="celda" class="text-center">
            <q-badge
              :color="celda.row.prioridad === 'alta' ? 'orange-2' : celda.row.prioridad === 'media' ? 'blue-1' : 'grey-3'"
              :text-color="celda.row.prioridad === 'alta' ? 'orange-9' : celda.row.prioridad === 'media' ? 'blue-9' : 'grey-8'"
              :label="prioridadLabel(celda.row.prioridad)"
            />
          </q-td>
        </template>

        <template #body-cell-estado="celda">
          <q-td :props="celda" class="text-center">
            <span
              class="chip-estado"
              :style="{ background: ESTADO_CHIP[celda.row.estado]?.bg, color: ESTADO_CHIP[celda.row.estado]?.texto }"
            >
              {{ estadoLabel(celda.row.estado) }}
            </span>
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

<style scoped lang="scss">
// Píldoras de resumen por estado (clic = filtrar)
.resumen {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pildora {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  background: #ffffff;
  border: 1px solid #e4e9e4;
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: #c8e6c9;
  }

  &--activa {
    background: #e8f5e9;
    border-color: #2e7d32;
    box-shadow: 0 2px 8px rgba(16, 42, 18, 0.08);
  }

  &__punto {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__num {
    font-size: 17px;
    font-weight: 800;
    color: #14261a;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  &__label {
    font-size: 12px;
    font-weight: 600;
    color: #5f6b61;
  }

  &--activa .pildora__label {
    color: #1b5e20;
    font-weight: 700;
  }
}

// Cliente + tipo en la tabla
.cliente-nombre {
  font-weight: 700;
  color: #14261a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-tipo {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  flex-shrink: 0;

  &--interno {
    background: #e8f5e9;
    color: #1b5e20;
  }

  &--externo {
    background: #e3f2fd;
    color: #0d47a1;
  }
}

// Descripción con aviso de atención inmediata
.celda-descripcion {
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aviso-inmediato {
  color: #e65100;
  vertical-align: middle;
}

// Chip de estado (fondo suave + texto oscuro)
.chip-estado {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}

@media (max-width: 600px) {
  .resumen {
    gap: 6px;
  }

  .pildora {
    padding: 6px 10px;
  }
}
</style>
