/**
 * Cuentas, sesión y aislamiento de datos por usuario.
 *
 * ADVERTENCIA DE ALCANCE
 * ----------------------
 * Esta es una autenticación de DEMOSTRACIÓN, adecuada para una aplicación
 * estática sin servidor, no para proteger información sensible. Todo ocurre en
 * el navegador: cualquiera con acceso al equipo puede abrir las herramientas de
 * desarrollo y leer o modificar localStorage. El aislamiento entre usuarios es
 * una separación funcional del catálogo, no una barrera de seguridad.
 *
 * Una versión de producción necesitaría un servidor que valide credenciales y
 * entregue un token, porque toda validación hecha en el cliente es evitable.
 *
 * Aun así, las contraseñas NO se guardan en claro: se almacena un resumen
 * SHA-256 con sal por cuenta. Esto no vuelve segura la aplicación, pero evita
 * exponer una contraseña que la persona probablemente reutiliza en otros sitios.
 */
import { borrar, escribir, leer } from './almacenamiento'
import { idsCatalogoInicial } from '../data/catalogo'

const CLAVE_CUENTAS = 'cuentas'
const CLAVE_SESION = 'sesion'
const CLAVE_CATALOGO = 'catalogo'
const CLAVE_EDICIONES = 'ediciones'
const CLAVE_PROPIAS = 'maquinas-propias'
const CLAVE_ORDENES = 'ordenes-trabajo'
const CLAVE_VERSION = 'version-catalogo'

/** Cuenta precargada la primera vez que se abre la aplicación. */
const CUENTA_INICIAL = { usuario: 'jhamilamaya', contrasena: '12345' }

/**
 * Versión de la asignación inicial de máquinas.
 *
 * El sembrado es idempotente sobre la CUENTA: si ya existe, no se toca. Eso
 * dejaba un problema real: cuando cambia la definición del catálogo inicial, un
 * navegador que ya había abierto la aplicación conservaba la asignación vieja
 * para siempre, con identificadores que podían ya no existir.
 *
 * Subir este número fuerza una única resincronización del catálogo de la cuenta
 * precargada. No toca su contraseña, ni sus ediciones, ni a los demás usuarios.
 */
const VERSION_CATALOGO = 2

export const LONGITUD_MINIMA_CONTRASENA = 5

/** Normaliza el usuario para que "Jhamil" y "jhamil " sean la misma cuenta. */
const normalizar = (usuario) => String(usuario ?? '').trim().toLowerCase()

/** Sal aleatoria por cuenta: dos cuentas con igual contraseña dan resúmenes distintos. */
function generarSal() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Resumen SHA-256 de la contraseña con su sal.
 *
 * `crypto.subtle` solo existe en contextos seguros (https y localhost). Si la
 * aplicación se sirve por http desde una IP de la red local no está disponible,
 * así que se usa un resumen alternativo para que el inicio de sesión no quede
 * inutilizable. No es criptográfico, y el comentario existe para que nadie lo
 * confunda con uno.
 */
