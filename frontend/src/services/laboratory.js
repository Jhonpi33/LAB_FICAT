import { activity, customers, mailQueue, parameters, requests, samples } from '../mocks/data'

const wait = (value, delay = 180) => new Promise((resolve) => window.setTimeout(() => resolve(structuredClone(value)), delay))

export const laboratoryService = {
  async overview() {
    return wait({ customers, requests, samples, activity, mailQueue, parameters })
  },
  async getSample(code) {
    await wait(null, 250)
    const sample = samples.find((item) => item.code.toLowerCase() === code.toLowerCase())
    if (!sample) throw new Error('No encontramos una muestra con ese código. Revisa los datos e inténtalo de nuevo.')
    return structuredClone(sample)
  },
  async getPublicSample(code) {
    const sample = await this.getSample(code)
    return {
      code: sample.code,
      food: sample.food,
      status: sample.status,
      dueDate: sample.dueDate,
      isDelayed: sample.isDelayed,
      publicEvents: sample.publicEvents,
      incidents: sample.incidents.filter((incident) => incident.public).map(({ id, type, text, status }) => ({ id, type, text, status })),
      resultStatus: sample.resultStatus,
      invoiceStatus: sample.invoiceStatus,
    }
  },
  async saveRecord(module, values) {
    await wait(null, 300)
    const errors = {}
    if (!values.name && module === 'clientes') errors.name = 'Escribe el nombre completo.'
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Escribe un correo válido.'
    if (Object.keys(errors).length) {
      const error = new Error('Revisa los campos señalados.')
      error.fields = errors
      throw error
    }
    return { ...values, id: `${module}-${Date.now()}`, createdAt: new Date().toISOString() }
  },
  async performAction(action, payload = {}) {
    if (action === 'Iniciar proceso' && payload.code) {
      const request = requests.find((item) => item.code === payload.code)
      if (request?.kind === 'Externo' && request.payment !== 'Confirmado') {
        throw new Error('Confirma el pago antes de iniciar el proceso de una solicitud externa.')
      }
    }
    await wait(null, 250)
    const event = { id: `evt-${Date.now()}`, action, payload, user: 'Laura Gómez', at: new Date().toISOString() }
    activity.unshift({ at: event.at, user: event.user, action, record: payload.code || 'SOL-1042', module: payload.module || 'Sistema' })
    if (['Confirmar pago', 'Simular confirmación de pago'].includes(action) && payload.code) {
      const sample = samples.find((item) => item.code === payload.code)
      if (sample) sample.requestStatus = 'Pago confirmado'
      const request = requests.find((item) => item.code === payload.code)
      if (request) request.payment = 'Confirmado'
    }
    if (action === 'Cambiar estado' && payload.code && payload.status) {
      const sample = samples.find((item) => item.code === payload.code)
      if (sample) sample.status = payload.status
    }
    if (action === 'Validar resultados' && payload.code) {
      const sample = samples.find((item) => item.code === payload.code)
      if (sample) {
        sample.resultStatus = 'Validado'
        sample.publicEvents.push({ at: event.at, title: 'Resultados validados', description: 'Los resultados de tu muestra fueron revisados.' })
      }
    }
    if (action === 'Marcar atención inmediata') {
      const request = requests.find((item) => item.id === payload.requestId) || requests.find((item) => item.code === payload.code)
      if (request) {
        request.urgent = true
        request.urgentReason = payload.reason
      }
    }
    if (action === 'Iniciar proceso') {
      const sample = samples.find((item) => item.code === payload.code)
      if (sample) sample.status = 'En proceso'
    }
    if (action === 'Generar documento de facturación' && payload.code) {
      const sample = samples.find((item) => item.code === payload.code)
      if (sample) sample.invoiceStatus = 'Generada'
    }
    if (action === 'Reenviar') {
      const notification = mailQueue.find((item) => item.id === payload.id)
      if (notification) notification.status = 'Enviada'
    }
    return event
  },
}
