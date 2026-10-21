/**
 * Formateadores compartidos (fechas ISO 8601 y moneda COP).
 */

/** Formatea una fecha ISO como fecha/hora local de Colombia. */
export function formatearFecha(iso) {
  if (!iso) return '—'
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** Formatea un monto en pesos colombianos. */
export function formatearMoneda(valor) {
  const numero = Number(valor)
  if (Number.isNaN(numero)) return '$ 0'
  return numero.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

/** Capitaliza el primer letra de un estado ("en_analisis" → "En_analisis" → "En analisis"). */
export function textoEstado(estado) {
  if (!estado) return '—'
  return estado.replaceAll('_', ' ')
}
