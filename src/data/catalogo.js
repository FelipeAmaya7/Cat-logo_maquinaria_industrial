/**
 * Selección del catálogo visible.
 *
 * `maquinas.js` es un archivo GENERADO por `npm run datos`: cualquier cambio
 * hecho a mano allí se pierde en la siguiente extracción. Por eso el recorte del
 * catálogo vive aquí, en un módulo escrito a mano que consume el generado.
 */
import { maquinas } from './maquinas'

/** Marcador que usa el extractor cuando el formato venía sin diligenciar. */
const SIN_DATO = 'No registrado'

/**
 * Campos que deben estar diligenciados para considerar una ficha "completa".
 * Son los que la vista de ficha técnica muestra como datos clave.
 */
const CAMPOS_EXIGIDOS = [
  'marca',
  'modelo',
  'ubicacion',
  'anioAdquisicion',
  'turnoPorDia',
  'capacidad',
  'funcion',
]

/** Cuenta cuántos de los campos exigidos quedaron sin diligenciar. */
const vaciosDe = (maquina) =>
  CAMPOS_EXIGIDOS.filter((campo) => String(maquina[campo]) === SIN_DATO).length

/** Todas las máquinas cuya fotografía se extrajo del Excel. */
export const maquinasConFotografia = maquinas.filter((maquina) => maquina.imagen)

/**
 * Catálogo: TODAS las fichas del libro de planta.
 *
 * Antes se recortaba a seis. Aquel recorte existía porque el catálogo se
 * repartía entre usuarios y había que darle un conjunto pequeño a la cuenta
 * precargada; sin inicio de sesión no tiene sentido esconder el inventario.
 *
 * Se ordenan por completitud —menos campos vacíos primero— y, a igualdad, por
 * el orden del libro. Así las fichas bien diligenciadas abren el listado y las
 * que están a medio llenar quedan al final, visibles pero sin estorbar.
 */
export const catalogoInicial = [...maquinas]
  .map((maquina, posicion) => ({ maquina, posicion, vacios: vaciosDe(maquina) }))
  .sort((a, b) => a.vacios - b.vacios || a.posicion - b.posicion)
  .map((entrada) => entrada.maquina)

/** Identificadores del catálogo, que es lo que se guarda en el navegador. */
export const idsCatalogoInicial = catalogoInicial.map((maquina) => maquina.id)

/**
 * Resuelve una lista de identificadores a sus objetos de máquina.
 * Ignora los ids que ya no existan en el catálogo generado, de modo que un
 * cambio en el Excel no deje la interfaz con huecos, y garantiza fotografía.
 *
 * @param {string[]} ids
 * @returns {import('./maquinas').Maquina[]}
 */
export function obtenerMaquinasPorId(ids) {
  const porId = new Map(maquinas.map((maquina) => [maquina.id, maquina]))

  return ids
    .map((id) => porId.get(id))
    .filter(Boolean)

}
