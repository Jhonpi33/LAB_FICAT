import mongoose from 'mongoose';

// FACTURA del servicio (antes tabla "facturas").
//
// Cómo funciona:
//   - Se genera desde un PAGO confirmado (RF-099/101).
//   - "generada" -> "enviada" (correo simulado, RNF-019) o "anulada"/"error".
//   - historial[] es una bitácora embebida de TODOS los cambios (RF-106).
//   - documento guarda la respuesta de FACTUS SANDBOX (nunca pública, RNF-017).
const historialSchema = new mongoose.Schema(
  {
    estado: {
      type: String,
      enum: {
        values: ['pendiente', 'generada', 'enviada', 'anulada', 'error'],
        message: 'Estado no valido'
      },
      required: true
    },
    usuario: { type: String, default: null },
    fecha: { type: Date, default: Date.now },
    motivo: { type: String, default: '' }
  },
  { _id: false }
);

const facturaSchema = new mongoose.Schema(
  {
    solicitud_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Solicitud',
      required: [true, 'La solicitud es obligatoria']
    },
    pago_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pago',
      required: [true, 'El pago es obligatorio']
    },
    numero: { type: String, required: true, unique: true }, // 'FAC-2026-0001'
    valor_total: { type: Number, required: true, min: 0 },
    estado: {
      type: String,
      enum: {
        values: ['pendiente', 'generada', 'enviada', 'anulada', 'error'],
        message: 'Estado no valido'
      },
      default: 'pendiente'
    },
    documento: { type: mongoose.Schema.Types.Mixed, default: null }, // respuesta Factus
    generado_por: { type: String, default: null },
    fecha_generacion: { type: Date, default: null },
    historial: { type: [historialSchema], default: [] },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

facturaSchema.index({ solicitud_id: 1 });
facturaSchema.index({ pago_id: 1 });

export default mongoose.model('Factura', facturaSchema);
