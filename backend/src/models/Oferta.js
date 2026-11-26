import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  solicitud: { type: mongoose.ObjectId, ref: 'Solicitud', required: true, unique: true },
  cotizacion: { type: mongoose.ObjectId, ref: 'Cotizacion', required: true, unique: true },
  clave: { type: String, required: true, unique: true },
  numero: String,
  cliente: String,
  correo: String,
  formulario: Object,
  borrador: Buffer,
  pdf: Buffer,
  token: { type: String, select: false },
  vence: Date,
  firmada: Date,
  enviada: Date,
  produccionEnviada: Date,
  reciboEnviado: Date,
  ultimoIntento: Date,
}, { timestamps: true });

export default mongoose.model('Oferta', schema);
