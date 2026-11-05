import mongoose from 'mongoose';

// Respuesta embebida de la encuesta (4 preguntas fijas, calificación 1-5).
const respuestaSchema = new mongoose.Schema(
  {
    pregunta: { type: String, required: true },
    calificacion: { type: Number, required: true, min: 1, max: 5 },
    comentario: { type: String, default: '' }
  },
  { _id: false }
);

const encuestaSchema = new mongoose.Schema(
  {
    muestra_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Muestra',
      required: [true, 'La muestra es obligatoria']
    },
    cliente_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
      required: [true, 'El cliente es obligatorio']
    },
    token: { type: String, required: true, unique: true },
    estado: {
      type: String,
      enum: { values: ['pendiente', 'respondida'], message: 'Estado no valido' },
      default: 'pendiente'
    },
    fecha_envio: { type: Date, default: null },
    fecha_respuesta: { type: Date, default: null },
    respuestas: { type: [respuestaSchema], default: [] },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

encuestaSchema.index({ muestra_id: 1 });

export default mongoose.model('Encuesta', encuestaSchema);
