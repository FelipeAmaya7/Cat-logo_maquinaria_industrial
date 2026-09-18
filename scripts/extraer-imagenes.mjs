/**
 * Extrae las imágenes incrustadas en el libro de Excel.
 *
 * Por qué hace falta un módulo aparte
 * -----------------------------------
 * Las fotografías NO viven en celdas: un .xlsx/.xlsm es un contenedor ZIP
 * (OpenXML) y las imágenes están en `xl/media/`. Ninguna lectura de celdas las
 * encuentra. Para saber a qué máquina pertenece cada archivo hay que seguir la
 * cadena de relaciones del paquete:
 *
 *   workbook.xml            nombre de la hoja        -> rId
 *   _rels/workbook.xml.rels rId                      -> worksheets/sheetN.xml
 *   worksheets/_rels/...    sheetN.xml               -> drawings/drawingM.xml
 *   drawings/_rels/...      drawingM.xml             -> media/imageK.png
 *
 * Dos detalles del archivo real que obligan a normalizar:
 *
 *   - El logo institucional está incrustado en TODAS las hojas, así que aparece
 *     como una imagen más. Se detecta por frecuencia: la imagen presente en casi
 *     todas las hojas es el logo, no una máquina.
 *   - Excel guarda algunas fotos con extensión `.tmp` y añade copias `.wdp`
 *     (JPEG XR) que ningún navegador muestra. El tipo real se deduce leyendo los
 *     bytes mágicos de cada archivo, no su extensión.
 */
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import sharp from 'sharp'

/**
 * Optimización de las fotografías.
 *
 * El Excel guarda las fotos a resolución de cámara (hasta 2,6 MB cada una), un
 * peso desproporcionado para una miniatura de 160 px y para una ficha que nunca
 * las muestra a más de ~700 px. Se reescalan a 1200 px de ancho —suficiente para
 * pantallas de alta densidad— y se convierten a WebP, que pesa mucho menos que
 * PNG a calidad equivalente y está soportado por todos los navegadores actuales.
 */
const OPTIMIZACION = {
  anchoMaximo: 1200,
  calidadWebp: 82,
  extension: 'webp',
}

/** Extensiones que produce este script; se limpian antes de regenerar. */
const EXTENSIONES_GENERADAS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.gif', '.bmp'])

/** Firmas binarias -> extensión real y si el navegador puede mostrarla. */
const FIRMAS = [
  { ext: 'png', web: true, bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: 'jpg', web: true, bytes: [0xff, 0xd8, 0xff] },
  { ext: 'gif', web: true, bytes: [0x47, 0x49, 0x46, 0x38] },
  { ext: 'bmp', web: true, bytes: [0x42, 0x4d] },
  { ext: 'tif', web: false, bytes: [0x49, 0x49, 0x2a, 0x00] },
  { ext: 'tif', web: false, bytes: [0x4d, 0x4d, 0x00, 0x2a] },
  { ext: 'wdp', web: false, bytes: [0x49, 0x49, 0xbc] },
]

/** Identifica el formato real por sus primeros bytes. */
function detectarFormato(buffer) {
  for (const firma of FIRMAS) {
    if (firma.bytes.every((byte, i) => buffer[i] === byte)) return firma
  }
  return null
}

/** Devuelve el contenido de una entrada del ZIP como Buffer. */
function contenido(libro, ruta) {
  const entrada = libro.files?.[ruta]
  if (!entrada) return null
  return Buffer.from(entrada.content)
}

/** Texto de una entrada XML del ZIP. */
const textoXml = (libro, ruta) => contenido(libro, ruta)?.toString('utf8') ?? ''

/** Extrae los pares Id -> Target de un archivo .rels. */
function leerRelaciones(xml) {
  const relaciones = new Map()
  for (const coincidencia of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const etiqueta = coincidencia[0]
    const id = /Id="([^"]+)"/.exec(etiqueta)?.[1]
    const destino = /Target="([^"]+)"/.exec(etiqueta)?.[1]
    if (id && destino) relaciones.set(id, destino)
  }
  return relaciones
}

