<script setup>
/**
 * /views/UsuariosView.vue
 * CRUD de usuarios del personal del laboratorio (solo administrador).
 * Consume el módulo real /usuarios del backend.
 */
import { computed, onMounted, ref } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'

import { get, post, put, patch } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useAuthStore } from '@/store/Auth'
import { useNotificar } from '@/composables/useNotificar'
import { useConfirmar } from '@/composables/useConfirmar'
import { formatDate } from '@/utils/formatDate'
import { requerido, esEmail, minimo, contrasenaValida, igualA, seleccionRequerida } from '@/utils/reglas'

const general = useGeneralStore()
const auth = useAuthStore()
const { notificarOk, notificarError } = useNotificar()
const { confirmar } = useConfirmar()

const ROL_LABEL = { admin: 'Administrador', encargado: 'Encargado', usuario: 'Usuario / Cliente' }
const ROL_OPCIONES = [
  { label: 'Encargado', value: 'encargado' },
  { label: 'Usuario / Cliente', value: 'usuario' },
]

const columnas = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left', sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left', sortable: true },
  { name: 'rol', label: 'Rol', field: 'rol', align: 'center', sortable: true },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'center', sortable: true },
  { name: 'fecha_creacion', label: 'Creado', field: 'fecha_creacion', align: 'left', sortable: true, format: (v) => formatDate(v) },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'right' },
]

// --- Listado ----------------------------------------------------------------
const usuarios = ref([])
const cargando = ref(false)
const error = ref(null)

