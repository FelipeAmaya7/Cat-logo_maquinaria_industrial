/**
 * Lectura de un LIBRO completo exportado por esta aplicación o por el proyecto
 * de referencia.
 *
 * Es la contraparte de `exportarExcel.js`: lo que aquella escribe, esta lo
 * vuelve a leer. Se distingue de `lectorExcel.js` en el propósito:
 *
 *   - `lectorExcel.js`  una hoja con UNA ficha en disposición vertical
 *                       (rótulo | valor), que es el formato de planta.
 *   - este módulo       un libro con hojas TABULARES (una fila por registro),
 *                       que es como se guarda el inventario completo.
 *
 * Reconoce las tres hojas del formato de referencia y tolera que falte
 * cualquiera de ellas: quien exporte solo el catálogo podrá volver a cargarlo.
 */
import { SIN_DATO, normalizarClave } from './anclajeRotulos'
import { FICHA_TECNICA, ORDENES_DE_TRABAJO, REGISTRO_DE_DATOS } from './formatoCompanero'
import { CAMPOS_ORDEN } from '../data/ordenes'

const cargarXlsx = () => import('xlsx')

/** Nombres alternativos con que puede venir la hoja de equipos. */
const HOJAS_EQUIPOS = ['Registro de datos', 'Equipos', 'Catálogo']

/** Lee un File como ArrayBuffer. */
function leerArchivo(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(lector.result)
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo.'))
    lector.readAsArrayBuffer(archivo)
  })
}

/** Busca una hoja por nombre, sin distinguir mayúsculas ni tildes. */
function buscarHoja(libro, nombres) {
  const buscados = nombres.map(normalizarClave)
  const encontrado = libro.SheetNames.find((nombre) => buscados.includes(normalizarClave(nombre)))
  return encontrado ? libro.Sheets[encontrado] : null
}

/**
 * Convierte una hoja tabular en registros, emparejando por el TEXTO del
 * encabezado y no por su posición: así sigue funcionando si alguien reordena
 * o inserta columnas en Excel.
 *
 * @param {Object} hoja
 * @param {Array<[string, string]>} columnas Pares [campo, rótulo].
 * @param {Object} xlsx
 */
function hojaARegistros(hoja, columnas, xlsx) {
  if (!hoja || !hoja['!ref']) return []

  const filas = xlsx.utils.sheet_to_json(hoja, { header: 1, raw: false, defval: '' })
  if (filas.length < 2) return []

  const encabezado = filas[0].map(normalizarClave)
  const posicion = new Map(columnas.map(([campo, rotulo]) => [campo, encabezado.indexOf(normalizarClave(rotulo))]))

  return filas
    .slice(1)
    .filter((fila) => fila.some((celda) => String(celda ?? '').trim()))
    .map((fila) => {
      const registro = {}
      for (const [campo, indice] of posicion) {
        registro[campo] = indice >= 0 ? String(fila[indice] ?? '').trim() : ''
      }
      return registro
    })
}

/** Identificador único a partir de la placa, o uno generado si no la hay. */
function construirId(placa, usados) {
  const base = normalizarClave(placa).replace(/[^A-Z0-9]/g, '')
  let id = base || `FICHA-${Date.now().toString(36).toUpperCase()}`

  let sufijo = 2
  while (usados.has(id)) id = `${base}-${sufijo++}`

  usados.add(id)
  return id
}

/**
 * Lee un libro completo y devuelve sus máquinas y órdenes.
 *
 * @param {File} archivo
 * @param {Object} [opciones]
 * @param {Set<string>} [opciones.idsUsados]
 * @returns {Promise<{ok: boolean, error?: string, maquinas?: Object[], ordenes?: Object[]}>}
 */
export async function leerLibroCompleto(archivo, { idsUsados = new Set() } = {}) {
  let libro
  let xlsx

  try {
    xlsx = await cargarXlsx()
    const datos = await leerArchivo(archivo)
    libro = xlsx.read(new Uint8Array(datos), { type: 'array', cellDates: true })
  } catch {
    return { ok: false, error: 'No se pudo abrir el archivo. ¿Está dañado o protegido?' }
  }

  const usados = new Set(idsUsados)

  // La hoja de ficha técnica es la más completa; la de equipos, la de respaldo.
  const deFicha = hojaARegistros(buscarHoja(libro, [FICHA_TECNICA.hoja]), FICHA_TECNICA.columnas, xlsx)
  const deEquipos = hojaARegistros(
    buscarHoja(libro, HOJAS_EQUIPOS),
    REGISTRO_DE_DATOS.columnas,
    xlsx,
  )

  const crudas = deFicha.length > 0 ? deFicha : deEquipos

  const maquinas = crudas
    .filter((registro) => registro.placaNueva || registro.descripcion)
    .map((registro) => {
      const valores = Object.fromEntries(
        Object.entries(registro).map(([campo, valor]) => [campo, valor || SIN_DATO]),
      )

      return {
        ...valores,
        id: construirId(registro.placaNueva || registro.descripcion, usados),
        hoja: 'Importada de un libro',
        imagen: null,
        codigoFormato: null,
        fechaFormato: new Date().toISOString().slice(0, 10),
        versionFormato: null,
        origen: 'libro',
      }
    })

  // Las órdenes referencian el equipo por placa; se reenlazan al id interno.
  const porPlaca = new Map(maquinas.map((maquina) => [normalizarClave(maquina.placaNueva), maquina.id]))

  const ordenes = hojaARegistros(
    buscarHoja(libro, [ORDENES_DE_TRABAJO.hoja]),
    CAMPOS_ORDEN.map(({ campo, rotulo }) => [campo, rotulo]),
    xlsx,
  ).map((orden, indice) => ({
    ...orden,
    equipo: porPlaca.get(normalizarClave(orden.equipo)) ?? orden.equipo,
    ref: `ot-${Date.now().toString(36)}-${indice}`,
  }))

  if (maquinas.length === 0 && ordenes.length === 0) {
    return {
      ok: false,
      error:
        'No se reconoció ninguna hoja con datos. Se esperan «Registro de datos», ' +
        '«Ficha técnica» u «Ordenes de trabajo».',
    }
  }

  return { ok: true, maquinas, ordenes }
}
