/**
 * Indicadores de confiabilidad, según ISO 14224.
 *
 * Módulo PURO: no toca React ni el almacenamiento. Recibe máquinas y órdenes y
 * devuelve números, así que se puede verificar con pruebas sin montar nada.
 *
 * DE DÓNDE SALEN LOS DATOS
 * ------------------------
 * Todo se calcula a partir de las órdenes EJECUTADAS y su duración. No hay
 * ningún valor que alguien teclee: si una orden no está ejecutada o no tiene
 * duración, no entra. Esa es la diferencia entre un indicador y un adorno.
 *
 * HONESTIDAD SOBRE LA COBERTURA
 * -----------------------------
 * Una máquina solo se puede calcular si tiene historia de mantenimiento. Sin
 * ella no hay periodo contra el que medir, y el resultado se inventaría. Por
 * eso `calcularIndicadores` informa de cuántas máquinas quedaron fuera: es
 * preferible decir «10 de 12» a promediar sobre datos que no existen.
 */

import { aFecha } from './fechas'
// El marcador de «campo sin diligenciar» se define en un solo sitio: si el
// extractor algún día cambia de marca, no hay que buscarlo por el proyecto.
import { SIN_DATO } from './calidadDatos'

/** Número a partir de un campo que puede venir vacío o con el marcador. */
function aNumero(valor) {
  if (valor === null || valor === undefined) return null

  const texto = String(valor).trim().replace(',', '.')
  if (!texto || texto === SIN_DATO) return null

  const numero = Number(texto)
  return Number.isFinite(numero) ? numero : null
}

/** Las órdenes que cuentan: ejecutadas y con duración registrada. */
const esComputable = (orden) =>
  orden.estado === 'Ejecutada' && aNumero(orden.duracion) !== null

/** Una orden correctiva es una falla; las demás son mantenimiento planeado. */
const esCorrectiva = (orden) => orden.mantenimiento === 'Correctivo'

/** Fecha en que ocurrió la intervención: la de ejecución, o la programada. */
const fechaDeOrden = (orden) => aFecha(orden.fechaEjecucion) ?? aFecha(orden.fecha)

/**
 * Comienzo del PERIODO OBSERVADO: la primera orden con fecha de esa máquina.
 *
 * Antes se tomaba el año de instalación o de compra de la ficha, y producía
 * indicadores sin sentido: una máquina comprada en 1990 con una sola falla
 * registrada daba un MTBF de seis millones de horas, porque se medía un
 * periodo de treinta y cinco años contra una historia de dos semanas.
 *
 * El periodo tiene que ser aquel del que REALMENTE hay registro, y eso empieza
 * en la primera orden. Es el «periodo de observación» del que habla ISO 14224.
 *
 * Como efecto secundario, una máquina sin órdenes deja de ser medible, y eso
 * también es lo correcto: antes aparecía en la matriz con 100 % de
 * disponibilidad por el solo hecho de no tener historia.
 *
 * @returns {Date|null} null cuando la máquina no tiene ninguna orden fechada.
 */
export function inicioDeObservacion(ordenesDeLaMaquina) {
  const fechas = ordenesDeLaMaquina.map(fechaDeOrden).filter(Boolean)
  return fechas.length ? new Date(Math.min(...fechas.map((f) => f.getTime()))) : null
}

/**
 * Indicadores de una sola máquina.
 *
 * @param {Object} maquina
 * @param {Object[]} ordenesDeLaMaquina
 * @param {Date} [hasta] Fin del periodo; por defecto, hoy.
 * @returns {Object|null} null si no hay datos suficientes.
 */
export function indicadoresDeMaquina(maquina, ordenesDeLaMaquina, hasta = new Date()) {
  const desde = inicioDeObservacion(ordenesDeLaMaquina)
  if (!desde || desde >= hasta) return null

  const computables = ordenesDeLaMaquina.filter(esComputable)
  const correctivas = computables.filter(esCorrectiva)

  const horas = (lista) => lista.reduce((total, orden) => total + aNumero(orden.duracion), 0)

  // Periodo: horas naturales transcurridas. Se asume que la máquina estuvo
  // disponible todo ese tiempo salvo cuando estuvo en mantenimiento, que es el
  // supuesto habitual cuando no se registran paradas de producción.
  const periodo = ((hasta - desde) / 1000 / 3600) || 0
  const mt = horas(computables)
  const rt = horas(correctivas)
  const tto = Math.max(periodo - mt, 0)
  const n = correctivas.length

  return {
    id: maquina.id,
    descripcion: maquina.descripcion,
    desde,
    periodo,
    /** Tiempo de mantenimiento: todas las órdenes ejecutadas. */
    mt,
    /** Tiempo de reparación: solo las correctivas. */
    rt,
    /** Tiempo total de operación. */
    tto,
    /** Número de fallas, es decir, de órdenes correctivas. */
    n,
    /** Disponibilidad. */
    a: periodo > 0 ? tto / periodo : null,
    /** Tiempo medio entre fallas. */
    mtbf: n > 0 ? tto / n : null,
    /** Tiempo medio de reparación. */
    mttr: n > 0 ? rt / n : null,
    /** Tiempo medio hasta la falla: tramos operados entre intervenciones. */
    mttf: n > 0 ? tto / (n + 1) : null,
  }
}

