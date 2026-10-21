const mongoose = require('mongoose');
const { ESTADOS_MUESTRA, TIPOS_FISICO_MUESTRA, UNIDADES_MUESTRA } = require('../config/constants');

const muestraSchema = new mongoose.Schema(
  {
    solicitud: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Solicitud',
      required: [true, 'La solicitud es obligatoria']
    },
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
      required: [true, 'El cliente es obligatorio']
    },
    nombre_muestra: {
      type: String,
      required: [true, 'El nombre de la muestra es obligatorio'],
      trim: true,
      maxlength: 150
    },
    descripcion: {
      type: String,
      required: [true, 'La descripcion es obligatoria'],
      trim: true,
      maxlength: 2000
    },
    tipo_fisico: {
      type: String,
      enum: { values: TIPOS_FISICO_MUESTRA, message: 'Tipo fisico no valido' },
      required: [true, 'El tipo fisico es obligatorio']
    },
    cantidad: {
      type: Number,
      required: [true, 'La cantidad es obligatoria'],
      min: [0, 'La cantidad no puede ser negativa']
    },
    unidad: {
      type: String,
      enum: { values: UNIDADES_MUESTRA, message: 'La unidad solo puede ser g o ml' },
      required: [true, 'La unidad es obligatoria']
    },
    estado: {
      type: String,
      enum: { values: ESTADOS_MUESTRA, message: 'Estado de muestra no valido' },
      default: 'pendiente'
    },
    motivo_rechazo: { type: String, default: '', maxlength: 300 },
    // Se generan al aceptar la muestra (RF-026 a RF-028); indice unico con sparse
    // para permitir muestras aun sin codigo.
    codigo: { type: String, unique: true, sparse: true },
    codigo_seguimiento: { type: String, unique: true, sparse: true },
    parametros: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ParametroAnalisis' }],
    ubicacion: { type: String, default: '', maxlength: 150 },
    fecha_recepcion: { type: Date, default: Date.now },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

muestraSchema.index({ solicitud: 1 });
muestraSchema.index({ cliente: 1 });
muestraSchema.index({ estado: 1, fecha_recepcion: -1 });

module.exports = mongoose.model('Muestra', muestraSchema);
