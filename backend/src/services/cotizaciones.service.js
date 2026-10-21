const mongoose = require('mongoose');
const Cotizacion = require('../models/Cotizacion');
const Solicitud = require('../models/Solicitud');
const ParametroAnalisis = require('../models/ParametroAnalisis');
const { httpError } = require('../utils/responses');
const { IVA } = require('../config/constants');

// Transiciones permitidas del estado de la cotizacion
const TRANSICIONES = {
  borrador: ['enviada'],
  enviada: ['aceptada', 'rechazada'],
  aceptada: [],
  rechazada: []
};

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Cotizacion no encontrada');
}

function validarFiltroId(valor, mensaje) {
  if (valor && !mongoose.Types.ObjectId.isValid(valor)) throw httpError(400, mensaje);
}

function redondear(valor) {
  return Math.round(valor * 100) / 100;
}

function poblar(query) {
  return query
    .populate({
      path: 'solicitud',
      select: 'estado prioridad fecha_creacion cliente',
      populate: { path: 'cliente', select: 'nombre tipo_cliente numero_documento' }
    })
    .populate('items.parametro', 'nombre precio unidad');
}

async function listar({ solicitud, estado }) {
  const filtro = { eliminado: false };

  validarFiltroId(solicitud, 'La solicitud no es valida');

  if (solicitud) filtro.solicitud = solicitud;
  if (estado) filtro.estado = estado;

  const cotizaciones = await poblar(Cotizacion.find(filtro))
    .select('-__v')
    .sort({ fecha_creacion: -1 });

  return cotizaciones;
}

async function obtener(id) {
  validarId(id);

  const cotizacion = await poblar(Cotizacion.findOne({ _id: id, eliminado: false })).select('-__v');
  if (!cotizacion) throw httpError(404, 'Cotizacion no encontrada');

  return cotizacion.toObject({ versionKey: false });
}

// Arma los items con precios del catalogo cuando no se envian y calcula el subtotal de cada item.
async function armarItems(items) {
  const armados = [];

  for (const item of items) {
    const parametro = await ParametroAnalisis.findOne({ _id: item.parametro, eliminado: false });
    if (!parametro) throw httpError(404, 'Uno o mas parametros de analisis no fueron encontrados');

    const cantidad = Number(item.cantidad);
    const precioUnitario =
      item.precio_unitario === undefined || item.precio_unitario === null
        ? Number(parametro.precio)
        : Number(item.precio_unitario);

    armados.push({
      parametro: parametro._id,
      descripcion: item.descripcion || parametro.nombre,
      cantidad,
      precio_unitario: precioUnitario,
      subtotal: redondear(cantidad * precioUnitario)
    });
  }

  return armados;
}

function calcularTotales(items) {
  const subtotal = redondear(items.reduce((suma, item) => suma + item.subtotal, 0));
  const total = redondear(subtotal * (1 + IVA));
  return { subtotal, total };
}

async function siguienteNumero() {
  const ultima = await Cotizacion.findOne({ eliminado: false }).sort({ numero: -1 }).select('numero');
  return ultima ? ultima.numero + 1 : 1;
}

async function crear(data) {
  const solicitud = await Solicitud.findOne({ _id: data.solicitud, eliminado: false });
  if (!solicitud) throw httpError(404, 'Solicitud no encontrada');

  const items = await armarItems(data.items);
  const { subtotal, total } = calcularTotales(items);

  let cotizacion = null;

  // Reintenta ante una colision del indice unico de numero.
  for (let intento = 0; intento < 3 && !cotizacion; intento++) {
    try {
      cotizacion = await Cotizacion.create({
        solicitud: solicitud._id,
        numero: await siguienteNumero(),
        items,
        subtotal,
        total,
        estado: 'borrador'
      });
    } catch (err) {
      if (err.code === 11000 && intento < 2) continue;
      throw err;
    }
  }

  if (!cotizacion) throw httpError(409, 'No fue posible asignar el numero de la cotizacion');

  return obtener(cotizacion._id);
}

async function editar(id, data) {
  validarId(id);

  const cotizacion = await Cotizacion.findOne({ _id: id, eliminado: false });
  if (!cotizacion) throw httpError(404, 'Cotizacion no encontrada');
  if (cotizacion.estado !== 'borrador') {
    throw httpError(409, 'Solo se pueden editar cotizaciones en borrador');
  }

  const items = await armarItems(data.items);
  const { subtotal, total } = calcularTotales(items);

  cotizacion.items = items;
  cotizacion.subtotal = subtotal;
  cotizacion.total = total;

  await cotizacion.save();
  return obtener(cotizacion._id);
}

async function cambiarEstado(id, estado) {
  validarId(id);

  const cotizacion = await Cotizacion.findOne({ _id: id, eliminado: false });
  if (!cotizacion) throw httpError(404, 'Cotizacion no encontrada');

  const permitidos = TRANSICIONES[cotizacion.estado] || [];
  if (!permitidos.includes(estado)) {
    throw httpError(400, `Transicion de estado no permitida: de "${cotizacion.estado}" a "${estado}"`);
  }

  cotizacion.estado = estado;
  await cotizacion.save();
  return obtener(cotizacion._id);
}

async function eliminar(id, idUsuario) {
  validarId(id);

  const cotizacion = await Cotizacion.findOne({ _id: id, eliminado: false });
  if (!cotizacion) throw httpError(404, 'Cotizacion no encontrada');
  if (cotizacion.estado !== 'borrador') {
    throw httpError(409, 'Solo se pueden eliminar cotizaciones en borrador');
  }

  cotizacion.eliminado = true;
  cotizacion.eliminado_por = idUsuario || null;
  cotizacion.fecha_eliminacion = new Date();

  await cotizacion.save();
  return cotizacion.toObject({ versionKey: false });
}

module.exports = { listar, obtener, crear, editar, cambiarEstado, eliminar };
