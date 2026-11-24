import api from '@/plugins/axios'

export async function obtenerPdf(ruta) {
  const { data } = await api.get(ruta, { responseType: 'blob' })
  return URL.createObjectURL(data)
}

export async function descargarPdf(ruta, nombre) {
  const url = await obtenerPdf(ruta)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
