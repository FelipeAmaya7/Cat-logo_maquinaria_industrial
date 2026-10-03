/**
 * Generación y descarga de archivos de Excel desde el navegador.
 *
 * Cierra el ciclo con `lectorExcel.js`: lo que esta aplicación escribe, esta
 * aplicación lo vuelve a leer.
 *
 * IDA Y VUELTA
 * ------------
 * La ficha individual se exporta como pares RÓTULO | VALOR, una fila por campo,
 * usando exactamente los rótulos de `MAPA_CAMPOS`. No es una decisión estética:
 * es la condición para que el archivo descargado, editado en Excel y vuelto a
 * subir, lo reconozca el mismo algoritmo de anclaje que lee las fichas de
 * planta. Si alguien cambia un rótulo allí, el ciclo se rompe aquí.
 *
 * Por eso los rótulos NO se escriben a mano en este módulo: se derivan de
 * `MAPA_CAMPOS`. Escribir «Año de adquisición» en lugar de «AÑO DE ADQUISCION»
 * —que trae una errata del formato original— basta para que el lector deje de
 * reconocer el campo al volver a subirlo.
 *
 * El catálogo completo, en cambio, se exporta como TABLA (una fila por máquina),
 * que es lo útil para revisar o imprimir un inventario. Ese formato NO se puede
 * volver a subir: el lector ancla a rótulos, que en una tabla quedan arriba de
 * los valores y no a su izquierda.
 */
import { MAPA_CAMPOS, SIN_DATO } from './anclajeRotulos'
import { FICHA_TECNICA, ORDENES_DE_TRABAJO, REGISTRO_DE_DATOS } from './formatoCompanero'
import { COLUMNAS_ORDEN } from '../data/ordenes'

/**
 * Carga `xlsx` BAJO DEMANDA, igual que el lector.
 * Mantiene la librería fuera del paquete principal: quien nunca exporta ni sube
 * un archivo no la descarga.
 */
const cargarXlsx = () => import('xlsx')

/** Campos del modelo, en el orden en que se escriben en la hoja. */
const CAMPOS = Object.entries(MAPA_CAMPOS)

/** Anchos de columna, en caracteres, para que nada salga cortado al abrir. */
const ANCHO_MINIMO = 14
const ANCHOS_ESPECIALES = {
  funcion: 60,
  descripcion: 46,
  especificaciones: 40,
  dimension: 34,
  materialProcesado: 30,
  ubicacion: 26,
  capacidad: 26,
}

/** Valor listo para la celda: nunca `undefined`, que Excel escribiría vacío. */
const valorCelda = (maquina, campo) => {
  const valor = maquina[campo]
  return valor === null || valor === undefined || valor === '' ? SIN_DATO : String(valor)
}

/**
 * Valor para la TABLA del catálogo, donde `SIN_DATO` se deja en blanco.
 *
 * Es seguro hacerlo solo aquí: la tabla no se vuelve a leer, y una columna con
 * «No registrado» repetido cientos de veces estorba al filtrar y al ordenar.
 * En la ficha individual se conserva el marcador, porque ese archivo sí regresa.
 */
const valorTabla = (maquina, campo) => {
  const valor = valorCelda(maquina, campo)
  return valor === SIN_DATO ? '' : valor
}

/** Quita de un nombre de archivo lo que los sistemas de ficheros no admiten. */
const nombreSeguro = (texto) =>
  String(texto ?? '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)

/** Marca de tiempo legible y válida como nombre de archivo. */
function sello() {
  const ahora = new Date()
  const dos = (n) => String(n).padStart(2, '0')

  return (
    `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}` +
    `_${dos(ahora.getHours())}${dos(ahora.getMinutes())}`
  )
}

/**
 * Descarga una ficha técnica como archivo .xlsx.
 *
 * Refleja el estado ACTUAL de la máquina, ediciones incluidas: quien modifique
 * datos en la web y descargue verá esos cambios al abrir el archivo.
 *
 * @param {Object} maquina Máquina ya con sus ediciones aplicadas.
 * @returns {Promise<{ok: boolean, error?: string, archivo?: string}>}
 */
export async function descargarFichaExcel(maquina) {
  if (!maquina) return { ok: false, error: 'No hay ficha que exportar.' }

  try {
    const xlsx = await cargarXlsx()

    const filas = [
      ['FICHA TÉCNICA DE MAQUINARIA'],
      [],
      // Rótulos derivados de MAPA_CAMPOS: es lo que permite volver a subirla.
      ...CAMPOS.map(([campo, rotulo]) => [rotulo, valorCelda(maquina, campo)]),
    ]

    const hoja = xlsx.utils.aoa_to_sheet(filas)
    hoja['!cols'] = [{ wch: 26 }, { wch: 60 }]

    const libro = xlsx.utils.book_new()
    // El nombre de hoja de Excel admite 31 caracteres y no acepta : \ / ? * [ ]
    xlsx.utils.book_append_sheet(libro, hoja, nombreSeguro(maquina.id).slice(0, 31) || 'Ficha')

    const archivo = `ficha-${nombreSeguro(maquina.id)}.xlsx`
    xlsx.writeFile(libro, archivo)

    return { ok: true, archivo }
  } catch {
    return { ok: false, error: 'No se pudo generar el archivo de Excel.' }
  }
}

/** Construye una hoja a partir de una definición de columnas del formato. */
function hojaTabular(xlsx, { columnas }, maquinas) {
  const encabezado = columnas.map(([, rotulo]) => rotulo)

  const cuerpo = maquinas.map((maquina) =>
    // Una columna sin campo asociado existe en el formato pero no en estos
    // datos (precio, responsable, intervenciones): se deja en blanco.
    columnas.map(([campo]) => (campo ? valorTabla(maquina, campo) : '')),
  )

  const hoja = xlsx.utils.aoa_to_sheet([encabezado, ...cuerpo])

  hoja['!cols'] = columnas.map(([campo, rotulo]) => ({
    wch: ANCHOS_ESPECIALES[campo] ?? Math.max(ANCHO_MINIMO, rotulo.length + 2),
  }))

  // Títulos fijos y filtros puestos: lo primero que hace cualquiera al abrir.
  hoja['!freeze'] = { xSplit: 0, ySplit: 1 }
  hoja['!autofilter'] = {
    ref: xlsx.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: cuerpo.length, c: encabezado.length - 1 },
    }),
  }

  return hoja
}

