/**
 * Algoritmo de anclaje a rótulos: extrae los campos de una ficha técnica desde
 * una hoja de cálculo, sin depender de coordenadas fijas.
 *
 * Módulo PURO: no importa nada de Node ni del navegador. Por eso lo usan los dos
 * consumidores del proyecto sin duplicar la lógica:
 *
 *   - `scripts/extraer-fichas.mjs`  extracción masiva del libro oficial (Node).
 *   - `src/servicios/lectorExcel.js` carga de una ficha suelta (navegador).
 *
 * Por qué no coordenadas
 * ----------------------
 * Las fichas reales NO están alineadas: hay hojas con filas insertadas o
 * eliminadas (POLIPASTO, PRENSA MANUAL) y hojas que usan otras columnas para el
 * mismo dato (YAOTA usa B/F/J donde el resto usa B/E/I). Leer "C40" a ciegas
 * produciría datos cruzados sin fallar, que es el peor error posible.
 *
 * Reglas
 * ------
 *   1. Se localiza la celda que CONTIENE el rótulo, en cualquier columna.
 *   2. El valor es la primera celda no vacía a su DERECHA, sin pasar del
 *      siguiente rótulo de esa misma fila.
 *   3. Si un rótulo se repite, gana el MÁS ALTO: los anexos inferiores (listas
 *      de repuestos) repiten palabras como "MARCA" y contaminarían el dato.
 */

/** Campo del modelo -> rótulo tal como aparece en el formato de planta. */
export const MAPA_CAMPOS = {
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
export const MARCADORES_VACIOS = new Set(['', '.', '..', '-', '--', '0', 'N/A'])

/** Texto uniforme para lo que el formato dejó sin llenar. */
export const SIN_DATO = 'No registrado'

/** Colapsa espacios y recorta. */
export const normalizar = (texto) =>
  String(texto ?? '')
    .replace(/\s+/g, ' ')
    .trim()

/** Quita tildes y mayúsculas para comparar rótulos de forma tolerante. */
export function normalizarClave(texto) {
  return normalizar(texto)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Todos los rótulos del formato, normalizados, para reconocerlos en la hoja.
 * Se define DESPUÉS de `normalizar`: al ser una constante, evaluarla antes
 * dejaría a `normalizarClave` llamando a una variable aún sin inicializar.
 */
export const ETIQUETAS_CONOCIDAS = new Set(Object.values(MAPA_CAMPOS).map(normalizarClave))

/** Texto ya formateado por la hoja ('w' respeta fechas y decimales). */
export const textoCelda = (celda) => (celda ? normalizar(celda.w ?? celda.v) : '')

/** Convierte marcadores de relleno en un texto uniforme. */
export const limpiar = (valor) =>
  valor === null || valor === undefined || MARCADORES_VACIOS.has(normalizar(valor).toUpperCase())
    ? SIN_DATO
    : normalizar(valor)

/** El año puede venir como número, como fecha o como marcador. */
export function limpiarAnio(valor) {
  const texto = limpiar(valor)
  if (texto === SIN_DATO) return SIN_DATO

  const anio = /(19|20)\d{2}/.exec(texto)
  return anio ? Number(anio[0]) : texto
}

/**
 * Índice { ROTULO -> { celdaValor, fila } } con la primera aparición de cada rótulo.
 *
 * @param {Object} hoja Hoja en el formato de objeto de SheetJS.
 * @param {(letra: string) => number} decodificarColumna Convierte 'B' en su índice.
 */
export function indexarRotulos(hoja, decodificarColumna) {
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
    filas.get(fila).push({ direccion, columna: decodificarColumna(partes[1]), texto })
  }

  const indice = new Map()

  // 2. En cada fila, emparejar rótulo -> primer valor a su derecha.
  for (const [fila, celdas] of [...filas.entries()].sort((a, b) => a[0] - b[0])) {
    celdas.sort((a, b) => a.columna - b.columna)

    celdas.forEach((celda, posicion) => {
      const rotulo = normalizarClave(celda.texto)
      if (!ETIQUETAS_CONOCIDAS.has(rotulo)) return

      // El bloque principal siempre está por encima de los anexos: gana el más alto.
      if (indice.has(rotulo)) return

      const posteriores = celdas.slice(posicion + 1)
      const valor = posteriores.find(
        (siguiente) => !ETIQUETAS_CONOCIDAS.has(normalizarClave(siguiente.texto)),
      )
      const rotuloSiguiente = posteriores.find((siguiente) =>
        ETIQUETAS_CONOCIDAS.has(normalizarClave(siguiente.texto)),
      )

      // El valor no puede invadir el rótulo siguiente de la misma fila.
      const invade = valor && rotuloSiguiente && valor.columna > rotuloSiguiente.columna

      indice.set(rotulo, { celdaValor: valor && !invade ? valor.direccion : null, fila })
    })
  }

  return indice
}

/**
 * Lee un campo por su rótulo.
 * @returns {string|null} Valor crudo, cadena vacía si el rótulo existe sin dato,
 *                        o null si el rótulo no aparece en la hoja.
 */
export function leerCampo(hoja, indice, rotulo) {
  const ubicacion = indice.get(normalizarClave(rotulo))
  if (!ubicacion) return null
  if (!ubicacion.celdaValor) return ''

  return textoCelda(hoja[ubicacion.celdaValor])
}

/**
 * Extrae todos los campos del mapa desde una hoja, ya normalizados.
 *
 * @param {Object} hoja
 * @param {(letra: string) => number} decodificarColumna
 * @returns {{registro: Object, faltantes: string[]}} `faltantes` lista los
 *          rótulos que la hoja no traía, útil para avisar al usuario.
 */
export function extraerFicha(hoja, decodificarColumna) {
  const indice = indexarRotulos(hoja, decodificarColumna)
  const registro = {}
  const faltantes = []

  for (const [campo, rotulo] of Object.entries(MAPA_CAMPOS)) {
    const crudo = leerCampo(hoja, indice, rotulo)
    if (crudo === null) faltantes.push(rotulo)

    registro[campo] = campo === 'anioAdquisicion' ? limpiarAnio(crudo) : limpiar(crudo)
  }

  return { registro, faltantes }
}
