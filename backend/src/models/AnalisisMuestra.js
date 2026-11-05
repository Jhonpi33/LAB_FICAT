import mongoose from 'mongoose';

// Resultado de UN parámetro de una muestra (antes tabla analisis_muestras).
// numero_ejecucion permite repetir un parámetro (RF-054/055).
const analisisSchema = new mongoose.Schema({
  muestra_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Muestra',
    required: [true, 'La muestra es obligatoria']
  },
  parametro_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParametroAnalisis',
    required: [true, 'El parámetro es obligatorio']
  },
  numero_ejecucion: { type: Number, required: true, min: 1, default: 1 },
  tipo: {
    type: String,
    enum: { values: ['inicial', 'repeticion'], message: 'Tipo no valido' },
    default: 'inicial'
  },
  motivo_repeticion: { type: String, default: '' },
  estado: {
    type: String,
    enum: { values: ['en_curso', 'completado', 'validado'], message: 'Estado no valido' },
    default: 'en_curso'
  },
  resultado: { type: String, default: '' },
  valor: { type: Number, default: null },
  unidad: { type: String, default: '' },
  fecha_inicio: { type: Date, default: null },
  fecha_finalizacion: { type: Date, default: null },
  fecha_validacion: { type: Date, default: null },
  realizado_por: { type: String, default: null },
  validado_por: { type: String, default: null }
});

analisisSchema.index({ muestra_id: 1, parametro_id: 1, numero_ejecucion: 1 }, { unique: true });
analisisSchema.index({ muestra_id: 1 });

export default mongoose.model('AnalisisMuestra', analisisSchema);