async function resumir(contrasena, sal) {
  const texto = `${sal}:${contrasena}`

  if (globalThis.crypto?.subtle) {
    const datos = new TextEncoder().encode(texto)
    const digest = await crypto.subtle.digest('SHA-256', datos)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  // Respaldo no criptográfico (FNV-1a) para contextos sin Web Crypto.
  let hash = 0x811c9dc5
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return 'fnv1a:' + hash.toString(16)
}

/** Todas las cuentas registradas, indexadas por usuario. */
const leerCuentas = () => leer(CLAVE_CUENTAS, {})

/** Crea el registro de una cuenta (sin persistirlo). */
async function construirCuenta(usuario, contrasena) {
  const sal = generarSal()
  return {
    usuario,
    sal,
    resumen: await resumir(contrasena, sal),
    creada: new Date().toISOString(),
  }
}

/**
 * Precarga la cuenta inicial la primera vez que se abre la aplicación.
 * Es idempotente: si la cuenta ya existe no la toca, de modo que un cambio de
 * contraseña hecho por la persona no se revierte al recargar.
 */
export async function sembrarDatosIniciales() {
  const cuentas = leerCuentas()
  const claveCatalogo = `${CLAVE_CATALOGO}:${CUENTA_INICIAL.usuario}`

  if (!cuentas[CUENTA_INICIAL.usuario]) {
    cuentas[CUENTA_INICIAL.usuario] = await construirCuenta(
      CUENTA_INICIAL.usuario,
      CUENTA_INICIAL.contrasena,
    )
    escribir(CLAVE_CUENTAS, cuentas)
    // Solo esta cuenta arranca con máquinas asignadas.
    escribir(claveCatalogo, idsCatalogoInicial)
    escribir(CLAVE_VERSION, VERSION_CATALOGO)
    return
  }

  // La cuenta ya existía: se resincroniza su catálogo solo si la definición
  // cambió desde la última vez que este navegador la guardó.
  if (leer(CLAVE_VERSION, 1) !== VERSION_CATALOGO) {
    escribir(claveCatalogo, idsCatalogoInicial)
    escribir(CLAVE_VERSION, VERSION_CATALOGO)
  }
}

/**
 * Registra una cuenta nueva. Su catálogo arranca vacío: un usuario nuevo nunca
 * hereda las máquinas de otro.
 *
 * @returns {Promise<{ok: boolean, error?: string, sesion?: {usuario: string}}>}
 */
export async function registrar(usuario, contrasena, confirmacion) {
  const nombre = normalizar(usuario)

  if (nombre.length < 3) return { ok: false, error: 'El usuario debe tener al menos 3 caracteres.' }
  if (contrasena.length < LONGITUD_MINIMA_CONTRASENA) {
    return {
      ok: false,
      error: `La contraseña debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`,
    }
  }
  if (contrasena !== confirmacion) return { ok: false, error: 'Las contraseñas no coinciden.' }

  const cuentas = leerCuentas()
  if (cuentas[nombre]) return { ok: false, error: 'Ese usuario ya está registrado.' }

  cuentas[nombre] = await construirCuenta(nombre, contrasena)

  if (!escribir(CLAVE_CUENTAS, cuentas)) {
    return { ok: false, error: 'No se pudo guardar la cuenta en este navegador.' }
  }

  escribir(`${CLAVE_CATALOGO}:${nombre}`, [])
  return iniciarSesion(nombre)
}

/**
 * Verifica las credenciales y abre sesión.
 *
 * @returns {Promise<{ok: boolean, error?: string, sesion?: {usuario: string}}>}
 */
export async function autenticar(usuario, contrasena) {
  const nombre = normalizar(usuario)
  const cuenta = leerCuentas()[nombre]

  // Mismo mensaje para usuario inexistente y contraseña errónea: no conviene
  // revelar cuáles usuarios existen.
  const credencialesInvalidas = { ok: false, error: 'Usuario o contraseña incorrectos.' }
  if (!cuenta) return credencialesInvalidas

  const resumen = await resumir(contrasena, cuenta.sal)
  if (resumen !== cuenta.resumen) return credencialesInvalidas

  return iniciarSesion(nombre)
}

/** Guarda la sesión activa para que sobreviva a una recarga. */
function iniciarSesion(usuario) {
  const sesion = { usuario, iniciada: new Date().toISOString() }
  escribir(CLAVE_SESION, sesion)
  return { ok: true, sesion }
}

/** Sesión persistida, o null si no hay ninguna. */
export function leerSesion() {
  const sesion = leer(CLAVE_SESION, null)
  if (!sesion?.usuario) return null

  // Si la cuenta se borró del almacenamiento, la sesión deja de ser válida.
  return leerCuentas()[sesion.usuario] ? sesion : null
}

/** Cierra la sesión sin borrar la cuenta ni su catálogo. */
export function cerrarSesion() {
  borrar(CLAVE_SESION)
}

/**
 * Identificadores de las máquinas asignadas a un usuario.
 * Un usuario sin asignación devuelve un arreglo vacío, que es lo que garantiza
 * que no vea el catálogo de otro.
 *
 * @param {string} usuario
 * @returns {string[]}
 */
export function maquinasDeUsuario(usuario) {
  return leer(`${CLAVE_CATALOGO}:${normalizar(usuario)}`, [])
}

/**
 * Ediciones que un usuario ha hecho sobre sus fichas técnicas.
 *
 * Se guardan como PARCHES por máquina —solo los campos modificados— y no como
 * copias completas. Así, si el Excel se vuelve a extraer con datos nuevos, la
 * ficha se actualiza en todo lo que la persona no haya tocado.
 *
 * @param {string} usuario
 * @returns {Object<string, Object>} { [idMaquina]: { campo: valor } }
 */
export function leerEdiciones(usuario) {
  return leer(`${CLAVE_EDICIONES}:${normalizar(usuario)}`, {})
}

/**
 * Fichas que el usuario ha cargado él mismo desde un archivo de Excel.
 *
 * Se guardan COMPLETAS —no como identificadores— porque no existen en el
 * catálogo generado: su única copia es esta.
 *
 * @param {string} usuario
 * @returns {Object[]}
 */
export function maquinasPropias(usuario) {
  return leer(`${CLAVE_PROPIAS}:${normalizar(usuario)}`, [])
}

/**
 * Guarda una ficha cargada por el usuario: la AÑADE o la REEMPLAZA.
 *
 * Reemplazar en vez de rechazar es lo que hace posible el ciclo completo con
 * Excel: descargar una ficha, corregirla en la hoja y volver a subirla actualiza
 * la que ya estaba, en lugar de dejar dos versiones compitiendo en el catálogo.
 *
 * @param {string} usuario
 * @param {Object} maquina
 * @returns {{ok: boolean, error?: string, maquinas?: Object[], actualizada?: boolean}}
 */
export function guardarMaquinaPropia(usuario, maquina) {
  const clave = `${CLAVE_PROPIAS}:${normalizar(usuario)}`
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
 * @param {string} usuario
 * @param {string} idMaquina
 * @param {Object} cambios Todos los campos que difieren del original.
 * @returns {{ok: boolean, ediciones: Object}}
 */
export function guardarEdicion(usuario, idMaquina, cambios) {
  const clave = `${CLAVE_EDICIONES}:${normalizar(usuario)}`
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
 * Elimina una máquina del catálogo del usuario.
 *
 * Según su origen hay que tocar sitios distintos: las fichas que el usuario
 * cargó viven completas en su lista, mientras que las del libro oficial solo
 * están referenciadas por identificador. Se limpia también su parche de
 * edición, que si no quedaría huérfano ocupando espacio.
 *
 * @param {string} usuario
 * @param {string} idMaquina
 * @returns {{ok: boolean, error?: string, maquinas?: Object[], ids?: string[]}}
 */
export function eliminarMaquina(usuario, idMaquina) {
  const nombre = normalizar(usuario)
  const clavePropias = `${CLAVE_PROPIAS}:${nombre}`
  const claveCatalogo = `${CLAVE_CATALOGO}:${nombre}`
  const claveEdiciones = `${CLAVE_EDICIONES}:${nombre}`

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
 * Órdenes de trabajo del usuario.
 * Se guardan completas, como las fichas propias: no existen en ningún otro sitio.
 *
 * @param {string} usuario
 * @returns {Object[]}
 */
export function ordenesDeUsuario(usuario) {
  return leer(`${CLAVE_ORDENES}:${normalizar(usuario)}`, [])
}

/**
 * Crea o actualiza una orden de trabajo.
 * El identificador interno la distingue del «N° de orden», que la persona puede
 * cambiar: dos órdenes podrían acabar con el mismo número por un error de
 * digitación y aun así deben seguir siendo registros distintos.
 *
 * @param {string} usuario
 * @param {Object} orden
 * @returns {{ok: boolean, error?: string, ordenes?: Object[]}}
 */
export function guardarOrden(usuario, orden) {
  const clave = `${CLAVE_ORDENES}:${normalizar(usuario)}`
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
 * @param {string} usuario
 * @param {string} ref
 * @returns {{ok: boolean, error?: string, ordenes?: Object[]}}
 */
export function eliminarOrden(usuario, ref) {
  const clave = `${CLAVE_ORDENES}:${normalizar(usuario)}`
  const ordenes = leer(clave, []).filter((orden) => orden.ref !== ref)

  if (!escribir(clave, ordenes)) {
    return { ok: false, error: 'No se pudo eliminar la orden en este navegador.' }
  }

  return { ok: true, ordenes }
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
 * Vacía el catálogo y las órdenes del usuario, dejando la cuenta intacta.
 *
 * Equivale al «Vaciar y empezar de nuevo» del proyecto de referencia, con una
 * diferencia importante: allí los datos solo viven en memoria y se pierden al
 * cerrar la pestaña, así que vaciar es inofensivo. Aquí SÍ están guardados, por
 * lo que la interfaz debe confirmar antes de llamar a esta función.
 *
 * @param {string} usuario
 * @returns {{ok: boolean, error?: string}}
 */
export function vaciarDatosDeUsuario(usuario) {
  const nombre = normalizar(usuario)

  const escrituras = [
    escribir(`${CLAVE_CATALOGO}:${nombre}`, []),
    escribir(`${CLAVE_PROPIAS}:${nombre}`, []),
    escribir(`${CLAVE_ORDENES}:${nombre}`, []),
    escribir(`${CLAVE_EDICIONES}:${nombre}`, {}),
  ]

  if (escrituras.some((correcta) => !correcta)) {
    return { ok: false, error: 'No se pudo vaciar el almacenamiento de este navegador.' }
  }

  return { ok: true }
}

/**
 * Incorpora de una vez las máquinas y órdenes leídas de un libro de Excel.
 * Las fichas cuya placa ya exista se omiten, para no duplicar el inventario
 * al volver a cargar un archivo exportado antes.
 *
 * @param {string} usuario
 * @param {{maquinas: Object[], ordenes: Object[]}} contenido
 * @returns {{ok: boolean, error?: string, maquinas?: Object[], ordenes?: Object[], omitidas?: number}}
 */
export function importarLibro(usuario, { maquinas = [], ordenes = [] }) {
  const nombre = normalizar(usuario)
  const clavePropias = `${CLAVE_PROPIAS}:${nombre}`
  const claveOrdenes = `${CLAVE_ORDENES}:${nombre}`

  const propias = leer(clavePropias, [])
  const existentes = new Set([...propias.map((m) => m.id), ...leer(`${CLAVE_CATALOGO}:${nombre}`, [])])

  const nuevas = maquinas.filter((maquina) => !existentes.has(maquina.id))
  const siguientesPropias = [...propias, ...nuevas]
  const siguientesOrdenes = [...leer(claveOrdenes, []), ...ordenes]

  if (!escribir(clavePropias, siguientesPropias) || !escribir(claveOrdenes, siguientesOrdenes)) {
    return {
      ok: false,
      error: 'No se pudo guardar: el almacenamiento del navegador está lleno o bloqueado.',
    }
  }

  return {
    ok: true,
    maquinas: siguientesPropias,
    ordenes: siguientesOrdenes,
    omitidas: maquinas.length - nuevas.length,
  }
}
