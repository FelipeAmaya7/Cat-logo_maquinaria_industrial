/**
 * Conversión de una fotografía elegida por la persona a un dato almacenable.
 *
 * Por qué no se guarda el archivo tal cual
 * ----------------------------------------
 * Una foto de teléfono pesa varios MB, y localStorage admite unos 5 MB EN TOTAL
 * por origen. Guardar el Base64 crudo llenaría la cuota con dos o tres fichas y
 * las escrituras siguientes fallarían.
 *
 * Por eso la imagen pasa antes por un lienzo (canvas): se reescala a 1200 px de
 * ancho y se exporta como WebP con calidad 0,82 — los mismos parámetros que usa
 * `sharp` en la extracción del Excel, para que ambas vías produzcan fotografías
 * comparables.
 */

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const ANCHO_MAXIMO = 1200
const CALIDAD = 0.82
const TAMANO_MAXIMO_MB = 12

/** Comprueba que el archivo sea una imagen admitida. */
export function esImagenAdmitida(archivo) {
  return Boolean(archivo) && TIPOS_IMAGEN.includes(archivo.type)
}

/** Carga un File en un elemento de imagen, a través de una URL temporal. */
function cargarImagen(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()

    lector.onerror = () => rechazar(new Error('No se pudo leer la imagen.'))
    lector.onload = () => {
      const imagen = new Image()
      imagen.onload = () => resolver(imagen)
      imagen.onerror = () => rechazar(new Error('El archivo no es una imagen válida.'))
      imagen.src = lector.result
    }

    // readAsDataURL entrega directamente un origen utilizable por <img>.
    lector.readAsDataURL(archivo)
  })
}

/**
 * Convierte una imagen elegida por la persona en un data URL optimizado.
 *
 * @param {File} archivo
 * @returns {Promise<{ok: boolean, error?: string, imagen?: string}>}
 *          `imagen` es un data URL listo para el atributo src.
 */
export async function prepararFotografia(archivo) {
  if (!esImagenAdmitida(archivo)) {
    return { ok: false, error: 'Use una imagen JPG, PNG, WebP o GIF.' }
  }

  if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
    return { ok: false, error: `La imagen supera los ${TAMANO_MAXIMO_MB} MB.` }
  }

  let imagen
  try {
    imagen = await cargarImagen(archivo)
  } catch (fallo) {
    return { ok: false, error: fallo.message }
  }

  // No se amplía: ampliar solo agrega peso sin agregar detalle.
  const escala = Math.min(1, ANCHO_MAXIMO / imagen.naturalWidth)
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(imagen.naturalWidth * escala)
  lienzo.height = Math.round(imagen.naturalHeight * escala)

  const contexto = lienzo.getContext('2d')
  if (!contexto) return { ok: false, error: 'Este navegador no permite procesar la imagen.' }

  contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)

  // Si el navegador no soporta WebP, toDataURL devuelve PNG y el src sigue siendo válido.
  const datos = lienzo.toDataURL('image/webp', CALIDAD)

  return { ok: true, imagen: datos }
}
