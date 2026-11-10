import 'dotenv/config';

const mongoUri = (process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();
const jwtSecret = (process.env.JWT_SECRET || '').trim();
const requeridas = [
  ...(!mongoUri ? ['MONGO_URI (o MONGODB_URI)'] : []),
  ...(!jwtSecret ? ['JWT_SECRET'] : [])
];
const faltantes = requeridas;

if (faltantes.length > 0) {
  console.error(`Faltan variables obligatorias en el archivo .env: ${faltantes.join(', ')}`);
  console.error('Copia .env.example a .env y completa los valores.');
  process.exit(1);
}

export default {
  PORT: process.env.PORT || 4000,
  MONGO_URI: mongoUri,
  MONGO_DATABASE: process.env.MONGO_DATABASE || 'laboratorio',
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES: process.env.JWT_EXPIRES || '12h',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5174',
  ADMIN_NOMBRE: process.env.ADMIN_NOMBRE || '',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || ''
};