/**
 * Reescala y convierte una fotografía a WebP.
 *
 * `rotate()` sin argumentos aplica la orientación EXIF de la cámara, que de otro
 * modo se perdería al reescribir el archivo y dejaría fotos acostadas.
 * `withoutEnlargement` evita ampliar las que ya son más pequeñas que el tope.
 *
 * @returns {Promise<Buffer|null>} Imagen optimizada, o null si sharp no pudo procesarla.
 */
async function optimizar(datos) {
  try {
    return await sharp(datos)
      .rotate()
      .resize({ width: OPTIMIZACION.anchoMaximo, withoutEnlargement: true })
      .webp({ quality: OPTIMIZACION.calidadWebp })
      .toBuffer()
  } catch {
    return null
  }
}

/** Borra las imágenes de una ejecución anterior para no dejar archivos huérfanos. */
function limpiarCarpeta(carpeta) {
  let borrados = 0

  for (const archivo of readdirSync(carpeta)) {
    if (!EXTENSIONES_GENERADAS.has(extname(archivo).toLowerCase())) continue
    unlinkSync(resolve(carpeta, archivo))
    borrados += 1
  }

  return borrados
}

/** Presenta un tamaño en bytes de forma legible. */
const enMB = (bytes) => (bytes / 1024 / 1024).toFixed(1) + ' MB'

/** Normaliza rutas relativas del paquete (../media/x.png -> xl/media/x.png). */
const rutaPaquete = (destino) => 'xl/' + destino.replace(/^\.\.\//, '')

/**
 * Construye el mapa { nombreDeHoja -> [rutas de imagen] } siguiendo las relaciones.
 */
function mapearImagenesPorHoja(libro) {
  const relacionesLibro = leerRelaciones(textoXml(libro, 'xl/_rels/workbook.xml.rels'))
  const workbook = textoXml(libro, 'xl/workbook.xml')
  const porHoja = new Map()

  for (const coincidencia of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const etiqueta = coincidencia[0]
    const nombre = /name="([^"]+)"/.exec(etiqueta)?.[1]
    const rId = /r:id="([^"]+)"/.exec(etiqueta)?.[1]
    if (!nombre || !rId) continue

    const destinoHoja = relacionesLibro.get(rId)
    if (!destinoHoja) continue

    // worksheets/sheet3.xml -> xl/worksheets/_rels/sheet3.xml.rels
    const archivoHoja = destinoHoja.split('/').pop()
    const relsHoja = leerRelaciones(
      textoXml(libro, `xl/worksheets/_rels/${archivoHoja}.rels`),
    )

    const imagenes = []
    for (const destino of relsHoja.values()) {
      if (!destino.includes('drawings/')) continue

      const archivoDibujo = destino.split('/').pop()
      const relsDibujo = leerRelaciones(
        textoXml(libro, `xl/drawings/_rels/${archivoDibujo}.rels`),
      )

      for (const destinoImagen of relsDibujo.values()) {
        if (destinoImagen.includes('/media/')) imagenes.push(rutaPaquete(destinoImagen))
      }
    }

    porHoja.set(nombre, imagenes)
  }

  return porHoja
}

/**
 * Extrae el logo institucional y las fotografías de cada máquina.
 *
 * @param {Object} libro            Libro leído con xlsx.read(..., { bookFiles: true }).
 * @param {Map<string,string>} nombrePorHoja  Hoja -> nombre base del archivo (la placa).
 * @param {Object} opciones
 * @param {string} opciones.carpetaMaquinas   Destino de las fotografías.
 * @param {string} opciones.archivoLogo       Destino del logo institucional.
 * @param {boolean} [opciones.escribir=true]  En false solo calcula el mapeo (modo diagnóstico).
 * @returns {{ imagenPorHoja: Map<string,string>, logo: string|null, informe: string[] }}
 */
