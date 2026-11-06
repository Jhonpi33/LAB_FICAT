<script setup>
/**
 * /views/NotificacionesView.vue
 * Bandeja de correo SIMULADO (RF-111/112, RNF-019). Muestra las notificaciones
 * automáticas del sistema y permite encolar manuales, simular el resultado del
 * envío y reenviar las fallidas (máx. 3 intentos).
 *
 * La tabla plana se presenta como una BANDEJA de correo (estilo Skiff Mail):
 * círculo de tipo, asunto en negrita con destinatario debajo, chip de estado
 * con punto de color, meta en gris pequeño y acciones que aparecen al hover.
 */
import { computed, onMounted, ref, watch } from 'vue'

import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'

import { get, post, patch } from '@/services/api.service'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { useConfirmar } from '@/composables/useConfirmar'
import { requerido, seleccionRequerida } from '@/utils/reglas'
import { tipoInfo, estadoInfo, fechaCorta } from '@/utils/notificaciones'

const general = useGeneralStore()
const { notificarOk, notificarError } = useNotificar()
const { confirmar } = useConfirmar()

/**
 * Normaliza texto para comparar sin distinguir mayúsculas ni acentos:
 * "cambio" debe encontrar "cambió" y "muestra" debe encontrar "Muestra".
 * Sin esto, el buscador parecía no responder según lo que se escribiera.
 */
const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

// --- Datos -------------------------------------------------------------------
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

// --- Buscador, pestañas y paginación (misma lógica de antes, ahora a mano) ----
const busqueda = ref('')
const pestana = ref('todas')
const pagina = ref(1)
const porPagina = ref(10)

const opcionesPorPagina = [
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: 'Todos', value: 0 },
]

const conteos = computed(() => ({
  todas: notificaciones.value.length,
  pendientes: notificaciones.value.filter((n) => n.estado === 'pendiente').length,
  enviadas: notificaciones.value.filter((n) => n.estado === 'enviada').length,
}))

// Coincide la búsqueda con una notificación (ignora acentos y mayúsculas).
const coincide = (n, q) =>
  [n.asunto, n.correo_destino, n.mensaje, tipoInfo(n.tipo).label, estadoInfo(n.estado).label]
    .some((campo) => normalizar(campo).includes(q))

/**
 * Vista previa corta del mensaje para la segunda línea de la fila:
 * llena el ancho de la columna y se lleva el espacio en blanco que
 * sobraba a la derecha del asunto.
 */
const previsualizacion = (n) => {
  const texto = String(n.mensaje || '').replace(/\s+/g, ' ').trim()
  if (!texto) return 'Sin mensaje'
  // 180 caracteres: la fila se llena hasta el chip y queda menos blanco.
  return texto.length > 180 ? `${texto.slice(0, 180)}…` : texto
}

const filtradas = computed(() => {
  const q = normalizar(busqueda.value)
  return notificaciones.value.filter((n) => {
    if (pestana.value === 'pendientes' && n.estado !== 'pendiente') return false
    if (pestana.value === 'enviadas' && n.estado !== 'enviada') return false
    if (!q) return true
    return coincide(n, q)
  })
})

const totalPaginas = computed(() => {
  if (porPagina.value <= 0) return 1
  return Math.max(1, Math.ceil(filtradas.value.length / porPagina.value))
})

const paginaEfectiva = computed(() => Math.min(pagina.value, totalPaginas.value))

const filasVisibles = computed(() => {
  if (porPagina.value <= 0) return filtradas.value
  const inicio = (paginaEfectiva.value - 1) * porPagina.value
  return filtradas.value.slice(inicio, inicio + porPagina.value)
})

const rango = computed(() => {
  const total = filtradas.value.length
  if (total === 0) return '0 de 0'
  const inicio = (paginaEfectiva.value - 1) * porPagina.value + 1
  const fin = porPagina.value <= 0 ? total : Math.min(paginaEfectiva.value * porPagina.value, total)
  return `${inicio}-${fin} de ${total}`
})

const sinResultados = computed(() => !cargando.value && filasVisibles.value.length === 0)

// Al cambiar de pestaña, de búsqueda o de tamaño de página, vuelta a la 1.
watch([busqueda, pestana, porPagina], () => {
  pagina.value = 1
})

