import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import sharp from 'sharp';
import jwt from 'jsonwebtoken';
import config from '../src/config/env.js';
import app from '../src/app.js';
import Usuario from '../src/models/Usuario.js';
import Cliente from '../src/models/Cliente.js';
import Oferta from '../src/models/Oferta.js';
import CorreoOferta from '../src/models/CorreoOferta.js';
import Parametro from '../src/models/ParametroAnalisis.js';
import { procesarCorreosOferta } from '../src/services/correos-oferta.service.js';

// Base local desechable con replica set. Nunca utiliza la URI de Atlas del entorno.
await mongoose.connect('mongodb://127.0.0.1:27019/labficat_ofertas_' + Date.now() + '?replicaSet=labficatOfertas');
await Promise.all(Object.values(mongoose.models).map(model => model.init()));
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening',resolve));
const base = 'http://127.0.0.1:' + server.address().port + '/api';
const originalFetch = globalThis.fetch;
const mails = [];
process.env.MAIL_PROVIDER = 'gmail-api';
for (const key of ['GMAIL_CLIENT_ID','GMAIL_CLIENT_SECRET','GMAIL_REFRESH_TOKEN']) process.env[key] = 'prueba-local';
process.env.GMAIL_USER = 'labficat2026@gmail.com';
globalThis.fetch = async (url, options) => {
  if (String(url).startsWith('https://oauth2.googleapis.com')) return new Response(JSON.stringify({ access_token: 'prueba' }));
  if (String(url).startsWith('https://gmail.googleapis.com')) { mails.push(JSON.parse(options.body)); return new Response('{}'); }
  return originalFetch(url,options);
};
try {
  const user = await Usuario.create({ nombre: 'Administrador pruebas', email: 'ofertas-test@example.com', password: 'SoloPruebaLocal2026', rol:'admin' });
  const token = jwt.sign({ id:user._id }, config.JWT_SECRET);
  async function api(path, method='GET', body, auth=true) {
    const r = await fetch(base+path, { method, headers: { 'Content-Type':'application/json', ...(auth ? {Authorization:'Bearer '+token} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}) });
    const data = await r.json(); return { status:r.status, ...data };
  }
  const parametro = await Parametro.create({ nombre: 'Proteína prueba oferta', unidad:'%', precio:15000 });
  const imagen = await sharp({ create:{width:200,height:40,channels:3,background:'#345641'} }).png().toBuffer();
  const input = { clave: crypto.randomUUID(), descripcion:'Muestra de alimento para prueba',
    cliente: {nombre:'Cliente de prueba',numero_documento:'OFERTA-PRUEBA-01',tipo_documento:'CC',email:'cliente@example.com',telefono:'3001234567',direccion:'Calle de prueba 123',tipo_cliente:'externo'},
    formulario: {ciudad:'San Gil',departamento:'Santander',cargo:'Solicitante',contacto:'Cliente de prueba',clasificacion:'Persona natural',vigencia:'2026-12-31',entrega:'15 días hábiles',responsable:'Responsable de prueba',cargoResponsable:'Encargado del laboratorio',observaciones:''},
    ensayos:[{parametro_id:String(parametro._id),cantidad:2,codigo:'3',unidad:'%',metodo:'AOAC 981.10:2023 Modificado',tecnica:'Volumetría (Kjeldahl)'}],
    firmaResponsable:imagen.toString('base64') };
  const created = await api('/ofertas','POST',input);
  assert.equal(created.status,200,JSON.stringify(created));
  const id = created.datos.solicitud;
  assert.equal((await api('/ofertas','POST',input)).datos.solicitud,id);
  assert.equal(await Cliente.countDocuments(),1);
  assert.equal((await api('/ofertas/clientes?q=cliente%40example.com')).datos.length,1);
  assert.equal((await api('/ofertas/'+id+'/enviar','POST',{destino:'recibo'})).status,409);
  assert.equal((await api('/ofertas/'+id,'GET',undefined,false)).status,401);
  await procesarCorreosOferta();
  assert.equal(mails.length,1);
  const mime = Buffer.from(mails[0].raw,'base64url').toString();
  const decoded = mime.replace(/=\r?\n/g,'').replace(/=([A-F0-9]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));
  const firmaToken = decoded.match(/firmar-oferta\/([a-f0-9]{64})/)?.[1];
  assert.ok(firmaToken, 'El correo debe incluir el enlace de firma');
  assert.match(decoded,/labficat2026/);
  const signed = await api('/ofertas/firma/'+firmaToken,'POST',{acepto:true,imagen:imagen.toString('base64')},false);
  assert.equal(signed.status,200,JSON.stringify(signed));
  assert.equal((await api('/ofertas/firma/'+firmaToken,'POST',{acepto:true,imagen:imagen.toString('base64')},false)).status,410);
  await procesarCorreosOferta();
  const pago = await api('/pagos','POST',{cotizacion_id:created.datos.cotizacion});
  assert.equal(pago.status,200,JSON.stringify(pago));
  const paid = await api('/pagos/'+pago.datos._id+'/estado','PATCH',{estado:'confirmado'});
  assert.equal(paid.status,200,JSON.stringify(paid));
  await procesarCorreosOferta();
  assert.equal(await CorreoOferta.countDocuments({estado:'enviado'}),3);
  const oferta = await Oferta.findOne({solicitud:id});
  await writeFile('/tmp/labficat-oferta-prueba.pdf',oferta.pdf);
  assert.equal((await api('/ofertas','POST',{...input,clave:crypto.randomUUID()})).status,409);
  console.log('OK: solicitud atómica, cliente, reintento, PDF, firma única, pago individual y tres correos con proveedor simulado.');
} finally {
  globalThis.fetch = originalFetch;
  await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
}
