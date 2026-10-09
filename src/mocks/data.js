export const customers = [
  { id: 'cli-001', name: 'María Fernanda López', kind: 'Externo', document: '1098123456', email: 'maria.lopez@example.com', phone: '310 555 0172', address: 'San Gil, Santander' },
  { id: 'cli-002', name: 'Aprendiz ADSO Grupo 2', kind: 'Interno SENA', document: 'SENA-2048', email: 'aprendiz@sena.edu.co', phone: '607 724 0999', address: 'Centro Agroturístico, San Gil' },
  { id: 'cli-003', name: 'Cooperativa La Huerta', kind: 'Externo', document: '901456780', email: 'calidad@lahuerta.co', phone: '320 440 8812', address: 'Barichara, Santander' },
]

export const samples = [
  {
    code: '0042-2026', customerId: 'cli-001', customer: 'María Fernanda López', food: 'Queso campesino',
    type: 'Sólido', quantity: 450, unit: 'g', status: 'En análisis', requestStatus: 'Pago confirmado',
    invoiceStatus: 'Pendiente', receivedAt: '2026-09-22T09:20:00', dueDate: '2026-10-05', isDelayed: true,
    parameters: ['Humedad', 'Grasa', 'Proteína'], location: 'Nevera 2 · Bandeja B',
    publicEvents: [
      { at: '2026-09-22T09:20:00', title: 'Muestra recibida', description: 'Recibimos la muestra en el laboratorio.' },
      { at: '2026-09-22T10:05:00', title: 'Verificación completada', description: 'La muestra fue aceptada para su análisis.' },
      { at: '2026-09-25T14:10:00', title: 'Análisis en curso', description: 'El equipo de laboratorio está realizando los análisis solicitados.' },
    ],
    internalEvents: [{ at: '2026-09-25T14:10:00', title: 'Control interno', description: 'Revisar calibración del equipo antes de validación.' }],
    incidents: [{ id: 'inc-001', type: 'Informativa', text: 'Se requiere revisión de un parámetro.', public: false, status: 'Abierta' }],
    resultStatus: 'Pendiente', conservationDays: 7,
  },
  {
    code: '0043-2026', customerId: 'cli-002', customer: 'Aprendiz ADSO Grupo 2', food: 'Harina de maíz',
    type: 'Sólido', quantity: 280, unit: 'g', status: 'Ingresada', requestStatus: 'Cotización aceptada',
    invoiceStatus: 'Pendiente', receivedAt: '2026-09-28T08:30:00', dueDate: '2026-10-08',
    parameters: ['Humedad', 'Proteína'], location: 'Estante A · Nivel 1',
    publicEvents: [{ at: '2026-09-28T08:30:00', title: 'Muestra recibida', description: 'Recibimos la muestra en el laboratorio.' }],
    internalEvents: [], incidents: [], resultStatus: 'No iniciado', conservationDays: 7,
  },
  {
    code: '0044-2026', customerId: 'cli-003', customer: 'Cooperativa La Huerta', food: 'Jugo de mora',
    type: 'Líquido', quantity: 600, unit: 'ml', status: 'En proceso', requestStatus: 'En espera de información',
    invoiceStatus: 'Generada', receivedAt: '2026-09-26T11:45:00', dueDate: '2026-10-02',
    parameters: ['pH', 'Acidez'], location: 'Nevera 1 · Bandeja A',
    publicEvents: [{ at: '2026-09-26T11:45:00', title: 'Muestra recibida', description: 'Recibimos la muestra en el laboratorio.' }],
    internalEvents: [], incidents: [{ id: 'inc-002', type: 'Requiere acción del usuario', text: 'Confirme la fecha de elaboración del producto.', public: true, status: 'Abierta' }],
    resultStatus: 'No iniciado', conservationDays: 7,
  },
]

export const requests = [
  { id: 'SOL-1042', client: 'María Fernanda López', kind: 'Externo', service: 'Análisis fisicoquímico', status: 'Aceptada', payment: 'Confirmado', priority: 2, code: '0042-2026', urgent: false },
  { id: 'SOL-1043', client: 'Aprendiz ADSO Grupo 2', kind: 'Interno SENA', service: 'Control de calidad', status: 'Aceptada', payment: 'No requiere pago', priority: 1, code: '0043-2026', urgent: false },
  { id: 'SOL-1044', client: 'Cooperativa La Huerta', kind: 'Externo', service: 'Análisis de bebidas', status: 'Enviada', payment: 'Pendiente', priority: 3, code: '0044-2026', urgent: false },
]

export const parameters = ['Humedad', 'Grasa', 'Proteína', 'pH', 'Acidez', 'Cenizas', 'Fibra']

export const activity = [
  { at: '2026-09-28T08:30:00', user: 'Laura Gómez', action: 'Muestra ingresada', record: '0043-2026', module: 'Recepción' },
  { at: '2026-09-26T11:45:00', user: 'Andrés Rojas', action: 'Factura generada', record: '0044-2026', module: 'Facturación' },
  { at: '2026-09-25T14:10:00', user: 'Laura Gómez', action: 'Etapa actualizada', record: '0042-2026', module: 'Muestras' },
]

export const mailQueue = [
  { id: 'not-001', recipient: 'maria.lopez@example.com', subject: 'Recibimos tu muestra 0042-2026', status: 'Enviada', date: '2026-09-22 09:21' },
  { id: 'not-002', recipient: 'calidad@lahuerta.co', subject: 'Información adicional solicitada', status: 'Fallida', date: '2026-09-27 15:32' },
]