const cargar = async () => {
  cargando.value = true
  error.value = null

  try {
    usuarios.value = await get('/usuarios')
    general.marcarSincronizacion()
  } catch (e) {
    error.value = e.mensaje
    notificarError(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

// --- Formulario crear/editar ------------------------------------------------
const dialogo = ref(false)
const guardando = ref(false)
const usuarioEditando = ref(null)
const formularioRef = ref(null)
const verPassword = ref(false)

const formularioVacio = () => ({ nombre: '', email: '', password: '', confirmacion: '', rol: 'encargado' })
const formulario = ref(formularioVacio())

const esEdicion = computed(() => usuarioEditando.value !== null)
const esAdminSeleccionado = computed(() => usuarioEditando.value?.rol === 'admin')

const abrirCreacion = () => {
  usuarioEditando.value = null
  formulario.value = formularioVacio()
  dialogo.value = true
}

const abrirEdicion = (usuario) => {
  usuarioEditando.value = usuario
  formulario.value = {
    nombre: usuario.nombre,
    email: usuario.email,
    password: '',
    confirmacion: '',
    rol: usuario.rol,
  }
  dialogo.value = true
}

const guardar = async () => {
  guardando.value = true

  try {
    const datos = {
      nombre: formulario.value.nombre.trim(),
      email: formulario.value.email.trim(),
    }
    if (formulario.value.password) datos.password = formulario.value.password
    if (esEdicion.value && !esAdminSeleccionado.value) datos.rol = formulario.value.rol

    const respuesta = esEdicion.value
      ? await put(`/usuarios/${usuarioEditando.value._id}`, datos)
      : await post('/usuarios', { ...datos, password: formulario.value.password })

    notificarOk(respuesta.mensaje)
    dialogo.value = false
    await cargar()
  } catch (e) {
    notificarError(e)
  } finally {
    guardando.value = false
  }
}

// --- Activar / desactivar ---------------------------------------------------
const cambiarEstado = async (usuario) => {
  const activar = !usuario.activo

  const aceptado = await confirmar({
    titulo: activar ? 'Activar usuario' : 'Desactivar usuario',
    mensaje: `¿Confirmas ${activar ? 'activar' : 'desactivar'} la cuenta de ${usuario.nombre}?`,
    textoOk: activar ? 'Activar' : 'Desactivar',
    color: activar ? 'primary' : 'negative',
  })

  if (!aceptado) return

  try {
    const respuesta = await patch(`/usuarios/${usuario._id}/estado`, { activo: activar })
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
        titulo="Usuarios"
        subtitulo="Cuentas del personal del laboratorio"
        icono="manage_accounts"
      >
        <template #acciones>
          <q-btn unelevated no-caps color="primary" icon="person_add" label="Nuevo encargado" @click="abrirCreacion" />
        </template>
      </EncabezadoPagina>

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar>
          <q-icon name="error_outline" />
        </template>
        {{ error }}
        <template #action>
          <q-btn flat dense no-caps label="Reintentar" @click="cargar" />
        </template>
      </q-banner>

      <TablaDatos
        :filas="usuarios"
        :columnas="columnas"
        :cargando="cargando"
        mensaje-vacio="Aún no hay usuarios registrados"
      >
        <template #body-cell-rol="celda">
          <q-td :props="celda" class="text-center">
            <q-badge
              :color="celda.row.rol === 'admin' ? 'green-9' : celda.row.rol === 'encargado' ? 'green-2' : 'grey-4'"
              :text-color="celda.row.rol === 'admin' ? 'white' : celda.row.rol === 'encargado' ? 'green-10' : 'grey-8'"
              :label="ROL_LABEL[celda.row.rol] || celda.row.rol"
            />
          </q-td>
        </template>

        <template #body-cell-activo="celda">
          <q-td :props="celda" class="text-center">
            <q-badge :color="celda.row.activo ? 'positive' : 'grey-6'" :label="celda.row.activo ? 'Activo' : 'Inactivo'" />
          </q-td>
        </template>

        <template #body-cell-acciones="celda">
          <q-td :props="celda" class="text-right">
            <q-btn
              flat dense round size="sm" icon="edit" color="primary" class="action-secondary"
              @click="abrirEdicion(celda.row)"
            >
              <q-tooltip>Editar</q-tooltip>
            </q-btn>

            <q-btn
              flat dense round size="sm" class="action-secondary"
              :icon="celda.row.activo ? 'toggle_on' : 'toggle_off'"
              :color="celda.row.activo ? 'negative' : 'positive'"
              @click="cambiarEstado(celda.row)"
            >
              <q-tooltip>{{ celda.row.activo ? 'Desactivar' : 'Activar' }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </TablaDatos>
    </div>

    <!-- ===================== FORMULARIO CREAR / EDITAR ===================== -->
    <q-dialog v-model="dialogo" persistent @show="formularioRef?.resetValidation()">
      <q-card class="dialog-card">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon :name="esEdicion ? 'edit' : 'person_add'" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">{{ esEdicion ? 'Editar usuario' : 'Nuevo encargado' }}</div>
            <div class="text-caption text-green-2">Cuentas del personal del laboratorio</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-form ref="formularioRef" greedy @submit="guardar">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model="formulario.nombre"
              outlined dense label="Nombre completo *"
              :rules="[requerido('El nombre'), minimo(3, 'El nombre')]"
              lazy-rules
            >
              <template #prepend><q-icon name="person" /></template>
            </q-input>

            <q-input
              v-model="formulario.email"
              outlined dense type="email" label="Email *"
              hint="Con este correo inicia sesión"
              autocomplete="off"
              :rules="[requerido('El email'), esEmail()]"
              lazy-rules
            >
              <template #prepend><q-icon name="mail" /></template>
            </q-input>

            <q-input
              v-model="formulario.password"
              outlined dense label="Contraseña *"
              autocomplete="new-password"
              :hint="esEdicion ? 'Dejar vacío para no cambiarla' : 'Mínimo 8 caracteres y un número'"
              :type="verPassword ? 'text' : 'password'"
              :rules="[
                (v) => (esEdicion && !v) || contrasenaValida('La contraseña')(v),
              ]"
              lazy-rules
            >
              <template #prepend><q-icon name="lock" /></template>
              <template #append>
                <q-icon
                  :name="verPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="verPassword = !verPassword"
                />
              </template>
            </q-input>

            <q-input
              v-if="!esEdicion"
              v-model="formulario.confirmacion"
              outlined dense type="password" label="Confirmar contraseña *"
              autocomplete="new-password"
              :rules="[requerido('La confirmación'), igualA(() => formulario.password, 'Las contraseñas no coinciden')]"
              lazy-rules
            >
              <template #prepend><q-icon name="lock_reset" /></template>
            </q-input>

            <q-select
              v-if="esEdicion && !esAdminSeleccionado"
              v-model="formulario.rol"
              outlined dense
              :options="ROL_OPCIONES"
              emit-value
              map-options
              label="Rol *"
              :rules="[seleccionRequerida('el rol')]"
              lazy-rules
            >
              <template #prepend><q-icon name="badge" /></template>
            </q-select>

            <q-banner v-if="!esEdicion" dense class="bg-green-1 text-green-10 rounded-borders">
              <template #avatar><q-icon name="info" /></template>
              Las cuentas nuevas se crean con el rol <strong>Encargado</strong>. Los
              administradores pueden cambiar el rol luego desde la edición.
            </q-banner>
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
            <q-btn
              unelevated no-caps type="submit" color="primary" class="btn-ok"
              :label="esEdicion ? 'Guardar cambios' : 'Crear encargado'"
              :loading="guardando"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>
