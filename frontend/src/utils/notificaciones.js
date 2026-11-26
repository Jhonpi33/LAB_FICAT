import { formatDate } from './formatDate'

const tipos = {
  cambio_etapa: { label: 'Cambio de etapa', icon: 'science', fondo: '#e8f5e9', color: '#256029' },
  incidencia: { label: 'Incidencia', icon: 'report_problem', fondo: '#fff3e0', color: '#9a5200' },
  cambio_fecha: { label: 'Cambio de fecha', icon: 'event', fondo: '#e3f2fd', color: '#1565c0' },
  resultados_disponibles: { label: 'Resultados disponibles', icon: 'fact_check', fondo: '#e8f5e9', color: '#256029' },
  conservacion: { label: 'Conservación', icon: 'inventory_2', fondo: '#ede7f6', color: '#673ab7' },
  otro: { label: 'Otro', icon: 'mail', fondo: '#eceff1', color: '#455a64' },
}

const estados = {
  pendiente: { label: 'Pendiente', fondo: '#fff3e0', texto: '#8a4b00', color: '#c77700' },
  enviada: { label: 'Enviada', fondo: '#e8f5e9', texto: '#256029', color: '#2e7d32' },
  fallida: { label: 'Fallida', fondo: '#ffebee', texto: '#b71c1c', color: '#c62828' },
}

export function tipoInfo(tipo) {
  return Object.hasOwn(tipos, tipo) ? tipos[tipo] : tipos.otro
}

export function estadoInfo(estado) {
  return Object.hasOwn(estados, estado)
    ? estados[estado]
    : { label: 'Desconocido', fondo: '#eceff1', texto: '#455a64', color: '#607d8b' }
}

export const fechaCorta = formatDate
