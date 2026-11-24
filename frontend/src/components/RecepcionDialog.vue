<script setup>
import { computed, ref, watch } from 'vue'
import { get, put } from '@/services/api.service'
import api from '@/plugins/axios'
import { descargarPdf } from '@/services/pdf.service'
import { useNotificar } from '@/composables/useNotificar'

const abierto = defineModel({ type: Boolean })
const props = defineProps({ solicitud: String, muestra: String })
const { notificarOk, notificarError } = useNotificar()
const documento = ref(null)
const ocupado = ref(false)
const error = ref('')
const modificado = ref(false)
const pestana = ref('solicitante')
const ruta = computed(() => props.muestra ? '/firmas/muestra/' + props.muestra : '/firmas/solicitud/' + props.solicitud)
const estados = {
  nuevo: 'Por diligenciar', borrador: 'Borrador guardado', pendiente: 'Pendiente de firma', firmada: 'Firmada',
}
const editable = computed(() => ['nuevo', 'borrador'].includes(documento.value?.estado))
const puedeDescargar = computed(() => documento.value?.tienePdf && !modificado.value)

async function cargar() {
  await ejecutar(async () => {
    documento.value = await get(ruta.value)
    modificado.value = false
  })
}
watch(abierto, valor => {
  if (!valor) return
  documento.value = null
  pestana.value = 'solicitante'
  cargar()
})
async function ejecutar(accion) {
  ocupado.value = true
  error.value = ''
  try { await accion() }
  catch (e) { error.value = e.mensaje || 'No se pudo completar la operación.'; notificarError(e) }
  finally { ocupado.value = false }
}
function cambiarFila(indice) {
  const muestras = documento.value.formulario.muestras
  if (indice === undefined) muestras.push({})
  else muestras.splice(indice, 1)
  modificado.value = true
}
function guardar() {
  ejecutar(async () => {
    const respuesta = await put(ruta.value, documento.value.formulario)
    documento.value = await get(ruta.value)
    modificado.value = false
    notificarOk(respuesta.mensaje)
  })
}
function enviar() {
  ejecutar(async () => {
    if (editable.value && !puedeDescargar.value) {
      await put(ruta.value, documento.value.formulario)
      documento.value = await get(ruta.value)
      modificado.value = false
    }
    const { data } = await api.post(ruta.value, {}, { timeout: 30000 })
    documento.value = await get(ruta.value)
    notificarOk(data.mensaje)
  })
}
function descargar() {
  ejecutar(() => descargarPdf(ruta.value + '/pdf', 'Recepcion-' + (documento.value.codigoMuestra || props.solicitud) + '.pdf'))
}
</script>

