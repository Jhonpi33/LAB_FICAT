const mongoose = require('mongoose');
const config = require('./env');

async function connectDB() {
  mongoose.connection.on('connected', () => console.log('MongoDB Atlas: conexion establecida'));
  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB: conexion cerrada'));

  try {
    await mongoose.connect(config.MONGO_URI);
  } catch (err) {
    console.error('No fue posible conectar a MongoDB Atlas:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
