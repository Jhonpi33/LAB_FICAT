import app from './app.js';
import mongoose from 'mongoose';
import config from './config/env.js';
import { connectDB } from './config/database.js';

async function main() {
  const server = app.listen(config.PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${config.PORT}`);
  });

  // Abrimos el puerto primero para que Render pueda validar /api/health aunque
  // Atlas tarde o rechace temporalmente la conexión. Mongo reintenta aparte.
  void connectDB();

  const cerrar = (signal) => {
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
