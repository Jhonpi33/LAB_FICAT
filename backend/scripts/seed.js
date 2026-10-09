const mongoose = require('mongoose');
const config = require('../src/config/env');
const { connectDB } = require('../src/config/database');
const Usuario = require('../src/models/Usuario');

async function run() {
  const { ADMIN_NOMBRE, ADMIN_EMAIL, ADMIN_PASSWORD } = config;

  if (!ADMIN_NOMBRE || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Faltan ADMIN_NOMBRE, ADMIN_EMAIL o ADMIN_PASSWORD en el archivo .env');
    process.exit(1);
  }

  await connectDB();

  const existe = await Usuario.findOne({ email: ADMIN_EMAIL.toLowerCase() });

  if (existe) {
    console.log('El admin ya existe');
  } else {
    await Usuario.create({
      nombre: ADMIN_NOMBRE,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      rol: 'admin',
      activo: true,
      permiso_editar: true,
      permiso_eliminar: true
    });
    console.log('Admin creado correctamente');
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Error en la semilla:', err.message);
  process.exit(1);
});
