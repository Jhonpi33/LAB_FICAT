import mongoose from 'mongoose';
import config from './env.js';

async function connectDB() {
  mongoose.connection.on('connected', () => console.log('MongoDB Atlas: conexion establecida'));
  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB: conexion cerrada'));

  try {
    await mongoose.connect(config.MONGO_URI);
  } catch (err) {
    console.error('No fue posible conectar a MongoDB Atlas:', err.message);
    // Do not stop the HTTP server here. Render (and other platforms) needs the
    // health endpoint to come up so the service can be diagnosed and recovered.
    // Mongoose keeps retrying according to its connection settings.
  }
}

export { connectDB };
