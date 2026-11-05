import { body } from 'express-validator';

const nombreRule = body('nombre')
  .trim()
  .isLength({ min: 3, max: 120 })
  .withMessage('El nombre debe tener entre 3 y 120 caracteres');

const tipoDocumentoRule = body('tipo_documento')
  .isIn(['CC', 'NIT', 'CE', 'TI'])
  .withMessage('Tipo de documento no válido');

const numeroDocumentoRule = body('numero_documento')
  .trim()
  .notEmpty()
  .withMessage('El número de documento es obligatorio')
  .isLength({ max: 30 })
  .withMessage('El número de documento es demasiado largo');

const emailRule = body('email')
  .trim()
  .isEmail()
  .withMessage('El email no es válido')
  .normalizeEmail();

const telefonoRule = body('telefono')
  .optional({ values: 'falsy' })
  .isLength({ max: 30 })
  .withMessage('El teléfono es demasiado largo');

const direccionRule = body('direccion')
  .optional({ values: 'falsy' })
  .isLength({ max: 200 })
  .withMessage('La dirección es demasiado larga');

const tipoClienteRule = body('tipo_cliente')
  .isIn(['interno', 'externo'])
  .withMessage('El tipo de cliente solo puede ser interno o externo');

const crearRules = [nombreRule, tipoDocumentoRule, numeroDocumentoRule, emailRule, telefonoRule, direccionRule, tipoClienteRule];
const editarRules = crearRules;

export { crearRules, editarRules };
