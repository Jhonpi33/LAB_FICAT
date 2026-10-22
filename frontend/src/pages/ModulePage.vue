<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import StatusBadge from '../components/StatusBadge.vue'
import { laboratoryService } from '../services/laboratory'
import { useAuthStore } from '../stores/auth'

const props = defineProps({ path: { type: String, required: true } })
const $q = useQuasar()
const auth = useAuthStore()
const loading = ref(true)
const records = ref({})
const search = ref('')
const page = ref(1)
const dialogOpen = ref(false)
const dialogTitle = ref('')
const dialogAction = ref('')
const form = ref({})
const fieldErrors = ref({})
const reason = ref('')
const reasonDialog = ref(false)
const reasonAction = ref('')
const reasonStatus = ref('')
const softDeleted = ref([])
const recordFilter = ref('Todos')
const reportPreview = ref(false)
const mailPreview = ref('')
const receptionType = ref('Sólido')
const receptionQuantity = ref('')
function printReport() { window.print() }

const modules = {
  panel: { title: 'Buen día, Laura', subtitle: 'Resumen del laboratorio y trabajo pendiente.', kind: 'dashboard' },
  clientes: { title: 'Clientes', subtitle: 'Personas y organizaciones que solicitan análisis.', kind: 'customers', columns: ['Nombre', 'Tipo', 'Correo', 'Teléfono'], fields: ['name', 'document', 'email', 'phone', 'address'] },
  solicitudes: { title: 'Solicitudes de análisis', subtitle: 'Cotizaciones, pagos y atención de solicitudes.', kind: 'requests', columns: ['Solicitud', 'Cliente', 'Tipo', 'Servicio', 'Estado', 'Pago', 'Prioridad'], fields: ['name', 'email'] },
  cotizaciones: { title: 'Cotizaciones', subtitle: 'Prepara, revisa y comunica las cotizaciones.', kind: 'quotes', columns: ['Solicitud', 'Cliente', 'Análisis', 'Estado', 'Total'], fields: ['name', 'email'] },
  'recepcion/nueva': { title: 'Recepción de muestras', subtitle: 'Vincula la muestra a una solicitud y registra su verificación.', kind: 'reception', fields: ['food', 'quantity', 'location'] },
  muestras: { title: 'Inventario de muestras', subtitle: 'Ubica las muestras almacenadas y revisa su etapa actual.', kind: 'samples', columns: ['Código', 'Alimento', 'Cliente', 'Ingreso', 'Estado', 'Ubicación'], fields: ['food', 'quantity', 'location'] },
  incidencias: { title: 'Incidencias', subtitle: 'Novedades, demoras y solicitudes de información.', kind: 'incidents', columns: ['Código', 'Tipo', 'Detalle', 'Estado'], fields: ['name', 'description'] },
  resultados: { title: 'Resultados de análisis', subtitle: 'Registra, revisa y valida resultados por parámetro.', kind: 'results', columns: ['Código', 'Alimento', 'Parámetros', 'Estado', 'Fecha estimada'], fields: ['name', 'description'] },
  informes: { title: 'Informes técnicos', subtitle: 'Previsualiza resultados validados y genera informes.', kind: 'reports', columns: ['Código', 'Muestra', 'Estado de resultados', 'Informe'], fields: ['name', 'description'] },
  facturacion: { title: 'Facturación', subtitle: 'Consulta y genera documentos de facturación académica.', kind: 'billing', columns: ['Solicitud', 'Cliente', 'Estado', 'Fecha de generación'], fields: ['name', 'description'] },
  disposicion: { title: 'Disposición final', subtitle: 'Conservación, devolución o desecho de muestras.', kind: 'disposal', columns: ['Código', 'Muestra', 'Ingreso', 'Fecha límite', 'Conservación'], fields: ['name', 'description'] },
  notificaciones: { title: 'Notificaciones enviadas', subtitle: 'Revisa el correo enviado y vuelve a intentar si hace falta.', kind: 'notifications', columns: ['Destinatario', 'Asunto', 'Estado', 'Fecha'], fields: ['name', 'email'] },
  'catalogo-parametros': { title: 'Catálogo de análisis', subtitle: 'Administra los parámetros disponibles para las muestras.', kind: 'catalog', columns: ['Parámetro', 'Código', 'Estado'], fields: ['name', 'description'] },
  usuarios: { title: 'Usuarios y permisos', subtitle: 'Consulta perfiles de acceso del personal.', kind: 'users', columns: ['Nombre', 'Correo institucional', 'Rol', 'Estado'], fields: ['name', 'email'] },
  auditoria: { title: 'Auditoría', subtitle: 'Historial de acciones con usuario, fecha y módulo.', kind: 'audit', columns: ['Fecha y hora', 'Usuario', 'Acción', 'Registro', 'Módulo'], fields: [] },
  eliminados: { title: 'Registros eliminados', subtitle: 'Los registros se conservan y pueden restaurarse.', kind: 'deleted', columns: ['Registro', 'Módulo', 'Motivo', 'Fecha'], fields: [] },
  respaldo: { title: 'Respaldo manual', subtitle: 'Genera una copia descargable de la información.', kind: 'backup', columns: [], fields: [] },
}

