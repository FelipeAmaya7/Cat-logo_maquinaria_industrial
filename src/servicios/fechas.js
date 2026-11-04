/**
 * Fechas: un solo sitio donde se decide qué es una fecha y cómo se cuentan los
 * días.
 *
 * POR QUÉ EXISTE ESTE MÓDULO
 * --------------------------
 * `aFecha` estaba copiada palabra por palabra en cuatro archivos, y `diasHasta`
 * en dos — pero NO iguales: una comparaba instantes y la otra, días naturales.
 * El resultado era que el panel de alertas y la programación discrepaban sobre
 * la misma orden según la hora en que se mirara la aplicación: una orden
 * programada para hoy, abierta a las tres de la tarde, aparecía como «1 día sin
 * ejecutar» en alertas y correctamente en «hoy» en programación.
 *
 * La causa es que restar dos `Date` da milisegundos, y `new Date()` trae la hora
 * actual mientras que una fecha leída de un campo `date` viene a medianoche. Al
 * dividir por un día y redondear, esas horas de diferencia se convertían en un
 * día entero de más.
 *
 * Para contar días hay que llevar las dos fechas a medianoche ANTES de restar.
 * Esa es toda la corrección, y vive aquí para que no vuelva a divergir.
 */

/**
 * Fecha a partir de un campo ISO (`2026-11-03`), a medianoche local.
 *
 * Se recorta a diez caracteres y se le añade `T00:00:00` a propósito: sin la
 * hora, el navegador interpreta `2026-11-03` como UTC y en Colombia se va al
 * día anterior.
 *
 * @param {string|Date|null|undefined} valor
 * @returns {Date|null} null si el valor está vacío o no es una fecha válida.
 */
export function aFecha(valor) {
  if (!valor) return null

  const fecha = new Date(`${String(valor).slice(0, 10)}T00:00:00`)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

/** Medianoche del día indicado: para comparar días, no instantes. */
export const aMedianoche = (fecha) =>
  new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())

/**
 * Días naturales entre `hoy` y `fecha`; negativo si ya pasó.
 *
 * Normaliza las dos a medianoche, así que la hora a la que se consulte la
 * aplicación no cambia el resultado.
 */
export const diasHasta = (fecha, hoy) =>
  Math.round((aMedianoche(fecha) - aMedianoche(hoy)) / 86400000)

/** Fecha en la forma corta que usa toda la interfaz: «03 nov 2026». */
export const enFecha = (fecha) =>
  fecha
    ? fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