const cambiarPestana = (nombre) => {
  pestana.value = nombre
}

// --- Crear manual ------------------------------------------------------------
const dialogo = ref(false)
const guardando = ref(false)
const formulario = ref({ cliente_id: null, asunto: '', mensaje: '' })
const formularioRef = ref(null) // q-form: valida antes de encolar

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
    icono: 'mark_email_read',
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
    icono: 'error_outline',
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
  <q-page class="pagina-bandeja">
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Notificaciones"
        subtitulo="Bandeja de correo simulado"
        icono="mail"
      >
        <template #acciones>
          <q-btn unelevated no-caps class="btn-nueva" @click="abrirCreacion">
            <span class="btn-nueva__icono"><q-icon name="add" size="20px" /></span>
            <span class="btn-nueva__texto">Nueva notificación</span>
          </q-btn>
        </template>
      </EncabezadoPagina>

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action><q-btn flat dense no-caps label="Reintentar" @click="cargar" /></template>
      </q-banner>

      <!-- Bandeja -->
      <div class="bandeja">
        <!-- Buscador + pestañas -->
        <div class="bandeja__barra">
          <q-input
            v-model="busqueda"
            dense outlined clearable
            placeholder="Buscar asunto, destinatario..."
            class="bandeja__buscar"
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>

          <div class="pestanas" role="tablist" aria-label="Filtrar notificaciones">
            <button
              type="button" class="pestana" :class="{ 'pestana--activa': pestana === 'todas' }"
              role="tab" :aria-selected="pestana === 'todas'" @click="cambiarPestana('todas')"
            >
              Todas <span class="pestana__contador">{{ conteos.todas }}</span>
            </button>
            <button
              type="button" class="pestana" :class="{ 'pestana--activa': pestana === 'pendientes' }"
              role="tab" :aria-selected="pestana === 'pendientes'" @click="cambiarPestana('pendientes')"
            >
              Pendientes <span class="pestana__contador">{{ conteos.pendientes }}</span>
            </button>
            <button
              type="button" class="pestana" :class="{ 'pestana--activa': pestana === 'enviadas' }"
              role="tab" :aria-selected="pestana === 'enviadas'" @click="cambiarPestana('enviadas')"
            >
              Enviadas <span class="pestana__contador">{{ conteos.enviadas }}</span>
            </button>
          </div>
        </div>

        <!-- Lista -->
        <div class="bandeja__lista">
          <!-- Misma línea de carga (grey-8, indeterminada) que pinta q-table
               en Informes/Incidencias cuando loading = true. -->
          <q-linear-progress
            v-if="cargando"
            indeterminate
            color="grey-8"
            track-color="transparent"
            class="bandeja__progreso"
          />

          <q-inner-loading :active="cargando" label="Consultando al servidor..." color="primary" />

          <template v-if="filasVisibles.length">
            <div
              v-for="n in filasVisibles"
              :key="n._id"
              class="fila"
              :class="`fila--${n.estado}`"
            >
              <!-- 1. Tipo: círculo con ícono y color propio -->
              <div class="fila__avatar" :style="{ background: tipoInfo(n.tipo).fondo, color: tipoInfo(n.tipo).color }">
                <q-icon :name="tipoInfo(n.tipo).icon" size="20px" />
                <q-tooltip>{{ tipoInfo(n.tipo).label }}</q-tooltip>
              </div>

              <!-- 2. Asunto en negrita + destinatario debajo en gris (sin mono) -->
              <div class="fila__cuerpo">
                <div class="fila__asunto">{{ n.asunto }}</div>
                <div class="fila__destino">
                  <span class="fila__tipo" :style="{ color: tipoInfo(n.tipo).color }">{{ tipoInfo(n.tipo).label }}</span>
                  <span class="fila__sep">·</span>
                  <span class="fila__correo">{{ n.correo_destino || 'Sin destinatario' }}</span>
                  <!-- Vista previa del mensaje: llena la fila y reduce el
                       espacio en blanco que sobraba a la derecha -->
                  <span class="fila__sep">·</span>
                  <span class="fila__preview">{{ previsualizacion(n) }}</span>
                </div>
              </div>

              <!-- 3. Estado: chip con punto de color -->
              <span
                class="fila__estado"
                :style="{ background: estadoInfo(n.estado).fondo, color: estadoInfo(n.estado).texto }"
              >
                <i class="fila__punto" :style="{ background: estadoInfo(n.estado).color }"></i>
                {{ estadoInfo(n.estado).label }}
              </span>

              <!-- 4. Intentos y programada: texto pequeño en gris, fecha corta -->
              <div class="fila__meta">
                <span class="fila__fecha" :title="n.fecha_programada">{{ fechaCorta(n.fecha_programada) }}</span>
                <span class="fila__intentos">{{ n.intentos }} {{ n.intentos === 1 ? 'intento' : 'intentos' }}</span>
              </div>

              <!-- 5. Acciones: botones con tooltip, visibles al pasar el mouse -->
              <div class="fila__acciones">
                <template v-if="n.estado === 'pendiente'">
                  <q-btn flat dense round size="sm" icon="check" color="positive" class="action-secondary" @click="simularEnvio(n)">
                    <q-tooltip>Enviar ahora</q-tooltip>
                  </q-btn>
                  <q-btn flat dense round size="sm" icon="close" color="negative" class="action-secondary" @click="simularFallo(n)">
                    <q-tooltip>Cancelar</q-tooltip>
                  </q-btn>
                </template>
                <q-btn
                  v-if="n.estado === 'fallida' && n.intentos < 3"
                  flat dense round size="sm" icon="refresh" color="info" class="action-secondary"
                  @click="reenviar(n)"
                >
                  <q-tooltip>Reenviar (intento {{ n.intentos + 1 }}/3)</q-tooltip>
                </q-btn>
              </div>
            </div>
          </template>

          <!-- Estado vacío -->
          <div v-else-if="sinResultados" class="bandeja__vacia">
            <q-icon name="inbox" size="56px" color="grey-4" class="q-mb-sm" />
            <span class="empty-title">
              {{ busqueda || pestana !== 'todas' ? 'Ninguna notificación coincide con el filtro' : 'La bandeja está vacía' }}
            </span>
          </div>
        </div>

        <!-- Paginación -->
        <div class="bandeja__pie">
          <div class="pie__paginas">
            <span class="pie__texto">Registros por página</span>
            <q-select
              v-model="porPagina" dense outlined :options="opcionesPorPagina"
              emit-value map-options class="pie__select" aria-label="Registros por página"
            />
          </div>

          <div class="pie__rango">
            <span class="pie__texto">{{ rango }}</span>
            <q-btn
              flat dense round icon="chevron_left" size="sm" aria-label="Página anterior"
              :disable="paginaEfectiva <= 1" @click="pagina = paginaEfectiva - 1"
            />
            <q-btn
              flat dense round icon="chevron_right" size="sm" aria-label="Página siguiente"
              :disable="paginaEfectiva >= totalPaginas" @click="pagina = paginaEfectiva + 1"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Nueva notificación: mismo estilo del diálogo "Nuevo cliente"
         (cabecera con degradado, secciones etiquetadas y pie con pista). -->
    <q-dialog v-model="dialogo" persistent @show="formularioRef?.resetValidation()">
      <q-card class="dlg-notif">
        <!-- Cabecera: degradado verde + círculos decorativos -->
        <div class="dlg-notif__cabecera">
          <span class="dlg-notif__decoracion dlg-notif__decoracion--1" aria-hidden="true"></span>
          <span class="dlg-notif__decoracion dlg-notif__decoracion--2" aria-hidden="true"></span>

          <span class="dlg-notif__icono"><q-icon name="mail" size="26px" /></span>
          <div class="dlg-notif__textos">
            <div class="dlg-notif__titulo">Nueva notificación</div>
            <div class="dlg-notif__subtitulo">Se encola en la bandeja de correo simulado</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" class="dlg-notif__cerrar" />
        </div>

        <q-form ref="formularioRef" greedy class="dlg-notif__cuerpo" @submit="guardar">
          <!-- Sección: destinatario -->
          <div class="dlg-notif__seccion">
            <div class="dlg-notif__seccion-titulo">
              <q-icon name="person" size="14px" />
              <span>Destinatario</span>
              <i class="dlg-notif__linea"></i>
            </div>

            <q-select
              v-model="formulario.cliente_id"
              outlined dense :options="opcionesCliente" emit-value map-options
              label="Destinatario (cliente) *"
              :rules="[seleccionRequerida('el destinatario')]" lazy-rules
              class="dlg-notif__campo"
            >
              <template #prepend><q-icon name="person" /></template>
            </q-select>
          </div>

          <!-- Sección: contenido -->
          <div class="dlg-notif__seccion">
            <div class="dlg-notif__seccion-titulo">
              <q-icon name="edit_note" size="14px" />
              <span>Contenido</span>
              <i class="dlg-notif__linea"></i>
            </div>

            <q-input
              v-model="formulario.asunto"
              outlined dense label="Asunto *"
              :rules="[requerido('El asunto')]" lazy-rules
              class="dlg-notif__campo"
            >
              <template #prepend><q-icon name="subject" /></template>
            </q-input>

            <q-input
              v-model="formulario.mensaje"
              type="textarea" outlined dense label="Mensaje *" rows="4"
              :rules="[requerido('El mensaje')]" lazy-rules
              class="dlg-notif__campo"
            >
              <template #prepend><q-icon name="notes" /></template>
            </q-input>
          </div>

          <!-- Pie: pista + acciones -->
          <div class="dlg-notif__pie">
            <span class="dlg-notif__pista">
              <q-icon name="info" size="14px" />
              Los campos con * son obligatorios
            </span>
            <div class="dlg-notif__acciones">
              <q-btn v-close-popup flat no-caps label="Cancelar" class="dlg-notif__cancelar" />
              <q-btn
                unelevated no-caps type="submit" label="Encolar" icon="send"
                class="dlg-notif__guardar" :loading="guardando"
              />
            </div>
          </div>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

