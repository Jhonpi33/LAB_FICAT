import mongoose from 'mongoose';

const parametroSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      unique: true,
      maxlength: 100
    },
    descripcion: { type: String, default: '' },
    precio: { type: Number, required: [true, 'El precio es obligatorio'], min: 0 },
    unidad: { type: String, default: '' },
    activo: { type: Boolean, default: true },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

// Mongoose pluralizaría "ParametroAnalisis" como "parametroanalises", que NO
// coincide con la colección real "parametros_analisis" de Atlas. Por eso se fija
// el nombre explícito como tercer argumento.
export default mongoose.model('ParametroAnalisis', parametroSchema, 'parametros_analisis');
