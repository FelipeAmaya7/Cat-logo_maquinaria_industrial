/**
 * Almacenamiento local de los datos del sistema.
 *
 * La aplicación NO tiene inicio de sesión: es una herramienta de planta que se
 * abre y se usa. Todo vive en el `localStorage` del navegador bajo una sola
 * colección de claves, sin separación por persona.
 *
 * Consecuencia que conviene tener presente: los datos son de ESE navegador.
 * No viajan entre equipos ni se respaldan solos; para llevarlos a otro sitio
 * está la exportación a Excel.
 */
import { borrar, escribir, leer } from './almacenamiento'
import { idsCatalogoInicial } from '../data/catalogo'

const CLAVE_CATALOGO = 'catalogo'
const CLAVE_EDICIONES = 'ediciones'
const CLAVE_PROPIAS = 'maquinas-propias'
const CLAVE_ORDENES = 'ordenes-trabajo'
const CLAVE_REPUESTOS = 'repuestos'
const CLAVE_VERSION = 'version-catalogo'


/** Versión de la asignación inicial; subirla fuerza una resincronización. */
const VERSION_CATALOGO = 3



/**
 * Prepara el catálogo la primera vez que se abre la aplicación.
 *
 * Es idempotente y está versionado: al cambiar la definición del catálogo
 * inicial se sube `VERSION_CATALOGO` y esa única vez se resincroniza. Sin eso,
 * un navegador que ya hubiera abierto la aplicación conservaría para siempre
 * una lista de identificadores que quizá ya no existen.
 */
export async function sembrarDatosIniciales() {
  if (leer(CLAVE_VERSION, 0) === VERSION_CATALOGO) return

  escribir(CLAVE_CATALOGO, idsCatalogoInicial)
  escribir(CLAVE_VERSION, VERSION_CATALOGO)
}

/**
 * Identificadores de las máquinas que componen el catálogo.
 *
 * Si el navegador bloquea el almacenamiento —ventana privada, datos de sitio
 * desactivados— el sembrado no pudo escribir nada y esto devolvería una lista
 * vacía: la aplicación anunciaría que no hay fichas teniendo las 49 dentro del
 * propio paquete. Por eso la ausencia de clave cae en el catálogo de fábrica.
 *
 * Un catálogo vaciado a propósito SÍ es una lista vacía guardada, y esa se
 * respeta: solo se recurre al de fábrica cuando no hay clave en absoluto.
 *
 * @returns {string[]}
 */
export function idsDelCatalogo() {
  return leer(CLAVE_CATALOGO, null) ?? idsCatalogoInicial
}

/**
 * Ediciones hechas sobre las fichas del catálogo.
 *
 * Se guardan como PARCHES por máquina —solo los campos modificados— y no como
 * copias completas. Así, si el Excel se vuelve a extraer con datos nuevos, la
 * ficha se actualiza en todo lo que la persona no haya tocado.
 *
 * @returns {Object<string, Object>} { [idMaquina]: { campo: valor } }
 */
export function leerEdiciones() {
  return leer(CLAVE_EDICIONES, {})
}

/**
 * Fichas creadas a mano o cargadas desde un archivo de Excel.
 *
 * Se guardan COMPLETAS —no como identificadores— porque no existen en el
 * catálogo generado: su única copia es esta.
 *
 * @returns {Object[]}
 */
export function maquinasPropias() {
  return leer(CLAVE_PROPIAS, [])
}

/**
 * Guarda una ficha propia: la AÑADE o la REEMPLAZA.
 *
 * Reemplazar en vez de rechazar es lo que hace posible el ciclo completo con
 * Excel: descargar una ficha, corregirla en la hoja y volver a subirla actualiza
 * la que ya estaba, en lugar de dejar dos versiones compitiendo en el catálogo.
 *
 * @param {Object} maquina
 * @returns {{ok: boolean, error?: string, maquinas?: Object[], actualizada?: boolean}}
 */