// --- Botón "Nueva notificación" ----------------------------------------------
// Mismo lenguaje que el diálogo: degradado verde, ícono en recuadro
// translúcido, sombra verde y elevación al pasar el mouse.
.btn-nueva {
  display: inline-flex;
  align-items: center;
  gap: 16px; // separa el "+" del texto
  height: 44px;
  padding: 0 20px 0 14px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.01em;
  color: #fff;
  // Sombra neutra (sin tinte verde): eleva sin dejar resplandor verde.
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.14);
  background-image: linear-gradient(135deg, #43a047, #2e7d32) !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.14);
  }
}

.btn-nueva__icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-right: 6px; // el gap no llega: los hermanos van dentro de .q-btn__content
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.45);
  color: #fff; // el "+" siempre blanco, nunca verde oscuro
  transition: transform 0.15s ease;
}

.btn-nueva :deep(.q-btn__content) {
  gap: 12px; // separación real entre el círculo y el texto
}

.btn-nueva:hover .btn-nueva__icono {
  transform: rotate(90deg); // el "+" gira al pasar el mouse
}

.btn-nueva__texto {
  color: #fff;
}

// --- Encabezado de la página (rediseño local de esta vista) -----------------
// Icono en degradado con sombra (como los diálogos), título en verde
// oscuro y subtítulo convertido en píldora verde suave con punto.
.encabezado-pagina {
  :deep(.encabezado-pagina__icono) {
    width: 50px !important;
    height: 50px !important;
    border-radius: 14px !important;
    background-image: linear-gradient(135deg, #43a047, #2e7d32);
    box-shadow: 0 8px 18px rgba(46, 125, 50, 0.28);
  }

  :deep(.encabezado-pagina__icono .q-icon) {
    font-size: 26px !important;
  }

  :deep(.titulo-vista) {
    color: #1b5e20;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  :deep(.encabezado-pagina__subtitulo) {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-top: 8px;
    padding: 5px 13px;
    border-radius: 999px;
    background: #e8f5e9;
    color: #1b5e20;
    font-size: 12.5px;
    font-weight: 600;
  }

  :deep(.encabezado-pagina__subtitulo)::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #2e7d32;
  }
}

