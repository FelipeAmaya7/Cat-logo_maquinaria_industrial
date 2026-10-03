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

/**
 * Campo del modelo -> rótulo tal como aparece en el formato de planta y gestión.
 *
 * Enfocado 100% en maquinaria industrial de planta (empaques, corrugados y maquinaria gráfica).
 * Los rótulos oficiales permiten la importación y exportación bidireccional en Excel.
 */
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
  numeroMotor: 'NÚMERO DE MOTOR',
  turnoPorDia: 'TURNO POR DÍA',
  especificaciones: 'ESPECIFICACIONES',
  funcion: 'FUNCIÓN QUE PRESTA',
  materialProcesado: 'MATERIAL PROCESADO',
  capacidad: 'CAPACIDAD PRODUCTIVA',
  precio: 'PRECIO',
  anioInstalacion: 'AÑO INSTALACIÓN',
  responsable: 'RESPONSABLE',
  longitud: 'LONGITUD (M)',
  ancho: 'ANCHO (M)',
  alto: 'ALTO (M)',
  pesoVacio: 'PESO VACÍO (KG)',
  pesoBruto: 'PESO BRUTO (KG)',
  fechaUltimaIntervencion: 'FECHA ÚLTIMA INTERVENCIÓN',
  proximoMantenimiento: 'PRÓXIMO MANTENIMIENTO PROGRAMADO',
  manualTecnico: 'MANUAL TÉCNICO',
  vigenciaGarantia: 'VIGENCIA GARANTÍA',
  intervenciones: 'INTERVENCIONES',
  modificaciones: 'MODIFICACIONES',
  actualizaciones: 'ACTUALIZACIONES',
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

/**
 * Campos que la interfaz edita con un calendario (`<input type="date">`).
 *
 * Ese control SOLO acepta `AAAA-MM-DD`. Si recibe cualquier otra cosa se pinta
 * vacío, y entonces el dato parece no existir y se pierde al guardar. Por eso
 * las fechas que entran desde una hoja de cálculo se normalizan aquí.
 */
export const CAMPOS_FECHA = new Set(['fechaUltimaIntervencion', 'proximoMantenimiento'])

/** ¿El texto ya está en el formato que entiende el calendario? */
export const esFechaIso = (valor) => /^\d{4}-\d{2}-\d{2}$/.test(String(valor ?? '').trim())

/**
 * Fecha de una celda, en formato `AAAA-MM-DD` cuando se puede afirmar.
 *
 * Excel guarda la fecha como número de serie y la MUESTRA según la
 * configuración regional: la misma celda se lee «9/22/26» en un equipo y
 * «22/09/2026» en otro. Con `cellDates: true` la librería entrega además el
 * objeto Date real, y de ahí sí sale una fecha inequívoca.
 *
 * Cuando la celda es texto suelto no se adivina: «3/4/2026» puede ser el 3 de
 * abril o el 4 de marzo, y equivocarse en silencio es peor que no convertir.
 * En ese caso se devuelve el texto tal cual y la interfaz lo muestra como
 * casilla de texto, de modo que la persona lo vea y lo corrija.
 *
 * @param {Object|undefined} celda Celda en el formato de SheetJS.
 * @param {string} texto           Lo que ya leyó `textoCelda`.
 */
export function limpiarFecha(celda, texto) {
  const fecha = celda?.v

  if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
    // Se compone a mano con las partes locales: `toISOString` pasa a UTC y
    // puede restar un día según la zona horaria del navegador.
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const dia = String(fecha.getDate()).padStart(2, '0')
    return `${fecha.getFullYear()}-${mes}-${dia}`
  }

  return limpiar(texto)
}

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
 * La celda en bruto de un rótulo, no su texto.
 * Las fechas la necesitan: el texto ya perdió el objeto Date que permite
 * normalizarlas sin adivinar el orden de día y mes.
 */
export function leerCelda(hoja, indice, rotulo) {
  const ubicacion = indice.get(normalizarClave(rotulo))
  if (!ubicacion?.celdaValor) return undefined

  return hoja[ubicacion.celdaValor]
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

    if (campo === 'anioAdquisicion') {
      registro[campo] = limpiarAnio(crudo)
    } else if (CAMPOS_FECHA.has(campo)) {
      registro[campo] = limpiarFecha(leerCelda(hoja, indice, rotulo), crudo)
    } else {
      registro[campo] = limpiar(crudo)
    }
  }

  return { registro, faltantes }
}