const detail = computed(() => {
  const parts = props.path.split('/')
  const isSample = parts[0] === 'muestras' && parts[1]
  const isRequest = parts[0] === 'solicitudes' && parts[1]
  const isCustomer = parts[0] === 'clientes' && parts[1]
  return { isSample, isRequest, isCustomer, code: parts[1] }
})
const baseKey = computed(() => {
  if (detail.value.isSample) return 'muestras'
  if (detail.value.isRequest) return 'solicitudes'
  if (detail.value.isCustomer) return 'clientes'
  return props.path.split('/')[0] || 'panel'
})
const config = computed(() => modules[baseKey.value] || { title: 'Página no encontrada', subtitle: 'No encontramos esta sección.', kind: 'notFound' })
const allRows = computed(() => {
  const { samples = [], customers = [], requests = [], parameters = [], activity = [], mailQueue = [] } = records.value
  switch (config.value.kind) {
    case 'customers': return customers.map((c) => ({ ...c, values: [c.name, c.kind, c.email, c.phone], status: c.kind }))
    case 'requests': return [...requests].sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.priority - b.priority).map((r) => ({ ...r, values: [r.id, r.client, r.kind, r.service, r.status, r.payment, r.urgent ? 'Atención inmediata' : r.kind === 'Interno SENA' ? 'Prioridad SENA' : 'Normal'], status: r.payment === 'Pendiente' ? 'Pago pendiente' : r.status, link: `/app/solicitudes/${r.id}` }))
    case 'quotes': return requests.map((r) => ({ ...r, values: [r.id, r.client, r.service, r.status, r.kind === 'Interno SENA' ? 'Sin costo' : '$ 180.000'], status: r.status, link: `/app/solicitudes/${r.id}` }))
    case 'samples': return samples.map((s) => ({ ...s, values: [s.code, s.food, s.customer, new Date(s.receivedAt).toLocaleDateString('es-CO'), s.status, s.location], status: s.status, link: `/app/muestras/${s.code}` }))
    case 'incidents': return samples.flatMap((s) => s.incidents.map((incident) => ({ ...incident, code: s.code, values: [s.code, incident.type, incident.text, incident.status], status: incident.status })))
    case 'results': return samples.map((s) => ({ ...s, values: [s.code, s.food, s.parameters.join(', '), s.resultStatus, s.dueDate], status: s.resultStatus, link: `/app/muestras/${s.code}` }))
    case 'reports': return samples.map((s) => ({ ...s, values: [s.code, s.food, s.resultStatus, s.resultStatus === 'Validado' ? 'Disponible' : 'Pendiente'], status: s.resultStatus, link: `/app/muestras/${s.code}` }))
    case 'billing': return requests.map((r) => ({ ...r, values: [r.id, r.client, samples.find((s) => s.code === r.code)?.invoiceStatus || 'Pendiente', '—'], status: samples.find((s) => s.code === r.code)?.invoiceStatus || 'Factura pendiente' }))
    case 'disposal': return samples.map((s) => ({ ...s, values: [s.code, s.food, new Date(s.receivedAt).toLocaleDateString('es-CO'), '2026-10-05', 'En conservación'], status: 'En conservación', link: `/app/muestras/${s.code}` }))
    case 'notifications': return mailQueue.map((n) => ({ ...n, values: [n.recipient, n.subject, n.status, n.date], status: n.status }))
    case 'catalog': return parameters.map((parameter, i) => ({ id: i + 1, values: [parameter, `PAR-${String(i + 1).padStart(3, '0')}`, 'Activo'], status: 'Activo' }))
    case 'users': return [
      { values: ['Laura Gómez', 'lab@sena.edu.co', 'Encargado', 'Activo'], status: 'Activo' },
      { values: ['Andrés Rojas', 'admin@sena.edu.co', 'Administrador', 'Activo'], status: 'Activo' },
      { values: ['Camila Díaz', 'lectura@sena.edu.co', 'Usuario / Cliente', 'Activo'], status: 'Activo' },
    ]
    case 'audit': return activity.map((event) => ({ ...event, values: [new Date(event.at).toLocaleString('es-CO'), event.user, event.action, event.record, event.module], status: 'Registrado' }))
    case 'deleted': return softDeleted.value.map((item) => ({ ...item, values: [item.record, item.module, item.reason, new Date(item.date).toLocaleString('es-CO')] }))
    default: return []
  }
})
const filteredRows = computed(() => allRows.value.filter((row) => row.values.join(' ').toLowerCase().includes(search.value.toLowerCase())))
const shownRows = computed(() => filteredRows.value.slice((page.value - 1) * 8, page.value * 8))
const selectedSample = computed(() => records.value.samples?.find((sample) => sample.code === detail.value.code))
const selectedRequest = computed(() => records.value.requests?.find((request) => request.id === detail.value.code))
const selectedCustomer = computed(() => records.value.customers?.find((customer) => customer.id === detail.value.code))
const sampleEvents = computed(() => {
  const events = auth.isClient ? [...(selectedSample.value?.publicEvents || [])] : [...(selectedSample.value?.publicEvents || []), ...(selectedSample.value?.internalEvents || [])]
  return events.sort((a, b) => b.at.localeCompare(a.at))
})
const emptyResult = computed(() => !loading.value && !filteredRows.value.length && ['customers', 'requests', 'samples', 'incidents', 'audit', 'notifications', 'results', 'billing', 'disposal', 'catalog', 'deleted'].includes(config.value.kind))
// El perfil Usuario / Cliente solo entra a sus propios registros (RF-049 / RNF-004)
const sectionDenied = computed(() => {
  if (detail.value.isCustomer) return auth.isClient
  if (detail.value.isSample) return auth.isClient && !auth.ownsRecord(selectedSample.value)
  if (detail.value.isRequest) return auth.isClient && !auth.ownsRecord(selectedRequest.value)
  if (auth.isClient) return !auth.canAccessSection(baseKey.value)
  return false
})
const noPermission = computed(() => (['users', 'deleted', 'backup'].includes(config.value.kind) && !auth.isAdmin) || sectionDenied.value)
const permissionLock = computed(() =>
  sectionDenied.value
    ? { title: 'Sección no disponible para tu perfil', text: 'Como Usuario / Cliente solo consultas la información de tus propias muestras, resultados e informes.' }
    : { title: 'Esta sección es solo para administración', text: 'Tu perfil puede consultar otras áreas, pero no tiene permiso para ver esta información.' },
)
const quickActions = computed(() => ({
  requests: ['Crear solicitud', 'Generar cotización', 'Enviar cotización', 'Registrar aceptación', 'Simular confirmación de pago', 'Marcar atención inmediata', 'Marcar sin continuidad'],
  quotes: ['Generar cotización', 'Enviar cotización', 'Registrar aceptación', 'Marcar sin continuidad'],
  reception: ['Registrar recepción', 'Verificar y aceptar', 'Rechazar muestra'],
  samples: ['Cambiar estado', 'Registrar observación', 'Corregir información', 'Cambiar fecha estimada', 'Eliminar registro'],
  incidents: ['Solicitar información', 'Registrar demora', 'Aprobar incidencia', 'Cerrar incidencia', 'Cambiar estado'],
  results: ['Iniciar proceso', 'Registrar resultados', 'Validar resultados', 'Devolver para repetición', 'Cerrar proceso'],
  reports: ['Previsualizar informe', 'Descargar PDF', 'Marcar informe disponible', 'Solicitar encuesta'],
  billing: ['Generar documento de facturación', 'Cambiar estado de factura'],
  disposal: ['Avisar vencimiento', 'Registrar devolución', 'Registrar desecho'],
  notifications: ['Reenviar'],
  catalog: ['Crear parámetro', 'Editar parámetro', 'Desactivar parámetro'],
  users: ['Asignar Encargado', 'Asignar Usuario / Cliente'],
  deleted: ['Restaurar registro'],
  backup: ['Generar respaldo'],
}[config.value.kind] || []))
const requiresReason = /Rechazar|cambiar fecha|Eliminar|repetición|Cambiar estado|Cambiar estado de factura|devolución|desecho|atención inmediata/i
const statusColumns = {
  requests: [4, 5, 6], quotes: [3], samples: [4], incidents: [3], results: [3],
  reports: [2, 3], billing: [2], disposal: [4], notifications: [2], catalog: [2], users: [3],
}
function isStatusCell(kind, index) {
  return statusColumns[kind]?.includes(index) || false
}
function displayStatus(kind, value) {
  if (kind === 'quotes' && value === 'Enviada') return 'Cotización enviada · En espera'
  if (kind === 'notifications' && value === 'Enviada') return 'Correo enviado'
  return String(value)
}
function isActionDisabled(action) {
  if (!auth.canEdit && action !== 'Previsualizar informe') return true
  if (['Cerrar proceso', 'Previsualizar informe'].includes(action) && !records.value.samples?.some((sample) => sample.resultStatus === 'Validado')) return true
  if (action === 'Cerrar proceso' && !records.value.samples?.every((sample) => sample.resultStatus === 'Validado')) return true
  if (action === 'Iniciar proceso') {
    const sample = records.value.samples?.[0]
    const request = records.value.requests?.find((item) => item.code === sample?.code)
    if (request?.kind === 'Externo' && sample?.requestStatus !== 'Pago confirmado') return true
  }
  return false
}

