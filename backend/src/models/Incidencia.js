import mongoose from 'mongoose';

// Respuesta embebida a una incidencia (cliente o interno).
const respuestaSchema = new mongoose.Schema(
  {
    tipo_usuario: {
      type: String,
      enum: { values: ['cliente', 'interno'], message: 'Tipo de usuario no valido' },
      required: true
    },
    usuario_id: { type: String, default: null },
    mensaje: { type: String, required: true },
    fecha: { type: Date, default: Date.now },
    eliminado: { type: Boolean, default: false }
  },
  { _id: true }
);

// Acción interna sobre la incidencia (bitácora).
const accionSchema = new mongoose.Schema(
  {
    tipo: { type: String, required: true },
    usuario: { type: String, default: null },
    fecha: { type: Date, default: Date.now },
    comentario: { type: String, default: '' }
  },
  { _id: false }
);

const incidenciaSchema = new mongoose.Schema(
  {
    muestra_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Muestra',
      required: [true, 'La muestra es obligatoria']
    },
    tipo: {
      type: String,
      enum: {
        values: ['informativa', 'demora', 'requiere_accion_cliente'],
        message: 'Tipo de incidencia no valido'
      },
      required: true
    },
    titulo: { type: String, required: true, trim: true, maxlength: 150 },
    descripcion: { type: String, required: true, trim: true, maxlength: 500 },
    observaciones_internas: { type: String, default: '' },
    visible_cliente: { type: Boolean, default: false },
    requiere_respuesta: { type: Boolean, default: false },
    estado: {
      type: String,
      enum: {
        values: ['abierta', 'en_revision', 'esperando_cliente', 'aprobada', 'cerrada'],
        message: 'Estado no valido'
      },
      default: 'abierta'
    },
    nueva_fecha_estimada: { type: Date, default: null },
    motivo: { type: String, default: '' },
    creada_por: { type: String, default: null },
    revisada_por: { type: String, default: null },
    fecha_cierre: { type: Date, default: null },
    acciones: { type: [accionSchema], default: [] },
    respuestas: { type: [respuestaSchema], default: [] },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

incidenciaSchema.index({ muestra_id: 1 });

export default mongoose.model('Incidencia', incidenciaSchema);
