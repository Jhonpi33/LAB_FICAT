import express from 'express';
import mongoose from 'mongoose';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import JSZip from 'jszip';
import Muestra from '../models/Muestra.js';
import Cotizacion from '../models/Cotizacion.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roles.js';
import { httpError } from '../utils/responses.js';

const ejecutar = promisify(execFile);
const base = new URL('../../plantillas/formatos/', import.meta.url);
const catalogo = JSON.parse(await readFile(new URL('fields.json', base), 'utf8'));
const esquema = new mongoose.Schema({ tipo: String, registro: mongoose.ObjectId, valores: Object, pdf: Buffer }, { timestamps: true });
esquema.index({ tipo: 1, registro: 1 }, { unique: true });
const Documento = mongoose.model('FormatoInterno', esquema);
const router = express.Router();
router.use(requireAuth, requireRole('admin', 'encargado'));
router.use('/:tipo/:id', async (req, res, next) => {
  try {
    const { tipo, id } = req.params;
    if (!Object.hasOwn(catalogo, tipo) || !mongoose.isObjectIdOrHexString(id)) throw httpError(404, 'Formato no encontrado.');
    const modelo = tipo === 'oferta' ? Cotizacion : Muestra;
    const registro = await modelo.findOne({ _id: id, eliminado: false }).lean();
    if (!registro) throw httpError(404, 'Registro no encontrado.');
    req.formato = { tipo, registro: registro._id };
    req.origen = registro;
    res.set('Cache-Control','no-store');
    next();
  } catch (error) { next(error); }
});
router.get('/:tipo/:id', async (req,res,next) => {
  try {
    const doc = await Documento.findOne(req.formato).select('-pdf').lean();
    const origen = req.origen;
    const inicial = req.formato.tipo === 'oferta' ? { F2: String(origen.numero), I22: String(origen.subtotal), I23: String(origen.total) }
      : { B8: origen.codigo || '', ...(req.formato.tipo === 'orden' ? { C8: origen.tipo_fisico, D8: origen.nombre_muestra } : { P8: origen.tipo_fisico, Q8: origen.nombre_muestra }) };
    res.json({ datos: { campos: catalogo[req.formato.tipo], valores: doc?.valores || inicial, guardado: Boolean(doc) } });
  } catch(error) { next(error); }
});
router.put('/:tipo/:id', async (req,res,next) => {
  let directorio;
  try {
    const tipo = req.formato.tipo;
    const zip = await JSZip.loadAsync(await readFile(new URL(tipo+'.xlsx', base)));
    const hoja = 'xl/worksheets/sheet1.xml';
    let xml = await zip.file(hoja).async('string');
    const valores = {};
    const reemplazos = new Map();
    for (const [marca, etiqueta, celda] of catalogo[tipo]) {
      const valor = req.body[celda] ?? '';
      if (typeof valor !== 'string' || valor.length > 180 || /[\x00-\x1F]/.test(valor)) throw httpError(400,'Revisa el campo '+etiqueta);
      valores[celda] = valor.trim();
      const seguro = valores[celda].replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
      reemplazos.set(marca, seguro);
    }
    xml = xml.replace(/<t>(X\d{2})<\/t>/g, (_, marca) => '<t>'+reemplazos.get(marca)+'</t>');
    zip.file(hoja,xml);
    directorio = await mkdtemp(join(tmpdir(),'labficat-formato-'));
    const archivo = join(directorio,'formato.xlsx');
    await writeFile(archivo,await zip.generateAsync({type:'nodebuffer'}));
    await ejecutar(process.env.SOFFICE_BIN || 'soffice',['-env:UserInstallation='+pathToFileURL(join(directorio,'perfil')).href,'--headless','--convert-to','pdf','--outdir',directorio,archivo],{timeout:60000});
    const pdf = await readFile(join(directorio,'formato.pdf'));
    await Documento.findOneAndUpdate(req.formato,{ valores,pdf },{upsert:true});
    res.json({ok:true,mensaje:'Formato guardado.'});
  } catch(error) { next(error); } finally { if(directorio) await rm(directorio,{recursive:true,force:true}); }
});
router.get('/:tipo/:id/pdf', async (req,res,next) => {
  try {
    const doc = await Documento.findOne(req.formato).select('pdf');
    if (!doc) throw httpError(404,'Guarda el formulario primero.');
    res.type('application/pdf').send(doc.pdf);
  } catch(error) { next(error); }
});
export default router;