export async function extraerImagenes(
  libro,
  nombrePorHoja,
  { carpetaMaquinas, archivoLogo, escribir = true },
) {
  const porHoja = mapearImagenesPorHoja(libro)
  const informe = []

  // El logo está incrustado en casi todas las hojas; las fotos, en una sola.
  const frecuencia = new Map()
  for (const imagenes of porHoja.values()) {
    for (const ruta of new Set(imagenes)) frecuencia.set(ruta, (frecuencia.get(ruta) ?? 0) + 1)
  }

  const umbralLogo = Math.max(2, porHoja.size * 0.5)
  const rutasLogo = new Set(
    [...frecuencia.entries()].filter(([, veces]) => veces >= umbralLogo).map(([ruta]) => ruta),
  )

  if (escribir) {
    mkdirSync(carpetaMaquinas, { recursive: true })
    const borrados = limpiarCarpeta(carpetaMaquinas)
    if (borrados) informe.push(`Imágenes previas eliminadas: ${borrados}`)
  }

  // 1. Logo institucional
  let logo = null
  const rutaLogo = [...rutasLogo][0]
  if (rutaLogo) {
    const datos = contenido(libro, rutaLogo)
    const formato = datos && detectarFormato(datos)
    if (formato?.web) {
      const destino = `${archivoLogo}.${formato.ext}`
      if (escribir) writeFileSync(destino, datos)
      logo = destino
      informe.push(`Logo institucional: ${rutaLogo} -> ${destino.split(/[\\/]/).pop()}`)
    }
  } else {
    informe.push('Aviso: no se identificó un logo común a las hojas.')
  }

  // 2. Fotografías de máquinas
  const imagenPorHoja = new Map()
  const sinFoto = []
  const descartadas = []
  let bytesOriginales = 0
  let bytesFinales = 0

  for (const [hoja, rutas] of porHoja) {
    const nombreBase = nombrePorHoja.get(hoja)
    if (!nombreBase) continue // hoja que no produjo ficha (índice, vacías)

    const candidatas = rutas.filter((ruta) => !rutasLogo.has(ruta))

    // Se queda con la primera candidata que el navegador sepa mostrar.
    let elegida = null
    for (const ruta of candidatas) {
      const datos = contenido(libro, ruta)
      const formato = datos && detectarFormato(datos)

      if (!formato) {
        descartadas.push(`${hoja}: ${ruta} (formato desconocido)`)
        continue
      }
      if (!formato.web) {
        // Los .wdp son copias JPEG XR que Excel deja junto al PNG real.
        descartadas.push(`${hoja}: ${ruta} (${formato.ext} no se muestra en navegador)`)
        continue
      }

      elegida = { datos, formato }
      break
    }

    if (!elegida) {
      sinFoto.push(hoja)
      continue
    }

    // Se intenta optimizar; si sharp no puede con el archivo, se guarda el original.
    const optimizada = await optimizar(elegida.datos)
    const datosFinales = optimizada ?? elegida.datos
    const extension = optimizada ? OPTIMIZACION.extension : elegida.formato.ext

    if (!optimizada) {
      descartadas.push(`${hoja}: no se pudo optimizar, se conserva el original`)
    }

    bytesOriginales += elegida.datos.length
    bytesFinales += datosFinales.length

    const nombreArchivo = `${nombreBase}.${extension}`
    if (escribir) writeFileSync(resolve(carpetaMaquinas, nombreArchivo), datosFinales)
    imagenPorHoja.set(hoja, nombreArchivo)
  }

  informe.push(`Fotografías escritas : ${imagenPorHoja.size}`)
  if (bytesOriginales) {
    const ahorro = Math.round((1 - bytesFinales / bytesOriginales) * 100)
    informe.push(
      `Peso  ${enMB(bytesOriginales)} -> ${enMB(bytesFinales)} (${ahorro}% menos, ` +
        `WebP q${OPTIMIZACION.calidadWebp}, ancho máx. ${OPTIMIZACION.anchoMaximo}px)`,
    )
  }
  informe.push(`Fichas sin fotografía: ${sinFoto.length}`)
  if (sinFoto.length) informe.push(`  ${sinFoto.join(', ')}`)
  if (descartadas.length) {
    informe.push(`Archivos descartados (${descartadas.length}):`)
    descartadas.forEach((d) => informe.push(`  - ${d}`))
  }

  return { imagenPorHoja, logo, informe }
}
