/**
 * Recorte de las capturas de pantalla del libro de planta.
 *
 * EL PROBLEMA
 * -----------
 * Las fotografías incrustadas en el Excel no son fotos: son capturas del
 * Explorador de Windows con la imagen abierta en el panel de vista previa. La
 * máquina ocupa apenas la mitad derecha; el resto es la ventana, el árbol de
 * carpetas y el listado de archivos. Puesta en una tarjeta, se ve el listado y
 * no el equipo.
 *
 * CÓMO SE DETECTA
 * ---------------
 * No sirve un recorte fijo: las capturas tienen tamaños distintos y la ventana
 * no siempre está igual. Tampoco sirve buscar color, porque la interfaz tiene
 * iconos de colores.
 *
 * Lo que sí distingue a una de otra es el FONDO: la interfaz es en su mayoría
 * blanco liso, y una fotografía casi no tiene píxeles blancos planos. Midiendo
 * qué proporción de cada fila y de cada columna es «blanco de interfaz», el
 * panel de la foto aparece como un valle muy marcado — en las capturas reales,
 * 0,10 frente a 0,85 del resto.
 *
 * Es una heurística, así que sólo recorta cuando el resultado es creíble: un
 * rectángulo ni diminuto ni casi igual al original. Ante la duda deja la imagen
 * intacta, que es el error barato.
 */

/** Umbral de «blanco de interfaz» por franja: por debajo, es fotografía. */
const UMBRAL = 0.35

/** Umbral permisivo para extender el tramo ya sembrado (ver `valle`). */
const UMBRAL_EXTENSION = 0.62

/**
 * Proporción del área original admisible para dar el recorte por bueno.
 *
 * El tope alto no es arbitrario: algunas capturas son del Visor de fotos, donde
 * la imagen ocupa casi todo y solo sobran dos barras finas. Esas deben
 * recortarse. Una fotografía de verdad, en cambio, da un valle que abarca el
 * 100% y se descarta sola.
 */
const AREA_MINIMA = 0.06
const AREA_MAXIMA = 0.93

/** Lado mínimo en píxeles: por debajo no merece la pena recortar. */
const LADO_MINIMO = 120

/**
 * Localiza el rectángulo de la fotografía dentro de una captura.
 *
 * @param {Buffer} datos  Píxeles en crudo.
 * @param {{width: number, height: number, channels: number}} info
 * @returns {{left: number, top: number, width: number, height: number}|null}
 *          La región, o null si no se reconoce una captura.
 */
export function detectarFotografia(datos, { width: an, height: al, channels: ca }) {
  /** Claro y sin color: el blanco de las ventanas y los listados. */
  const esInterfaz = (x, y) => {
    const i = (y * an + x) * ca
    const r = datos[i]
    const v = datos[i + 1]
    const b = datos[i + 2]
    return Math.min(r, v, b) > 225 && Math.max(r, v, b) - Math.min(r, v, b) < 14
  }

  /** Proporción de interfaz en cada franja, muestreando una de cada tres. */
  const perfil = (largo, otro, enPosicion) => {
    const proporciones = []

    for (let i = 0; i < largo; i += 1) {
      let interfaz = 0
      let total = 0
      for (let j = 0; j < otro; j += 3) {
        total += 1
        if (enPosicion(i, j)) interfaz += 1
      }
      proporciones.push(interfaz / total)
    }

    return proporciones
  }

  /**
   * Tramo de fotografía, con dos umbrales.
   *
   * Con uno solo, cualquier zona clara DENTRO de la foto —una pared blanca, el
   * reflejo de una lámpara— levantaba la proporción por encima del umbral y
   * partía el valle en dos, de modo que el recorte se quedaba con la mitad de
   * la máquina. Así que el tramo se SIEMBRA donde la señal es inequívoca y se
   * EXTIENDE hacia los lados mientras siga sin parecer interfaz.
   */
  const valle = (proporciones) => {
    let semilla = null
    let inicio = null

    proporciones.forEach((valor, i) => {
      if (valor < UMBRAL) {
        inicio = inicio ?? i
        return
      }
      if (inicio !== null) {
        if (!semilla || i - inicio > semilla[1] - semilla[0] + 1) semilla = [inicio, i - 1]
        inicio = null
      }
    })

    if (inicio !== null && (!semilla || proporciones.length - inicio > semilla[1] - semilla[0] + 1)) {
      semilla = [inicio, proporciones.length - 1]
    }

    if (!semilla) return null

    let [desde, hasta] = semilla
    while (desde > 0 && proporciones[desde - 1] < UMBRAL_EXTENSION) desde -= 1
    while (hasta < proporciones.length - 1 && proporciones[hasta + 1] < UMBRAL_EXTENSION) hasta += 1

    return [desde, hasta]
  }

  // En DOS pasos, y el orden importa. Midiendo las filas sobre el ancho
  // completo, la mitad izquierda —árbol de carpetas y listado— mantiene la
  // proporción de blanco siempre por encima del umbral y no aparece ningún
  // valle. Primero se acota la banda horizontal de la fotografía y después se
  // miden las filas SOLO dentro de esa banda.
  const horizontal = valle(perfil(an, al, (x, y) => esInterfaz(x, y)))
  if (!horizontal) return null

  const [x0, x1] = horizontal
  const vertical = valle(
    perfil(al, x1 - x0 + 1, (y, j) => esInterfaz(x0 + j, y)),
  )
  if (!vertical) return null

  const region = {
    left: x0,
    top: vertical[0],
    width: x1 - x0 + 1,
    height: vertical[1] - vertical[0] + 1,
  }

  const proporcionArea = (region.width * region.height) / (an * al)
  const creible =
    proporcionArea >= AREA_MINIMA &&
    proporcionArea <= AREA_MAXIMA &&
    region.width >= LADO_MINIMO &&
    region.height >= LADO_MINIMO

  return creible ? region : null
}

/**
 * Devuelve la fotografía recortada, o la imagen tal cual si no era una captura.
 *
 * @param {Object} sharp  La librería, inyectada para no duplicar dependencias.
 * @param {Buffer} entrada
 * @returns {Promise<{datos: Buffer, recortada: boolean}>}
 */
export async function recortarCaptura(sharp, entrada) {
  const { data, info } = await sharp(entrada).raw().toBuffer({ resolveWithObject: true })
  const region = detectarFotografia(data, info)

  if (!region) return { datos: entrada, recortada: false }

  return { datos: await sharp(entrada).extract(region).toBuffer(), recortada: true }
}
