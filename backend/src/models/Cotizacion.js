const mongoose = require('mongoose');
const { ESTADOS_COTIZACION } = require('../config/constants');

const itemSchema = new mongoose.Schema(
  {
    parametro: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParametroAnalisis',
      required: [true, 'El parametro es obligatorio']
    },
    descripcion: { type: String, default: '', maxlength: 200 },
    cantidad: {
      type: Number,
      required: [true, 'La cantidad es obligatoria'],
      min: [1, 'La cantidad minima es 1']
    },
    precio_unitario: {
      type: Number,
      required: [true, 'El precio unitario es obligatorio'],
      min: [0, 'El precio unitario no puede ser negativo']
    },
    subtotal: {
      type: Number,
      required: [true, 'El subtotal es obligatorio'],
      min: [0, 'El subtotal no puede ser negativo']
    }
  },
  { _id: false }
);

const cotizacionSchema = new mongoose.Schema(
  {
    solicitud: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Solicitud',
      required: [true, 'La solicitud es obligatoria']
    },
    numero: {
      type: Number,
      required: [true, 'El numero de cotizacion es obligatorio'],
      unique: true,
      min: 1
    },
    items: {
      type: [itemSchema],
      validate: {
        validator: (valor) => Array.isArray(valor) && valor.length > 0,
        message: 'La cotizacion debe tener al menos un item'
      }
    },
    subtotal: { type: Number, required: true, default: 0, min: 0 },
    total: { type: Number, required: true, default: 0, min: 0 },
    estado: {
      type: String,
      enum: { values: ESTADOS_COTIZACION, message: 'Estado de cotizacion no valido' },
      default: 'borrador'
    },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

cotizacionSchema.index({ solicitud: 1 });
cotizacionSchema.index({ estado: 1, fecha_creacion: -1 });

module.exports = mongoose.model('Cotizacion', cotizacionSchema);
