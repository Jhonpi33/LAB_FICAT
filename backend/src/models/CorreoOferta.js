import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  solicitud: { type: mongoose.ObjectId, required: true },
  evento: { type: String, enum: ['firma','copia','recibo'], required: true },
  estado: { type: String, enum: ['pendiente','procesando','enviado'], default: 'pendiente' },
  proximoIntento: { type: Date, default: Date.now },
  intentos: { type: Number, default: 0 },
  error: String,
  enviado: Date,
}, { timestamps: true });
schema.index({ solicitud: 1, evento: 1 }, { unique: true });
export default mongoose.model('CorreoOferta', schema);
