/**
 * Órdenes de trabajo: definición de campos para mantenimiento de maquinaria de planta.
 *
 * El ESTADO gobierna el resto del sistema: «Ejecutada» con su fecha alimenta
 * el cálculo del próximo mantenimiento y los indicadores; «Programada» y «En
 * proceso» son las que aparecen como pendientes y, pasada su fecha, vencidas.
 *
 * El ESTADO gobierna el resto del sistema: «Ejecutada», con su fecha, alimenta
 * el cálculo del próximo mantenimiento y los indicadores; «Programada» y «En
 * proceso» son las pendientes y, pasada su fecha, las vencidas.
 *
 * `tipo` describe el control que se pinta en el formulario:
 *   'equipo' → desplegable de máquinas del catálogo
 *   'auto'   → se rellena solo al elegir el equipo, y queda de solo lectura
 *   'fecha'  → selector de fecha
 *   'texto'  → línea simple (por defecto)
 *   'area'   → bloque de varias líneas
 */

export const CAMPOS_ORDEN = [
  { campo: 'numero', rotulo: 'N° de orden', tipo: 'numero', requerido: true, soloLectura: true },
  { campo: 'fecha', rotulo: 'Fecha programada', tipo: 'fecha', requerido: true },
  { campo: 'equipo', rotulo: 'Equipo a intervenir', tipo: 'equipo', requerido: true },
  { campo: 'ubicacion', rotulo: 'Ubicación', ph: 'Ej. Nave 1, Línea de corrugado, Troquelado' },
  { campo: 'marca', rotulo: 'Marca', tipo: 'auto', ph: 'Se completa al elegir el equipo' },
  { campo: 'modelo', rotulo: 'Modelo', tipo: 'auto', ph: 'Se completa al elegir el equipo' },
  { campo: 'serie', rotulo: 'Serie', tipo: 'auto', ph: 'Se completa al elegir el equipo' },
  {
    campo: 'mantenimiento',
    rotulo: 'Tipo',
    tipo: 'select',
    opciones: ['Correctivo', 'Preventivo', 'Predictivo'],
    requerido: true,
  },
  {
    campo: 'prioridad',
    rotulo: 'Prioridad',
    tipo: 'select',
    opciones: ['Alta', 'Media', 'Baja'],
  },
  {
    campo: 'estado',
    rotulo: 'Estado',
    tipo: 'select',
    opciones: ['Programada', 'En proceso', 'Ejecutada'],
    requerido: true,
  },
  {
    campo: 'fechaEjecucion',
    rotulo: 'Fecha de ejecución',
    tipo: 'fecha',
    // Solo tiene sentido una vez ejecutada. De ella sale la «última ejecutada»
    // con la que se calcula el próximo mantenimiento del equipo.
  },
  { campo: 'insumos', rotulo: 'Insumos / repuestos', ph: 'Ej. Rodamientos, cuchillas, bandas de transmisión, sellos' },
  { campo: 'tecnico', rotulo: 'Técnico', ph: 'Nombre del técnico' },
  { campo: 'falla', rotulo: 'Falla', ph: 'Descripción de la falla' },
  { campo: 'sistemaIntervenido', rotulo: 'Sistema intervenido', ph: 'Ej. Sistema neumático, transmisión mecánica, sistema eléctrico' },
  // En horas y como número, no como texto libre: de aquí salen el MTTR y el
  // tiempo de mantenimiento. Con «dos horas y media» escrito a mano no hay
  // indicador que calcular.
  {
    campo: 'duracion',
    rotulo: 'Duración (horas)',
    tipo: 'numero',
    ph: 'Ej. 2.5',
  },
  { campo: 'seguridad', rotulo: 'Seguridad', ph: 'Elementos y medidas de seguridad usadas' },
  { campo: 'observaciones', rotulo: 'Observaciones', tipo: 'area', ph: 'Observaciones generales' },
  { campo: 'tecnicoResponsable', rotulo: 'Técnico responsable', ph: 'Nombre' },
  { campo: 'supervisorResponsable', rotulo: 'Supervisor responsable', ph: 'Nombre' },
]

/** Campos que se rellenan solos al elegir el equipo. */
export const CAMPOS_AUTOMATICOS = CAMPOS_ORDEN.filter((c) => c.tipo === 'auto').map((c) => c.campo)

/**
 * Columnas de la hoja de Excel, en su orden.
 */
const ORDEN_EN_HOJA = [
  'numero',
  'fecha',
  'equipo',
  'marca',
  'modelo',
  'serie',
  'ubicacion',
  'mantenimiento',
  'prioridad',
  'estado',
  'fechaEjecucion',
  'insumos',
  'tecnico',
  'falla',
  'sistemaIntervenido',
  'duracion',
  'seguridad',
  'observaciones',
  'tecnicoResponsable',
  'supervisorResponsable',
]

const ROTULO_ORDEN = Object.fromEntries(CAMPOS_ORDEN.map(({ campo, rotulo }) => [campo, rotulo]))

export const COLUMNAS_ORDEN = ORDEN_EN_HOJA.map((campo) => [campo, ROTULO_ORDEN[campo]])

/** Orden vacía, con la fecha de hoy y el consecutivo que corresponda. */
export function ordenEnBlanco(numero) {
  const valores = Object.fromEntries(CAMPOS_ORDEN.map(({ campo }) => [campo, '']))

  return {
    ...valores,
    numero: String(numero),
    fecha: new Date().toISOString().slice(0, 10),
    // Una orden nace programada: es el estado natural al crearla.
    estado: 'Programada',
    prioridad: 'Media',
  }
}

/**
 * Copia al borrador los datos de la máquina elegida.
 * Evita volver a teclear marca, modelo, serie y ubicación.
 *
 * @param {Object} borrador
 * @param {Object|null} maquina
 */
export function aplicarDatosDeEquipo(borrador, maquina) {
  if (!maquina) {
    return { ...borrador, ...Object.fromEntries(CAMPOS_AUTOMATICOS.map((c) => [c, ''])) }
  }

  return {
    ...borrador,
    equipo: maquina.id,
    marca: maquina.marca ?? '',
    modelo: maquina.modelo ?? '',
    serie: maquina.serie ?? '',
  }
}

/**
 * Órdenes de una máquina, de la más reciente a la más antigua.
 *
 * Ordena por la fecha de EJECUCIÓN cuando existe y por la programada cuando
 * no: una orden ejecutada con retraso pertenece al día en que se hizo, no al
 * día en que se pensaba hacer.
 */
export function ordenesDeMaquina(ordenes, idMaquina) {
  const cuando = (orden) => String(orden.fechaEjecucion || orden.fecha || '')

  return ordenes
    .filter((orden) => orden.equipo === idMaquina)
    .sort((a, b) => cuando(b).localeCompare(cuando(a)))
}