/**
 * Descarga el catálogo completo del usuario como libro .xlsx.
 *
 * Reproduce la disposición de tres hojas del proyecto de referencia
 * (ver `formatoCompanero.js`), más una hoja de resumen con los conteos del
 * inventario.
 *
 * @param {Object[]} maquinas Catálogo ya con las ediciones aplicadas.
 * @param {Object} [opciones]
 * @param {string} [opciones.usuario] Queda registrado en la hoja de resumen.
 * @param {Object[]} [opciones.ordenes] Órdenes de trabajo del usuario.
 * @returns {Promise<{ok: boolean, error?: string, archivo?: string}>}
 */
export async function descargarCatalogoExcel(maquinas, { usuario, ordenes = [] } = {}) {
  if (!maquinas || maquinas.length === 0) {
    return { ok: false, error: 'No hay fichas que exportar.' }
  }

  try {
    const xlsx = await cargarXlsx()
    const libro = xlsx.utils.book_new()

    xlsx.utils.book_append_sheet(
      libro,
      hojaTabular(xlsx, REGISTRO_DE_DATOS, maquinas),
      REGISTRO_DE_DATOS.hoja,
    )

    // Las órdenes registradas. Sin ninguna, queda la plantilla con sus títulos.
    const filasOrdenes = ordenes.map((orden) =>
      COLUMNAS_ORDEN.map(([campo]) => {
        if (campo !== 'equipo') return String(orden[campo] ?? '')

        // En el Excel se escribe la placa, no el identificador interno.
        const maquina = maquinas.find((m) => m.id === orden.equipo)
        return maquina ? maquina.placaNueva : String(orden.equipo ?? '')
      }),
    )

    const hojaOrdenes = xlsx.utils.aoa_to_sheet([ORDENES_DE_TRABAJO.columnas, ...filasOrdenes])
    hojaOrdenes['!cols'] = ORDENES_DE_TRABAJO.columnas.map((rotulo) => ({
      wch: Math.max(ANCHO_MINIMO, rotulo.length + 2),
    }))
    hojaOrdenes['!freeze'] = { xSplit: 0, ySplit: 1 }
    xlsx.utils.book_append_sheet(libro, hojaOrdenes, ORDENES_DE_TRABAJO.hoja)

    xlsx.utils.book_append_sheet(
      libro,
      hojaTabular(xlsx, FICHA_TECNICA, maquinas),
      FICHA_TECNICA.hoja,
    )

    xlsx.utils.book_append_sheet(libro, hojaResumen(xlsx, maquinas, usuario, ordenes), 'Resumen')

    const archivo = `catalogo-maquinaria-${sello()}.xlsx`
    xlsx.writeFile(libro, archivo)

    return { ok: true, archivo }
  } catch {
    return { ok: false, error: 'No se pudo generar el archivo de Excel.' }
  }
}

/** Hoja de portada con los conteos por estado y por ubicación. */
function hojaResumen(xlsx, maquinas, usuario, ordenes = []) {
  const contar = (campo) => {
    const conteo = new Map()
    for (const maquina of maquinas) {
      const valor = valorTabla(maquina, campo) || 'Sin dato'
      conteo.set(valor, (conteo.get(valor) ?? 0) + 1)
    }
    return [...conteo.entries()].sort((a, b) => b[1] - a[1])
  }

  const filas = [
    ['Catálogo técnico de maquinaria'],
    [],
    ['Generado', new Date().toLocaleString('es-CO')],
    ['Usuario', usuario ?? ''],
    ['Total de fichas', maquinas.length],
    ['Con fotografía', maquinas.filter((maquina) => maquina.imagen).length],
    ['Órdenes de trabajo', ordenes.length],
    [],
    ['Por estado', 'Fichas'],
    ...contar('estado'),
    [],
    ['Por ubicación', 'Fichas'],
    ...contar('ubicacion'),
  ]

  const hoja = xlsx.utils.aoa_to_sheet(filas)
  hoja['!cols'] = [{ wch: 34 }, { wch: 24 }]
  return hoja
}
