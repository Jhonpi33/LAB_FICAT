<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { get, post } from '@/services/api.service'
import { obtenerPdf } from '@/services/pdf.service'
import { useNotificar } from '@/composables/useNotificar'

const abierto = defineModel({ type: Boolean })
const props = defineProps({ solicitud: String })
const emit = defineEmits(['guardado'])
const { notificarError, notificarOk, notificarInfo } = useNotificar()
const ocupado = ref(false)
const error = ref('')
const busqueda = ref('')
const coincidencias = ref([])
const clienteId = ref(null)
const cliente = ref({})
const parametros = ref([])
const datos = ref({})
const descripcion = ref('')
const ensayos = ref([])
const firma = ref(null)
const id = ref(null)
const documento = ref(null)
const pdf = ref('')
let clave = ''
const campos = [
  ['ciudad','Ciudad'], ['departamento','Departamento'], ['cargo','Cargo del cliente'],
  ['contacto','Persona de contacto'], ['clasificacion','Clasificación / tipología'],
  ['vigencia','Validez de la oferta'], ['entrega','Plazo de entrega de resultados'],
  ['responsable','Elaborada y emitida por'], ['cargoResponsable','Cargo del responsable'], ['observaciones','Observaciones de la propuesta'],
]
const clienteCampos = [['nombre','Nombre / razón social'],['numero_documento','Cédula / NIT'],['email','Correo electrónico'],['telefono','Celular / teléfono'],['direccion','Dirección']]
function limpiarPdf() { if (pdf.value) URL.revokeObjectURL(pdf.value); pdf.value = '' }
onBeforeUnmount(limpiarPdf)
watch(abierto, async valor => {
  limpiarPdf()
  if (!valor) return
  clave = crypto.randomUUID()
  id.value = props.solicitud || null
  documento.value = null
  clienteId.value = null
  cliente.value = { tipo_documento: 'CC', tipo_cliente: 'externo' }
  datos.value = { entrega: '15 días hábiles desde la recepción de la muestra' }
  descripcion.value = ''
  busqueda.value = ''
  coincidencias.value = []
  firma.value = null
  ensayos.value = [{}]
  await ejecutar(async () => {
    if (id.value) await cargarDocumento()
    else parametros.value = (await get('/parametros')).filter(p => p.activo)
  })
})
async function ejecutar(fn) {
  ocupado.value = true; error.value = ''
  try { await fn() }
  catch (e) { error.value = e.mensaje || 'No se pudo completar la operación.'; notificarError(e) }
  finally { ocupado.value = false }
}
function buscar() {
  ejecutar(async () => {
    coincidencias.value = await get('/ofertas/clientes?q=' + encodeURIComponent(busqueda.value.trim()))
    if (coincidencias.value.length === 1) seleccionar(coincidencias.value[0])
    if (!coincidencias.value.length) notificarOk('Cliente no registrado. Completa sus datos abajo.')
  })
}
function seleccionar(c) { clienteId.value = c._id; cliente.value = { ...c }; datos.value.contacto = c.nombre }
function seleccionarEnsayo(fila) {
  const p = parametros.value.find(p => p._id === fila.parametro_id)
  fila.unidad = p?.unidad || ''; fila.cantidad = 1
}
async function cargarDocumento() {
  documento.value = await get('/ofertas/' + id.value)
  limpiarPdf()
  pdf.value = await obtenerPdf('/ofertas/' + id.value + '/pdf')
}
function guardar() {
  ejecutar(async () => {
    if (!clienteId.value) {
      const documento = String(cliente.value.numero_documento || '').trim()
      const correo = String(cliente.value.email || '').trim().toLowerCase()
      const termino = documento || correo
      if (termino) {
        const encontrados = await get('/ofertas/clientes?q=' + encodeURIComponent(termino))
        const existente = encontrados.find(c => c.numero_documento === documento || c.email === correo)
        if (existente) {
          seleccionar(existente)
          notificarInfo(`${existente.nombre} ya estaba registrado. Usaremos sus datos en esta solicitud.`)
        }
      }
    }
    const imagen = await new Promise((resolve,reject) => {
      const lector = new FileReader(); lector.onload = () => resolve(lector.result.split(',')[1]); lector.onerror = reject; lector.readAsDataURL(firma.value)
    })
    const r = await post('/ofertas', { clave, cliente_id: clienteId.value, cliente: cliente.value, descripcion: descripcion.value,
      formulario: datos.value, ensayos: ensayos.value, firmaResponsable: imagen })
    id.value = r.datos.solicitud
    emit('guardado')
    await cargarDocumento()
    notificarOk('Solicitud guardada. El correo al cliente quedó programado.')
  })
}
function reenviar(destino) { ejecutar(async () => { const r = await post('/ofertas/' + id.value + '/enviar', { destino }); notificarOk(r.mensaje); await cargarDocumento() }) }
const obligatorio = v => !!String(v ?? '').trim() || 'Campo obligatorio'
</script>

