const { body } = require('express-validator');
const { TIPOS_DOCUMENTO, TIPOS_CLIENTE } = require('../config/constants');

const nombreRule = body('nombre')
  .trim()
  .isLength({ min: 3, max: 120 })
  .withMessage('El nombre debe tener entre 3 y 120 caracteres');

const tipoDocumentoRule = body('tipo_documento')
  .optional({ nullable: true })
  .isIn(TIPOS_DOCUMENTO)
  .withMessage('Tipo de documento no valido');

const numeroDocumentoRule = body('numero_documento')
  .trim()
  .notEmpty()
  .withMessage('El numero de documento es obligatorio')
  .isLength({ max: 20 })
  .withMessage('El numero de documento no puede superar 20 caracteres');

const emailRule = body('email')
  .trim()
  .isEmail()
  .withMessage('El email no es valido')
  .normalizeEmail();

const telefonoRule = body('telefono')
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 20 })
  .withMessage('El telefono no puede superar 20 caracteres');

const direccionRule = body('direccion')
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 200 })
  .withMessage('La direccion no puede superar 200 caracteres');

const tipoClienteRule = body('tipo_cliente')
  .isIn(TIPOS_CLIENTE)
  .withMessage('El tipo de cliente solo puede ser interno o externo');

const crearRules = [
  nombreRule,
  tipoDocumentoRule,
  numeroDocumentoRule,
  emailRule,
  telefonoRule,
  direccionRule,
  tipoClienteRule
];

const editarRules = [
  nombreRule,
  tipoDocumentoRule,
  numeroDocumentoRule,
  emailRule,
  telefonoRule,
  direccionRule,
  tipoClienteRule
];

module.exports = { crearRules, editarRules };
