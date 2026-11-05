import { body } from 'express-validator';

const generarRules = [
  body('muestra_id')
    .isMongoId()
    .withMessage('Debe seleccionar una muestra válida')
];

const estadoRules = [
  body('estado')
    .isIn(['borrador', 'generado', 'disponible', 'enviado'])
    .withMessage('Estado de informe no válido')
];

export { generarRules, estadoRules };
