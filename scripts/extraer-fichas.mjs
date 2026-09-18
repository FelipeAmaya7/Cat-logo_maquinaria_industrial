/**
 * Extrae las fichas técnicas del libro de Excel y regenera src/data/maquinas.js
 *
 * Uso:
 *   node scripts/extraer-fichas.mjs            # escribe src/data/maquinas.js
 *   node scripts/extraer-fichas.mjs --dry-run  # solo diagnostica, no escribe
 *
 * Estrategia de lectura
 * ---------------------
 * Las fichas NO tienen coordenadas fijas: varias hojas tienen filas insertadas o
 * eliminadas (p. ej. POLIPASTO y PRENSA MANUAL), por lo que leer "C10" a ciegas
 * produciría datos cruzados. En su lugar se ancla la búsqueda al ROTULO:
 *
 *   1. Se localiza la celda que contiene el rótulo, en cualquier columna: no todas
 *      las hojas usan las mismas (la estándar usa B/E/I, pero YAOTA usa B/F/J).
 *   2. El valor es la primera celda no vacía a la DERECHA del rótulo, sin pasar
 *      del siguiente rótulo de esa misma fila. Así se respetan las columnas
 *      combinadas y las celdas intermedias en blanco.
 *   3. Si un rótulo aparece varias veces se toma el MAS ALTO de la hoja, porque
 *      los anexos inferiores (repuestos y componentes) repiten palabras como
 *      "MARCA" y contaminarían el dato principal.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import xlsx from 'xlsx'
import { extraerImagenes } from './extraer-imagenes.mjs'

const raizProyecto = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ARCHIVO_EXCEL = resolve(raizProyecto, 'FICHAS TECNICAS MAQUINAS.xlsm')
const ARCHIVO_SALIDA = resolve(raizProyecto, 'src/data/maquinas.js')
const CARPETA_MAQUINAS = resolve(raizProyecto, 'public/maquinas')
const ARCHIVO_LOGO = resolve(raizProyecto, 'public/logo-empaques-cartones')

/** Hojas que no son fichas técnicas. */
const HOJAS_OMITIDAS = new Set(['INDICE', 'Fisico'])

/** Campo del modelo -> rótulo tal como aparece en el formato de planta. */
const MAPA_CAMPOS = {
  placaNueva: 'PLACA NUEVA',
  placaPadre: 'PLACAPADRE',
  cantidad: 'CANTIDAD',
  descripcion: 'DESCRIPCIÓN',
  anioAdquisicion: 'AÑO DE ADQUISCION',
  nuevoUsado: 'NUEVO-USADO',
  vidaUtil: 'VIDA ÚTIL EN AÑOS',
  estado: 'ESTADO',
  disponibilidad: 'DISPONIBILIDAD',
  horasUso: 'HORAS DE USO',
  aniosUso: 'AÑOS DE USO',
  ubicacion: 'UBICACIÓN',
  piso: 'PISO',
  material: 'MATERIAL',
  color: 'COLOR',
  dimension: 'DIMENSIÓN',
  marca: 'MARCA',
  modelo: 'MODELO',
  serie: 'SERIE',
  turnoPorDia: 'TURNO POR DÍA',
  especificaciones: 'ESPECIFICACIONES',
  funcion: 'FUNCIÓN QUE PRESTA',
  materialProcesado: 'MATERIAL PROCESADO',
  capacidad: 'CAPACIDAD PRODUCTIVA',
}

/** Marcadores que en el formato significan "campo sin diligenciar". */
const MARCADORES_VACIOS = new Set(['', '.', '..', '-', '--', '0', 'N/A'])
const SIN_DATO = 'No registrado'

const normalizar = (texto) =>
  String(texto ?? '')
    .replace(/\s+/g, ' ')
    .trim()

/** Quita tildes y mayúsculas para comparar rótulos de forma tolerante. */
const clave = (texto) =>
  normalizar(texto)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Todos los rótulos del formato, normalizados, para reconocerlos en la hoja. */
const ETIQUETAS_CONOCIDAS = new Set(Object.values(MAPA_CAMPOS).map(clave))

