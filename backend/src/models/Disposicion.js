import mongoose from 'mongoose';

// DISPOSICIÓN final de la muestra (RF-086 a RF-093): devolución al cliente o
// desecho. Es 1:1 con la muestra (índice único), como en el diseño original.
const disposicionSchema = new mongoose.Schema(
  {
    muestra_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Muestra',
      required: [true, 'La muestra es obligatoria'],
      unique: true
    },
    tipo: {
      type: String,
      enum: { values: ['devolucion', 'desecho'], message: 'Tipo no valido' },
      required: true
    },
    motivo: { type: String, required: true, trim: true, maxlength: 300 },
    observacion: { type: String, default: '' },
    fecha_salida: { type: Date, default: Date.now },
    notificacion_cliente: { type: Boolean, default: false },
    realizada_por: { type: String, default: null },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

export default mongoose.model('Disposicion', disposicionSchema);
