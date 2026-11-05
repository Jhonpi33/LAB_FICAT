import mongoose from 'mongoose';

const solicitudSchema = new mongoose.Schema(
  {
    cliente_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
      required: [true, 'El cliente es obligatorio']
    },
    tipo_cliente: {
      type: String,
      enum: { values: ['interno', 'externo'], message: 'Tipo de cliente no valido' },
      required: [true, 'El tipo de cliente es obligatorio']
    },
    descripcion: {
      type: String,
      required: [true, 'La descripcion es obligatoria'],
      trim: true,
      maxlength: 500
    },
    prioridad: {
      type: String,
      enum: { values: ['baja', 'media', 'alta'], message: 'Prioridad no valida' },
      default: 'media'
    },
    atencion_inmediata: { type: Boolean, default: false },
    motivo_atencion_inmediata: { type: String, default: '' },
    estado: {
      type: String,
      enum: { values: ['pendiente', 'cotizada', 'aceptada', 'pagada', 'rechazada'], message: 'Estado no valido' },
      default: 'pendiente'
    },
    requiere_pago: { type: Boolean, default: false },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

solicitudSchema.index({ estado: 1, fecha_creacion: -1 });
solicitudSchema.index({ cliente_id: 1 });

export default mongoose.model('Solicitud', solicitudSchema);
