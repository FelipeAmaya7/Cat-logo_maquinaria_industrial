/**
 * Identidad institucional.
 *
 * El logo se extrae del propio libro de Excel (`npm run datos` lo escribe en
 * public/), de modo que la aplicación usa el archivo oficial y no una
 * reproducción aproximada. Centralizarlo aquí evita repetir la ruta en cada
 * componente y deja un único punto de cambio si la marca se actualiza.
 */

export const INSTITUCION = {
  nombre: 'Empaques & Cartones',
  subtitulo: 'Catálogo técnico de maquinaria industrial',
  dependencia: 'Departamento de Mantenimiento',
  proceso: 'Control de activos de planta',
}

/** Ruta pública del logo; BASE_URL la hace válida en desarrollo y en el build. */
export const RUTA_LOGO = `${import.meta.env.BASE_URL}logo-empaques-cartones.png`

/**
 * Presenta una fecha ISO (YYYY-MM-DD) con el formato del membrete original (M/D/AAAA).
 * Se parte la cadena en lugar de usar `new Date`, que desplazaría el día según
 * la zona horaria del navegador.
 *
 * @param {string|null} isoFecha
 * @returns {string} Fecha formateada, o cadena vacía si no hay dato.
 */
export function formatearFechaFormato(isoFecha) {
  if (!isoFecha) return ''

  const [anio, mes, dia] = isoFecha.split('-')
  if (!anio || !mes || !dia) return isoFecha

  return `${Number(mes)}/${Number(dia)}/${anio}`
}
