<script setup>
import { ref } from 'vue'
import { get } from '@/services/api.service'
import api from '@/plugins/axios'
import { descargarPdf } from '@/services/pdf.service'
const props = defineProps({ tipo: String, id: String, titulo: String })
const abierto = ref(false), ocupado = ref(false), error = ref(''), datos = ref(null)
const ruta = () => '/formatos/' + props.tipo + '/' + props.id
async function ejecutar(fn) {
  ocupado.value = true
  error.value = ''
  try { await fn() } catch (e) { error.value = e.mensaje || 'No se pudo completar la operación.' }
  finally { ocupado.value = false }
}
async function abrir() {
  abierto.value = true
  datos.value = null
  await ejecutar(async () => { datos.value = await get(ruta()) })
}
async function guardar() {
  await ejecutar(async () => {
    await api.put(ruta(), datos.value.valores, { timeout: 75000 })
    datos.value.guardado = true
    await descargar()
  })
}
function descargar() { return descargarPdf(ruta() + '/pdf', props.tipo + '-' + props.id + '.pdf') }
</script>
<template>
  <q-btn flat dense no-caps color="primary" icon="description" :label="titulo" @click="abrir"/>
  <q-dialog v-model="abierto" persistent>
    <q-card style="width: 820px; max-width: 95vw">
      <q-toolbar class="bg-primary text-white"><q-toolbar-title>{{ titulo }}</q-toolbar-title><q-btn v-close-popup flat round icon="close" aria-label="Cerrar" :disable="ocupado"/></q-toolbar>
      <q-linear-progress v-if="ocupado" indeterminate/>
      <q-banner v-if="error" class="bg-red-1 text-negative">{{ error }}</q-banner>
      <template v-if="datos">
        <q-card-section class="row q-col-gutter-md">
          <div v-for="[,etiqueta,celda] in datos.campos" :key="celda" class="col-12 col-sm-6">
            <q-input outlined dense :label="etiqueta" :disable="ocupado" maxlength="180" v-model="datos.valores[celda]" @update:model-value="datos.guardado=false"/>
          </div>
        </q-card-section>
        <q-card-actions align="right"><q-btn v-if="datos.guardado" flat label="Descargar PDF" :disable="ocupado" @click="ejecutar(descargar)"/><q-btn unelevated color="primary" label="Guardar y descargar PDF" :loading="ocupado" @click="guardar"/></q-card-actions>
      </template>
    </q-card>
  </q-dialog>
</template>
