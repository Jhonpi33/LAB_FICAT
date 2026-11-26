import app from './app.js';
import mongoose from 'mongoose';
import config from './config/env.js';
import { connectDB } from './config/database.js';
import { procesarCorreosOferta } from './services/correos-oferta.service.js';

async function main() {
  const server = app.listen(config.PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${config.PORT}`);
  });

  // Abrimos el puerto primero para que Render pueda validar /api/health aunque
  // Atlas tarde o rechace temporalmente la conexión. Mongo reintenta aparte.
  void connectDB();
  const correoTimer = setInterval(() => {
    if (mongoose.connection.readyState === 1) void procesarCorreosOferta();
  }, 15000);
  correoTimer.unref();

  const cerrar = (signal) => {
    clearInterval(correoTimer);
    console.log(`Recibida señal ${signal}; cerrando servidor...`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.once('SIGTERM', () => cerrar('SIGTERM'));
  process.once('SIGINT', () => cerrar('SIGINT'));
}

main();