export function guardarMaquinaPropia(maquina) {
  const clave = CLAVE_PROPIAS
  const propias = leer(clave, [])

  const posicion = propias.findIndex((existente) => existente.id === maquina.id)
  const actualizada = posicion !== -1

  const siguientes = actualizada
    ? propias.map((existente, indice) => (indice === posicion ? maquina : existente))
    : [...propias, maquina]

  if (!escribir(clave, siguientes)) {
    // La causa habitual es la cuota de localStorage, que ronda los 5 MB.
    return {
      ok: false,
      error: 'No se pudo guardar: el almacenamiento del navegador está lleno o bloqueado.',
    }
  }

  return { ok: true, maquinas: siguientes, actualizada }
}

/**
 * Guarda el parche de una ficha y devuelve el mapa completo de ediciones ya
 * actualizado, para que la interfaz refresque sin releer el almacenamiento.
 *
 * INVARIANTE: `cambios` es el parche COMPLETO de la máquina respecto al
 * catálogo generado, no un incremento sobre el parche guardado. Aquí se
 * reemplaza, no se mezcla: quien llame con una diferencia parcial borrará las
 * ediciones anteriores de esa ficha.
 *
 * @param {string} idMaquina
 * @param {Object} cambios Todos los campos que difieren del original.
 * @returns {{ok: boolean, ediciones: Object}}
 */
export function guardarEdicion(idMaquina, cambios) {
  const clave = CLAVE_EDICIONES
  const ediciones = leer(clave, {})

  if (Object.keys(cambios).length === 0) {
    // Volvió a los valores originales: se descarta el parche entero.
    delete ediciones[idMaquina]
  } else {
    ediciones[idMaquina] = cambios
  }

  return { ok: escribir(clave, ediciones), ediciones }
}

/**
 * Elimina una máquina del catálogo.
 *
 * Según su origen hay que tocar sitios distintos: las fichas que se
 * agregaron viven completas en su lista, mientras que las del libro oficial solo
 * están referenciadas por identificador. Se limpia también su parche de
 * edición, que si no quedaría huérfano ocupando espacio.
 *
 * @param {string} idMaquina
 * @returns {{ok: boolean, error?: string, maquinas?: Object[], ids?: string[]}}
 */
export function eliminarMaquina(idMaquina) {
  const clavePropias = CLAVE_PROPIAS
  const claveCatalogo = CLAVE_CATALOGO
  const claveEdiciones = CLAVE_EDICIONES

  const propias = leer(clavePropias, []).filter((maquina) => maquina.id !== idMaquina)
  const ids = leer(claveCatalogo, []).filter((id) => id !== idMaquina)

  if (!escribir(clavePropias, propias) || !escribir(claveCatalogo, ids)) {
    return { ok: false, error: 'No se pudo eliminar la ficha en este navegador.' }
  }

  const ediciones = leer(claveEdiciones, {})
  if (ediciones[idMaquina]) {
    delete ediciones[idMaquina]
    escribir(claveEdiciones, ediciones)
  }

  return { ok: true, maquinas: propias, ids }
}

/**
 * Órdenes de trabajo registradas.
 * Se guardan completas, como las fichas propias: no existen en ningún otro sitio.
 *
 * @returns {Object[]}
 */
export function leerOrdenes() {
  return leer(CLAVE_ORDENES, [])
}

/**
 * Crea o actualiza una orden de trabajo.
 * El identificador interno la distingue del «N° de orden», que la persona puede
 * cambiar: dos órdenes podrían acabar con el mismo número por un error de
 * digitación y aun así deben seguir siendo registros distintos.
 *
 * @param {Object} orden
 * @returns {{ok: boolean, error?: string, ordenes?: Object[]}}
 */
export function guardarOrden(orden) {
  const clave = CLAVE_ORDENES
  const ordenes = leer(clave, [])

  const posicion = ordenes.findIndex((existente) => existente.ref === orden.ref)
  const siguientes =
    posicion >= 0
      ? ordenes.map((existente, i) => (i === posicion ? orden : existente))
      : [...ordenes, orden]

  if (!escribir(clave, siguientes)) {
    return {
      ok: false,
      error: 'No se pudo guardar: el almacenamiento del navegador está lleno o bloqueado.',
    }
  }

  return { ok: true, ordenes: siguientes, actualizada: posicion >= 0 }
}

/**
 * Elimina una orden de trabajo por su identificador interno.
 *
 * @param {string} ref
 * @returns {{ok: boolean, error?: string, ordenes?: Object[]}}
 */
