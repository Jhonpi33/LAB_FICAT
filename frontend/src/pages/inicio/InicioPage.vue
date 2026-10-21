<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-weight-bold q-mb-xs">Inicio</div>
    <div class="text-body2 text-grey q-mb-md">Resumen general del laboratorio</div>

    <div v-if="cargando" class="row q-gutter-md">
      <q-card v-for="i in 6" :key="i" class="stats-card" flat>
        <q-skeleton type="text" width="120px" />
        <q-skeleton type="text" width="60px" height="40px" />
      </q-card>
    </div>

    <ErrorBanner v-else-if="error" :error="error" class="q-mb-md" />

    <div v-else class="row q-col-gutter-md">
      <div v-for="tarjeta in tarjetas" :key="tarjeta.titulo" class="col-12 col-sm-6 col-md-4">
        <q-card class="stats-card" flat bordered>
          <q-card-section class="row items-center no-wrap">
            <q-avatar :color="tarjeta.color" text-color="white" size="52px" :icon="tarjeta.icono" />
            <div class="q-ml-md">
              <div class="text-h3 text-weight-bold">{{ tarjeta.valor }}</div>
              <div class="text-body2 text-grey-7">{{ tarjeta.titulo }}</div>
            </div>
          </q-card-section>
          <q-card-section v-if="tarjeta.detalle" class="q-pt-none text-caption text-grey-7">
            {{ tarjeta.detalle }}
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../services/api.js'
import ErrorBanner from '../../components/ErrorBanner.vue'

const cargando = ref(true)
const error = ref(null)

const clientes = ref([])
const solicitudes = ref([])
const cotizaciones = ref([])
const muestras = ref([])
const parametros = ref([])

const contarPorEstado = (lista) =>
  lista.reduce((acc, item) => {
    acc[item.estado] = (acc[item.estado] || 0) + 1
    return acc
  }, {})

const resumen = computed(() => ({
  solicitudes: contarPorEstado(solicitudes.value),
  cotizaciones: contarPorEstado(cotizaciones.value),
  muestras: contarPorEstado(muestras.value)
}))

const tarjetas = computed(() => [
  {
    titulo: 'Clientes registrados',
    valor: clientes.value.length,
    icono: 'business',
    color: 'primary',
    detalle: `${clientes.value.filter((c) => c.tipo_cliente === 'interno').length} internos · ${clientes.value.filter((c) => c.tipo_cliente === 'externo').length} externos`
  },
  {
    titulo: 'Solicitudes',
    valor: solicitudes.value.length,
    icono: 'assignment',
    color: 'blue',
    detalle: `${resumen.value.solicitudes.borrador || 0} borrador · ${resumen.value.solicitudes.enviada || 0} enviadas · ${resumen.value.solicitudes.aprobada || 0} aprobadas`
  },
  {
    titulo: 'Cotizaciones',
    valor: cotizaciones.value.length,
    icono: 'request_quote',
    color: 'deep-purple',
    detalle: `${resumen.value.cotizaciones.borrador || 0} borrador · ${resumen.value.cotizaciones.enviada || 0} enviadas · ${resumen.value.cotizaciones.aceptada || 0} aceptadas · ${resumen.value.cotizaciones.rechazada || 0} rechazadas`
  },
  {
    titulo: 'Muestras pendientes de verificacion',
    valor: resumen.value.muestras.pendiente || 0,
    icono: 'hourglass_top',
    color: 'orange',
    detalle: `${muestras.value.length} muestras en total`
  },
  {
    titulo: 'Muestras en analisis',
    valor: resumen.value.muestras.en_analisis || 0,
    icono: 'biotech',
    color: 'teal',
    detalle: `${resumen.value.muestras.aceptada || 0} aceptadas · ${resumen.value.muestras.finalizada || 0} finalizadas · ${resumen.value.muestras.rechazada || 0} rechazadas`
  },
  {
    titulo: 'Parametros de analisis activos',
    valor: parametros.value.filter((p) => p.activo).length,
    icono: 'list_alt',
    color: 'green',
    detalle: `${parametros.value.length} parametros en el catalogo`
  }
])

onMounted(async () => {
  // Todos los listados existen en API.md (sin paginación, devuelven el arreglo completo).
  // Si alguno falla (p. ej. 403 por rol), se muestra el error real del backend.
  try {
    const [rClientes, rSolicitudes, rCotizaciones, rMuestras, rParametros] = await Promise.all([
      api.get('/clientes'),
      api.get('/solicitudes'),
      api.get('/cotizaciones'),
      api.get('/muestras'),
      api.get('/parametros')
    ])
    clientes.value = rClientes.data.datos ?? []
    solicitudes.value = rSolicitudes.data.datos ?? []
    cotizaciones.value = rCotizaciones.data.datos ?? []
    muestras.value = rMuestras.data.datos ?? []
    parametros.value = rParametros.data.datos ?? []
  } catch (e) {
    error.value = e
  } finally {
    cargando.value = false
  }
})
</script>

<style scoped>
.stats-card {
  height: 100%;
  border-radius: 10px;
}
</style>
