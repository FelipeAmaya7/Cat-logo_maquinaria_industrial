/**
 * Programación del mantenimiento: qué toca y cuándo.
 *
 * Módulo PURO. La lista de órdenes ya existe y se puede filtrar por estado,
 * pero una tabla ordenada por número no responde a la única pregunta que se
 * hace alguien al llegar a planta: «¿qué tengo que hacer hoy?». Esta vista
 * agrupa lo pendiente por cercanía en el tiempo, que es como se prioriza el
 * trabajo de verdad.
 *
 * Solo entra lo NO ejecutado: lo ya hecho pertenece a la hoja de vida del
 * equipo, no a la agenda.
 */

import { aFecha, diasHasta } from './fechas'

// Se reexporta porque forma parte de la respuesta de este módulo: quien
// consulta la programación cuenta días con el mismo criterio que ella.
export { diasHasta }

/** Ventanas de tiempo, de la más urgente a la más lejana. */
export const VENTANAS = [
  {
    clave: 'vencidas',
    titulo: 'Vencidas',
    descripcion: 'La fecha programada ya pasó y la orden sigue abierta.',
    gravedad: 'alta',
  },
  {
    clave: 'hoy',
    titulo: 'Hoy',
    descripcion: 'Programadas para la fecha de hoy.',
    gravedad: 'alta',
  },
  {
    clave: 'semana',
    titulo: 'Próximos 7 días',
    descripcion: 'Entran en la semana en curso.',
    gravedad: 'media',
  },
  {
    clave: 'mes',
    titulo: 'Próximos 30 días',
    descripcion: 'Hay tiempo para conseguir repuestos y coordinar el paro.',
    gravedad: 'baja',
  },
  {
    clave: 'despues',
    titulo: 'Más adelante',
    descripcion: 'A más de 30 días.',
    gravedad: 'baja',
  },
  {
    clave: 'sinFecha',
    titulo: 'Sin fecha programada',
    descripcion: 'No se pueden planificar hasta que tengan fecha.',
    gravedad: 'media',
  },
]

/** En qué ventana cae una orden, según los días que falten. */
function ventanaDe(dias) {
  if (dias === null) return 'sinFecha'
  if (dias < 0) return 'vencidas'
  if (dias === 0) return 'hoy'
  if (dias <= 7) return 'semana'
  if (dias <= 30) return 'mes'
  return 'despues'
}

/**
 * Agrupa las órdenes pendientes en las ventanas de tiempo.
 *
 * Cada orden sale enriquecida con su máquina y con los días que faltan, para
 * que la vista no tenga que volver a cruzar las dos listas.
 *
 * @param {Object[]} ordenes
 * @param {Object[]} maquinas
 * @param {Date} [hoy]
 * @returns {{grupos: Array, pendientes: number, vencidas: number}}
 */
export function agruparProgramacion(ordenes, maquinas, hoy = new Date()) {
  const porId = new Map(maquinas.map((maquina) => [maquina.id, maquina]))
  const porVentana = new Map(VENTANAS.map(({ clave }) => [clave, []]))

  for (const orden of ordenes) {
    if (orden.estado === 'Ejecutada') continue

    const fecha = aFecha(orden.fecha)
    const dias = fecha ? diasHasta(fecha, hoy) : null

    porVentana.get(ventanaDe(dias)).push({
      ...orden,
      fechaProgramada: fecha,
      dias,
      maquina: porId.get(orden.equipo) ?? null,
    })
  }

  // Dentro de cada ventana, lo más próximo primero; a igualdad de fecha, la
  // prioridad más alta, que es el único desempate que significa algo en planta.
  const ordenPrioridad = { Alta: 0, Media: 1, Baja: 2 }
  for (const lista of porVentana.values()) {
    lista.sort(
      (a, b) =>
        (a.dias ?? Infinity) - (b.dias ?? Infinity) ||
        (ordenPrioridad[a.prioridad] ?? 9) - (ordenPrioridad[b.prioridad] ?? 9),
    )
  }

  const grupos = VENTANAS.map((ventana) => ({
    ...ventana,
    ordenes: porVentana.get(ventana.clave),
  }))

  return {
    grupos,
    pendientes: grupos.reduce((total, grupo) => total + grupo.ordenes.length, 0),
    vencidas: porVentana.get('vencidas').length,
  }
}

/** Texto del plazo de una orden, ya en lenguaje de planta. */
export function plazoDe(dias) {
  if (dias === null || dias === undefined) return 'Sin fecha'
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias === -1) return 'Venció ayer'
  if (dias < 0) return `Venció hace ${Math.abs(dias)} días`
  return `En ${dias} días`
}
