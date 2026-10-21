const { body } = require('express-validator');
const { ESTADOS_COTIZACION } = require('../config/constants');

const solicitudRule = body('solicitud')
  .isMongoId()
  .withMessage('La solicitud no es valida');

const itemsRule = body('items')
  .isArray({ min: 1 })
  .withMessage('Debe enviar al menos un item');

const itemParametroRule = body('items.*.parametro')
  .isMongoId()
  .withMessage('El parametro no es valido');

const itemCantidadRule = body('items.*.cantidad')
  .isInt({ min: 1 })
  .withMessage('La cantidad debe ser un numero entero mayor o igual a 1');

const itemPrecioRule = body('items.*.precio_unitario')
  .optional({ nullable: true })
  .isFloat({ min: 0 })
  .withMessage('El precio unitario debe ser un numero mayor o igual a 0');

const itemDescripcionRule = body('items.*.descripcion')
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 200 })
  .withMessage('La descripcion del item no puede superar 200 caracteres');

const crearRules = [
  solicitudRule,
  itemsRule,
  itemParametroRule,
  itemCantidadRule,
  itemPrecioRule,
  itemDescripcionRule
];

const editarRules = [
  itemsRule,
  itemParametroRule,
  itemCantidadRule,
  itemPrecioRule,
  itemDescripcionRule
];

const estadoRules = [
  body('estado')
    .isIn(ESTADOS_COTIZACION)
    .withMessage('Estado de cotizacion no valido')
];

module.exports = { crearRules, editarRules, estadoRules };