// --- Contenedor de la bandeja ------------------------------------------------
// Mismo lenguaje que el diálogo "Nueva notificación": radio grande, borde
// verde tenue y sombra verde en vez del recuadro plano con borde gris.
.bandeja {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #d7ead7;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: none; // sin sombra verde: se veía sucio debajo de la tarjeta
  min-height: 340px; // solo para estados vacíos/carga; el alto lo da la lista
}

// Página con fondo degradado (verde muy claro → blanco): lo que sobra
// debajo de la tarjeta se ve como fondo diseñado, no como blanco crudo.
.pagina-bandeja {
  background-image: linear-gradient(180deg, #edf6ed 0%, #f9fdf9 45%, #ffffff 100%);
}

// --- Barra superior: buscador + pestañas -------------------------------------
// Cabecera con el MISMO degradado verde y círculos decorativos que la
// cabecera del diálogo "Nueva notificación".
.bandeja__barra {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background-image: linear-gradient(135deg, #43a047 0%, #2e7d32 55%, #1b5e20 100%);
  flex-shrink: 0;
  overflow: hidden;
}

.bandeja__barra::before,
.bandeja__barra::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.bandeja__barra::before {
  width: 180px;
  height: 180px;
  right: -50px;
  top: -110px;
}

.bandeja__barra::after {
  width: 130px;
  height: 130px;
  left: 36%;
  bottom: -100px;
  background: rgba(255, 255, 255, 0.06);
}

.bandeja__buscar {
  flex: 1 1 260px;
  min-width: 220px;
  position: relative; // por encima de los círculos decorativos
  z-index: 1;

  // Sobre el degradado el campo debe ser BLANCO: Quasar lo deja
  // transparente por defecto y el verde se "comería" el texto.
  // Ojo: .q-field--outlined está en el MISMO elemento que esta clase,
  // por eso se apunta directo a .q-field__control (sin encadenarla).
  :deep(.q-field__control) {
    background-color: #fff;
    border-radius: 10px;
  }

  :deep(.q-field--focused .q-field__control) {
    border-color: #fff;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.35);
  }

  // Texto escrito y placeholder en tonos oscuros (sobre blanco se leen).
  :deep(.q-field__input) {
    color: #1d1d1d;
  }

  :deep(.q-field__input::placeholder) {
    color: #9e9e9e;
  }

  // Icono de búsqueda en verde SENA.
  :deep(.q-field__prepend) {
    color: #2e7d32;
  }

  // --- Línea amarilla del campo ---------------------------------------------
  // 1) subrayado nativo del input (estilo standard/filled): nunca aplica.
  :deep(.q-field__control::after) {
    display: none;
  }

  // 2) autofill del navegador (Chrome/Opera tiñe el campo de amarillo):
  //    se pisa con fondo blanco y texto oscuro.
  :deep(input:-webkit-autofill),
  :deep(input:-webkit-autofill:hover),
  :deep(input:-webkit-autofill:focus) {
    -webkit-box-shadow: 0 0 0 1000px #fff inset;
    -webkit-text-fill-color: #1d1d1d;
    caret-color: #2e7d32;
    transition: background-color 9999s ease-out;
  }

  // 3) cursor y foco en VERDE (nunca amarillo).
  :deep(input) {
    caret-color: #2e7d32;
  }

  :deep(.q-field--focused .q-field__control::before) {
    border-color: #2e7d32;
  }
}

.pestanas {
  position: relative; // por encima de los círculos decorativos
  z-index: 1;
  display: flex;
  gap: 6px;
}

// Pestañas sobre verde: píldoras translúcidas; la activa pasa a blanco
// con texto verde oscuro (mismo contraste que el diálogo).
.pestana {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.26);
    border-color: rgba(255, 255, 255, 0.55);
  }

  &--activa {
    background: #fff;
    border-color: #fff;
    color: #1b5e20;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);

    &:hover {
      background: #fff;
      border-color: #fff;
      color: #1b5e20;
    }
  }
}