/** Texto ya formateado por Excel ('w' respeta fechas y decimales). */
const textoCelda = (celda) => (celda ? normalizar(celda.w ?? celda.v) : '')

/**
 * Índice { ROTULO -> { celdaValor, fila } } con la primera aparición de cada rótulo.
 * Recorre la hoja fila por fila para poder acotar cada valor al siguiente rótulo.
 */
function indexarRotulos(hoja) {
  const filas = new Map()

  // 1. Agrupar las celdas con contenido por fila.
  for (const direccion of Object.keys(hoja)) {
    if (direccion.startsWith('!')) continue

    const partes = /^([A-Z]+)(\d+)$/.exec(direccion)
    if (!partes) continue

    const texto = textoCelda(hoja[direccion])
    if (!texto) continue

    const fila = Number(partes[2])
    if (!filas.has(fila)) filas.set(fila, [])
    filas.get(fila).push({ direccion, columna: xlsx.utils.decode_col(partes[1]), texto })
  }

  const indice = new Map()

  // 2. En cada fila, emparejar rótulo -> primer valor a su derecha.
  for (const [fila, celdas] of [...filas.entries()].sort((a, b) => a[0] - b[0])) {
    celdas.sort((a, b) => a.columna - b.columna)

    celdas.forEach((celda, posicion) => {
      const rotulo = clave(celda.texto)
      if (!ETIQUETAS_CONOCIDAS.has(rotulo)) return

      // El bloque principal siempre está por encima de los anexos: gana el más alto.
      if (indice.has(rotulo)) return

      // El valor no puede invadir el rótulo siguiente de la misma fila.
      const valor = celdas
        .slice(posicion + 1)
        .find((siguiente) => !ETIQUETAS_CONOCIDAS.has(clave(siguiente.texto)))

      const rotuloSiguiente = celdas
        .slice(posicion + 1)
        .find((siguiente) => ETIQUETAS_CONOCIDAS.has(clave(siguiente.texto)))

      const invadeOtroRotulo =
        valor && rotuloSiguiente && valor.columna > rotuloSiguiente.columna

      indice.set(rotulo, {
        celdaValor: valor && !invadeOtroRotulo ? valor.direccion : null,
        fila,
      })
    })
  }

  return indice
}

/** Lee un campo por su rótulo; devuelve el valor crudo o null si no existe el rótulo. */
function leerCampo(hoja, indice, rotulo) {
  const ubicacion = indice.get(clave(rotulo))
  if (!ubicacion) return null
  if (!ubicacion.celdaValor) return ''

  return textoCelda(hoja[ubicacion.celdaValor])
}

/** Convierte marcadores de relleno en un texto uniforme. */
const limpiar = (valor) =>
  valor === null || MARCADORES_VACIOS.has(normalizar(valor).toUpperCase())
    ? SIN_DATO
    : normalizar(valor)

/** El año puede venir como número, como fecha o como marcador. */
function limpiarAnio(valor) {
  const texto = limpiar(valor)
  if (texto === SIN_DATO) return SIN_DATO

  const anio = /(19|20)\d{2}/.exec(texto)
  return anio ? Number(anio[0]) : texto
}

/**
 * Lee el membrete del formato (código, fecha y versión).
 *
 * Este bloque no tiene rótulos: son tres celdas sueltas en la esquina superior
 * derecha, así que se reconocen por su forma ("MTO_...", "V.001", una fecha) y
 * no por su posición, que también varía entre hojas.
 */
function leerMetadataFormato(hoja) {
  const membrete = { codigoFormato: null, fechaFormato: null, versionFormato: null }

  for (const direccion of Object.keys(hoja)) {
    if (direccion.startsWith('!')) continue

    const partes = /^([A-Z]+)(\d+)$/.exec(direccion)
    if (!partes || Number(partes[2]) > 8) continue // el membrete va sobre la ficha

    const celda = hoja[direccion]
    const texto = textoCelda(celda)

    if (!membrete.codigoFormato && /^MTO[_-]/i.test(texto)) membrete.codigoFormato = texto
    else if (!membrete.versionFormato && /^V\.?\s?\d/i.test(texto)) membrete.versionFormato = texto
    else if (!membrete.fechaFormato && celda.v instanceof Date) {
      // Se guarda en ISO; la interfaz decide cómo presentarlo.
      membrete.fechaFormato = celda.v.toISOString().slice(0, 10)
    }
  }

  return membrete
}

