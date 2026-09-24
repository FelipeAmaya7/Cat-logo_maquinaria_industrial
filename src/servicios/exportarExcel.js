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
 * El catálogo completo, en cambio, se exporta como TABLA (una fila por máquina),
 * que es lo útil para revisar o imprimir un inventario. Ese formato NO se puede
 * volver a subir: el lector ancla a rótulos, que en una tabla quedan arriba de
 * los valores y no a su izquierda.
 */
import { MAPA_CAMPOS, SIN_DATO } from './anclajeRotulos'

/**
 * Carga `xlsx` BAJO DEMANDA, igual que el lector.
 * Mantiene la librería fuera del paquete principal: quien nunca exporta ni sube
 * un archivo no la descarga.
 */
const cargarXlsx = () => import('xlsx')

/** Campos del modelo, en el orden en que se escriben en la hoja. */
const CAMPOS = Object.entries(MAPA_CAMPOS)

/** Valor listo para la celda: nunca `undefined`, que Excel escribiría vacío. */
const valorCelda = (maquina, campo) => {
  const valor = maquina[campo]
  return valor === null || valor === undefined || valor === '' ? SIN_DATO : String(valor)
}

/** Quita de un nombre de archivo lo que los sistemas de ficheros no admiten. */
const nombreSeguro = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'ficha'

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
  try {
    const xlsx = await cargarXlsx()

    const filas = [
      ['FICHA TÉCNICA DE MAQUINARIA'],
      [],
      ...CAMPOS.map(([campo, rotulo]) => [rotulo, valorCelda(maquina, campo)]),
    ]

    const hoja = xlsx.utils.aoa_to_sheet(filas)
    hoja['!cols'] = [{ wch: 26 }, { wch: 52 }]

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

/**
 * Descarga el catálogo completo del usuario como tabla .xlsx.
 *
 * @param {Object[]} maquinas Catálogo ya con las ediciones aplicadas.
 * @returns {Promise<{ok: boolean, error?: string, archivo?: string}>}
 */
export async function descargarCatalogoExcel(maquinas) {
  if (!maquinas || maquinas.length === 0) {
    return { ok: false, error: 'No hay fichas que exportar.' }
  }

  try {
    const xlsx = await cargarXlsx()

    const encabezado = ['ID', ...CAMPOS.map(([, rotulo]) => rotulo)]
    const cuerpo = maquinas.map((maquina) => [
      maquina.id,
      ...CAMPOS.map(([campo]) => valorCelda(maquina, campo)),
    ])

    const hoja = xlsx.utils.aoa_to_sheet([encabezado, ...cuerpo])
    hoja['!cols'] = encabezado.map((titulo) => ({ wch: Math.max(14, titulo.length + 2) }))
    // Deja fija la fila de títulos al desplazarse por el inventario.
    hoja['!freeze'] = { xSplit: 0, ySplit: 1 }

    const libro = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(libro, hoja, 'Catálogo')

    const archivo = `catalogo-maquinaria-${new Date().toISOString().slice(0, 10)}.xlsx`
    xlsx.writeFile(libro, archivo)

    return { ok: true, archivo }
  } catch {
    return { ok: false, error: 'No se pudo generar el archivo de Excel.' }
  }
}
