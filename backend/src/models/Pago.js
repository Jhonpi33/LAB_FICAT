import mongoose from 'mongoose';

// Pagos SIMULADOS (RNF-018): nunca se captura información de tarjeta.
const pagoSchema = new mongoose.Schema(
  {
    cotizacion_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cotizacion',
      required: [true, 'La cotización es obligatoria']
    },
    solicitud_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Solicitud',
      required: [true, 'La solicitud es obligatoria']
    },
    referencia: { type: String, required: true, unique: true },
    monto: { type: Number, required: true, min: 0 },
    metodo: { type: String, default: 'simulado' },
    estado: {
      type: String,
      enum: { values: ['pendiente', 'confirmado', 'fallido'], message: 'Estado no valido' },
      default: 'pendiente'
    },
    fecha_confirmacion: { type: Date, default: null },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

pagoSchema.index({ solicitud_id: 1 });
pagoSchema.index({ cotizacion_id: 1 });
pagoSchema.index({ estado: 1, fecha_creacion: -1 });

export default mongoose.model('Pago', pagoSchema);