.pestana__contador {
  background: rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 1px 7px;
  font-size: 12px;
  font-weight: 700;

  .pestana--activa & {
    background: rgba(46, 125, 50, 0.14);
    color: #1b5e20;
  }
}

// --- Lista de correos --------------------------------------------------------
.bandeja__lista {
  position: relative;
  flex: 1 1 auto; // crece para que el pie quede al fondo de la tarjeta
  min-height: 140px;
}

// Línea de carga tipo q-table: pegada arriba del área de la lista.
.bandeja__progreso {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3; // por encima del velo de q-inner-loading
}

.fila {
  position: relative;
  display: grid;
  // 4 columnas: avatar · asunto · estado (ancho fijo 110px) · meta a la
  // derecha. Las acciones NO ocupan columna: se superponen al hacer hover
  // (estilo Gmail), así la fecha queda pegada al borde y no se reserva un
  // hueco en blanco a la derecha de cada fila.
  grid-template-columns: 40px minmax(0, 1fr) 110px auto;
  align-items: center;
  gap: 14px;
  // Izquierda: 13px + 3px de barra = 16px (alineado con la cabecera).
  // Derecha: 16px → la fecha queda pegada al borde, alineada con la
  // paginación del pie. El chip se aparta con margin-left en .fila__meta.
  padding: 14px 16px 14px 13px;
  // Barra lateral de estado: 3px del color del chip (izquierda del texto).
  border-left: 3px solid transparent;
  border-bottom: 1px solid #eaf2ea; // separador verde tenue
  transition: background 0.15s ease;

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: rgba(46, 125, 50, 0.06);
  }
}