/**
 * Indicadores del conjunto, más la matriz por máquina.
 *
 * Los totales NO son el promedio de los promedios: se recalculan sumando los
 * tiempos y las fallas de todas las máquinas. Promediar MTTR entre equipos daría
 * el mismo peso a uno con veinte fallas que a otro con una.
 *
 * @param {Object[]} maquinas
 * @param {Object[]} ordenes
 * @param {Date} [hasta]
 */
export function calcularIndicadores(maquinas, ordenes, hasta = new Date()) {
  const porMaquina = new Map()
  for (const orden of ordenes) {
    if (!porMaquina.has(orden.equipo)) porMaquina.set(orden.equipo, [])
    porMaquina.get(orden.equipo).push(orden)
  }

  const matriz = maquinas
    .map((maquina) => indicadoresDeMaquina(maquina, porMaquina.get(maquina.id) ?? [], hasta))
    .filter(Boolean)

  const suma = (campo) => matriz.reduce((total, fila) => total + fila[campo], 0)

  const periodo = suma('periodo')
  const mt = suma('mt')
  const rt = suma('rt')
  const tto = suma('tto')
  const n = suma('n')

  return {
    matriz,
    /** Cuántas entraron y cuántas había: la cobertura real del cálculo. */
    cubiertas: matriz.length,
    total: maquinas.length,
    totales: {
      periodo,
      mt,
      rt,
      tto,
      n,
      a: periodo > 0 ? tto / periodo : null,
      mtbf: n > 0 ? tto / n : null,
      mttr: n > 0 ? rt / n : null,
      mttf: n > 0 ? tto / (n + 1) : null,
    },
  }
}

/**
 * Presenta horas con separador de miles.
 *
 * Por debajo de cien horas conserva un decimal: un MTTR de 3,5 h redondeado a
 * 4 h pierde justo la precisión que hace útil al indicador. Por encima, el
 * decimal es ruido.
 */
export const formatearHoras = (valor) => {
  if (valor === null || valor === undefined) return '—'

  const decimales = Math.abs(valor) < 100 ? 1 : 0
  return `${valor.toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })} h`
}

/** Presenta una proporción como porcentaje. */
export const formatearPorcentaje = (valor) =>
  valor === null || valor === undefined ? '—' : `${(valor * 100).toFixed(1)}%`

/**
 * Definición de cada indicador: sigla, nombre y fórmula.
 * Una sola fuente para las tarjetas, la matriz y el panel de fórmulas.
 */
export const DEFINICIONES = [
  { clave: 'a', sigla: 'A', nombre: 'Disponibilidad', formula: 'TTO / Periodo', formato: 'porcentaje' },
  { clave: 'mttr', sigla: 'MTTR', nombre: 'Tiempo medio de reparación', formula: 'RT / N', formato: 'horas' },
  { clave: 'mtbf', sigla: 'MTBF', nombre: 'Tiempo medio entre fallas', formula: 'TTO / N', formato: 'horas' },
  { clave: 'mttf', sigla: 'MTTF', nombre: 'Tiempo medio hasta la falla', formula: 'TTO / (N + 1)', formato: 'horas' },
  { clave: 'rt', sigla: 'RT', nombre: 'Tiempo de reparación', formula: 'Suma de las OT correctivas', formato: 'horas' },
  { clave: 'mt', sigla: 'MT', nombre: 'Tiempo de mantenimiento', formula: 'Suma de todas las OT ejecutadas', formato: 'horas' },
  { clave: 'tto', sigla: 'TTO', nombre: 'Tiempo total de operación', formula: 'Periodo − MT', formato: 'horas' },
  { clave: 'n', sigla: 'N', nombre: 'Fallas', formula: 'Número de OT correctivas', formato: 'entero' },
]

/** Aplica el formato que corresponde a cada indicador. */
export function formatear(clave, valor) {
  const { formato } = DEFINICIONES.find((d) => d.clave === clave) ?? {}

  if (formato === 'porcentaje') return formatearPorcentaje(valor)
  if (formato === 'entero') return valor === null ? '—' : String(valor)
  return formatearHoras(valor)
}
