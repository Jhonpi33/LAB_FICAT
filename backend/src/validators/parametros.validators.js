import { body } from 'express-validator';

const nombreRule = body('nombre')
  .trim()
  .notEmpty()
  .withMessage('El nombre es obligatorio')
  .isLength({ max: 100 })
  .withMessage('El nombre no puede superar los 100 caracteres');

const descripcionRule = body('descripcion')
  .optional({ values: 'falsy' })
  .isLength({ max: 300 })
  .withMessage('La descripción es demasiado larga');

const precioRule = body('precio')
  .isFloat({ min: 0 })
  .withMessage('El precio debe ser un número mayor o igual a 0');

const unidadRule = body('unidad')
  .optional({ values: 'falsy' })
  .isLength({ max: 20 })
  .withMessage('La unidad es demasiado larga');

const crearRules = [nombreRule, descripcionRule, precioRule, unidadRule];
const editarRules = crearRules;

const activoRules = [
  body('activo')
    .isBoolean()
    .withMessage('El campo activo debe ser booleano')
];

export { crearRules, editarRules, activoRules };
