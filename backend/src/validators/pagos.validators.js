import { body } from 'express-validator';

const crearRules = [
  body('cotizacion_id')
    .isMongoId()
    .withMessage('Debe seleccionar una cotización válida')
];

const estadoRules = [
  body('estado')
    .isIn(['confirmado', 'fallido'])
    .withMessage('El estado solo puede ser confirmado o fallido')
];

export { crearRules, estadoRules };