<template>
  <q-dialog v-model="abierto" :persistent="ocupado">
    <q-card class="recepcion">
      <header class="recepcion__cabecera">
        <q-icon name="description" size="34px" />
        <div>
          <div class="text-caption">CAT–ST–MI–F–002</div>
          <h2 class="text-h6 q-my-none">Recepción de muestras</h2>
        </div>
        <q-space />
        <q-btn v-close-popup flat round icon="close" aria-label="Cerrar" :disable="ocupado" />
      </header>
      <q-linear-progress v-if="ocupado" indeterminate color="primary" />
      <q-banner v-if="error" rounded class="bg-red-1 text-red-10 q-ma-md" role="alert">
        {{ error }}
        <template v-if="!documento" #action><q-btn flat label="Reintentar" @click="cargar" /></template>
      </q-banner>
      <template v-if="documento">
        <div class="recepcion__resumen">
          <div>
            <div class="text-weight-bold">{{ documento.cliente }}</div>
            <div class="text-caption">{{ documento.correo }}</div>
            <div v-if="documento.codigoMuestra" class="text-caption">Muestra {{ documento.codigoMuestra }}</div>
          </div>
          <q-badge rounded :color="documento.estado === 'firmada' ? 'positive' : 'grey-8'" :label="estados[documento.estado]" />
        </div>
        <q-banner v-if="documento.excedeFormato && editable" class="bg-amber-1 q-ma-md">
          Esta solicitud tiene más de cinco muestras registradas. Este formato admite hasta cinco. Verifica cuáles deben quedar en el documento.
        </q-banner>
        <q-tabs v-model="pestana" align="left" active-color="primary" indicator-color="primary" no-caps>
          <q-tab name="solicitante" label="Solicitante y entrega" icon="badge" />
          <q-tab name="muestras" :label="'Muestras (' + documento.formulario.muestras.length + ')'" icon="science" />
        </q-tabs>
        <q-separator />
        <q-tab-panels v-model="pestana" animated class="recepcion__contenido">
          <q-tab-panel name="solicitante">
            <div class="recepcion__campos">
              <q-input v-for="[clave, etiqueta, max] in documento.camposRecepcion" :key="clave"
                v-model="documento.formulario[clave]" :label="etiqueta" :maxlength="max"
                :readonly="!editable || ocupado" outlined dense @update:model-value="modificado = true" />
            </div>
          </q-tab-panel>
          <q-tab-panel name="muestras">
            <q-expansion-item v-for="(fila, indice) in documento.formulario.muestras" :key="indice"
              class="recepcion__muestra" :label="'Muestra ' + (indice + 1) + (fila.matriz ? ' · ' + fila.matriz : '')"
              icon="biotech" :default-opened="indice === 0">
              <div class="recepcion__campos q-pa-md">
                <q-input v-for="[clave, etiqueta, max] in documento.camposMuestra" :key="clave" v-model="fila[clave]"
                  :label="etiqueta + (['tipo', 'matriz'].includes(clave) ? ' *' : '')" :maxlength="max"
                  :readonly="!editable || ocupado || (Boolean(muestra) && clave === 'codigo')" outlined dense @update:model-value="modificado = true" />
              </div>
              <q-btn v-if="!muestra && editable && documento.formulario.muestras.length > 1" flat no-caps color="negative"
                class="q-ml-md q-mb-sm" label="Quitar muestra" :disable="ocupado" @click="cambiarFila(indice)" />
            </q-expansion-item>
            <q-btn v-if="!muestra && editable" flat no-caps icon="add" color="primary" label="Agregar muestra"
              :disable="ocupado || documento.formulario.muestras.length >= 5" @click="cambiarFila()" />
          </q-tab-panel>
        </q-tab-panels>
        <q-separator />
        <div v-if="modificado" class="text-caption q-px-md q-pt-sm">Guarda los cambios antes de descargar.</div>
        <div v-if="documento.copiaEnviada" class="text-caption q-px-md q-pt-sm">El proveedor aceptó el envío de la copia firmada.</div>
        <q-card-actions class="recepcion__acciones">
          <q-btn flat no-caps icon="download" label="Descargar PDF" :disable="!puedeDescargar || ocupado" @click="descargar" />
          <q-space />
          <q-btn v-if="editable" outline no-caps color="primary" label="Guardar formulario" :disable="ocupado" @click="guardar" />
          <q-btn unelevated no-caps color="primary" icon="mail"
            :label="documento.estado === 'firmada' ? 'Reenviar copia' : documento.estado === 'pendiente' ? 'Reenviar enlace' : puedeDescargar ? 'Enviar para firma' : 'Guardar y enviar para firma'"
            :disable="ocupado || (!editable && !puedeDescargar)" @click="enviar" />
        </q-card-actions>
      </template>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.recepcion { width: 860px; max-width: 96vw; border-radius: 16px; }
.recepcion__cabecera { display: flex; align-items: center; gap: 14px; background: #174b29; color: #fff; padding: 16px 20px; }
.recepcion__resumen { padding: 16px 20px; display: flex; gap: 12px; align-items: center; justify-content: space-between; background: #f1f8f2; overflow-wrap: anywhere; }
.recepcion__contenido { min-height: 230px; }
.recepcion__campos { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); }
.recepcion__muestra { border: 1px solid #dce9df; border-radius: 10px; margin-bottom: 10px; }
.recepcion__acciones { padding: 12px 16px; gap: 8px; }
</style>