// Barra lateral según estado: mismo color que el chip → el color y el
// orden de la fila se leen de un vistazo.
.fila--pendiente {
  border-left-color: #f59e0b;
}

.fila--enviada {
  border-left-color: #2e7d32;
}

.fila--fallida {
  border-left-color: #e53935;
}

.fila__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fila__cuerpo {
  min-width: 0;
}

.fila__asunto {
  font-size: 14.5px;
  font-weight: 700;
  color: $texto-principal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fila__destino {
  margin-top: 3px;
  font-size: 12.5px;
  color: #9e9e9e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fila__tipo {
  font-weight: 600;
}

.fila__sep {
  margin: 0 5px;
  color: #bdbdbd;
}

.fila__correo {
  font-family: inherit; // nunca monoespaciada
}

// Vista previa del mensaje en gris claro: llena la fila sin competir
// con el asunto en negrita.
.fila__preview {
  color: #b0bec5;
}

// Asunto según estado: las enviadas se suavizan y las fallidas se tiñen
// de rojo, para que las pendientes destaquen (orden visual de la bandeja).
.fila--enviada .fila__asunto {
  color: #455a64;
  font-weight: 600;
}

.fila--fallida .fila__asunto {
  color: #b71c1c;
}

// Chip de estado con punto de color. Ocupa TODO el ancho de su columna
// fija y centra su contenido: todos los chips miden igual (misma forma
// de píldora) y el texto siempre queda en el centro.
.fila__estado {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 26px;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); // sutil elevación, no opaco
}

.fila__punto {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

// Meta: fecha e intentos, pequeño y gris
.fila__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 132px;
  text-align: right;
  // Empuja la fecha hacia la derecha y, de paso, corre el chip de estado
  // hacia la izquierda (la columna 1fr absorbe el espacio): la fecha queda
  // alineada al borde con la paginación y el chip más cerca del contenido.
  margin-left: 120px;
}

.fila__fecha {
  font-size: 12.5px;
  color: $texto-secundario;
}

.fila__intentos {
  font-size: 11.5px;
  color: #9e9e9e;
}

