const mongoose = require('mongoose');
const config = require('../src/config/env');
const { connectDB } = require('../src/config/database');
const Usuario = require('../src/models/Usuario');
const ParametroAnalisis = require('../src/models/ParametroAnalisis');
const Cliente = require('../src/models/Cliente');
const Solicitud = require('../src/models/Solicitud');

// ------------------------------------------------------------------
// Datos por defecto de la semilla.
// Cada registro se identifica por su clave natural, por lo que el
// script es idempotente: si ya existe no se vuelve a crear.
// ------------------------------------------------------------------
const PARAMETROS = [
  {
    nombre: 'Analisis de humedad',
    descripcion: 'Contenido de humedad por metodo de secado en estufa',
    precio: 25000,
    unidad: '%'
  },
  {
    nombre: 'Cenizas totales',
    descripcion: 'Residuo mineral fijo tras calcinacion a 550 C',
    precio: 30000,
    unidad: '%'
  },
  {
    nombre: 'Proteina cruda',
    descripcion: 'Determinacion de nitrogeno total por Kjeldahl',
    precio: 45000,
    unidad: '%'
  },
  {
    nombre: 'Viscosidad',
    descripcion: 'Viscosidad aparente de la muestra a 25 C',
    precio: 38000,
    unidad: 'cP'
  },
  {
    nombre: 'pH',
    descripcion: 'Potencial de hidrogeno en suspension acuosa',
    precio: 20000,
    unidad: 'pH'
  }
];

const CLIENTES = [
  {
    nombre: 'Centro de Formacion SENA',
    tipo_documento: 'NIT',
    numero_documento: '899999001-1',
    email: 'ficat@sena.edu.co',
    telefono: '6017364700',
    direccion: 'Bogota D.C.',
    tipo_cliente: 'interno'
  },
  {
    nombre: 'Alimentos Andinos S.A.S.',
    tipo_documento: 'NIT',
    numero_documento: '900123456-2',
    email: 'compras@alimentosandinos.co',
    telefono: '6014445566',
    direccion: 'Carrera 7 # 40 - 62, Bogota',
    tipo_cliente: 'externo'
  },
  {
    nombre: 'Laboratorio Universitario Ltda',
    tipo_documento: 'NIT',
    numero_documento: '830112233-4',
    email: 'laboratorio@universidad.edu.co',
    telefono: '6013445566',
    direccion: 'Av. Circunvalar 40 - 30, Bogota',
    tipo_cliente: 'externo'
  }
];

const SOLICITUDES = [
  {
    numero_documento_cliente: '899999001-1',
    descripcion: 'Analisis de humedad y cenizas para lote de harina de panaderia',
    prioridad: 'media',
    atencion_inmediata: false,
    motivo_atencion_inmediata: '',
    estado: 'borrador'
  },
  {
    numero_documento_cliente: '900123456-2',
    descripcion: 'Perfil completo de proteinas para lote de galletas',
    prioridad: 'alta',
    atencion_inmediata: true,
    motivo_atencion_inmediata: 'El cliente exige resultados antes del cierre del mes',
    estado: 'enviada'
  },
  {
    numero_documento_cliente: '830112233-4',
    descripcion: 'Determinacion de viscosidad y pH para aceite comestible',
    prioridad: 'baja',
    atencion_inmediata: false,
    motivo_atencion_inmediata: '',
    estado: 'aprobada'
  }
];

// ------------------------------------------------------------------
// Pasos de la semilla
// ------------------------------------------------------------------
async function sembrarAdmin() {
  const { ADMIN_NOMBRE, ADMIN_EMAIL, ADMIN_PASSWORD } = config;
  const existe = await Usuario.findOne({ email: ADMIN_EMAIL.toLowerCase() });

  if (existe) {
    console.log('El admin ya existe');
    return;
  }

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

async function sembrarParametros() {
  let creados = 0;

  for (const dato of PARAMETROS) {
    const existe = await ParametroAnalisis.findOne({ nombre: dato.nombre });
    if (existe) continue;

    await ParametroAnalisis.create(dato);
    creados += 1;
  }

  console.log(`Parametros de analisis: ${creados} creados, ${PARAMETROS.length - creados} ya existian`);
}

async function sembrarClientes() {
  let creados = 0;

  for (const dato of CLIENTES) {
    const existe = await Cliente.findOne({ numero_documento: dato.numero_documento });
    if (existe) continue;

    await Cliente.create(dato);
    creados += 1;
  }

  console.log(`Clientes: ${creados} creados, ${CLIENTES.length - creados} ya existian`);
}

async function sembrarSolicitudes() {
  let creadas = 0;
  let omitidas = 0;

  for (const dato of SOLICITUDES) {
    const cliente = await Cliente.findOne({ numero_documento: dato.numero_documento_cliente });

    if (!cliente) {
      console.log(`Solicitud omitida, no existe el cliente con documento ${dato.numero_documento_cliente}`);
      omitidas += 1;
      continue;
    }

    // Clave natural: cliente + descripcion.
    const existe = await Solicitud.exists({ cliente: cliente._id, descripcion: dato.descripcion });
    if (existe) continue;

    await Solicitud.create({
      cliente: cliente._id,
      tipo_cliente: cliente.tipo_cliente,
      descripcion: dato.descripcion,
      prioridad: dato.prioridad,
      atencion_inmediata: dato.atencion_inmediata,
      motivo_atencion_inmediata: dato.motivo_atencion_inmediata,
      estado: dato.estado
    });

    creadas += 1;
  }

  console.log(`Solicitudes: ${creadas} creadas, ${SOLICITUDES.length - creadas - omitidas} ya existian, ${omitidas} omitidas`);
}

async function run() {
  const { ADMIN_NOMBRE, ADMIN_EMAIL, ADMIN_PASSWORD } = config;

  if (!ADMIN_NOMBRE || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Faltan ADMIN_NOMBRE, ADMIN_EMAIL o ADMIN_PASSWORD en el archivo .env');
    process.exit(1);
  }

  await connectDB();

  await sembrarAdmin();
  await sembrarParametros();
  await sembrarClientes();
  await sembrarSolicitudes();

  await mongoose.disconnect();
  console.log('Semilla finalizada');
}

run().catch((err) => {
  console.error('Error en la semilla:', err.message);
  process.exit(1);
});
