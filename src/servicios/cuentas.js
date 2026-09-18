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

/** Cuenta precargada la primera vez que se abre la aplicación. */
const CUENTA_INICIAL = { usuario: 'jhamilamaya', contrasena: '12345' }

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
  if (cuentas[CUENTA_INICIAL.usuario]) return

  cuentas[CUENTA_INICIAL.usuario] = await construirCuenta(
    CUENTA_INICIAL.usuario,
    CUENTA_INICIAL.contrasena,
  )

  escribir(CLAVE_CUENTAS, cuentas)
  // Solo esta cuenta arranca con máquinas asignadas.
  escribir(`${CLAVE_CATALOGO}:${CUENTA_INICIAL.usuario}`, idsCatalogoInicial)
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
