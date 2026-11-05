import { body } from 'express-validator';

const generarRules = [
  body('pago_id')
    .isMongoId()
    .withMessage('Debe seleccionar un pago válido')
];

const estadoRules = [
  body('estado')
    .isIn(['enviada', 'anulada', 'error'])
    .withMessage('Estado de factura no válido'),
  body('motivo')
    .optional({ values: 'falsy' })
    .isLength({ max: 300 })
    .withMessage('El motivo es demasiado largo')
];

export { generarRules, estadoRules };
