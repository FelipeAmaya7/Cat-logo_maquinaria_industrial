/**
 * Selección del catálogo visible.
 *
 * `maquinas.js` es un archivo GENERADO por `npm run datos`: cualquier cambio
 * hecho a mano allí se pierde en la siguiente extracción. Por eso el recorte del
 * catálogo vive aquí, en un módulo escrito a mano que consume el generado.
 */
import { maquinas } from './maquinas'

/** Cuántas máquinas componen el catálogo inicial. */
export const TAMANO_CATALOGO_INICIAL = 6

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
 * Catálogo inicial: las máquinas con fotografía MÁS COMPLETAS.
 *
 * Criterio, en este orden:
 *   1. Tener fotografía técnica extraída.
 *   2. Menor cantidad de campos sin diligenciar.
 *   3. Orden original del libro de Excel, como desempate estable.
 *
 * Se ordena por completitud y no por posición porque las primeras hojas del
 * libro son herramientas de taller con la ficha a medio llenar; tomarlas "las
 * seis primeras" dejaría cuatro fichas sin capacidad, función, año ni turno.
 * Para volver al orden del libro basta con quitar la comparación por vacíos.
 */
export const catalogoInicial = [...maquinasConFotografia]
  .map((maquina, posicion) => ({ maquina, posicion, vacios: vaciosDe(maquina) }))
  .sort((a, b) => a.vacios - b.vacios || a.posicion - b.posicion)
  .slice(0, TAMANO_CATALOGO_INICIAL)
  .map((entrada) => entrada.maquina)

/** Identificadores del catálogo inicial, que es lo que se guarda por usuario. */
export const idsCatalogoInicial = catalogoInicial.map((maquina) => maquina.id)

/**
 * Resuelve una lista de identificadores a sus objetos de máquina.
 * Ignora los ids que ya no existan en el catálogo generado, de modo que un
 * cambio en el Excel no deje la interfaz con huecos.
 *
 * @param {string[]} ids
 * @returns {import('./maquinas').Maquina[]}
 */
export function obtenerMaquinasPorId(ids) {
  const porId = new Map(maquinas.map((maquina) => [maquina.id, maquina]))
  return ids.map((id) => porId.get(id)).filter(Boolean)
}