/** Genera un id estable y único a partir de la placa, con la hoja como respaldo. */
function construirId(placa, nombreHoja, usados) {
  const base =
    placa !== SIN_DATO
      ? clave(placa).replace(/[^A-Z0-9]/g, '')
      : clave(nombreHoja)
          .replace(/[^A-Z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')

  let id = base || 'SIN-PLACA'
  let sufijo = 2
  while (usados.has(id)) id = base + '-' + sufijo++

  usados.add(id)
  return id
}

// --- Extracción -------------------------------------------------------------

// bookFiles: true conserva las entradas del ZIP, necesarias para las imágenes.
const libro = xlsx.read(readFileSync(ARCHIVO_EXCEL), { cellDates: true, bookFiles: true })
const usados = new Set()
const maquinas = []
const omitidas = []
const incidencias = []

for (const nombreHoja of libro.SheetNames) {
  if (HOJAS_OMITIDAS.has(nombreHoja)) {
    omitidas.push(nombreHoja + ' (no es ficha técnica)')
    continue
  }

  const hoja = libro.Sheets[nombreHoja]
  if (!hoja || !hoja['!ref']) {
    omitidas.push(nombreHoja + ' (hoja vacía)')
    continue
  }

  const indice = indexarRotulos(hoja)
  const registro = { hoja: nombreHoja }

  for (const [campo, rotulo] of Object.entries(MAPA_CAMPOS)) {
    const crudo = leerCampo(hoja, indice, rotulo)
    if (crudo === null) incidencias.push(nombreHoja + ': falta el rótulo "' + rotulo + '"')
    registro[campo] = campo === 'anioAdquisicion' ? limpiarAnio(crudo) : limpiar(crudo)
  }

  // La hoja es la fuente más confiable del nombre cuando la celda viene vacía.
  if (registro.descripcion === SIN_DATO) registro.descripcion = nombreHoja

  Object.assign(registro, leerMetadataFormato(hoja))

  registro.id = construirId(registro.placaNueva, nombreHoja, usados)
  registro.imagen = null

  maquinas.push(registro)
}

// --- Imágenes incrustadas ---------------------------------------------------
// Convención de nombres: public/maquinas/<ID>.<ext>, donde <ID> es la placa.

const esDiagnostico = process.argv.includes('--dry-run')

const nombrePorHoja = new Map(maquinas.map((m) => [m.hoja, m.id]))
// Nivel superior de un módulo ES: se puede usar await directamente.
const { imagenPorHoja, informe } = await extraerImagenes(libro, nombrePorHoja, {
  carpetaMaquinas: CARPETA_MAQUINAS,
  archivoLogo: ARCHIVO_LOGO,
  escribir: !esDiagnostico,
})

for (const maquina of maquinas) {
  maquina.imagen = imagenPorHoja.get(maquina.hoja) ?? null
}

// --- Informe ----------------------------------------------------------------

console.log('Hojas en el libro : ' + libro.SheetNames.length)
console.log('Fichas extraídas  : ' + maquinas.length)
console.log('Hojas omitidas    : ' + omitidas.length)
omitidas.forEach((o) => console.log('  - ' + o))

if (incidencias.length) {
  console.log('\nRótulos no encontrados (' + incidencias.length + '):')
  incidencias.forEach((i) => console.log('  - ' + i))
}

console.log('\nImágenes incrustadas:')
informe.forEach((linea) => console.log('  ' + linea))

if (esDiagnostico) {
  console.log('\nMuestra:')
  console.dir(maquinas.slice(0, 3), { depth: null })
  console.log('\n[--dry-run] No se escribió ningún archivo.')
  process.exit(0)
}

// --- Escritura de src/data/maquinas.js --------------------------------------

const ORDEN_CAMPOS = [
  'id',
  'placaNueva',
  'descripcion',
  ...Object.keys(MAPA_CAMPOS),
  'codigoFormato',
  'fechaFormato',
  'versionFormato',
  'hoja',
  'imagen',
]

const serializar = (maquina) => {
  const lineas = []
  const vistos = new Set()

  for (const campo of ORDEN_CAMPOS) {
    if (vistos.has(campo) || !(campo in maquina)) continue
    vistos.add(campo)

    const valor = maquina[campo]
    const literal =
      valor === null ? 'null' : typeof valor === 'number' ? String(valor) : JSON.stringify(valor)
    lineas.push('    ' + campo + ': ' + literal + ',')
  }

  return '  {\n' + lineas.join('\n') + '\n  },'
}

const contenido = `/**
 * Catálogo de maquinaria — ARCHIVO GENERADO AUTOMÁTICAMENTE. No editar a mano.
 *
 * Fuente : FICHAS TECNICAS MAQUINAS.xlsm
 * Script : node scripts/extraer-fichas.mjs
 * Fichas : ${maquinas.length}
 *
 * Los campos sin diligenciar en el formato original se normalizan a "${SIN_DATO}".
 *
 * @typedef {Object} Maquina
 * @property {string} id               Identificador único derivado de la placa.
 * @property {string} placaNueva       Placa de inventario vigente.
 * @property {string} descripcion      Nombre técnico de la máquina.
 * @property {number|string} anioAdquisicion  Año de adquisición o "${SIN_DATO}".
 * @property {string} estado           Estado físico del activo.
 * @property {string} disponibilidad   Condición actual de uso.
 * @property {string} ubicacion        Área de planta.
 * @property {string} piso             Nivel de la edificación.
 * @property {string} marca            Fabricante.
 * @property {string} modelo           Modelo o referencia.
 * @property {string} turnoPorDia      Régimen de trabajo diario.
 * @property {string} capacidad        Capacidad productiva nominal.
 * @property {string} funcion          Función que presta en el proceso.
 * @property {string|null} codigoFormato   Código del formato (membrete).
 * @property {string|null} fechaFormato    Fecha del formato en ISO (YYYY-MM-DD).
 * @property {string|null} versionFormato  Versión del formato.
 * @property {string} hoja             Hoja de origen en el libro de Excel.
 * @property {string|null} imagen      Archivo en public/maquinas/, o null si la
 *                                     ficha original no traía fotografía.
 */

/** @type {Maquina[]} */
export const maquinas = [
${maquinas.map(serializar).join('\n')}
]

/**
 * Construye la ruta pública de la fotografía técnica.
 * Usa BASE_URL para que resuelva igual en desarrollo y en el build estático.
 *
 * @param {string|null} imagen Nombre del archivo en public/maquinas/
 * @returns {string|null} Ruta usable en un atributo src, o null si no hay imagen.
 */
export function rutaImagen(imagen) {
  if (!imagen) return null
  return \`\${import.meta.env.BASE_URL}maquinas/\${imagen}\`
}

/**
 * Filtra el catálogo por nombre (descripción), placa nueva o ID.
 * Función pura: no muta el arreglo original y es fácilmente testeable.
 *
 * @param {Maquina[]} listado Catálogo sobre el que se busca.
 * @param {string} termino    Texto ingresado por el usuario.
 * @returns {Maquina[]} Subconjunto que coincide con el término.
 */
export function filtrarMaquinas(listado, termino) {
  const criterio = termino.trim().toLowerCase()
  if (!criterio) return listado

  return listado.filter((maquina) =>
    [maquina.descripcion, maquina.placaNueva, maquina.id]
      .join(' ')
      .toLowerCase()
      .includes(criterio),
  )
}

export default maquinas
`

writeFileSync(ARCHIVO_SALIDA, contenido, 'utf8')
console.log('\nEscrito: src/data/maquinas.js (' + maquinas.length + ' fichas)')
