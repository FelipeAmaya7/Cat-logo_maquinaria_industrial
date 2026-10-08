/**
 * Historial de repuestos: definición de campos.
 *
 * POR QUÉ NO ES UN CAMPO DE LA FICHA
 * ----------------------------------
 * La ficha técnica guarda UN valor por campo, y cada campo es una columna del
 * libro de Excel. Un historial es lo contrario: MUCHAS entradas por máquina, que
 * crecen con el tiempo. Meterlo en la ficha obligaría a acumular todo en un
 * campo de texto, donde no se puede ordenar por fecha, sumar costos ni saber
 * cuántas veces se cambió un rodamiento.
 *
 * Por eso vive aparte, con la misma forma que las órdenes de trabajo: su propia
 * colección por usuario, su formulario y su hoja en el libro exportado.
 *
 * Cada entrada queda atada a una máquina por `idMaquina`, no a una orden de
 * trabajo: en planta se cambia un repuesto sin abrir siempre una orden, y el
 * historial no debe depender de que alguien se acuerde de hacerlo.
 */

/**
 * Campos de una entrada del historial, en el orden del formulario.
 *
 * `tipo` describe el control:
 *   'fecha'  → selector de fecha
 *   'numero' → entrada numérica
 *   'area'   → bloque de varias líneas
 *   'texto'  → línea simple (por defecto)
 */
export const CAMPOS_REPUESTO = [
  { campo: 'fecha', rotulo: 'Fecha', tipo: 'fecha', requerido: true },
  {
    campo: 'repuesto',
    rotulo: 'Repuesto',
    requerido: true,
    ph: 'Ej. Rodamiento SKF 6205-2RS',
  },
  { campo: 'referencia', rotulo: 'Referencia / N° de parte', ph: 'Ej. 6205-2RSH' },
  { campo: 'cantidad', rotulo: 'Cantidad', tipo: 'numero', ph: '1' },
  { campo: 'costoUnitario', rotulo: 'Costo unitario', tipo: 'numero', ph: '0' },
  { campo: 'proveedor', rotulo: 'Proveedor', ph: 'Ej. Rodamientos del Valle' },
  { campo: 'instaladoPor', rotulo: 'Instalado por', ph: 'Nombre del técnico' },
  {
    campo: 'ordenTrabajo',
    rotulo: 'N° de orden asociada',
    ph: 'Opcional, si hubo orden de trabajo',
  },
  {
    campo: 'motivo',
    rotulo: 'Motivo del cambio',
    tipo: 'area',
    ph: 'Ej. Desgaste por horas de servicio; ruido en el eje de salida.',
  },
]

/** Columnas de la hoja de Excel: el equipo primero, que es lo que agrupa. */
export const COLUMNAS_REPUESTO = [
  ['idMaquina', 'Equipo'],
  ...CAMPOS_REPUESTO.map(({ campo, rotulo }) => [campo, rotulo]),
]

/** Campos que la tabla muestra sin desplegar la fila. */
export const COLUMNAS_VISIBLES_REPUESTO = ['fecha', 'repuesto', 'cantidad', 'instaladoPor']

/**
 * Entrada en blanco para una máquina, con la fecha de hoy.
 *
 * `ref` es un identificador interno y estable. No se usa la fecha ni el nombre
 * del repuesto como clave porque ambos se repiten: la misma pieza se cambia
 * varias veces, y dos cambios pueden caer el mismo día.
 *
 * @param {string} idMaquina
 */
export function repuestoEnBlanco(idMaquina) {
  const valores = Object.fromEntries(CAMPOS_REPUESTO.map(({ campo }) => [campo, '']))

  return {
    ...valores,
    ref: `rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    idMaquina,
    fecha: new Date().toISOString().slice(0, 10),
    cantidad: '1',
  }
}

/** Entradas de una máquina, de la más reciente a la más antigua. */
export function repuestosDeMaquina(repuestos, idMaquina) {
  return repuestos
    .filter((entrada) => entrada.idMaquina === idMaquina)
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
}

/**
 * Costo total de una lista de entradas.
 * Ignora lo que no sea un número para que una entrada a medio diligenciar no
 * convierta el total en NaN.
 */
export function costoTotal(entradas) {
  return entradas.reduce((suma, entrada) => {
    const cantidad = Number(entrada.cantidad)
    const costo = Number(entrada.costoUnitario)
    if (!Number.isFinite(costo)) return suma

    return suma + costo * (Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 1)
  }, 0)
}