// Acciones: aparecen al hover sobre la fecha con un degradado blanco que
// la "desvanece" detrás de los botones (estilo Gmail).
.fila__acciones {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px 6px 34px;
  border-radius: 12px;
  background-image: linear-gradient(90deg, rgba(255, 255, 255, 0), #fff 34px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.fila:hover .fila__acciones,
.fila:focus-within .fila__acciones {
  opacity: 1;
  pointer-events: auto;
}

@media (hover: none) {
  // Sin hover (táctil): las acciones quedan siempre visibles y necesitan
  // su propia zona a la derecha para no tapar la fecha.
  .fila {
    padding-right: 130px;
  }

  .fila__acciones {
    opacity: 1;
    pointer-events: auto;
  }
}

// --- Estado vacío ------------------------------------------------------------
.bandeja__vacia {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 18px;
}

// --- Pie: paginación ---------------------------------------------------------
.bandeja__pie {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid #e3eee3;
  background: #fff; // liso, sin degradado verde
  flex-shrink: 0;
}

.pie__paginas,
.pie__rango {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pie__texto {
  font-size: 13px;
  color: $texto-secundario;
}

.pie__select {
  min-width: 88px;
  // Sin overrides de altura: Quasar ya lo renderiza compacto con `dense`,
  // y forzar el alto descuadra el borde respecto al texto del lado izquierdo.
}

// --- Diálogo "Nueva notificación" (inspirado en "Nuevo cliente") -------------
// Cabecera con degradado + círculos decorativos, cuerpo con fondo degradado
// (nada opaco), secciones etiquetadas con icono y línea, y pie con pista.
.dlg-notif {
  width: 640px;
  max-width: 95vw;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 24px 60px rgba(27, 94, 32, 0.32);
}

.dlg-notif__cabecera {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  overflow: hidden;
  color: #fff;
  background-image: linear-gradient(135deg, #43a047 0%, #2e7d32 55%, #1b5e20 100%);
}

// Círculos decorativos del fondo (solo atmósfera, no capturan clics)
.dlg-notif__decoracion {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.09);
  pointer-events: none;
}

.dlg-notif__decoracion--1 {
  width: 170px;
  height: 170px;
  right: -40px;
  top: -85px;
}

.dlg-notif__decoracion--2 {
  width: 110px;
  height: 110px;
  right: 110px;
  bottom: -70px;
  background: rgba(255, 255, 255, 0.06);
}

.dlg-notif__icono {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.dlg-notif__textos {
  position: relative;
  min-width: 0;
}

.dlg-notif__titulo {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}

.dlg-notif__subtitulo {
  margin-top: 2px;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.85);
}

.dlg-notif__cerrar {
  position: relative;
}

// Cuerpo: degradado muy claro verde→blanco (anti opacidad)
.dlg-notif__cuerpo {
  padding: 18px 22px 0;
  background-image: linear-gradient(180deg, #f3faf3 0%, #ffffff 130px);
}

.dlg-notif__seccion + .dlg-notif__seccion {
  margin-top: 16px;
}

.dlg-notif__seccion-titulo {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 10px;
  color: #2e7d32;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.dlg-notif__linea {
  flex: 1;
  height: 1px;
  background-image: linear-gradient(90deg, rgba(46, 125, 50, 0.35), rgba(46, 125, 50, 0.04));
}

.dlg-notif__campo {
  margin-bottom: 12px;
}

// Campos: esquinas redondeadas, iconos en verde SENA y foco con halo
.dlg-notif {
  :deep(.q-field--outlined .q-field__control) {
    border-radius: 10px;
  }

  :deep(.q-field--outlined.q-field--focused .q-field__control) {
    border-color: #2e7d32;
    box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.15);
  }

  :deep(.q-field__prepend) {
    padding-right: 6px;
    color: #2e7d32;
  }
}

.dlg-notif__pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px -22px 0; // sangra hasta el borde del diálogo
  padding: 14px 22px 18px;
  background: #fff;
  border-top: 1px solid #e8f1e8;
}

.dlg-notif__pista {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #9e9e9e;
}

.dlg-notif__acciones {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.dlg-notif__cancelar {
  padding: 8px 14px;
  border-radius: 8px;
  color: #455a64;
  font-weight: 600;
}

// Botón "Encolar": BLANCO con texto y borde verdes (el degradado se veía
// oscuro contra el pie claro del diálogo).
.dlg-notif__guardar {
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  font-weight: 700;
  background: #fff !important;
  background-image: none !important;
  color: #1b5e20 !important;
  border: 1px solid #2e7d32;
  box-shadow: 0 6px 16px rgba(46, 125, 50, 0.18);
}

.dlg-notif__guardar:hover {
  background: #f0f8f0 !important;
  color: #1b5e20 !important;
}

// --- Responsive --------------------------------------------------------------
@media (max-width: 700px) {
  .fila {
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 10px;
    padding-right: 16px; // sin zona reservada: las acciones van en el flujo
  }

  .fila__estado {
    grid-column: 2;
    // Mismo ancho fijo que en escritorio: todos los chips siguen midiendo
    // igual (el contenido, centrado), solo que alineados al inicio en móvil.
    width: 110px;
    justify-self: start;
  }

  .fila__meta {
    grid-column: 2;
    align-items: flex-start;
    text-align: left;
    min-width: 0;
    margin-left: 0; // sin empuje: en móvil la fecha va a la izquierda
  }

  .fila__acciones {
    position: static;
    transform: none;
    padding: 0;
    background-image: none;
    grid-column: 2;
    justify-content: flex-start;
    opacity: 1;
    pointer-events: auto;
    min-width: 0;
  }
}
</style>
