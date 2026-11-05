import mongoose from 'mongoose';

const muestraSchema = new mongoose.Schema(
  {
    solicitud_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Solicitud',
      required: [true, 'La solicitud es obligatoria']
    },
    cliente_id: {
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
      maxlength: 500
    },
    tipo_fisico: {
      type: String,
      enum: { values: ['solido', 'liquido'], message: 'Tipo fisico no valido' },
      required: [true, 'El tipo fisico es obligatorio']
    },
    cantidad: { type: Number, required: [true, 'La cantidad es obligatoria'], min: 0 },
    unidad: {
      type: String,
      enum: { values: ['g', 'ml'], message: 'Unidad no valida' },
      required: [true, 'La unidad es obligatoria']
    },
    parametros_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ParametroAnalisis' }],
    verificacion_fisica: { type: Boolean, default: false },
    estado_recepcion: {
      type: String,
      enum: { values: ['pendiente', 'aceptada', 'rechazada'], message: 'Estado de recepcion no valido' },
      default: 'pendiente'
    },
    motivo_rechazo: { type: String, default: '' },
    codigo: { type: String, default: null, unique: true, sparse: true },
    codigo_seguimiento: { type: String, default: null, unique: true, sparse: true },
    estado: {
      type: String,
      enum: {
        values: [
          'ingresada', 'en_proceso', 'en_analisis', 'resultados_validados',
          'cerrada', 'rechazada', 'en_almacen', 'devuelta', 'desechada'
        ],
        message: 'Estado no valido'
      },
      default: 'ingresada'
    },
    rotulo_impreso: { type: Boolean, default: false },
    rotulo_pdf_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    ubicacion_clasificacion: {
      type: String,
      enum: { values: ['ingresada', 'en_proceso', 'en_analisis'], message: 'Clasificacion no valida' },
      default: 'ingresada'
    },
    ubicacion: { type: String, default: '' },
    ubicacion_actualizado_en: { type: Date, default: null },
    fecha_recepcion: { type: Date, default: null },
    fecha_inicio: { type: Date, default: null },
    fecha_estimada_entrega: { type: Date, default: null },
    fecha_cierre: { type: Date, default: null },
    fecha_limite_conservacion: { type: Date, default: null },
    pendiente_disposicion: { type: Boolean, default: false },
    ultimo_evento_tipo: { type: String, default: null },
    ultimo_evento_fecha: { type: Date, default: null },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

muestraSchema.index({ solicitud_id: 1 });
muestraSchema.index({ cliente_id: 1 });
muestraSchema.index({ estado: 1, fecha_recepcion: -1 });

export default mongoose.model('Muestra', muestraSchema);
