import mongoose from 'mongoose';

// NOTIFICACIÓN: cola de correo SIMULADO (RNF-019) con reintentos (RF-111).
//
// Cómo funciona la bandeja:
//   pendiente -> está encolada, "se enviará"
//   enviada   -> se marcó como enviada (simulado)
//   fallida   -> falló el intento; se puede REENVIAR hasta 3 veces
const notificacionSchema = new mongoose.Schema(
  {
    muestra_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Muestra', default: null },
    cliente_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },
    tipo: {
      type: String,
      enum: {
        values: ['cambio_etapa', 'incidencia', 'cambio_fecha', 'resultados_disponibles', 'conservacion', 'otro'],
        message: 'Tipo no valido'
      },
      default: 'otro'
    },
    asunto: { type: String, required: true },
    mensaje: { type: String, required: true },
    correo_destino: { type: String, default: null },
    medio: { type: String, enum: { values: ['correo'], message: 'Medio no valido' }, default: 'correo' },
    estado: {
      type: String,
      enum: { values: ['pendiente', 'enviada', 'fallida'], message: 'Estado no valido' },
      default: 'pendiente'
    },
    intentos: { type: Number, default: 0, min: 0, max: 3 },
    error_ultimo_intento: { type: String, default: null },
    fecha_programada: { type: Date, default: Date.now },
    fecha_envio: { type: Date, default: null },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

notificacionSchema.index({ muestra_id: 1 });
notificacionSchema.index({ cliente_id: 1 });
notificacionSchema.index({ estado: 1, fecha_programada: 1 });

export default mongoose.model('Notificacion', notificacionSchema);
