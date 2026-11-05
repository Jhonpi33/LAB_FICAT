import mongoose from 'mongoose';

// INFORME de resultados de una muestra (antes tabla "informes").
//
// Cómo funciona el ciclo de vida:
//   generado  -> el informe se crea con los resultados de la muestra
//   disponible -> se publica para el cliente (aparece en el seguimiento público)
//   enviado   -> se simula el envío por correo (RNF-019: sin SMTP real)
//
// El PDF real (archivo_id, GridFS) queda pendiente: por ahora la descarga es
// DEMOSTRATIVA (RF-095), como exige el alcance académico del proyecto.
const informeSchema = new mongoose.Schema(
  {
    muestra_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Muestra',
      required: [true, 'La muestra es obligatoria']
    },
    numero_informe: { type: String, required: true, unique: true }, // 'INF-2026-0001'
    estado: {
      type: String,
      enum: {
        values: ['borrador', 'generado', 'disponible', 'enviado'],
        message: 'Estado no valido'
      },
      default: 'generado'
    },
    archivo_id: { type: mongoose.Schema.Types.ObjectId, default: null }, // GridFS (pendiente)
    version: { type: Number, required: true, min: 1, default: 1 },
    regenerado_de: { type: mongoose.Schema.Types.ObjectId, default: null },
    generado_por: { type: String, default: null },
    fecha_generacion: { type: Date, default: null },
    fecha_disponibilidad: { type: Date, default: null },
    eliminado: { type: Boolean, default: false },
    eliminado_por: { type: String, default: null },
    fecha_eliminacion: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }
  }
);

informeSchema.index({ muestra_id: 1 });

export default mongoose.model('Informe', informeSchema);
