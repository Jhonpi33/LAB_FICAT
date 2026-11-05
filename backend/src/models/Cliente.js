import mongoose from 'mongoose';

const clienteSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [3, 'El nombre debe tener minimo 3 caracteres'],
      maxlength: 120
    },
    tipo_documento: {
      type: String,
      enum: { values: ['CC', 'NIT', 'CE', 'TI'], message: 'Tipo de documento no valido' },
      required: [true, 'El tipo de documento es obligatorio']
    },
    numero_documento: {
      type: String,
      required: [true, 'El numero de documento es obligatorio'],
      trim: true,
      unique: true,
      maxlength: 30
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'El email no es valido']
    },
    telefono: { type: String, default: '', maxlength: 30 },
    direccion: { type: String, default: '', maxlength: 200 },
    tipo_cliente: {
      type: String,
      enum: { values: ['interno', 'externo'], message: 'Tipo de cliente no valido' },
      required: [true, 'El tipo de cliente es obligatorio']
    },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

export default mongoose.model('Cliente', clienteSchema);
