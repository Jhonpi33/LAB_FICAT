import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import Usuario from '../src/models/Usuario.js';

// Cuentas de demostración que muestra el login del frontend
// (src/pages/LoginPage.vue). Deben coincidir exactamente con ese diseño
// para que el botón "Probar como…" y las notas de demo funcionen.
const CUENTAS = [
  {
    nombre: 'Encargado',
    email: 'lab@sena.edu.co',
    password: 'Laboratorio2026',
    rol: 'encargado',
    activo: true,
    permiso_editar: true,
    permiso_eliminar: false
  },
  {
    nombre: 'Administrador',
    email: 'admin@sena.edu.co',
    password: 'Admin2026',
    rol: 'admin',
    activo: true,
    permiso_editar: true,
    permiso_eliminar: true
  },
  {
    nombre: 'Usuario Cliente',
    email: 'lectura@sena.edu.co',
    password: 'Lectura2026',
    rol: 'usuario',
    activo: true,
    permiso_editar: false,
    permiso_eliminar: false
  }
];

// Crea la cuenta si no existe; si existe, la actualiza (rol, permisos y
// contraseña). La contraseña se hashea en el hook pre('save') del modelo.
async function upsertCuenta({ email, password, ...datos }) {
  const existe = await Usuario.findOne({ email });

  if (existe) {
    Object.assign(existe, datos, { eliminado: false });
    existe.password = password;
    await existe.save();
    console.log(`Actualizada: ${email} (${datos.rol})`);
  } else {
    await Usuario.create({ email, password, ...datos });
    console.log(`Creada: ${email} (${datos.rol})`);
  }
}

async function run() {
  await connectDB();

  for (const cuenta of CUENTAS) {
    await upsertCuenta(cuenta);
  }

  await mongoose.disconnect();
  console.log('Semilla finalizada.');
}

run().catch((err) => {
  console.error('Error en la semilla:', err.message);
  process.exit(1);
});
