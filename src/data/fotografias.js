/**
 * Resolución de la fotografía de una máquina.
 *
 * Hay dos orígenes posibles y no se resuelven igual:
 *
 *   - Extraída del Excel: el campo guarda solo el nombre del archivo
 *     (`EM00063.webp`) y hay que anteponerle la ruta pública.
 *   - Cargada por la persona: el campo ya es un data URL completo
 *     (`data:image/webp;base64,...`) y debe pasar tal cual.
 *
 * Este módulo existe aparte para no tocar `maquinas.js`, que lo regenera
 * `npm run datos` y no debe saber nada de las cargas manuales.
 */
import { rutaImagen } from './maquinas'

/**
 * @param {string|null} imagen Nombre de archivo o data URL.
 * @returns {string|null} Origen utilizable en un atributo src, o null.
 */
export function resolverFotografia(imagen) {
  if (!imagen) return null
  if (imagen.startsWith('data:')) return imagen

  return rutaImagen(imagen)
}
