/**
 * Alertas del panel de mantenimiento.
 *
 * Módulo PURO: recibe el catálogo, las órdenes y los repuestos, y devuelve la
 * lista de avisos. Nadie teclea una alerta — todas se deducen de lo que ya hay
 * registrado. Esa es la diferencia entre un tablero y un cuaderno: si el dato
 * cambia, el aviso cambia solo.
 *
 * Cada alerta lleva a dónde ir (`destino`), para que la lista sea el punto de
 * entrada del día y no un cartel informativo.
 */

import { CAMPOS_CLAVE, vacio } from './calidadDatos'
import { aFecha, diasHasta } from './fechas'

/** Días de antelación con que se avisa de una orden próxima. */
const DIAS_AVISO = 15

/** Gravedad, de mayor a menor. Gobierna el orden y el color. */
export const GRAVEDAD = { alta: 0, media: 1, baja: 2 }

/**
 * Deduce las alertas del estado actual.
 *
 * @param {Object} datos
 * @param {Object[]} datos.maquinas
 * @param {Object[]} datos.ordenes
 * @param {Object[]} datos.repuestos
 * @param {Date} [hoy]
 * @returns {Array<{clave, gravedad, codigo, titulo, detalle, destino}>}
 */
export function calcularAlertas({ maquinas = [], ordenes = [], repuestos = [] }, hoy = new Date()) {
  const alertas = []
  const nombreDe = new Map(maquinas.map((m) => [m.id, m]))

  // --- Órdenes pendientes: vencidas o a punto de vencer ---
  for (const orden of ordenes) {
    if (orden.estado === 'Ejecutada') continue

    const programada = aFecha(orden.fecha)
    if (!programada) continue

    const dias = diasHasta(programada, hoy)
    if (dias > DIAS_AVISO) continue

    const maquina = nombreDe.get(orden.equipo)
    const vencida = dias < 0

    alertas.push({
      clave: `orden-${orden.ref}`,
      gravedad: vencida ? 'alta' : 'media',
      codigo: `OT-${String(orden.numero).padStart(4, '0')}`,
      titulo: maquina ? maquina.descripcion : 'Equipo sin identificar',
      detalle: vencida
        ? `${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'} sin ejecutar`
        : `Programada en ${dias} ${dias === 1 ? 'día' : 'días'}`,
      destino: { vista: 'ordenes', ref: orden.ref },
    })
  }

  // --- Códigos de placa repetidos ---
  // Dos fichas con la misma placa rompen la trazabilidad: las órdenes de una
  // acaban contándose en la otra, y los indicadores salen mal sin avisar.
  const porPlaca = new Map()
  for (const maquina of maquinas) {
    const placa = String(maquina.placaNueva ?? '').trim().toUpperCase()
    if (vacio(placa)) continue
    if (!porPlaca.has(placa)) porPlaca.set(placa, [])
    porPlaca.get(placa).push(maquina)
  }

  for (const [placa, repetidas] of porPlaca) {
    if (repetidas.length < 2) continue

    alertas.push({
      clave: `placa-${placa}`,
      gravedad: 'alta',
      codigo: placa,
      titulo: `${repetidas.length} fichas con el mismo código`,
      detalle: 'Código repetido',
      destino: { vista: 'catalogo', id: repetidas[0].id },
    })
  }

  // --- Fichas a medio diligenciar ---
  for (const maquina of maquinas) {
    const faltan = CAMPOS_CLAVE.filter((campo) => vacio(maquina[campo]))
    if (faltan.length === 0) continue

    alertas.push({
      clave: `ficha-${maquina.id}`,
      gravedad: 'baja',
      codigo: maquina.placaNueva,
      titulo: maquina.descripcion,
      detalle: `Faltan ${faltan.length} datos clave`,
      destino: { vista: 'catalogo', id: maquina.id },
    })
  }

  // --- Equipos fuera de servicio ---
  for (const maquina of maquinas) {
    if (String(maquina.disponibilidad ?? '').toUpperCase() !== 'FUERA DE SERVICIO') continue

    alertas.push({
      clave: `parada-${maquina.id}`,
      gravedad: 'alta',
      codigo: maquina.placaNueva,
      titulo: maquina.descripcion,
      detalle: 'Fuera de servicio',
      destino: { vista: 'catalogo', id: maquina.id },
    })
  }

  // --- Equipos críticos sin ninguna orden registrada ---
  // Una máquina crítica sin historial no es una buena noticia: es un punto
  // ciego, porque tampoco se le pueden calcular indicadores.
  const conOrden = new Set(ordenes.map((orden) => orden.equipo))
  for (const maquina of maquinas) {
    const criticidad = String(maquina.criticidad ?? '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')

    if (criticidad !== 'CRITICA' || conOrden.has(maquina.id)) continue

    alertas.push({
      clave: `sin-historial-${maquina.id}`,
      gravedad: 'media',
      codigo: maquina.placaNueva,
      titulo: maquina.descripcion,
      detalle: 'Equipo crítico sin órdenes registradas',
      destino: { vista: 'catalogo', id: maquina.id },
    })
  }

  // --- Repuestos de coste alto, por si conviene revisarlos ---
  const gastoPorRepuesto = new Map()
  for (const entrada of repuestos) {
    const nombre = String(entrada.repuesto ?? '').trim()
    if (!nombre) continue

    const gasto =
      (Number(entrada.cantidad) || 0) * (Number(entrada.costoUnitario) || 0)
    gastoPorRepuesto.set(nombre, (gastoPorRepuesto.get(nombre) ?? 0) + gasto)
  }

  const [masCaro] = [...gastoPorRepuesto.entries()].sort((a, b) => b[1] - a[1])
  if (masCaro && masCaro[1] > 0) {
    alertas.push({
      clave: 'repuesto-caro',
      gravedad: 'baja',
      codigo: 'REPUESTOS',
      titulo: masCaro[0],
      detalle: `Mayor gasto acumulado: ${masCaro[1].toLocaleString('es-CO')}`,
      destino: { vista: 'catalogo' },
    })
  }

  return alertas.sort(
    (a, b) => GRAVEDAD[a.gravedad] - GRAVEDAD[b.gravedad] || a.titulo.localeCompare(b.titulo, 'es'),
  )
}

/** Resumen para la cabecera del panel. */
export function resumirAlertas(alertas) {
  return {
    total: alertas.length,
    altas: alertas.filter((a) => a.gravedad === 'alta').length,
    medias: alertas.filter((a) => a.gravedad === 'media').length,
    bajas: alertas.filter((a) => a.gravedad === 'baja').length,
  }
}