// El perfil Usuario / Cliente solo recibe sus propios registros (RF-049)
function restrictToOwnAccount() {
  const ownSamples = (records.value.samples || []).filter((sample) => sample.customerId === auth.customerId)
  const ownCodes = new Set(ownSamples.map((sample) => sample.code))
  const ownCustomers = (records.value.customers || []).filter((customer) => customer.id === auth.customerId)
  const ownEmails = new Set(ownCustomers.map((customer) => customer.email))
  records.value.samples = ownSamples
  records.value.customers = ownCustomers
  records.value.requests = (records.value.requests || []).filter((request) => ownCodes.has(request.code))
  records.value.mailQueue = (records.value.mailQueue || []).filter((mail) => ownEmails.has(mail.recipient))
  records.value.activity = []
}

async function loadData() {
  loading.value = true
  try {
    records.value = await laboratoryService.overview()
    if (auth.isClient) restrictToOwnAccount()
  } catch (error) {
    $q.notify({ type: 'negative', message: `No fue posible cargar la información: ${error.message}` })
  } finally {
    loading.value = false
  }
}

function beginRecord(action = 'Crear registro') {
  if (!auth.canEdit) return
  dialogTitle.value = action
  dialogAction.value = action
  fieldErrors.value = {}
  form.value = {}
  dialogOpen.value = true
}

function runAction(action) {
  if (!auth.canEdit && action !== 'Previsualizar informe') return
  if (action === 'Crear solicitud') {
    beginRecord(action)
    return
  }
  if (requiresReason.test(action)) {
    reasonAction.value = action
    reason.value = ''
    reasonStatus.value = ''
    reasonDialog.value = true
    return
  }
  perform(action)
}

