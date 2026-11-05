import mongoose from 'mongoose';

// Colección técnica de consecutivos. Cada documento es un contador por tipo y
// año (ej. { tipo: 'muestras', anio: 2026, secuencia: 42 }).
// El índice único (tipo, anio) y el $inc evitan condiciones de carrera
// (RF-026/027: dos muestras creadas a la vez jamás reciben el mismo código).
const secuenciaSchema = new mongoose.Schema({
  tipo: { type: String, required: true },
  anio: { type: Number, required: true },
  secuencia: { type: Number, required: true, default: 0 }
});

secuenciaSchema.index({ tipo: 1, anio: 1 }, { unique: true });

export default mongoose.model('Secuencia', secuenciaSchema);
