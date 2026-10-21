const { body } = require('express-validator');
const { ESTADOS_MUESTRA, TIPOS_FISICO_MUESTRA, UNIDADES_MUESTRA } = require('../config/constants');

const solicitudRule = body('solicitud')
  .isMongoId()
  .withMessage('La solicitud no es valida');

const clienteRule = body('cliente')
  .optional({ nullable: true })
  .isMongoId()
  .withMessage('El cliente no es valido');

const nombreMuestraRule = body('nombre_muestra')
  .trim()
  .notEmpty()
  .withMessage('El nombre de la muestra es obligatorio')
  .isLength({ max: 150 })
  .withMessage('El nombre de la muestra no puede superar 150 caracteres');

const descripcionRule = body('descripcion')
  .trim()
  .notEmpty()
  .withMessage('La descripcion es obligatoria')
  .isLength({ max: 2000 })
  .withMessage('La descripcion no puede superar 2000 caracteres');

const tipoFisicoRule = body('tipo_fisico')
  .isIn(TIPOS_FISICO_MUESTRA)
  .withMessage('El tipo fisico solo puede ser solido o liquido');

const cantidadRule = body('cantidad')
  .isFloat({ min: 0 })
  .withMessage('La cantidad debe ser un numero mayor o igual a 0');

const unidadRule = body('unidad')
  .isIn(UNIDADES_MUESTRA)
  .withMessage('La unidad solo puede ser g o ml');

const ubicacionRule = body('ubicacion')
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 150 })
  .withMessage('La ubicacion no puede superar 150 caracteres');

const parametrosRule = body('parametros')
  .optional({ nullable: true })
  .isArray()
  .withMessage('El campo parametros debe ser una lista');

const parametroItemRule = body('parametros.*')
  .optional({ nullable: true })
  .isMongoId()
  .withMessage('El parametro no es valido');

const crearRules = [
  solicitudRule,
  clienteRule,
  nombreMuestraRule,
  descripcionRule,
  tipoFisicoRule,
  cantidadRule,
  unidadRule,
  ubicacionRule,
  parametrosRule,
  parametroItemRule
];

const editarRules = crearRules;

const estadoRules = [
  body('estado')
    .isIn(ESTADOS_MUESTRA)
    .withMessage('Estado de muestra no valido')
    .custom((valor, { req }) => {
      if (valor === 'rechazada' && !String(req.body.motivo_rechazo || '').trim()) {
        throw new Error('El motivo de rechazo es obligatorio al rechazar la muestra');
      }
      return true;
    }),
  body('motivo_rechazo')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage('El motivo de rechazo no puede superar 300 caracteres')
];

module.exports = { crearRules, editarRules, estadoRules };
