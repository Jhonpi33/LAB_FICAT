import mongoose from 'mongoose';
import config from './env.js';

const RETRY_MAX_MS = 60_000;
let retryDelayMs = 5_000;
let retryTimer;

function describirError(error) {
  const mensaje = String(error?.message || 'Error desconocido');
  if (/authentication failed|bad auth/i.test(mensaje)) {
    return 'Atlas rechazó la autenticación. Verifica el usuario y la contraseña en Database Access.';
  }
  if (/not authorized|ip.*not allowed|whitelist|access list/i.test(mensaje)) {
    return 'Atlas bloqueó la conexión por permisos o por la Network Access List.';
  }
  if (/ENOTFOUND|querySrv|server selection|timed out|ECONN/i.test(mensaje)) {
    return 'No se pudo alcanzar el cluster. Verifica el hostname y la Network Access List de Atlas.';
  }
  if (/Invalid scheme|Invalid connection string|must be a string/i.test(mensaje)) {
    return 'La URI de MongoDB no tiene un formato válido.';
  }
  return `${error?.name || 'MongoError'}: ${mensaje}`;
}

mongoose.connection.on('connected', () => console.log(`MongoDB Atlas conectado a la base "${config.MONGO_DATABASE}"`));
mongoose.connection.on('error', (err) => console.error('MongoDB error:', describirError(err)));
mongoose.connection.on('disconnected', () => console.warn('MongoDB: conexion cerrada'));

function programarReintento() {
  if (retryTimer) return;
  const espera = retryDelayMs;
  retryDelayMs = Math.min(retryDelayMs * 2, RETRY_MAX_MS);
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    void connectDB();
  }, espera);
  retryTimer.unref?.();
  console.warn(`Se reintentará MongoDB en ${Math.round(espera / 1000)} segundos.`);
}

async function connectDB() {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;

  try {
    await mongoose.connect(config.MONGO_URI, {
      dbName: config.MONGO_DATABASE,
      authSource: 'admin',
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 5,
      minPoolSize: 0
    });
    retryDelayMs = 5_000;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = undefined;
  } catch (err) {
    console.error('No fue posible conectar a MongoDB Atlas:', describirError(err));
    programarReintento();
  }
}

export { connectDB, describirError };
