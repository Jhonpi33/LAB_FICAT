<script setup>
/**
 * COMPONENTE REUTILIZABLE 2/2 — /components/Tables/TablaDatos.vue
 * Envoltorio sobre <q-table> con buscador, paginado, estado "cargando" y
 * mensaje cuando no hay datos.
 */
import { computed, ref, useSlots } from 'vue'

defineProps({
  filas: { type: Array, required: true },
  columnas: { type: Array, required: true },
  cargando: { type: Boolean, default: false },
  filaClave: { type: String, default: '_id' },
  mensajeVacio: { type: String, default: 'No hay registros para mostrar' },
})

const busqueda = ref('')

const slotsPropios = ['default', 'top', 'no-data', 'acciones-tabla']
const slots = useSlots()
const slotsReenviados = computed(() =>
  Object.keys(slots).filter((nombre) => !slotsPropios.includes(nombre)),
)
</script>

<template>
  <q-table
    :rows="filas"
    :columns="columnas"
    :row-key="filaClave"
    :loading="cargando"
    :filter="busqueda"
    :rows-per-page-options="[10, 25, 50, 0]"
    :no-data-label="mensajeVacio"
    no-results-label="Ningún registro coincide con la búsqueda"
    loading-label="Consultando al servidor..."
    rows-per-page-label="Registros por página"
    flat
    bordered
    class="tabla-datos my-sticky-header-table"
  >
    <template #top>
      <div class="row full-width items-center q-col-gutter-sm">
        <div class="col-12 col-sm-5">
          <q-input v-model="busqueda" dense outlined clearable debounce="300" placeholder="Buscar...">
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>

        <q-space class="gt-xs" />

        <div class="col-12 col-sm-auto">
          <slot name="acciones-tabla" />
        </div>
      </div>
    </template>

    <template v-for="nombre in slotsReenviados" :key="nombre" #[nombre]="datosDelSlot">
      <slot :name="nombre" v-bind="datosDelSlot || {}" />
    </template>

    <template #no-data>
      <div class="full-width column flex-center q-py-xl">
        <q-icon name="inbox" size="64px" color="grey-4" class="q-mb-sm" />
        <span class="empty-title">{{ mensajeVacio }}</span>
      </div>
    </template>
  </q-table>
</template>

<style scoped lang="scss">
.tabla-datos {
  border-radius: 8px;
}
</style>
