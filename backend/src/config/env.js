require('dotenv').config();

const requeridas = ['MONGO_URI', 'JWT_SECRET'];
const faltantes = requeridas.filter((v) => !process.env[v]);

if (faltantes.length > 0) {
  console.error(`Faltan variables obligatorias en el archivo .env: ${faltantes.join(', ')}`);
  console.error('Copia .env.example a .env y completa los valores.');
  process.exit(1);
}

module.exports = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES: process.env.JWT_EXPIRES || '12h',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:9000',
  ADMIN_NOMBRE: process.env.ADMIN_NOMBRE || '',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || ''
};