export function eliminarOrden(ref) {
  const clave = CLAVE_ORDENES
  const ordenes = leer(clave, []).filter((orden) => orden.ref !== ref)

  if (!escribir(clave, ordenes)) {
    return { ok: false, error: 'No se pudo eliminar la orden en este navegador.' }
  }

  return { ok: true, ordenes }
}

/**
 * Historial de repuestos de TODAS las máquinas.
 *
 * Se guarda en una sola lista y no una por máquina: así una ficha que se borra
 * no se lleva el historial por delante, y exportar el libro completo es leer
 * una única clave en vez de recorrer el catálogo.
 *
 * @returns {Object[]}
 */
export function leerRepuestos() {
  return leer(CLAVE_REPUESTOS, [])
}

/**
 * Crea o actualiza una entrada del historial de repuestos.
 * Se distingue por `ref`, no por fecha ni nombre: la misma pieza se cambia
 * varias veces y dos cambios pueden caer el mismo día.
 *
 * @param {Object} repuesto
 * @returns {{ok: boolean, error?: string, repuestos?: Object[], actualizada?: boolean}}
 */
export function guardarRepuesto(repuesto) {
  const clave = CLAVE_REPUESTOS
  const repuestos = leer(clave, [])

  const posicion = repuestos.findIndex((existente) => existente.ref === repuesto.ref)
  const siguientes =
    posicion >= 0
      ? repuestos.map((existente, i) => (i === posicion ? repuesto : existente))
      : [...repuestos, repuesto]

  if (!escribir(clave, siguientes)) {
    return {
      ok: false,
      error: 'No se pudo guardar: el almacenamiento del navegador está lleno o bloqueado.',
    }
  }

  return { ok: true, repuestos: siguientes, actualizada: posicion >= 0 }
}

/**
 * Elimina una entrada del historial por su identificador interno.
 *
 * @param {string} ref
 * @returns {{ok: boolean, error?: string, repuestos?: Object[]}}
 */
export function eliminarRepuesto(ref) {
  const clave = CLAVE_REPUESTOS
  const repuestos = leer(clave, []).filter((entrada) => entrada.ref !== ref)

  if (!escribir(clave, repuestos)) {
    return { ok: false, error: 'No se pudo eliminar el repuesto en este navegador.' }
  }

  return { ok: true, repuestos }
}

/**
 * Siguiente número de orden: el mayor registrado más uno.
 *
 * No se usa `longitud + 1` —como hace el proyecto de referencia— porque al
 * borrar una orden ese cálculo repite un número ya usado.
 *
 * @param {Object[]} ordenes
 * @returns {number}
 */
export function siguienteNumeroOrden(ordenes) {
  const numeros = ordenes.map((orden) => Number(orden.numero)).filter(Number.isFinite)
  return numeros.length === 0 ? 1 : Math.max(...numeros) + 1
}

/**
 * Vacía el catálogo, las órdenes y los repuestos.
 *
 * Equivale al «Vaciar y empezar de nuevo» del proyecto de referencia, con una
 * diferencia importante: allí los datos solo viven en memoria y se pierden al
 * cerrar la pestaña, así que vaciar es inofensivo. Aquí SÍ están guardados, por
 * lo que la interfaz debe confirmar antes de llamar a esta función.
 *
 * @returns {{ok: boolean, error?: string}}
 */
export function vaciarTodo() {

  const escrituras = [
    escribir(CLAVE_CATALOGO, []),
    escribir(CLAVE_PROPIAS, []),
    escribir(CLAVE_ORDENES, []),
    escribir(CLAVE_REPUESTOS, []),
    escribir(CLAVE_EDICIONES, {}),
  ]

  if (escrituras.some((correcta) => !correcta)) {
    return { ok: false, error: 'No se pudo vaciar el almacenamiento de este navegador.' }
  }

  // Sin esto el vaciado era irreversible: la versión seguía al día, el sembrado
  // no volvía a ejecutarse y las 49 fichas de planta no regresaban nunca. Al
  // retirar la versión, la próxima carga vuelve a sembrar el catálogo.
  borrar(CLAVE_VERSION)

  return { ok: true }
}

