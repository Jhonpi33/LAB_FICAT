import mongoose from 'mongoose';

// Ítem embebido de la cotización (antes era la tabla cotizacion_items).
const itemSchema = new mongoose.Schema(
  {
    parametro_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParametroAnalisis',
      required: [true, 'El parámetro es obligatorio']
    },
    descripcion: { type: String, default: '' },
    cantidad: { type: Number, required: true, min: 1 },
    precio_unitario: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const cotizacionSchema = new mongoose.Schema(
  {
    solicitud_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Solicitud',
      required: [true, 'La solicitud es obligatoria']
    },
    numero: { type: Number, required: true, unique: true },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    estado: {
      type: String,
      enum: {
        values: ['borrador', 'enviada', 'envio_fallido', 'aceptada', 'rechazada'],
        message: 'Estado no valido'
      },
      default: 'borrador'
    },
    enviada_por_correo: { type: Boolean, default: false },
    error_correo: { type: String, default: '' },
    items: { type: [itemSchema], default: [] },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

cotizacionSchema.index({ solicitud_id: 1 });

export default mongoose.model('Cotizacion', cotizacionSchema);
