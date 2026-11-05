<script setup>
/**
 * /views/ParametrosView.vue
 * Catálogo de parámetros de análisis (RF-030).
 */
import { computed, onMounted, ref } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'

import { get, post, put, patch } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { useConfirmar } from '@/composables/useConfirmar'
import { requerido, maximo, enteroMayorA } from '@/utils/reglas'

const general = useGeneralStore()
const { notificarOk, notificarError } = useNotificar()
const { confirmar } = useConfirmar()

const formatPrecio = (valor) =>
  Number(valor).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const columnas = [
  { name: 'nombre', label: 'Parámetro', field: 'nombre', align: 'left', sortable: true },
  { name: 'descripcion', label: 'Descripción', field: 'descripcion', align: 'left' },
  { name: 'unidad', label: 'Unidad', field: 'unidad', align: 'center' },
  { name: 'precio', label: 'Precio', field: 'precio', align: 'right', sortable: true, format: (v) => formatPrecio(v) },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'center', sortable: true },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'right' },
]

const parametros = ref([])
const cargando = ref(false)
const error = ref(null)

const cargar = async () => {
  cargando.value = true
  error.value = null
  try {
    parametros.value = await get('/parametros')
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
const parametroEditando = ref(null)
const formularioRef = ref(null)

const formularioVacio = () => ({ nombre: '', descripcion: '', precio: null, unidad: '' })
const formulario = ref(formularioVacio())

const esEdicion = computed(() => parametroEditando.value !== null)

const abrirCreacion = () => {
  parametroEditando.value = null
  formulario.value = formularioVacio()
  dialogo.value = true
}

const abrirEdicion = (parametro) => {
  parametroEditando.value = parametro
  formulario.value = {
    nombre: parametro.nombre,
    descripcion: parametro.descripcion || '',
    precio: Number(parametro.precio),
    unidad: parametro.unidad || '',
  }
  dialogo.value = true
}

const guardar = async () => {
  guardando.value = true
  try {
    const datos = {
      nombre: formulario.value.nombre.trim(),
      descripcion: formulario.value.descripcion.trim(),
      precio: Number(formulario.value.precio),
      unidad: formulario.value.unidad.trim(),
    }

    const respuesta = esEdicion.value
      ? await put(`/parametros/${parametroEditando.value._id}`, datos)
      : await post('/parametros', datos)

    notificarOk(respuesta.mensaje)
    dialogo.value = false
    await cargar()
  } catch (e) {
    notificarError(e)
  } finally {
    guardando.value = false
  }
}

// --- Activar / desactivar ----------------------------------------------------
const cambiarActivo = async (parametro) => {
  const activar = !parametro.activo
  const aceptado = await confirmar({
    titulo: activar ? 'Activar parámetro' : 'Desactivar parámetro',
    mensaje: `¿Confirmas ${activar ? 'activar' : 'desactivar'} el parámetro ${parametro.nombre}?`,
    textoOk: activar ? 'Activar' : 'Desactivar',
    color: activar ? 'primary' : 'negative',
  })
  if (!aceptado) return

  try {
    const respuesta = await patch(`/parametros/${parametro._id}/activo`, { activo: activar })
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
        titulo="Parámetros de análisis"
        subtitulo="Catálogo de análisis disponibles"
        icono="tune"
      >
        <template #acciones>
          <q-btn unelevated no-caps color="primary" icon="add" label="Nuevo parámetro" @click="abrirCreacion" />
        </template>
      </EncabezadoPagina>

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" @click="cargar" /></template>
      </q-banner>

      <TablaDatos :filas="parametros" :columnas="columnas" :cargando="cargando" mensaje-vacio="Aún no hay parámetros registrados">
        <template #body-cell-activo="celda">
          <q-td :props="celda" class="text-center">
            <q-badge :color="celda.row.activo ? 'positive' : 'grey-6'" :label="celda.row.activo ? 'Activo' : 'Inactivo'" />
          </q-td>
        </template>

        <template #body-cell-acciones="celda">
          <q-td :props="celda" class="text-right">
            <q-btn flat dense round size="sm" icon="edit" color="primary" class="action-secondary" @click="abrirEdicion(celda.row)">
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn
              flat dense round size="sm" class="action-secondary"
              :icon="celda.row.activo ? 'toggle_on' : 'toggle_off'"
              :color="celda.row.activo ? 'negative' : 'positive'"
              @click="cambiarActivo(celda.row)"
            >
              <q-tooltip>{{ celda.row.activo ? 'Desactivar' : 'Activar' }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </TablaDatos>
    </div>

    <!-- Formulario -->
    <q-dialog v-model="dialogo" persistent @show="formularioRef?.resetValidation()">
      <q-card class="dialog-card">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon :name="esEdicion ? 'edit' : 'add'" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">{{ esEdicion ? 'Editar parámetro' : 'Nuevo parámetro' }}</div>
            <div class="text-caption text-green-2">Catálogo de análisis</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-form ref="formularioRef" greedy @submit="guardar">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model="formulario.nombre"
              outlined dense label="Nombre del parámetro *"
              :rules="[requerido('El nombre'), maximo(100, 'El nombre')]" lazy-rules
            >
              <template #prepend><q-icon name="science" /></template>
            </q-input>

            <q-input v-model="formulario.descripcion" type="textarea" outlined label="Descripción" rows="2" />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-7">
                <q-input
                  v-model.number="formulario.precio"
                  outlined dense type="number" label="Precio (COP) *" step="any"
                  :rules="[requerido('El precio'), enteroMayorA(-1, 'El precio')]" lazy-rules
                >
                  <template #prepend><q-icon name="payments" /></template>
                </q-input>
              </div>
              <div class="col-12 col-sm-5">
                <q-input v-model="formulario.unidad" outlined dense label="Unidad" hint="Ej: %, mg, pH" />
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
            <q-btn
              unelevated no-caps type="submit" color="primary" class="btn-ok"
              :label="esEdicion ? 'Guardar cambios' : 'Registrar parámetro'"
              :loading="guardando"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>
