/**
 * HISTORIAL DE REPUESTOS DE EJEMPLO — DATOS DE DEMOSTRACIÓN
 * ========================================================
 *
 * ⚠ ESTAS ENTRADAS NO SON EL HISTORIAL REAL DE LA PLANTA. Son datos inventados
 * con fines de demostración, igual que `ordenes-ejemplo.js`, y por el mismo
 * motivo: sin ellos la hoja de vida de cada equipo mostraba solo órdenes y el
 * recuadro de «Gasto en repuestos» se quedaba en $0.
 *
 * La gracia de la hoja de vida es que mezcla las dos cosas en una sola línea de
 * tiempo: la orden que detectó la falla y la pieza que se cambió para
 * resolverla, seguidas una de otra. Con una sola de las dos colecciones esa
 * idea no se aprecia.
 *
 * Por eso cada entrada está atada a una orden concreta mediante
 * `ordenTrabajo`, y su fecha coincide con la de esa intervención. No es
 * obligatorio —en planta se cambia un repuesto sin abrir siempre una orden, y
 * el campo es opcional a propósito— pero aquí interesa que se vea la relación.
 *
 * Los costos están en pesos colombianos y son órdenes de magnitud razonables
 * para repuestos industriales, no cotizaciones reales.
 */

import { ORDENES_EJEMPLO } from './ordenes-ejemplo'

/**
 * Datos que la entrada de repuesto toma de su orden, por el `ref` de esta.
 *
 * Fecha, equipo y técnico NO se escriben en el guion de abajo: se heredan. El
 * motivo es que escribirlos dos veces es poder contradecirse, y ya pasó: una
 * entrada quedó colgada de la orden equivocada y aparecía una pieza instalada
 * en una máquina que nunca la llevó. Heredando, la única cosa que hay que
 * acertar es a qué orden se engancha, y de eso se encarga una prueba.
 *
 * La fecha se toma de la EJECUCIÓN, no de la programación: la pieza se monta el
 * día en que se interviene. Por eso un repuesto solo puede colgar de una orden
 * ejecutada, y `npm test` lo comprueba.
 */
function deLaOrden(ref) {
  const orden = ORDENES_EJEMPLO.find((o) => o.ref === ref)
  return {
    fecha: orden?.fechaEjecucion || orden?.fecha || '',
    numero: orden ? String(orden.numero) : '',
    equipo: orden?.equipo ?? '',
    tecnico: orden?.tecnico ?? '',
  }
}

/**
 * Repuestos, cada uno colgado de la orden que lo motivó.
 *
 * `cantidad` y `costoUnitario` van como números en forma de texto, igual que
 * los guarda el formulario: de su producto sale el gasto de la hoja de vida.
 */
