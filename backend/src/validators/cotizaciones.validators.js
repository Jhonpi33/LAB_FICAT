import { body } from 'express-validator';

const crearRules = [
  body('solicitud_id')
    .isMongoId()
    .withMessage('Debe seleccionar una solicitud válida'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Debe incluir al menos un parámetro'),
  body('items.*.parametro_id')
    .isMongoId()
    .withMessage('Parámetro no válido'),
  body('items.*.cantidad')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un entero mayor o igual a 1')
];

const estadoRules = [
  body('estado')
    .isIn(['borrador', 'enviada', 'envio_fallido', 'aceptada', 'rechazada'])
    .withMessage('Estado de cotización no válido')
];

export { crearRules, estadoRules };
