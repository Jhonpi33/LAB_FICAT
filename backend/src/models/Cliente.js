const mongoose = require('mongoose');
const { TIPOS_DOCUMENTO, TIPOS_CLIENTE } = require('../config/constants');

const clienteSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [3, 'El nombre debe tener minimo 3 caracteres'],
      maxlength: 120
    },
    tipo_documento: {
      type: String,
      enum: { values: TIPOS_DOCUMENTO, message: 'Tipo de documento no valido' },
      default: 'CC'
    },
    numero_documento: {
      type: String,
      required: [true, 'El numero de documento es obligatorio'],
      unique: true,
      trim: true,
      maxlength: 20
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'El email no es valido']
    },
    telefono: {
      type: String,
      trim: true,
      default: '',
      maxlength: 20
    },
    direccion: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200
    },
    tipo_cliente: {
      type: String,
      enum: { values: TIPOS_CLIENTE, message: 'Tipo de cliente no valido' },
      required: [true, 'El tipo de cliente es obligatorio']
    },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

module.exports = mongoose.model('Cliente', clienteSchema);
