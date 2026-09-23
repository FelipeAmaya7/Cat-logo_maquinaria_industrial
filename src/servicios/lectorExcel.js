/**
 * Lectura de una ficha técnica suelta desde el navegador.
 *
 * Usa el MISMO algoritmo de anclaje a rótulos que la extracción masiva
 * (`scripts/extraer-fichas.mjs`), importado de `anclajeRotulos.js`. Duplicarlo
 * habría significado que una corrección en un lado no llegara al otro.
 *
 * Todo ocurre en el equipo de la persona: el archivo nunca se sube a ningún
 * servidor, coherente con que la aplicación sea estática.
 */
import { SIN_DATO, extraerFicha, normalizarClave } from './anclajeRotulos'

/**
 * Carga la librería de hojas de cálculo BAJO DEMANDA.
 *
 * `xlsx` pesa unos 350 kB minificado. Importarla arriba la metía en el paquete
 * principal, de modo que TODA persona que abre el catálogo la descargaba aunque
 * nunca subiera un archivo. Con el import dinámico queda en un fragmento aparte
 * que solo se pide al procesar el primer archivo.
 */
const cargarXlsx = () => import('xlsx')

/** Extensiones admitidas en el selector y en la validación. */
export const EXTENSIONES_EXCEL = ['.xlsx', '.xls', '.xlsm']

/** Límite de tamaño del libro, para no bloquear el navegador con archivos enormes. */
const TAMANO_MAXIMO_MB = 15

/** Campos que deben poder leerse para considerar el archivo una ficha válida. */
const CAMPOS_MINIMOS = ['placaNueva', 'descripcion']

/** Lee un File como ArrayBuffer usando FileReader. */
function leerArchivo(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(lector.result)
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo.'))
    lector.readAsArrayBuffer(archivo)
  })
}

/** Comprueba la extensión del archivo. */
export function esArchivoExcel(archivo) {
  if (!archivo?.name) return false
  const nombre = archivo.name.toLowerCase()
  return EXTENSIONES_EXCEL.some((extension) => nombre.endsWith(extension))
}

/**
 * Genera un identificador único a partir de la placa leída.
 *
 * @param {string} placa
 * @param {Set<string>} usados Identificadores ya presentes en el catálogo.
 */
function construirId(placa, usados) {
  const base =
    placa && placa !== SIN_DATO
      ? normalizarClave(placa).replace(/[^A-Z0-9]/g, '')
      : 'FICHA-' + Date.now().toString(36).toUpperCase()

  let id = base || 'SIN-PLACA'
  let sufijo = 2
  while (usados.has(id)) id = `${base}-${sufijo++}`

  return id
}

/**
 * Extrae una ficha técnica de la PRIMERA hoja de un archivo de Excel.
 *
 * @param {File} archivo
 * @param {Object} opciones
 * @param {Set<string>} [opciones.idsUsados] Para no repetir identificadores.
 * @returns {Promise<{ok: boolean, error?: string, maquina?: Object, faltantes?: string[]}>}
 */
export async function leerFichaDesdeExcel(archivo, { idsUsados = new Set() } = {}) {
  if (!esArchivoExcel(archivo)) {
    return { ok: false, error: `Formato no admitido. Use ${EXTENSIONES_EXCEL.join(', ')}.` }
  }

  if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
    return { ok: false, error: `El archivo supera los ${TAMANO_MAXIMO_MB} MB.` }
  }

  let libro
  let xlsx
  try {
    xlsx = await cargarXlsx()
    const datos = await leerArchivo(archivo)
    libro = xlsx.read(new Uint8Array(datos), { type: 'array', cellDates: true })
  } catch {
    return { ok: false, error: 'No se pudo abrir el archivo. ¿Está dañado o protegido?' }
  }

  const nombreHoja = libro.SheetNames[0]
  const hoja = nombreHoja && libro.Sheets[nombreHoja]

  if (!hoja || !hoja['!ref']) {
    return { ok: false, error: 'La primera hoja del archivo está vacía.' }
  }

  const { registro, faltantes } = extraerFicha(hoja, xlsx.utils.decode_col)

  // Sin placa ni descripción no hay ficha que mostrar: es otro tipo de documento.
  const vacios = CAMPOS_MINIMOS.filter((campo) => registro[campo] === SIN_DATO)
  if (vacios.length === CAMPOS_MINIMOS.length) {
    return {
      ok: false,
      error:
        'No se reconoció el formato de ficha técnica: no se encontró ni la placa ni la descripción.',
    }
  }

  // El nombre de la hoja es el mejor respaldo para el nombre de la máquina.
  if (registro.descripcion === SIN_DATO) registro.descripcion = nombreHoja

  const maquina = {
    ...registro,
    id: construirId(registro.placaNueva, idsUsados),
    hoja: nombreHoja,
    imagen: null,
    // Sin membrete propio: la ficha se marca como cargada por el usuario.
    codigoFormato: registro.codigoFormato ?? null,
    fechaFormato: new Date().toISOString().slice(0, 10),
    versionFormato: null,
    origen: 'carga-manual',
  }

  return { ok: true, maquina, faltantes }
}
