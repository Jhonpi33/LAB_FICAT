import mongoose from 'mongoose';

// Trazabilidad de la muestra: solo se INSERTA (nunca se modifica).
// visible_cliente controla qué eventos se proyectan en el seguimiento público.
const eventoSchema = new mongoose.Schema({
  muestra_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Muestra',
    required: [true, 'La muestra es obligatoria']
  },
  tipo_evento: {
    type: String,
    enum: {
      values: [
        'recepcion', 'ingreso', 'cambio_estado', 'observacion', 'correccion',
        'inicio', 'cambio_fecha', 'resultado', 'repeticion', 'validacion',
        'cierre', 'rotulo', 'ubicacion', 'rechazo', 'notificacion'
      ],
      message: 'Tipo de evento no valido'
    },
    required: true
  },
  estado_anterior: { type: String, default: null },
  estado_nuevo: { type: String, default: null },
  descripcion: { type: String, required: true },
  ubicacion: { type: String, default: '' },
  visible_cliente: { type: Boolean, default: false },
  usuario_id: { type: String, default: null },
  fecha: { type: Date, default: Date.now }
});

eventoSchema.index({ muestra_id: 1 });
eventoSchema.index({ muestra_id: 1, visible_cliente: 1, fecha: -1 });

export default mongoose.model('EventoTrazabilidad', eventoSchema);