const GUION = [
  {
    orden: 'ejemplo-ot-01',
    repuesto: 'Rodillo portaplancha unidad 3',
    referencia: 'WH-QMS-RP03',
    cantidad: '1',
    costoUnitario: '2850000',
    proveedor: 'Windmöller & Hölscher Colombia',
    motivo: 'Desgaste del recubrimiento; provocaba registro de color fuera de tolerancia.',
  },
  {
    orden: 'ejemplo-ot-02',
    repuesto: 'Juego de sellos para tintero',
    referencia: 'WH-SEAL-U1',
    cantidad: '2',
    costoUnitario: '185000',
    proveedor: 'Sellos y Empaques Industriales',
    motivo: 'Fuga de tinta por endurecimiento del sello. Se cambió el juego completo.',
  },
  {
    orden: 'ejemplo-ot-05',
    repuesto: 'Banda de arrastre de papel',
    referencia: 'BA-1200-PU',
    cantidad: '1',
    costoUnitario: '640000',
    proveedor: 'Bandas del Valle',
    motivo: 'Ruptura por fatiga tras aproximadamente dos años de servicio.',
  },
  {
    orden: 'ejemplo-ot-06',
    repuesto: 'Resistencia de sellado',
    referencia: 'RS-450-24V',
    cantidad: '3',
    costoUnitario: '95000',
    proveedor: 'Electrotérmicos S.A.S',
    motivo: 'Sellado irregular en el fondo de la bolsa por resistencia parcialmente abierta.',
  },
  {
    orden: 'ejemplo-ot-09',
    repuesto: 'Cuchilla circular estación de corte',
    referencia: 'FK-CC-310',
    cantidad: '2',
    costoUnitario: '420000',
    proveedor: 'Herramientas de Corte Andina',
    motivo: 'Filo vencido; causaba atascamientos repetidos en la estación de corte.',
  },
  {
    orden: 'ejemplo-ot-10',
    repuesto: 'Contactor tripolar 32 A',
    referencia: 'LC1D32M7',
    cantidad: '1',
    costoUnitario: '310000',
    proveedor: 'Suministros Eléctricos del Norte',
    motivo: 'Contactos pegados; el variador presentaba paradas intermitentes.',
  },
  {
    orden: 'ejemplo-ot-14',
    repuesto: 'Presostato de compresor',
    referencia: 'PS-8BAR-1/4',
    cantidad: '1',
    costoUnitario: '168000',
    proveedor: 'Neumática Industrial Ltda',
    motivo: 'No cortaba a la presión de consigna; riesgo de sobrepresión en el tanque.',
  },
  {
    orden: 'ejemplo-ot-15',
    repuesto: 'Aceite para compresor de pistón 20 L',
    referencia: 'ISO-VG-100',
    cantidad: '1',
    costoUnitario: '240000',
    proveedor: 'Lubricantes del Oriente',
    motivo: 'Cambio programado por horas de servicio.',
  },
  {
    orden: 'ejemplo-ot-16',
    repuesto: 'Tuerca de bronce husillo transversal',
    referencia: 'WIN-2060-TB',
    cantidad: '1',
    costoUnitario: '520000',
    proveedor: 'Fundiciones Técnicas',
    motivo: 'Juego excesivo en el carro transversal por desgaste del filete.',
  },
  {
    orden: 'ejemplo-ot-21',
    repuesto: 'Resistencia de inmersión para tina de parafina',
    referencia: 'RI-3000W-220',
    cantidad: '1',
    costoUnitario: '430000',
    proveedor: 'Electrotérmicos S.A.S',
    motivo: 'Resistencia abierta; la tina no alcanzaba la temperatura de trabajo.',
  },
  {
    orden: 'ejemplo-ot-24',
    repuesto: 'Juego de cuchillas circulares de refilado',
    referencia: 'CR-180-HSS',
    cantidad: '4',
    costoUnitario: '165000',
    proveedor: 'Herramientas de Corte Andina',
    motivo: 'Filo vencido; dejaba rebabas en el borde de las tiras.',
  },
  {
    orden: 'ejemplo-ot-30',
    repuesto: 'Rodamientos de motor del alimentador',
    referencia: '6205-2RSH',
    cantidad: '2',
    costoUnitario: '48000',
    proveedor: 'Rodamientos del Valle',
    motivo: 'Ruido y sobrecalentamiento del motor por rodamientos en mal estado.',
  },
]

/** Entradas de ejemplo con la forma que guarda la aplicación. */
export const REPUESTOS_EJEMPLO = GUION.map((fila, indice) => {
  const { fecha, numero, equipo, tecnico } = deLaOrden(fila.orden)

  return {
    ref: `ejemplo-rp-${String(indice + 1).padStart(2, '0')}`,
    idMaquina: equipo,
    fecha,
    repuesto: fila.repuesto,
    referencia: fila.referencia,
    cantidad: fila.cantidad,
    costoUnitario: fila.costoUnitario,
    proveedor: fila.proveedor,
    instaladoPor: tecnico,
    ordenTrabajo: numero,
    motivo: fila.motivo,
  }
})
