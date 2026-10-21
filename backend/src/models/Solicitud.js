const mongoose = require('mongoose');
const { TIPOS_CLIENTE, PRIORIDADES, ESTADOS_SOLICITUD } = require('../config/constants');

const solicitudSchema = new mongoose.Schema(
  {
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
      required: [true, 'El cliente es obligatorio']
    },
    tipo_cliente: {
      type: String,
      enum: { values: TIPOS_CLIENTE, message: 'Tipo de cliente no valido' },
      required: [true, 'El tipo de cliente es obligatorio']
    },
    descripcion: {
      type: String,
      required: [true, 'La descripcion es obligatoria'],
      trim: true,
      maxlength: 2000
    },
    prioridad: {
      type: String,
      enum: { values: PRIORIDADES, message: 'Prioridad no valida' },
      default: 'media'
    },
    atencion_inmediata: { type: Boolean, default: false },
    motivo_atencion_inmediata: {
      type: String,
      default: '',
      maxlength: 300,
      validate: {
        validator: function (valor) {
          if (!this.atencion_inmediata) return true;
          return Boolean(String(valor || '').trim());
        },
        message: 'El motivo de atencion inmediata es obligatorio'
      }
    },
    estado: {
      type: String,
      enum: { values: ESTADOS_SOLICITUD, message: 'Estado de solicitud no valido' },
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

solicitudSchema.index({ estado: 1, fecha_creacion: -1 });
solicitudSchema.index({ cliente: 1 });

module.exports = mongoose.model('Solicitud', solicitudSchema);
