<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { get, post } from '@/services/api.service'
import { obtenerPdf } from '@/services/pdf.service'
import logoSena from '@/assets/logo-sena.svg'

const esOferta = useRoute().meta.oferta === true
const ruta = (esOferta ? '/ofertas/firma/' : '/firmas/') + useRoute().params.token
const datos = ref(null)
const archivo = ref(null)
const acepto = ref(false)
const pdf = ref('')
const mensaje = ref('')
const cargando = ref(true)
const firmado = ref(false)
const ocupado = ref(false)
let vistaActiva = true

onMounted(async () => {
  try {
    const documento = await get(ruta)
    const url = await obtenerPdf(ruta + '/pdf')
    if (!vistaActiva) return URL.revokeObjectURL(url)
    pdf.value = url
    datos.value = documento
  } catch (e) {
    mensaje.value = e.mensaje || 'No fue posible abrir el documento.'
  } finally {
    cargando.value = false
  }
})
onBeforeUnmount(() => {
  vistaActiva = false
  if (pdf.value) URL.revokeObjectURL(pdf.value)
})

async function firmar() {
  ocupado.value = true
  mensaje.value = ''
  try {
    const lector = new FileReader()
    const imagen = await new Promise((resolve, reject) => {
      lector.onload = () => resolve(lector.result.split(',')[1])
      lector.onerror = reject
      lector.readAsDataURL(archivo.value)
    })
    const respuesta = await post(ruta, { imagen, acepto: acepto.value })
    mensaje.value = respuesta.mensaje
    firmado.value = true
    archivo.value = null
  } catch (e) {
    mensaje.value = e.mensaje || 'No pudimos leer la firma.'
  } finally {
    ocupado.value = false
  }
}
</script>

<template>
  <main class="contenedor-app">
    <q-card class="tarjeta firma">
      <header class="firma__cabecera">
        <img :src="logoSena" alt="SENA" width="44" height="44">
        <div>
          <div class="text-caption text-weight-bold text-green-9">LABFICAT</div>
          <h1 class="titulo-vista">{{ esOferta ? 'Aceptar oferta de servicios' : 'Validar recepción de muestras' }}</h1>
        </div>
      </header>
      <q-linear-progress v-if="cargando" indeterminate color="primary" />
      <q-banner v-if="mensaje" rounded role="status" class="q-ma-md"
        :class="firmado ? 'bg-green-1 text-green-10' : 'bg-red-1 text-red-10'">
        {{ mensaje }}
      </q-banner>
      <div v-if="datos && !firmado" class="firma__cuerpo">
        <section class="firma__documento">
          <div class="row items-center justify-between q-pa-sm">
            <div><strong>{{ datos.cliente }}</strong><div class="text-caption">{{ esOferta ? datos.numero + ' · CAT–ST–OC–F–002' : 'CAT–ST–MI–F–002' }}</div></div>
            <q-btn flat no-caps icon="open_in_new" color="primary" :href="pdf" target="_blank" rel="noopener" label="Abrir PDF" />
          </div>
          <iframe :src="pdf" title="Documento para revisar y firmar"></iframe>
        </section>
        <q-form class="firma__formulario" @submit="firmar">
          <h2 class="text-h6 q-mt-none">{{ esOferta ? 'Firma de aceptación del cliente' : 'Firma de quien entrega' }}</h2>
          <q-file outlined v-model="archivo" accept="image/png,image/jpeg" label="Imagen de la firma"
            hint="PNG o JPG, máximo 1 MB" :rules="[v => !!v && v.size <= 1000000 || 'Selecciona una imagen de hasta 1 MB']">
            <template #prepend><q-icon name="draw" /></template>
          </q-file>
          <q-checkbox class="q-my-md" v-model="acepto" :label="esOferta ? 'Revisé la oferta, acepto sus condiciones y autorizo incorporar mi firma.' : 'Revisé el PDF y autorizo incorporar mi firma al formato de recepción.'" />
          <q-btn unelevated no-caps type="submit" color="primary" class="full-width"
            label="Firmar y recibir copia" :loading="ocupado" :disable="!acepto" />
        </q-form>
      </div>
    </q-card>
  </main>
</template>

<style scoped>
.firma { max-width: 1120px; margin-inline: auto; overflow: hidden; }
.firma__cabecera { display: flex; gap: 16px; align-items: center; padding: 20px; background: #edf7ef; }
.firma__cuerpo { display: grid; grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr); gap: 18px; padding: 18px; }
.firma__documento { border: 1px solid #dbe8dd; border-radius: 10px; overflow: hidden; overflow-wrap: anywhere; }
iframe { display: block; width: 100%; min-height: 440px; border: 0; background: #f2f6f3; }
.firma__formulario { padding: 18px; background: #f5f9f6; border-radius: 10px; align-self: start; }
@media (max-width: 720px) {
  .firma__cuerpo { grid-template-columns: minmax(0, 1fr); }
  iframe { min-height: 270px; }
}
</style>
