import { readFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import sharp from 'sharp';
import { httpError } from '../utils/responses.js';

export async function validarFirma(valor) {
  if (typeof valor !== 'string' || valor.length > 1340000) throw httpError(400, 'Adjunta una firma PNG o JPG de hasta 1 MB.');
  try {
    const imagen = sharp(Buffer.from(valor, 'base64'), { limitInputPixels: 12000000 });
    if (!['png', 'jpeg'].includes((await imagen.metadata()).format)) throw new Error();
    return await imagen.rotate().resize({ width: 800, height: 300, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  } catch { throw httpError(400, 'La imagen de firma no es válida.'); }
}

function caja(page, x, y, width, height) {
  return { x: x * page.getWidth() / 1160, y: page.getHeight() - (y + height) * page.getHeight() / 1500,
    width: width * page.getWidth() / 1160, height: height * page.getHeight() / 1500 };
}

async function firmaEn(pdf, imagen, rect) {
  const page = pdf.getPage(0);
  const firma = await pdf.embedPng(imagen);
  const c = caja(page, ...rect);
  const escala = firma.scaleToFit(c.width, c.height);
  page.drawImage(firma, { x: c.x + (c.width - escala.width) / 2, y: c.y, ...escala });
}

export async function generarOferta(numero, cliente, formulario, items, firma) {
  const pdf = await PDFDocument.load(await readFile(new URL('../../plantillas/oferta-v5.pdf', import.meta.url)));
  const page = pdf.getPage(0);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  function texto(valor, rect, etiqueta) {
    const s = String(valor ?? '').replace(/\s+/g, ' ').trim();
    const c = caja(page, ...rect);
    let size = Math.min(6, c.height - 1);
    try {
      while (font.widthOfTextAtSize(s, size) > c.width - 2 && size > 4) size -= 0.25;
      if (font.widthOfTextAtSize(s, size) > c.width - 2) throw new Error();
      page.drawText(s, { x: c.x + 1, y: c.y + (c.height-size)/2 + 1, size, font });
    } catch { throw httpError(400, 'Acorta o revisa el campo ' + etiqueta + ' para que quepa en la plantilla.'); }
  }
  texto(numero, [765,135,190,20], 'Número');
  texto(formulario.fecha, [775,190,180,20], 'Fecha');
  page.drawRectangle({ ...caja(page,58,342,1041,12), color: rgb(1,1,1) });
  texto('Ítem 1 · ' + formulario.descripcion, [60,342,1037,12], 'Descripción de la muestra');
  const izq = [cliente.nombre, cliente.numero_documento, cliente.direccion, formulario.ciudad, formulario.cargo, formulario.vigencia];
  const der = [formulario.departamento, formulario.contacto, formulario.clasificacion, cliente.email, cliente.telefono, formulario.entrega];
  const filas = [242,255,269,282,295,308];
  filas.forEach((y,i) => { texto(izq[i], [158,y,357,11], 'Datos del cliente'); texto(der[i], [684,y,415,11], 'Contacto y entrega'); });
  const bandas = [[381,24],[407,11],[420,11],[433,11],[446,12]];
  const cols = [[58,97],[157,198],[357,158],[518,164],[684,164],[850,82],[934,81],[1017,82]];
  const moneda = n => '$ ' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 });
  items.forEach((item,i) => {
    const extra = formulario.ensayos[i];
    const valores = [extra.codigo, item.descripcion, extra.unidad, extra.metodo, extra.tecnica, item.cantidad, moneda(item.precio_unitario), moneda(item.subtotal)];
    valores.forEach((v,j) => texto(v, [cols[j][0],bandas[i][0],cols[j][1],bandas[i][1]], 'Ensayo ' + (i+1)));
  });
  const total = items.reduce((n,item) => n + item.subtotal, 0);
  [461,474,487].forEach(y => texto(moneda(total), [1017,y,82,10], 'Total'));
  texto(formulario.observaciones, [59,487,873,10], 'Observaciones');
  await firmaEn(pdf, firma, [475,650,210,78]);
  texto(formulario.responsable, [420,735,410,15], 'Responsable');
  texto(formulario.cargoResponsable, [420,754,410,14], 'Cargo del responsable');
  texto(cliente.nombre, [358,787,740,11], 'Aceptante');
  texto(cliente.numero_documento, [358,814,740,10], 'Documento del aceptante');
  return Buffer.from(await pdf.save());
}

export async function firmarOferta(borrador, imagen) {
  const pdf = await PDFDocument.load(borrador);
  await firmaEn(pdf, imagen, [358,800,380,11]);
  return Buffer.from(await pdf.save());
}

export async function generarRecibo(oferta, pago) {
  const pdf = await PDFDocument.load(oferta.pdf);
  const page = pdf.getPage(0);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const c = caja(page, 58, 570, 1040, 18);
  const fecha = new Date(pago.fecha_confirmacion).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
  page.drawRectangle({ ...c, color: rgb(0.86, 0.96, 0.88) });
  page.drawText(`PAGO CONFIRMADO  ·  Recibo ${pago.referencia}  ·  ${fecha}  ·  COP ${Number(pago.monto).toLocaleString('es-CO')}`,
    { x: c.x + 5, y: c.y + 3, size: 8, font, color: rgb(0.05, 0.34, 0.13) });
  return Buffer.from(await pdf.save());
}
