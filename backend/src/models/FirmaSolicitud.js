import mongoose from 'mongoose';

const campos = {
  solicitud: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  cliente: String,
  correo: String,
  formulario: mongoose.Schema.Types.Mixed,
  borrador: Buffer,
  token: { type: String, index: true, select: false },
  vence: Date,
  enviada: Date,
  ultimoIntento: Date,
  firmada: Date,
  copiaEnviada: Date,
  pdf: Buffer
};
const opciones = { timestamps: true, optimisticConcurrency: true };

export default mongoose.model('FirmaSolicitud', new mongoose.Schema(campos, opciones));

// Cada muestra nueva tiene su propio PDF. Los documentos por solicitud conservan su historial.
export const FirmaMuestra = mongoose.model('FirmaMuestra', new mongoose.Schema({
  ...campos,
  solicitud: { type: mongoose.Schema.Types.ObjectId, required: true },
  muestra: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true }
}, opciones));
