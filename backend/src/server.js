import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import 'dotenv/config'
import { conectarBD } from './config/db.js'

const app = express()

// CORS: permite que Vite (5174) le haga peticiones a la API (4000).
// Sin esto el navegador bloquea las respuestas con un error de CORS.
app.use(cors())
app.use(express.json({ limit: '2mb' })) // RNF-016: acotar el cuerpo, el plan M0 tiene 512 MB

/**
 * Health check · verifica que la API y la base de datos estén vivas.
 * GET /api/health
 *   → { ok, bd, timestamp }
 */
app.get('/api/health', (req, res) => {
  const conectada = mongoose.connection.readyState === 1 // 1 = connected
  res.json({
    ok: true,
    bd: conectada ? 'conectada' : 'desconectada',
    proyecto: 'Sistema de Gestión de Análisis de Laboratorio',
    timestamp: new Date().toISOString(),
  })
})

// 404 · RNF-014: los errores se responden en pantalla, nunca como página aparte.
app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` })
})

// Manejador global de errores · RNF-014
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err.message)
  res.status(500).json({ ok: false, mensaje: 'Ocurrió un error al procesar la solicitud. Intenta de nuevo.' })
})

const PUERTO = process.env.PUERTO || 4000

const conectada = await conectarBD()
if (!conectada) process.exit(1) // sin BD no tiene sentido servir

app.listen(PUERTO, () => {
  console.log(`🚀 API escuchando en http://localhost:${PUERTO}`)
})
