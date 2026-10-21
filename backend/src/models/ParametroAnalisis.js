const mongoose = require('mongoose');

const parametroAnalisisSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      unique: true,
      trim: true,
      maxlength: 100
    },
    descripcion: {
      type: String,
      required: [true, 'La descripcion es obligatoria'],
      trim: true,
      maxlength: 2000
    },
    precio: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0, 'El precio no puede ser negativo']
    },
    unidad: {
      type: String,
      trim: true,
      default: '',
      maxlength: 20
    },
    activo: { type: Boolean, default: true },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

module.exports = mongoose.model('ParametroAnalisis', parametroAnalisisSchema);
