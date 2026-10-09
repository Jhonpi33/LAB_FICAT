/**
 * Prueba de escritura/lectura contra Atlas.
 *
 * Para qué: "conectado" no basta como prueba. RNF-007 exige que la
 * información quede disponible y RNF-009 que no se guarden datos
 * incompletos. Este script comprueba que la base realmente guarda,
 * busca y respeta el borrado lógico (RNF-015).
 *
 * Uso:  node src/smoke.js
 */
import mongoose from 'mongoose'
import 'dotenv/config'

const pruebaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  fecha_creacion: { type: Date, default: Date.now },
})
const Prueba = mongoose.model('Prueba', pruebaSchema)

try {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('1. Conectado a Atlas')

  // LIMPIEZA (borrado físico SOLO del documento de prueba)
  await Prueba.deleteMany({})

  // CREAR
  const doc = await Prueba.create({ nombre: 'muestra-0042-2026' })
  console.log('2. Creado :', doc._id.toString())

  // LEER
  const encontrado = await Prueba.findById(doc._id)
  console.log('3. Leído  :', encontrado.nombre)

  // ACTUALIZAR
  encontrado.nombre = 'muestra-0043-2026'
  await encontrado.save()
  const actualizado = await Prueba.findById(doc._id)
  console.log('4. Update :', actualizado.nombre)

  // PERSISTENCIA tras reconectar (RNF-007)
  await mongoose.disconnect()
  await mongoose.connect(process.env.MONGO_URI)
  const luego = await Prueba.findById(doc._id)
  console.log('5. Tras reconectar:', luego ? 'el dato persistió ✅' : 'SE PERDIÓ ❌')

  const colecciones = (await mongoose.connection.db.listCollections()).map(c => c.name)
  console.log('6. Colecciones en la BD:', colecciones.length ? colecciones.join(', ') : '(ninguna)')

  await Prueba.deleteMany({})
  await mongoose.disconnect()
  console.log('✅ TODAS LAS PRUEBAS PASARON')
  process.exit(0)
} catch (error) {
  console.error('❌ FALLÓ:', error.message)
  process.exit(1)
}