<template>
  <q-dialog v-model="abierto" :persistent="ocupado">
    <q-card class="oferta">
      <q-card-section class="oferta__header row items-center">
        <div><div class="text-caption">CAT–ST–OC–F–002 · Oferta de servicios</div><h2 class="text-h6 q-my-none">{{ documento ? documento.numero : 'Solicitud y cotización' }}</h2></div>
        <q-space /><q-btn flat round icon="close" v-close-popup :disable="ocupado" aria-label="Cerrar" />
      </q-card-section>
      <q-linear-progress v-if="ocupado" indeterminate />
      <q-banner v-if="error" class="bg-red-1 text-red-10 q-ma-md" role="alert">{{ error }}</q-banner>
      <q-form v-if="!id" class="q-pa-lg" @submit="guardar">
        <h3 class="text-subtitle1 q-mt-none">Datos del cliente</h3>
        <div class="row q-gutter-sm q-mb-md">
          <q-input v-model="busqueda" outlined dense class="col" label="Buscar por correo o cédula / NIT" @keydown.enter.prevent="buscar" />
          <q-btn outline color="primary" label="Buscar cliente" :disable="ocupado || !busqueda.trim()" @click="buscar" />
        </div>
        <q-list v-if="coincidencias.length > 1" bordered class="q-mb-md"><q-item v-for="c in coincidencias" :key="c._id" clickable @click="seleccionar(c)"><q-item-section>{{ c.nombre }} · {{ c.numero_documento }}</q-item-section></q-item></q-list>
        <q-banner v-if="clienteId" class="bg-green-1 q-mb-md">Cliente registrado. Sus datos se completaron automáticamente.<q-btn flat label="Usar otro cliente" @click="clienteId = null; cliente = { tipo_documento: 'CC', tipo_cliente: 'externo' }" /></q-banner>
        <div class="oferta__grid">
          <q-select v-model="cliente.tipo_documento" outlined dense label="Tipo de documento" :options="['CC','NIT','CE','TI']" :readonly="!!clienteId" />
          <q-select v-model="cliente.tipo_cliente" outlined dense label="Tipo de cliente" :options="[{label:'Interno SENA',value:'interno'},{label:'Externo',value:'externo'}]" emit-value map-options :readonly="!!clienteId" />
          <q-select v-if="cliente.tipo_cliente === 'interno'" v-model="cliente.rol" outlined dense label="Rol SENA" :options="['instructor','aprendiz','administrativo']" :readonly="!!clienteId" :rules="[obligatorio]" />
          <q-input v-if="cliente.tipo_cliente === 'interno'" v-model="cliente.ficha" outlined dense label="Ficha SENA" :readonly="!!clienteId" :rules="[obligatorio]" />
          <q-input v-for="[campo,label] in clienteCampos" :key="campo" v-model="cliente[campo]" outlined dense :label="label" :type="campo === 'email' ? 'email' : 'text'" :readonly="!!clienteId" :rules="[obligatorio]" />
          <q-input v-for="[campo,label] in campos" :key="campo" v-model="datos[campo]" outlined dense :label="label" :type="campo === 'vigencia' ? 'date' : 'text'" :maxlength="160" :rules="campo === 'observaciones' ? [] : [obligatorio]" />
        </div>
        <h3 class="text-subtitle1">Propuesta técnica y económica</h3>
        <q-input v-model="descripcion" outlined dense label="Descripción de la muestra a ensayar" :maxlength="160" :rules="[obligatorio]" />
        <section v-for="(fila,i) in ensayos" :key="i" class="oferta__ensayo q-mb-md">
          <div class="row items-center q-mb-sm"><strong>Ensayo {{ i+1 }}</strong><q-space /><q-btn v-if="ensayos.length > 1" flat color="negative" icon="delete" aria-label="Quitar ensayo" @click="ensayos.splice(i,1)" /></div>
          <div class="oferta__grid">
            <q-select v-model="fila.parametro_id" outlined dense label="Ensayo del catálogo" :options="parametros.map(p => ({label:p.nombre + ' · $' + p.precio, value:p._id}))" emit-value map-options :rules="[obligatorio]" @update:model-value="seleccionarEnsayo(fila)" />
            <q-input v-model.number="fila.cantidad" outlined dense type="number" min="1" max="9999" label="Cantidad" :rules="[v => v > 0 || 'Indica la cantidad']" />
            <q-input v-for="[campo,label] in [['codigo','Código de referencia'],['unidad','Unidades'],['metodo','Método'],['tecnica','Técnica']]" :key="campo" v-model="fila[campo]" outlined dense :label="label" :maxlength="100" :rules="['metodo','tecnica'].includes(campo) ? [obligatorio] : []" />
          </div>
        </section>
        <q-btn flat color="primary" icon="add" label="Agregar ensayo" :disable="ensayos.length >= 5" @click="ensayos.push({})" />
        <q-file class="q-my-md" v-model="firma" outlined accept="image/png,image/jpeg" label="Firma del responsable que emite la oferta" hint="PNG o JPG, máximo 1 MB. Se incorporará al PDF." :rules="[v => !!v && v.size <= 1000000 || 'Adjunta una firma de hasta 1 MB']" />
        <p class="text-caption">Al finalizar se guarda la solicitud y se programa el envío al correo del cliente para aceptar y firmar la oferta.</p>
        <q-btn type="submit" unelevated color="primary" label="Finalizar y ver PDF" :loading="ocupado" />
      </q-form>
      <div v-else-if="documento" class="q-pa-md">
        <div class="row items-center q-mb-md"><div><strong>{{ documento.cliente }}</strong><div>{{ documento.correo }}</div></div><q-space /><q-badge :color="documento.firmada ? 'positive' : 'warning'">{{ documento.firmada ? 'Oferta aceptada y firmada' : 'Pendiente de firma del cliente' }}</q-badge></div>
        <iframe :src="pdf" title="Vista previa de la oferta de servicios" />
        <div class="row q-gutter-sm q-mt-md">
          <q-btn outline color="primary" icon="download" label="Descargar PDF" :href="pdf" :download="documento.numero + '.pdf'" />
          <q-btn flat label="Actualizar" :disable="ocupado" @click="ejecutar(cargarDocumento)" />
          <q-btn unelevated color="primary" :label="documento.firmada ? 'Reenviar oferta firmada' : 'Reenviar correo para firma'" :disable="ocupado" @click="reenviar('cliente')" />
          <q-btn v-if="documento.firmada" outline color="primary" label="Reenviar recibo de pago" :disable="ocupado" @click="reenviar('recibo')" />
        </div>
        <p class="text-caption q-mt-md">Entrega este PDF firmado a Producción para el cupón individual. El recibo por correo se habilita cuando se confirma el pago.</p>
      </div>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.oferta { width: 1080px; max-width: 96vw; border-radius: 16px; }
.oferta__header { background: #174b29; color: white; }
.oferta__grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
.oferta__ensayo { padding: 16px; border: 1px solid #dce9df; border-radius: 12px; }
iframe { width: 100%; height: 65vh; border: 1px solid #dce9df; border-radius: 8px; }
@media (max-width: 640px) { .oferta__grid { grid-template-columns: 1fr; } }
</style>
