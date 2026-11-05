/**
 * @fileoverview /services/api.service.js
 * Las 4+1 funciones con las que se consume la API del backend de LAB_FICAT.
 *
 *   import { get, post, put, patch, del } from "@/services/api.service";
 *
 *   const usuarios = await get("/usuarios");                 // devuelve el array
 *   const resp = await post("/usuarios", { nombre, email }); // { ok, mensaje, datos }
 *   await put(`/usuarios/${id}`, datos);
 *   await patch(`/usuarios/${id}/estado`, { activo: false });
 *
 * Dos detalles:
 *
 * 1. "get" desempaca el payload: el backend envuelve todo en { ok, mensaje,
 *    datos }, así que get devuelve directamente data.datos (el array/objeto).
 * 2. post/put/patch devuelven el objeto completo para poder leer ".mensaje"
 *    (el texto que se muestra en el Notify verde de éxito).
 *
 * Ninguna función lleva try/catch: el error ya viene normalizado por el
 * interceptor de /plugins/axios.js y sube hasta la vista, que decide el mensaje.
 */
import api from '@/plugins/axios'

/** LEER datos. Devuelve el payload (data.datos). */
export const get = async (url) => {
  const { data } = await api.get(url)
  return data?.datos ?? data
}

/** CREAR un registro. Devuelve { ok, mensaje, datos }. */
export const post = async (url, datos) => {
  const { data } = await api.post(url, datos)
  return data
}

/** ACTUALIZAR un registro. Devuelve { ok, mensaje, datos }. */
export const put = async (url, datos = {}) => {
  const { data } = await api.put(url, datos)
  return data
}

/** ACTUALIZACIÓN PARCIAL (cambio de estado). Devuelve { ok, mensaje, datos }. */
export const patch = async (url, datos = {}) => {
  const { data } = await api.patch(url, datos)
  return data
}

/** BORRAR un registro. Se llama "del" porque "delete" es palabra reservada. */
export const del = async (url) => {
  const { data } = await api.delete(url)
  return data
}