async function perform(action, extra = {}) {
  const payload = { module: baseKey.value, code: selectedSample.value?.code || selectedRequest.value?.code || records.value.samples?.[0]?.code, requestId: selectedRequest.value?.id || records.value.requests?.[0]?.id, ...extra }
  try {
    const result = await laboratoryService.performAction(action, payload)
    if (action === 'Generar respaldo') {
      const blob = new Blob([JSON.stringify({ generado: result.at, muestras: records.value.samples }, null, 2)], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'respaldo-laboratorio-demo.json'
      link.click()
      URL.revokeObjectURL(link.href)
    }
    if (action === 'Previsualizar informe') reportPreview.value = true
    if (action === 'Eliminar registro') softDeleted.value.push({ record: payload.code, module: baseKey.value, reason: extra.reason, date: result.at })
    if (action === 'Validar resultados') {
      const sample = records.value.samples.find((item) => item.code === payload.code)
      if (sample) sample.resultStatus = 'Validado'
    }
    if (action === 'Cerrar proceso') {
      const sample = records.value.samples.find((item) => item.code === payload.code)
      if (sample) sample.status = 'Cerrada'
    }
    if (action === 'Cambiar estado' && payload.status) {
      const sample = records.value.samples.find((item) => item.code === payload.code)
      if (sample) sample.status = payload.status
    }
    if (action === 'Generar documento de facturación') {
      const sample = records.value.samples.find((item) => item.code === payload.code)
      if (sample) sample.invoiceStatus = 'Generada'
    }
    if (action === 'Marcar atención inmediata') {
      const request = records.value.requests.find((item) => item.id === payload.requestId)
      if (request) request.urgent = true
    }
    if (action === 'Iniciar proceso') {
      const sample = records.value.samples.find((item) => item.code === payload.code)
      if (sample) sample.status = 'En proceso'
    }
    if (action === 'Simular confirmación de pago' || action === 'Confirmar pago') {
      const sample = records.value.samples.find((item) => item.code === payload.code)
      if (sample) sample.requestStatus = 'Pago confirmado'
      const request = records.value.requests.find((item) => item.code === payload.code)
      if (request) request.payment = 'Confirmado'
    }
    $q.notify({ type: 'positive', message: `${action}: acción simulada y registrada en la trazabilidad.` })
    if (action === 'Descargar PDF') window.print()
  } catch (error) {
    $q.notify({ type: 'negative', message: `No fue posible completar la acción: ${error.message}` })
  }
}

async function confirmReason() {
  if (!reason.value.trim()) return
  const action = reasonAction.value
  reasonDialog.value = false
  await perform(action, { reason: reason.value, ...(action === 'Cambiar estado' ? { status: reasonStatus.value } : {}) })
}
async function restoreRecord(row) {
  softDeleted.value = softDeleted.value.filter((item) => item.record !== row.record)
  await perform('Restaurar registro', { record: row.record })
}

async function saveForm() {
  fieldErrors.value = {}
  try {
    const saved = await laboratoryService.saveRecord(baseKey.value, form.value)
    if (baseKey.value === 'clientes') records.value.customers.unshift(saved)
    else if (baseKey.value === 'catalogo-parametros') records.value.parameters.unshift(form.value.name)
    dialogOpen.value = false
    $q.notify({ type: 'positive', message: 'Los cambios se guardaron y quedaron en la trazabilidad.' })
  } catch (error) {
    fieldErrors.value = error.fields || {}
  }
}

function goDetail(row) {
  if (row.link) window.history.pushState({}, '', row.link)
}

watch(() => props.path, () => { page.value = 1; reportPreview.value = false; loadData() })
watch(() => auth.activeRole, () => { page.value = 1; search.value = ''; loadData() })
onMounted(loadData)
</script>

<template>
  <div class="page-wrap">
    <div class="page-heading">
      <div><div class="text-caption muted">Laboratorio de alimentos · SENA</div><h1>{{ config.kind==='dashboard' ? `Buen día, ${auth.user?.name.split(' ')[0] || 'equipo'}` : detail.isSample ? `Muestra ${detail.code}` : detail.isRequest ? `Solicitud ${detail.code}` : detail.isCustomer ? `Ficha de ${detail.code}` : config.title }}</h1><p class="muted q-mb-none">{{ detail.isSample ? 'Ficha, trazabilidad y análisis de la muestra.' : config.subtitle }}</p></div>
      <div class="row q-gutter-sm no-print">
        <q-btn v-if="auth.canEdit && ['customers','reception'].includes(config.kind)" unelevated class="btn-primary" icon="add" :label="config.kind==='reception'?'Iniciar recepción':'Nuevo cliente'" @click="beginRecord(config.kind==='reception'?'Registrar recepción':'Crear cliente')" />
      </div>
    </div>

    <section v-if="noPermission" class="q-card panel" role="status">
      <div class="empty-state"><q-icon name="lock" size="42px" /><h2>{{ permissionLock.title }}</h2><p>{{ permissionLock.text }}</p></div>
    </section>
    <template v-else>

    <template v-if="config.kind === 'dashboard'">
      <div class="row q-col-gutter-md q-mb-lg">
        <div v-for="metric in [
          {label:'Muestras activas',value:records.samples?.length||0,icon:'science'},
          {label:'Pagos pendientes',value:records.requests?.filter((item)=>item.payment==='Pendiente').length||0,icon:'payments'},
          {label:'Facturas pendientes',value:records.requests?.filter((item)=>item.payment==='Pendiente').length||0,icon:'receipt_long'},
          {label:'Incidencias abiertas',value:records.samples?.flatMap((item)=>item.incidents).filter((item)=>item.status==='Abierta').length||0,icon:'report_problem'},
        ]" :key="metric.label" class="col-12 col-sm-6 col-lg-3">
          <section class="q-card stat-card"><div class="row justify-between"><div class="stat-label">{{ metric.label }}</div><q-icon :name="metric.icon" color="primary" size="21px" /></div><div class="stat-value">{{ metric.value }}</div><div class="text-caption muted">En seguimiento</div></section>
        </div>
      </div>
      <div class="row q-col-gutter-lg">
        <div class="col-12 col-lg-8">
          <section class="q-card panel">
            <div class="row justify-between items-center q-mb-md"><h2 class="panel-title q-mb-none">Cola de muestras</h2><q-btn v-if="!auth.isClient" flat color="primary" label="Ver inventario" to="/app/muestras" /></div>
            <div class="table-wrap"><table class="data-table"><thead><tr><th>Código</th><th>Muestra</th><th>Ingreso</th><th>Estado</th></tr></thead><tbody>
              <tr v-for="sample in records.samples" :key="sample.code"><td><router-link class="mono" :to="`/app/muestras/${sample.code}`">{{ sample.code }}</router-link></td><td>{{ sample.food }}</td><td>{{ new Date(sample.receivedAt).toLocaleDateString('es-CO') }}</td><td><StatusBadge :status="sample.status" /></td></tr>
            </tbody></table></div>
          </section>
        </div>
        <div class="col-12 col-lg-4">
          <div v-if="!auth.isClient" class="lime-callout q-mb-lg"><div class="row items-center q-gutter-sm"><q-icon name="priority_high" size="22px" /><strong>Atención más urgente</strong></div><p class="q-mb-sm q-mt-sm">Una muestra necesita seguimiento antes de su fecha estimada.</p><q-btn unelevated color="dark" text-color="white" label="Revisar incidencias" to="/app/incidencias" /></div>
          <section v-if="!auth.isClient" class="q-card panel"><h2 class="panel-title">Actividad reciente</h2><div class="timeline"><article v-for="event in records.activity?.slice(0,3)" :key="event.at + event.action" class="timeline-event"><time>{{ new Date(event.at).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'}) }}</time><p>{{ event.action }} · {{ event.user }}</p></article></div></section>
        </div>
      </div>
    </template>

    <template v-else-if="detail.isSample && selectedSample">
      <div class="row q-col-gutter-lg">
        <div class="col-12 col-lg-8">
          <section class="q-card panel q-mb-lg">
            <div class="row justify-between items-start"><div><div class="mono text-h5">{{ selectedSample.code }}</div><h2 class="q-mb-xs">{{ selectedSample.food }}</h2><div class="muted">{{ selectedSample.customer }} · {{ selectedSample.quantity }} {{ selectedSample.unit }}</div></div><StatusBadge :status="selectedSample.status" /></div>
            <div class="row q-col-gutter-sm q-mt-md">
              <div v-for="(stage,index) in ['Ingresada','En proceso','En análisis']" :key="stage" class="col"><div class="row items-center q-gutter-sm"><span class="step-dot" :class="{active:index<=['Ingresada','En proceso','En análisis'].indexOf(selectedSample.status)}" /><span class="text-caption">{{ stage }}</span></div></div>
            </div>
            <div class="row q-gutter-sm q-mt-lg no-print">
              <q-btn v-for="action in quickActions" :key="action" unelevated :disable="isActionDisabled(action)" :class="/Validar|confirmar|Cerrar|disposición|devolución|desecho/i.test(action)?'btn-confirm':/Rechazar|Eliminar/i.test(action)?'btn-danger':'btn-primary'" :label="action" @click="runAction(action)" />
              <q-btn v-if="!auth.canEdit" flat disable label="Solo lectura" icon="visibility" />
            </div>
          </section>
          <section class="q-card panel q-mb-lg">
            <h2 class="panel-title">Análisis solicitados</h2><div class="row q-gutter-sm"><StatusBadge v-for="parameter in selectedSample.parameters" :key="parameter" :status="parameter" /></div>
            <q-banner class="status-info q-mt-md" rounded><template #avatar><q-icon name="info" /></template>La muestra cambia de etapa únicamente mediante una acción manual autorizada. Una incidencia no modifica el estado.</q-banner>
          </section>
          <section class="q-card panel">
            <h2 class="panel-title">{{ auth.isClient ? 'Trazabilidad de tu muestra' : 'Trazabilidad · visible para el personal' }}</h2>
            <div class="timeline"><article v-for="event in sampleEvents" :key="event.at+event.title" class="timeline-event"><time>{{ new Date(event.at).toLocaleString('es-CO') }} · Laura Gómez</time><p><strong>{{ event.title }}</strong></p><p>{{ event.description }}</p><StatusBadge :status="selectedSample.publicEvents.includes(event)?'Visible para el cliente':'Nota interna'" /></article></div>
            <q-input v-if="auth.canEdit" class="q-mt-md" outlined label="Registrar observación" type="textarea" rows="2" hint="La observación será interna por defecto." />
            <q-toggle v-if="auth.canEdit" label="Visible para el cliente" />
          </section>
        </div>
        <div class="col-12 col-lg-4">
          <section class="q-card panel q-mb-lg"><h2 class="panel-title">Fechas y ubicación</h2><p><span class="muted">Ingreso:</span> {{ new Date(selectedSample.receivedAt).toLocaleString('es-CO') }}</p><p><span class="muted">Fecha estimada:</span> {{ selectedSample.dueDate }}</p><p><span class="muted">Ubicación:</span> {{ selectedSample.location }}</p><p><span class="muted">Inicio formal:</span> Pendiente de registrar</p></section>
          <section class="q-card panel q-mb-lg"><h2 class="panel-title">Resultados</h2><StatusBadge :status="selectedSample.resultStatus" /><q-btn class="btn-confirm full-width q-mt-md" label="Registrar resultados" :disable="!auth.canEdit" @click="runAction('Registrar resultados')" /></section>
          <section class="q-card panel"><h2 class="panel-title">Conservación</h2><p>7 días hábiles desde el procesamiento.</p><StatusBadge status="Conservación por vencer" /><q-btn class="btn-communicate full-width q-mt-md" label="Avisar al cliente" :disable="!auth.canEdit" @click="runAction('Avisar vencimiento')" /></section>
        </div>
      </div>
    </template>
    <template v-else-if="detail.isSample || detail.isRequest || detail.isCustomer">
      <section v-if="detail.isRequest && selectedRequest" class="q-card panel">
        <div class="row justify-between items-start"><div><div class="text-caption muted">Solicitud de análisis</div><div class="mono text-h5">{{ selectedRequest.id }}</div><h2 class="q-mb-xs">{{ selectedRequest.client }}</h2><div>{{ selectedRequest.service }}</div></div><StatusBadge :status="selectedRequest.status" /></div>
        <div class="row q-col-gutter-md q-mt-md"><div class="col-12 col-sm-4"><div class="muted text-caption">Tipo de cliente</div><StatusBadge :status="selectedRequest.kind" /></div><div class="col-12 col-sm-4"><div class="muted text-caption">Pago</div><StatusBadge :status="selectedRequest.payment==='Pendiente'?'Pago pendiente':selectedRequest.payment" /></div><div class="col-12 col-sm-4"><div class="muted text-caption">Ruta aplicada</div><strong>{{ selectedRequest.kind==='Interno SENA'?'Recepción directa':'Pago confirmado antes de iniciar' }}</strong></div></div>
        <div class="row q-gutter-sm q-mt-lg no-print"><q-btn v-for="action in quickActions" :key="action" unelevated :disable="!auth.canEdit || action==='Previsualizar informe' && !records.samples?.some((sample)=>sample.resultStatus==='Validado')" :class="/confirmación|aceptación/i.test(action)?'btn-confirm':'btn-primary'" :label="action" @click="runAction(action)" /></div>
        <q-tabs class="q-mt-lg" align="left" active-color="primary" indicator-color="primary"><q-tab name="resumen" label="Resumen" /><q-tab name="cotizacion" label="Cotización" /><q-tab name="pago" label="Pago" /></q-tabs>
        <q-separator />
        <div class="row q-col-gutter-md q-mt-md"><div class="col-12 col-md-6"><h3>Resumen del servicio</h3><p>Solicitud vinculada a la muestra <router-link class="mono" :to="`/app/muestras/${selectedRequest.code}`">{{ selectedRequest.code }}</router-link>.</p><p>Prioridad: <StatusBadge :status="selectedRequest.kind==='Interno SENA'?'Prioridad SENA':'Normal'" /></p></div><div class="col-12 col-md-6"><h3>Pago y cotización</h3><p>El pago se simula para este entorno académico. No se solicitan datos bancarios.</p><q-btn v-if="selectedRequest.kind==='Externo'" class="btn-confirm" label="Simular confirmación de pago" :disable="!auth.canEdit" @click="perform('Simular confirmación de pago',{code:selectedRequest.code})" /></div></div>
      </section>
      <section v-else-if="detail.isCustomer && selectedCustomer" class="q-card panel">
        <div class="row justify-between"><div><div class="text-caption muted">Ficha del cliente</div><h2>{{ selectedCustomer.name }}</h2></div><q-btn v-if="auth.canEdit" class="btn-primary" label="Editar datos" icon="edit" @click="beginRecord('Editar cliente')" /></div>
        <div class="row q-col-gutter-lg"><div class="col-12 col-md-6"><p><strong>Tipo de identificación:</strong> {{ selectedCustomer.kind }}</p><p><strong>Número:</strong> {{ selectedCustomer.document }}</p><p><strong>Correo:</strong> {{ selectedCustomer.email }}</p><p><strong>Teléfono:</strong> {{ selectedCustomer.phone }}</p><p><strong>Dirección:</strong> {{ selectedCustomer.address }}</p></div><div class="col-12 col-md-6"><h3>Historial de solicitudes</h3><div v-for="request in records.requests?.filter((item)=>item.client===selectedCustomer.name)" :key="request.id" class="q-py-sm"><router-link :to="`/app/solicitudes/${request.id}`">{{ request.id }}</router-link> · {{ request.service }} · <StatusBadge :status="request.status" /></div><div v-if="!records.requests?.some((item)=>item.client===selectedCustomer.name)" class="muted">Todavía no hay solicitudes.</div></div></div>
      </section>
      <section v-else class="q-card panel"><div class="empty-state"><q-icon name="search_off" size="40px" /><p>No encontramos el registro solicitado.</p></div></section>
    </template>

    <template v-else-if="config.kind==='reception'">
      <div class="row q-col-gutter-lg">
        <section class="col-12 col-lg-8 q-card panel">
          <div class="row items-center q-gutter-sm q-mb-lg"><span class="step-dot active" /><span>Solicitud</span><q-separator class="col" /><span class="step-dot" /><span>Muestra</span><q-separator class="col" /><span class="step-dot" /><span>Verificar</span><q-separator class="col" /><span class="step-dot" /><span>Código</span></div>
          <q-select outlined label="Solicitud vinculada" :options="records.requests?.map((item)=>`${item.id} · ${item.client}`)||[]" />
          <q-input class="q-mt-md" outlined label="Nombre o descripción del alimento" />
          <div class="row q-col-gutter-md q-mt-xs"><div class="col-12 col-sm-6"><q-select v-model="receptionType" outlined label="Tipo físico" :options="['Sólido','Líquido']" /></div><div class="col-12 col-sm-6"><q-input v-model="receptionQuantity" outlined type="number" :label="`Cantidad (${receptionType==='Sólido'?'g':'ml'})`" /></div></div>
          <q-banner v-if="Number(receptionQuantity)>0 && Number(receptionQuantity)<300" class="status-warning q-mt-md" rounded><template #avatar><q-icon name="warning" /></template>Cantidad menor a 300 {{ receptionType==='Sólido'?'g':'ml' }}. Puedes continuar y guardar la muestra.</q-banner>
          <h2 class="panel-title q-mt-xl">Verificación física</h2><q-input outlined label="Empaque y estado de conservación" type="textarea" rows="3" />
          <div class="row q-gutter-sm q-mt-lg"><q-btn class="btn-confirm" unelevated label="Aceptar y generar código" :disable="!auth.canEdit" @click="perform('Recepción de muestra aceptada')" /><q-btn class="btn-danger" unelevated label="Rechazar muestra" :disable="!auth.canEdit" @click="runAction('Rechazar muestra')" /></div>
          <p class="text-caption muted q-mt-sm">El rechazo requiere un motivo y se conserva en el historial.</p>
        </section>
        <section class="col-12 col-lg-4 q-card panel"><h2 class="panel-title">Cola de recepción</h2><div v-for="request in records.requests" :key="request.id" class="q-py-md" style="border-bottom:1px solid var(--border)"><div class="text-weight-bold">{{ request.id }}</div><div class="muted">{{ request.client }}</div><StatusBadge :status="request.status" /></div></section>
      </div>
    </template>

    <template v-else-if="config.kind==='backup'">
      <div class="row q-col-gutter-lg">
        <section class="col-12 col-lg-7 q-card panel"><h2 class="panel-title">Generar copia de respaldo</h2><p>En este entorno académico, la copia se genera manualmente. La descarga contiene datos demostrativos.</p><q-banner class="status-info q-my-md" rounded><template #avatar><q-icon name="info" /></template>MongoDB Atlas M0 no incluye respaldos automáticos. Programa copias manuales periódicas.</q-banner><q-btn class="btn-primary" unelevated icon="backup" label="Generar respaldo" :disable="!auth.canEdit" @click="runAction('Generar respaldo')" /><p class="muted text-caption q-mt-md">Último respaldo: No se ha generado una copia en esta sesión.</p></section>
        <section class="col-12 col-lg-5 q-card panel"><h2 class="panel-title">Uso de almacenamiento</h2><div class="text-h4">128 MB <span class="text-caption muted">de 512 MB</span></div><q-linear-progress class="q-mt-md" :value="0.25" color="primary" rounded /><p class="muted q-mt-md">Tamaño máximo inicial de adjuntos e informes: 5 MB por archivo.</p></section>
      </div>
    </template>

    <template v-else>
    <section v-if="config.kind==='notifications'" class="q-card panel q-mb-lg">
      <div class="row q-col-gutter-lg">
        <div class="col-12 col-md-5"><h2 class="panel-title">Correo institucional</h2><StatusBadge status="Entorno de pruebas" /><q-select class="q-mt-md" outlined label="Remitente configurado" :options="['Cuenta Gmail de pruebas','Cuenta institucional (producción)']" model-value="Cuenta Gmail de pruebas" /><p class="text-caption muted q-mt-sm">El servicio de correo se reemplaza en services/ sin cambiar las pantallas.</p></div>
        <div class="col-12 col-md-7"><h2 class="panel-title">Plantillas de correo</h2><div class="row q-gutter-sm"><q-btn v-for="template in ['Cotización','Rechazo de muestra','Incidencia','Demora','Resultados disponibles','Aviso de disposición','Encuesta']" :key="template" outline color="primary" :label="template" @click="mailPreview=template" /></div></div>
      </div>
    </section>
      <section class="q-card panel">
        <div v-if="['billing','reports'].includes(config.kind)" class="q-mb-md">
          <q-banner v-if="config.kind==='billing'" class="status-info" rounded><template #avatar><q-icon name="science" /></template><strong>Entorno de pruebas · no se envía a la DIAN</strong><div>La facturación simula documentos para uso académico.</div></q-banner>
          <div v-if="config.kind==='reports' && reportPreview" class="q-card panel q-mt-md"><div class="row justify-between"><div><div class="text-overline">SENA · Laboratorio de alimentos</div><h2>Informe técnico de análisis</h2><div class="mono">Muestra {{ records.samples?.[0]?.code }}</div></div><q-btn flat icon="print" label="Imprimir" class="no-print" @click="printReport" /></div><q-separator class="q-my-md" /><p>Resultados analíticos validados · Datos de demostración</p></div>
        </div>
        <div class="row items-center q-col-gutter-sm q-mb-md">
          <div class="col-12 col-md"><q-input v-model="search" dense outlined placeholder="Buscar en esta lista" aria-label="Buscar en la lista" @update:model-value="page=1"><template #prepend><q-icon name="search" /></template></q-input></div>
          <div class="col-auto"><q-btn v-if="auth.canEdit && ['customers','catalog'].includes(config.kind)" unelevated class="btn-primary" icon="add" :label="config.kind==='catalog'?'Crear análisis':'Nuevo cliente'" @click="beginRecord()" /></div>
        </div>
        <div v-if="!auth.isClient" class="row q-gutter-sm q-mb-md no-print">
          <q-btn v-for="action in quickActions" :key="action" unelevated size="sm" :disable="isActionDisabled(action)" :class="/Validar|confirmar|Cerrar|devolución|desecho|facturación|respaldo/i.test(action)?'btn-confirm':/Rechazar|Eliminar|desactivar/i.test(action)?'btn-danger':'btn-primary'" :icon="/Enviar|Reenviar|Avisar|Solicitar/i.test(action)?'send':'add'" :label="action" @click="runAction(action)" />
        </div>
        <q-banner v-if="config.kind==='results' && !auth.isClient" class="status-info q-mb-md" rounded><template #avatar><q-icon name="info" /></template>El botón «Iniciar proceso» queda bloqueado hasta confirmar el pago para solicitudes externas.</q-banner>
        <div v-if="loading"><q-skeleton type="text" width="30%" /><q-skeleton type="rect" height="220px" class="q-mt-sm" aria-label="Cargando registros" /></div>
        <div v-else-if="emptyResult" class="empty-state"><q-icon name="inbox" size="38px" /><p>No hay registros que coincidan con la búsqueda.</p><q-btn v-if="auth.canEdit && config.kind!=='deleted'" flat color="primary" label="Crear registro" @click="beginRecord()" /></div>
        <div v-else class="table-wrap">
          <table class="data-table"><thead><tr><th v-for="column in config.columns" :key="column">{{ column }}</th><th v-if="['notifications','samples','requests','quotes'].includes(config.kind)">Acciones</th></tr></thead>
            <tbody><tr v-for="row in shownRows" :key="row.id || row.code || row.record || row.values[0]">
              <td v-for="(value,index) in row.values" :key="index">
                <router-link v-if="index===0 && row.link" :to="row.link" :class="row.link.includes('muestras')?'mono':''">{{ value }}</router-link>
                <StatusBadge v-else-if="isStatusCell(config.kind,index)" :status="displayStatus(config.kind,value)" />
                <span v-else>{{ value }}</span>
              </td>
              <td v-if="['notifications','samples','requests','quotes','deleted'].includes(config.kind)">
                <q-btn v-if="config.kind==='notifications'" flat dense color="primary" label="Reenviar" :disable="!auth.canEdit" @click="perform('Reenviar',{id:row.id})" />
                <q-btn v-else-if="config.kind==='deleted'" flat dense color="primary" label="Restaurar" :disable="!auth.isAdmin" @click="restoreRecord(row)" />
                <q-btn v-else-if="row.link" flat dense color="primary" label="Abrir ficha" :to="row.link" />
                <q-btn v-else flat dense color="primary" label="Ver" @click="goDetail(row)" />
              </td>
            </tr></tbody>
          </table>
        </div>
        <div v-if="filteredRows.length > 8" class="row justify-end q-mt-md"><q-pagination v-model="page" :max="Math.ceil(filteredRows.length/8)" direction-links /></div>
      </section>
      <div v-if="config.kind==='billing'" class="row q-gutter-sm q-mt-md"><StatusBadge status="Factura pendiente" /><StatusBadge status="Factura generada" /><span class="muted text-caption">Solo personal autorizado puede generar el documento.</span></div>
      <div v-if="config.kind==='results' && !auth.isClient" class="q-card panel q-mt-lg"><h2 class="panel-title">Cierre y validación</h2><p>El proceso se cierra solo cuando todos los resultados están completos y validados. El historial permanece disponible.</p><StatusBadge status="Proceso consultable tras el cierre" /><q-btn class="btn-confirm q-ml-md" label="Cerrar proceso" :disable="!auth.canEdit || !records.samples?.every((sample)=>sample.resultStatus==='Validado')" @click="runAction('Cerrar proceso')" /></div>
    </template>

    <q-dialog v-model="dialogOpen" persistent>
      <q-card style="width:min(560px,95vw);padding:22px">
        <div class="row justify-between items-center"><h2 class="panel-title q-mb-none">{{ dialogTitle }}</h2><q-btn flat round icon="close" aria-label="Cerrar diálogo" @click="dialogOpen=false" /></div>
        <q-banner class="status-info q-my-md" rounded>El servicio simula una segunda validación antes de guardar.</q-banner>
        <q-form class="q-gutter-md" @submit.prevent="saveForm">
          <q-input v-for="field in (modules[baseKey]?.fields || ['name','description'])" :key="field" v-model="form[field]" outlined :label="{name:'Nombre completo',email:'Correo electrónico',phone:'Teléfono',address:'Dirección',food:'Alimento',quantity:'Cantidad',location:'Ubicación física',description:'Descripción'}[field] || field" :type="field==='description'?'textarea':'text'" :error="Boolean(fieldErrors[field])" :error-message="fieldErrors[field]" />
          <q-select v-if="baseKey==='clientes'" v-model="form.kind" outlined label="Tipo de cliente" :options="['Interno SENA','Externo']" />
          <div v-if="baseKey==='recepcion/nueva'"><q-select v-model="form.type" outlined label="Tipo físico" :options="['Sólido','Líquido']" /><q-banner class="status-warning" rounded>Cantidad de referencia: 300 g o ml. Una cantidad menor no bloquea la recepción.</q-banner></div>
          <div class="row justify-end q-gutter-sm"><q-btn flat label="Cancelar" @click="dialogOpen=false" /><q-btn type="submit" unelevated class="btn-primary" label="Guardar cambios" /></div>
        </q-form>
      </q-card>
    </q-dialog>
    <q-dialog v-model="reasonDialog" persistent>
      <q-card style="width:min(500px,95vw);padding:24px">
        <h2 class="panel-title">{{ reasonAction }}</h2>
        <p class="muted">Escribe el motivo. Este dato quedará guardado en la trazabilidad.</p>
        <q-select v-if="reasonAction==='Cambiar estado'" v-model="reasonStatus" class="q-mb-md" outlined label="Nuevo estado" :options="['Ingresada','En proceso','En análisis']" />
        <q-input v-model="reason" type="textarea" outlined label="Motivo obligatorio" rows="3" autofocus />
        <div class="row justify-end q-gutter-sm q-mt-md"><q-btn flat label="Cancelar" @click="reasonDialog=false" /><q-btn unelevated class="btn-primary" label="Confirmar acción" :disable="!reason.trim() || reasonAction==='Cambiar estado' && !reasonStatus" @click="confirmReason" /></div>
      </q-card>
    </q-dialog>
    <q-dialog :model-value="Boolean(mailPreview)" @update:model-value="(value)=>{if(!value)mailPreview=''}">
      <q-card style="width:min(600px,95vw);padding:24px">
        <div class="row justify-between items-center"><h2 class="panel-title">{{ mailPreview }}</h2><q-btn flat round icon="close" aria-label="Cerrar vista previa" @click="mailPreview=''" /></div>
        <div class="q-pa-md" style="background:var(--bg);border:1px solid var(--border);border-radius:12px"><div class="text-caption muted">De: Laboratorio de alimentos · SENA</div><div class="text-caption muted">Para: cliente@example.com</div><q-separator class="q-my-md" /><p>Hola,</p><p>Te compartimos una actualización sobre tu muestra <span class="mono">0042-2026</span>.</p><p>Consulta los detalles en el portal de seguimiento del laboratorio.</p><p>Atentamente,<br>Servicio de Análisis de Laboratorio · SENA</p></div>
        <div class="row justify-end q-gutter-sm q-mt-md"><q-btn flat label="Cerrar" @click="mailPreview=''" /><q-btn class="btn-communicate" unelevated icon="send" label="Registrar envío simulado" @click="perform(`Vista previa ${mailPreview} enviada`);mailPreview=''" /></div>
      </q-card>
    </q-dialog>
    </template>
  </div>
</template>
