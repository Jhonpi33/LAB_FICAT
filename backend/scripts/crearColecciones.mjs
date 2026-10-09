/**
 * Aplica "colecciones mongodb.txt" sobre Atlas.
 *
 * Para qué: el documento del equipo es un script de mongosh. Para poder
 * ejecutarlo desde el proyecto sin instalar mongosh, este runner reproduce el
 * mismo entorno (db, use, print) usando el driver oficial de MongoDB.
 *
 * Uso:  node scripts/crearColecciones.js
 *
 * ⚠️  El script original BORRA la colección si ya existe (línea 19 del .txt),
 *     por eso después hay que volver a ejecutar `npm run seed` para recuperar
 *     el usuario administrador.
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import mongoose from 'mongoose'
import 'dotenv/config'

const RUTA_SCRIPT = path.resolve(process.cwd(), '../colecciones mongodb.txt')

const codigo = fs.readFileSync(RUTA_SCRIPT, 'utf8')

await mongoose.connect(process.env.MONGO_URI)
const db = mongoose.connection.db
console.log(`Conectado a "${mongoose.connection.name}"`)

// Cola SECUENCIAL: el script es síncrono pero el driver es asíncrono. Si se
// dispararan en paralelo, crear una colección chocaría con su drop previo
// (error NamespaceExists). Aquí se encadenan en el orden en que el script las pide.
let cola = Promise.resolve()
const fallos = []
const encolar = (etiqueta, fn) => {
  cola = cola.then(fn).catch((e) => { fallos.push({ etiqueta, error: e.message }) })
  return cola
}

let nombres = (await db.listCollections().toArray()).map((c) => c.name)
console.log(`Colecciones antes: ${nombres.length ? nombres.join(', ') : '(ninguna)'}`)

// db.coleccion_x.drop() / .createIndex()  y  db.createCollection()
const coleccion = (nombre) => ({
  drop: () => encolar(`${nombre}.drop`, () => db.collection(nombre).drop()),
  createIndex: (keys, opts) => encolar(`${nombre}.createIndex`, () => db.collection(nombre).createIndex(keys, opts)),
})

const dbShim = {
  getCollectionNames: () => nombres.slice(),
  createCollection: (nombre, opciones) => encolar(`${nombre}.createCollection`, () => db.createCollection(nombre, opciones)),
}
// Permite db["usuarios"], db.usuarios, etc.
const dbProxy = new Proxy(dbShim, {
  get(target, prop) {
    if (prop in target) return target[prop]
    if (typeof prop === 'string') return coleccion(prop)
    return undefined
  },
})

const contexto = {
  db: dbProxy,
  use: () => {},                     // ya estamos conectados a "laboratorio"
  print: (...args) => console.log(...args),
  console,
  ObjectId: mongoose.Types.ObjectId,
}
vm.createContext(contexto)

try {
  vm.runInContext(codigo, contexto, { filename: 'colecciones mongodb.txt' })
} catch (error) {
  console.error('❌ Error de sintaxis en el script:', error.message)
  await mongoose.disconnect()
  process.exit(1)
}

await cola

if (fallos.length) {
  console.log('\n⚠️ Operaciones que fallaron:')
  for (const f of fallos) console.log(`  · ${f.etiqueta}: ${f.error}`)
}

nombres = (await db.listCollections().toArray()).map((c) => c.name)
console.log(`\nColecciones después (${nombres.length}):`)
for (const n of nombres.sort()) {
  const idx = (await db.collection(n).indexes()).map((i) => i.name).join(', ')
  const total = await db.collection(n).countDocuments()
  console.log(`  · ${n.padEnd(24)} ${String(total).padStart(4)} docs   índices: ${idx}`)
}

await mongoose.disconnect()
console.log('\n✅ Colecciones aplicadas')
