/**
 * Identidad del sistema.
 *
 * Deliberadamente NEUTRA: no hay logo ni nombre de empresa. El encabezado se
 * arma con un ícono técnico genérico (`IconoSistema`) y con estos textos, de
 * modo que la aplicación pueda publicarse sin exponer la marca de ninguna
 * organización. Centralizarlos aquí deja un único punto de cambio.
 */

export const INSTITUCION = {
  titulo: 'SISTEMA DE GESTIÓN Y FICHAS TÉCNICAS',
  subtitulo: 'Control y registro de maquinaria y equipos',
  dependencia: 'Departamento de Mantenimiento',
  proceso: 'Control y registro de activos',
}

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
