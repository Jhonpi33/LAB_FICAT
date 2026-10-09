import mongoose from 'mongoose'
import 'dotenv/config'

/**
 * Conecta el backend con MongoDB Atlas.
 *
 * Para qué: RNF-001 obliga a usar MongoDB Atlas como almacenamiento, y
 * RNF-007 exige que la información permanezca disponible. Si la conexión
 * falla, el servidor NO debe arrancar: si no, la API respondería con datos
 * inexistentes y RNF-009 (integridad) quedaría violado.
 */
export async function conectarBD() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log(`✅ MongoDB Atlas conectado · ${mongoose.connection.name}`)
    return true
  } catch (error) {
    console.error('❌ No se pudo conectar con MongoDB Atlas:', error.message)
    return false
  }
}
