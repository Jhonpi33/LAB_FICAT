import { readFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { httpError } from '../utils/responses.js';

const plantilla = new URL('../../plantillas/recepcion-v2.pdf', import.meta.url);
// Medidas de las celdas en una referencia de 1404 × 993, con origen arriba a la izquierda.
const referencia = [1404, 993];
const columnas = [48, 132, 275, 417, 559, 701, 790, 884, 978, 1106, 1174, 1241, 1353];

export const camposRecepcion = [
  ['ciudad', 'Ciudad', 80], ['departamento', 'Departamento', 80], ['contacto', 'Contacto', 100],
  ['entrega', 'Quien entrega las muestras', 120], ['cedula', 'Cédula de quien entrega', 30],
  ['fechaRecepcion', 'Fecha y hora de recepción en Colombia', 40], ['recibe', 'Quien recibe las muestras', 100]
];
export const camposMuestra = [
  ['codigo', 'Código de muestra', 28], ['municipio', 'Municipio de recolección', 70],
  ['direccion', 'Dirección de toma', 95], ['lugar', 'Lugar de toma', 90],
  ['recolector', 'Recolectada por', 90], ['procedimiento', 'Procedimiento de muestreo', 55],
  ['tipo', 'Tipo de muestra', 58], ['matriz', 'Matriz de la muestra', 60],
  ['fecha', 'Fecha y hora de recolección', 50], ['cotizacion', 'Cotización', 24],
  ['item', 'Ítem de cotización', 24], ['observaciones', 'Observaciones', 58]
];

function validarCampos(datos, esquema) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw httpError(400, 'Revisa los datos del formulario.');
  return Object.fromEntries(esquema.map(([clave, etiqueta, max]) => {
    const valor = datos[clave] ?? '';
    if (typeof valor !== 'string' || valor.length > max) throw httpError(400, etiqueta + ': máximo ' + max + ' caracteres.');
    return [clave, valor.trim()];
  }));
}

export function validarRecepcion(datos) {
  const formulario = validarCampos(datos, camposRecepcion);
  if (!Array.isArray(datos.muestras) || datos.muestras.length < 1 || datos.muestras.length > 5)
    throw httpError(400, 'El formato admite entre una y cinco muestras.');
  formulario.muestras = datos.muestras.map(muestra => {
    const fila = validarCampos(muestra, camposMuestra);
    if (!fila.tipo || !fila.matriz) throw httpError(400, 'Indica el tipo y la matriz de cada muestra.');
    return fila;
  });
  return formulario;
}

function rectangulo(page, izq, arriba, der, abajo) {
  const sx = page.getWidth() / referencia[0];
  const sy = page.getHeight() / referencia[1];
  return { x: izq * sx, y: page.getHeight() - abajo * sy, width: (der - izq) * sx, height: (abajo - arriba) * sy };
}

function dibujarTexto(page, font, texto, etiqueta, celda) {
  if (!texto) return;
  const { x, y, width, height } = rectangulo(page, ...celda);
  const valor = texto.normalize('NFC').replace(/\s+/g, ' ');
  for (const size of [8, 7.5, 7, 6.5]) {
    const lineas = [];
    let linea = '';
    try {
      for (const palabra of valor.split(' ')) {
        const siguiente = linea ? linea + ' ' + palabra : palabra;
        if (font.widthOfTextAtSize(palabra, size) > width - 6) {
          linea = '';
          lineas.length = 0;
          break;
        }
        if (font.widthOfTextAtSize(siguiente, size) <= width - 6) linea = siguiente;
        else { lineas.push(linea); linea = palabra; }
      }
    } catch {
      throw httpError(400, etiqueta + ': contiene caracteres que el formato no admite.');
    }
    if (linea) lineas.push(linea);
    if (!lineas.length || lineas.length * (size + 1) > height - 4) continue;
    const inicio = y + (height + lineas.length * (size + 1)) / 2 - size;
    lineas.forEach((linea, i) => page.drawText(linea, { x: x + 3, y: inicio - i * (size + 1), size, font }));
    return;
  }
  throw httpError(400, etiqueta + ': el texto no cabe en la plantilla. Acórtalo y vuelve a guardar.');
}

export async function generarRecepcion(cliente, formulario) {
  const pdf = await PDFDocument.load(await readFile(plantilla));
  const page = pdf.getPage(0);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const izquierda = [['Solicitante', cliente.nombre], ['NIT / C.C.', cliente.numero_documento],
    ['Dirección', cliente.direccion], ['Ciudad', formulario.ciudad]];
  const derecha = [['Departamento', formulario.departamento], ['Contacto', formulario.contacto],
    ['Teléfono', cliente.telefono], ['Correo', cliente.email]];
  const bandas = [154, 190, 227, 263, 298];
  izquierda.forEach(([label, valor], i) => dibujarTexto(page, font, valor, label, [276, bandas[i], 701, bandas[i + 1]]));
  derecha.forEach(([label, valor], i) => dibujarTexto(page, font, valor, label, [885, bandas[i], 1352, bandas[i + 1]]));
  const filas = [348, 410, 474, 538, 601, 663];
  formulario.muestras.forEach((fila, i) => {
    camposMuestra.forEach(([clave, label], j) => {
      // El original tiene un sello rojo en la tercera fila; deja espacio debajo.
      const arriba = i === 2 && j >= 4 && j <= 5 ? 503 : filas[i];
      dibujarTexto(page, font, fila[clave], 'Muestra ' + (i + 1) + ' · ' + label, [columnas[j], arriba, columnas[j + 1], filas[i + 1]]);
    });
  });
  dibujarTexto(page, font, formulario.entrega, 'Quien entrega', [276, 826, 884, 862]);
  dibujarTexto(page, font, formulario.cedula, 'Cédula', [276, 863, 884, 898]);
  dibujarTexto(page, font, formulario.fechaRecepcion, 'Fecha de recepción', [1107, 826, 1352, 862]);
  dibujarTexto(page, font, formulario.recibe, 'Quien recibe', [1107, 863, 1352, 898]);
  return Buffer.from(await pdf.save());
}

export async function incorporarFirma(borrador, imagen) {
  const pdf = await PDFDocument.load(borrador);
  const page = pdf.getPage(0);
  const firma = await pdf.embedPng(imagen);
  const { x, y, height } = rectangulo(page, 282, 900, 880, 934);
  const size = firma.scaleToFit(150, height - 4);
  page.drawImage(firma, { x, y: y + (height - size.height) / 2, ...size });
  return Buffer.from(await pdf.save());
}
