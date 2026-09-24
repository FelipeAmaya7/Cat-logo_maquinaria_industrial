/**
 * Envoltura segura sobre localStorage.
 *
 * El acceso a localStorage puede lanzar excepciones aunque el navegador lo
 * soporte: ventana privada, cookies de terceros bloqueadas, cuota agotada o
 * políticas corporativas. Si una de esas llamadas revienta sin control, la
 * aplicación entera deja de renderizar.
 *
 * Aquí se aísla ese riesgo en un solo módulo: lee y escribe JSON, y ante
 * cualquier fallo devuelve el valor por defecto en lugar de propagar el error.
 */

const PREFIJO = 'fichas-tecnicas:'

/**
 * Prefijo usado antes de retirar la marca corporativa.
 *
 * Renombrar a secas habría dejado inaccesibles las cuentas, sesiones, ediciones
 * y fichas cargadas de quien ya venía usando la aplicación: para el navegador
 * son claves distintas. Por eso las entradas viejas se copian una sola vez, al
 * cargar el módulo, y se eliminan las originales.
 */
const PREFIJO_ANTERIOR = 'empaques-cartones:'

function migrarClavesAnteriores() {
  try {
    const antiguas = Object.keys(window.localStorage).filter((clave) =>
      clave.startsWith(PREFIJO_ANTERIOR),
    )

    for (const clave of antiguas) {
      const nueva = PREFIJO + clave.slice(PREFIJO_ANTERIOR.length)
      // Si ya se usó la aplicación con el nombre nuevo, ese dato es el vigente.
      if (window.localStorage.getItem(nueva) === null) {
        window.localStorage.setItem(nueva, window.localStorage.getItem(clave))
      }
      window.localStorage.removeItem(clave)
    }
  } catch {
    // Almacenamiento bloqueado: no hay nada que migrar y nada que romper.
  }
}

migrarClavesAnteriores()

/**
 * Lee un valor y lo deserializa.
 *
 * @param {string} clave
 * @param {*} porDefecto Valor devuelto si no existe o no se puede leer.
 */
export function leer(clave, porDefecto = null) {
  try {
    const crudo = window.localStorage.getItem(PREFIJO + clave)
    return crudo === null ? porDefecto : JSON.parse(crudo)
  } catch {
    // Almacenamiento no disponible o JSON corrupto: se sigue con el valor base.
    return porDefecto
  }
}

/**
 * Serializa y guarda un valor.
 *
 * @returns {boolean} true si se pudo escribir.
 */
export function escribir(clave, valor) {
  try {
    window.localStorage.setItem(PREFIJO + clave, JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}

/**
 * Comprueba si el navegador permite usar localStorage.
 *
 * En ventana privada o con el almacenamiento bloqueado, escribir lanza una
 * excepción. Sin esta comprobación la aplicación diría "usuario o contraseña
 * incorrectos" cuando el problema real es que la cuenta nunca pudo guardarse.
 */
export function estaDisponible() {
  const sonda = PREFIJO + '__prueba__'
  try {
    window.localStorage.setItem(sonda, '1')
    window.localStorage.removeItem(sonda)
    return true
  } catch {
    return false
  }
}

/** Elimina una clave. */
export function borrar(clave) {
  try {
    window.localStorage.removeItem(PREFIJO + clave)
    return true
  } catch {
    return false
  }
}
