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
 * LAS DOCE FICHAS DE REFERENCIA
 * =============================
 *
 * El libro de planta tiene 49 fichas y antes el catálogo las mostraba todas.
 * Se recorta a doce a propósito, y el motivo no es el tamaño del archivo:
 *
 * - Las doce TIENEN FOTOGRAFÍA. De las 49 solo 26 la tienen, así que mostrar
 *   el libro completo significaba que casi la mitad de las tarjetas salían con
 *   un hueco. Un catálogo con huecos se lee como una aplicación a medio hacer.
 * - Diez de las doce tienen historial de ejemplo, de modo que la programación,
 *   los indicadores y la hoja de vida muestran algo en casi todo lo que se
 *   abre, en lugar de una de cada cinco veces.
 * - Se van con el recorte las dos fichas que repetían la placa EM00057. Ese
 *   duplicado es un defecto real del libro de Excel —el panel de alertas lo
 *   señala— y no hay por qué arrastrarlo a una muestra de referencia.
 *
 * Esto NO borra nada: las 49 siguen en `maquinas.js` y la aplicación permite
 * añadir fichas propias. Es una selección de lo que se ve al abrir.
 *
 * El orden de esta lista es el de la planta, por secciones, para que se lea
 * como el recorrido real; el del listado lo decide `catalogoInicial`.
 */
export const IDS_REFERENCIA = [
  // REFILADO — la línea de impresión y refilado, la más documentada.
  'EM00034', // Impresora flexográfica Windmöller, 4 colores. El equipo insignia.
  'EM00032', // Parafinadora. Único equipo con sistema térmico.
  'EM00030', // Cortadora refiladora.

  // RESMADO — fabricación de bolsa.
  'EM00027', // Bolsera Cellomatador Windmöller & Hölscher.
  'EM00025', // Bolsera Fischer y Krecke 31D.
  'EM00012', // Impresora flexográfica Stack 6 colores Yaota. PADRE de EM00014.
  // Sistema hidráulico de la Yaota: la única SUBUNIDAD real (nivel 7) de todo
  // el libro entre las fichas con fotografía, y por eso entra. Su imagen es el
  // mismo archivo que la de EM00012 —byte por byte—, porque en el Excel se
  // fotografió la máquina completa y no el sistema hidráulico aparte. No es un
  // error de esta aplicación, pero conviene saberlo: son dos fichas con la
  // misma foto, y tiene su lógica, ya que una es parte de la otra.
  'EM00014',

  // MEZANINE — servicios de planta.
  'EM00057', // Compresor.

  // MANTENIMIENTO — taller propio.
  'EM00062', // Torno paralelo.
  'EM00061', // Sierra tronzadora.

  // EMBOLSADO
  'EM00041', // Báscula digital. Sin correctivos: su MTBF sale «—», a propósito.

  // MANIJAS Y ENTORCHADO
  'EM00007', // Máquina para fabricación de manijas.
]

/**
 * Catálogo inicial: las fichas de referencia, resueltas contra el libro.
 *
 * Se filtra lo que no exista en lugar de confiar en la lista: `maquinas.js` lo
 * regenera `npm run datos`, y si una ficha desaparece del Excel es mejor un
 * catálogo de once que una tarjeta vacía o un fallo al arrancar. La prueba de
 * `npm test` avisa de ese caso, que es donde hay que enterarse.
 *
 * Se ordenan por completitud —menos campos vacíos primero— y, a igualdad, por
 * el orden del libro. Así las fichas bien diligenciadas abren el listado y las
 * que están a medio llenar quedan al final, visibles pero sin estorbar.
 */
export const catalogoInicial = IDS_REFERENCIA.map((id) =>
  maquinas.find((maquina) => maquina.id === id),
)
  .filter(Boolean)
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
