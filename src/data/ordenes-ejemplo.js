/**
 * ÓRDENES DE TRABAJO DE EJEMPLO — DATOS DE DEMOSTRACIÓN
 * =====================================================
 *
 * ⚠ ESTAS ÓRDENES NO SON EL HISTORIAL REAL DE LA PLANTA. Son datos inventados
 * con fines de demostración, para que quien abra la aplicación publicada vea
 * funcionando la programación, los indicadores y la hoja de vida.
 *
 * El historial auténtico se registra desde la propia aplicación y se guarda en
 * el navegador de cada persona.
 *
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * ---------------------------
 * El catálogo de equipos viaja dentro del código: `maquinas.js` se genera del
 * libro de Excel y Vite lo empaqueta, así que cualquiera que abra el enlace ve
 * las 49 fichas. Las órdenes de trabajo, en cambio, viven en `localStorage`,
 * que es por navegador y por dispositivo: lo que una persona registra no existe
 * para nadie más. Resultado: las tres vistas más útiles —programación,
 * indicadores y hoja de vida— aparecían vacías para cualquier visitante.
 *
 * No hacía falta un servidor ni una base de datos, hacía falta una SEMILLA: un
 * juego de órdenes que viaje en el paquete igual que el catálogo. Eso es esto.
 *
 *
 * CÓMO ESTÁ COMPUESTO Y POR QUÉ ASÍ
 * ---------------------------------
 * Diez equipos de seis secciones distintas, con dos a cuatro órdenes cada uno.
 * El reparto no es decorativo:
 *
 * - Varias órdenes por equipo, no una. El MTBF es `TTO / N` y el MTTF
 *   `TTO / (N+1)`: con una sola falla por máquina, N = 1 y el MTBF sería todo
 *   el periodo observado, un número que no dice nada. Con tres o cuatro ya es
 *   un promedio de verdad.
 * - Correctivos y preventivos mezclados. Solo los correctivos cuentan como
 *   falla, así que sin preventivos el tiempo de mantenimiento (MT) y el de
 *   reparación (RT) saldrían idénticos y no se vería la diferencia.
 * - Todas las ejecutadas llevan `duracion` numérica. Sin ella una orden no
 *   entra en los indicadores, y entonces el ejemplo no cumpliría su función.
 * - Hay pendientes en cada ventana de la programación: dos vencidas, una para
 *   hoy, una esta semana, dos este mes y una más adelante. Así la vista se
 *   explica sola en vez de mostrar un solo grupo.
 * - Una queda «En proceso», el tercer estado, que de otro modo no se ve nunca.
 *
 *
 * LAS FECHAS SON RELATIVAS, NO FIJAS
 * ----------------------------------
 * Se calculan al cargar el módulo, a partir del día en que se abre la
 * aplicación. Escritas a mano quedarían congeladas: en tres meses TODAS las
 * pendientes aparecerían vencidas y la demostración se degradaría sola, sin
 * que nadie hubiera tocado nada.
 *
 * Marca, modelo y serie NO se escriben aquí: se copian de la ficha del equipo
 * con la misma función que usa el formulario. Así una orden de ejemplo nunca
 * puede contradecir a la ficha del activo al que se refiere.
 */

import { maquinas } from './maquinas'
import { aplicarDatosDeEquipo } from './ordenes'

/** Día de hoy a medianoche, una sola vez por carga. */
const HOY = new Date()

/**
 * Fecha ISO desplazada tantos días respecto a hoy.
 * Negativo hacia el pasado, positivo hacia el futuro.
 */
function dia(desplazamiento) {
  const fecha = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() + desplazamiento)

  // Se construye a mano en lugar de con toISOString: ese método pasa a UTC y
  // en Colombia (UTC-5) devolvería el día anterior.
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const diaDelMes = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${diaDelMes}`
}

/**
 * Las órdenes, en la forma mínima que las distingue.
 *
 * `dias` es el desplazamiento de la fecha programada; `ejecutadaEn`, el de la
 * fecha de ejecución cuando no coincide con la programada (una orden atendida
 * con retraso, que es lo normal en planta).
 */
const GUION = [
  // ─── EM00034 · REFILADO · Impresora flexográfica Windmöller 4 colores ───
  // El equipo insignia: el que más historia tiene y el que mejor demuestra
  // los indicadores.
  {
    equipo: 'EM00034',
    dias: -468,
    ejecutadaEn: -468,
    tipo: 'Correctivo',
    estado: 'Ejecutada',
    prioridad: 'Alta',
    duracion: '6',
    tecnico: 'Jairo Peña',
    falla: 'Registro de color fuera de tolerancia en la unidad 3',
    sistema: 'Sistema de impresión',
    insumos: 'Rodillo portaplancha, cinta doble faz',
    duracionNota: 'Ajuste de registro y cambio de rodillo portaplancha de la unidad 3.',
  },
  {
    equipo: 'EM00034',
    dias: -301,
    ejecutadaEn: -299,
    tipo: 'Correctivo',
    estado: 'Ejecutada',
    prioridad: 'Alta',
    duracion: '8',
    tecnico: 'Jairo Peña',
    falla: 'Fuga de tinta por el sello del tintero de la unidad 1',
    sistema: 'Sistema de entintado',
    insumos: 'Juego de sellos, rasqueta',
    duracionNota: 'Atendida dos días después por espera del juego de sellos.',
  },
  {
    equipo: 'EM00034',
    dias: -112,
    ejecutadaEn: -112,
    tipo: 'Preventivo',
    estado: 'Ejecutada',
    prioridad: 'Media',
    duracion: '4',
    tecnico: 'Luis Carvajal',
    falla: '',
    sistema: 'Transmisión mecánica',
    insumos: 'Grasa EP2, filtros de aire',
    duracionNota: 'Lubricación general, revisión de cadenas y cambio de filtros.',
  },
  {
    equipo: 'EM00034',
    dias: 45,
    tipo: 'Preventivo',
    estado: 'Programada',
    prioridad: 'Media',
    sistema: 'Transmisión mecánica',
    insumos: 'Grasa EP2, filtros de aire',
    duracionNota: 'Mantenimiento semestral programado.',
  },

  // ─── EM00027 · RESMADO · Bolsera Cellomatador Windmöller & Hölscher ───
  {
    equipo: 'EM00027',
    dias: -392,
    ejecutadaEn: -392,
    tipo: 'Correctivo',
    estado: 'Ejecutada',
    prioridad: 'Alta',
    duracion: '5',
    tecnico: 'Hernán Rojas',
    falla: 'Ruptura de la banda de arrastre de papel',
    sistema: 'Transmisión mecánica',
    insumos: 'Banda de arrastre',
    duracionNota: 'Cambio de banda y alineación de rodillos de entrada.',
  },
  {
    equipo: 'EM00027',
    dias: -205,
    ejecutadaEn: -205,
    tipo: 'Correctivo',
    estado: 'Ejecutada',
    prioridad: 'Media',
    duracion: '3.5',
    tecnico: 'Hernán Rojas',
    falla: 'Sellado irregular en el fondo de la bolsa',
    sistema: 'Sistema de sellado',
    insumos: 'Resistencia de sellado, teflón',
    duracionNota: 'Cambio de resistencia y recalibración de temperatura.',
  },
  {
    equipo: 'EM00027',
    dias: -78,
    ejecutadaEn: -78,
    tipo: 'Preventivo',
    estado: 'Ejecutada',
    prioridad: 'Media',
    duracion: '3',
    tecnico: 'Luis Carvajal',
    falla: '',
    sistema: 'Sistema neumático',
    insumos: 'Filtros reguladores, aceite neumático',
    duracionNota: 'Purga del circuito neumático y cambio de filtros reguladores.',
  },
  {
    // Vencida a propósito: alimenta la ventana «vencidas» y una alerta alta.
    equipo: 'EM00027',
    dias: -12,
    tipo: 'Preventivo',
    estado: 'Programada',
    prioridad: 'Alta',
    sistema: 'Sistema de sellado',
    insumos: 'Teflón, termocupla',
    duracionNota: 'Revisión trimestral del grupo de sellado. Pendiente de ejecutar.',
  },

  // ─── EM00025 · RESMADO · Bolsera Fischer y Krecke 31D ───
  {
    equipo: 'EM00025',
    dias: -421,
    ejecutadaEn: -421,
    tipo: 'Correctivo',
    estado: 'Ejecutada',
    prioridad: 'Alta',
    duracion: '7',
    tecnico: 'Jairo Peña',
    falla: 'Atascamiento repetido en la estación de corte',
    sistema: 'Sistema de corte',
    insumos: 'Cuchilla circular, bujes',
    duracionNota: 'Cambio de cuchilla y bujes de la estación de corte.',
  },
  {
    equipo: 'EM00025',
    dias: -246,
    ejecutadaEn: -243,
    tipo: 'Correctivo',
    estado: 'Ejecutada',
    prioridad: 'Media',
    duracion: '4',
    tecnico: 'Hernán Rojas',
    falla: 'Variador de velocidad con paradas intermitentes',
    sistema: 'Sistema eléctrico',
    insumos: 'Contactor, borneras',
    duracionNota: 'Atendida con retraso por disponibilidad del contactor.',
  },
  {
    equipo: 'EM00025',
    dias: -134,
    ejecutadaEn: -134,
    tipo: 'Preventivo',
    estado: 'Ejecutada',
    prioridad: 'Baja',
    duracion: '2.5',
    tecnico: 'Luis Carvajal',
    falla: '',
    sistema: 'Transmisión mecánica',
    insumos: 'Grasa EP2',
    duracionNota: 'Lubricación de rodamientos y ajuste de tensión de cadenas.',
  },

  // ─── EM00057 · MEZANINE · Compresor Laoshidun ───
  // Equipo de servicio: casi todo preventivo, que es como se mantiene de verdad.
  {
    equipo: 'EM00057',
    dias: -360,
    ejecutadaEn: -360,
    tipo: 'Preventivo',
    estado: 'Ejecutada',
    prioridad: 'Media',
    duracion: '2',
    tecnico: 'Luis Carvajal',
    falla: '',
    sistema: 'Sistema neumático',
    insumos: 'Aceite de compresor, filtro de aire',
    duracionNota: 'Cambio de aceite y filtro. Purga del tanque.',
  },
  {
    equipo: 'EM00057',
    dias: -270,
    ejecutadaEn: -270,
    tipo: 'Preventivo',
    estado: 'Ejecutada',
    prioridad: 'Media',
    duracion: '2',
    tecnico: 'Luis Carvajal',
    falla: '',
    sistema: 'Sistema neumático',
    insumos: 'Filtro de aire',
    duracionNota: 'Revisión trimestral. Purga del tanque y limpieza de filtro.',
  },
  {
    equipo: 'EM00057',
    dias: -181,
    ejecutadaEn: -181,
    tipo: 'Correctivo',
    estado: 'Ejecutada',
    prioridad: 'Alta',
    duracion: '4.5',
    tecnico: 'Hernán Rojas',
    falla: 'Presostato no corta a la presión de consigna',
    sistema: 'Sistema eléctrico',
    insumos: 'Presostato, manómetro',
    duracionNota: 'Cambio de presostato y verificación de la válvula de alivio.',
  },
  {
    equipo: 'EM00057',
    dias: -88,
    ejecutadaEn: -88,
    tipo: 'Preventivo',
    estado: 'Ejecutada',
    prioridad: 'Media',
    duracion: '1.5',
    tecnico: 'Luis Carvajal',
    falla: '',
    sistema: 'Sistema neumático',
    insumos: 'Aceite de compresor',
    duracionNota: 'Cambio de aceite y revisión de fugas en acoples.',
  },

  // ─── EM00062 · MANTENIMIENTO · Torno paralelo Winston ───
  {
    equipo: 'EM00062',
    dias: -311,
    ejecutadaEn: -311,
    tipo: 'Correctivo',
    estado: 'Ejecutada',
    prioridad: 'Media',
    duracion: '5',
    tecnico: 'Jairo Peña',
    falla: 'Juego excesivo en el husillo del carro transversal',
    sistema: 'Transmisión mecánica',
    insumos: 'Tuerca de bronce, chavetas',
    duracionNota: 'Cambio de la tuerca de bronce del husillo transversal.',
  },
  {
    equipo: 'EM00062',
    dias: -150,
    ejecutadaEn: -150,
    tipo: 'Preventivo',
    estado: 'Ejecutada',
    prioridad: 'Baja',
    duracion: '2',
    tecnico: 'Luis Carvajal',
    falla: '',
    sistema: 'Transmisión mecánica',
    insumos: 'Aceite ISO 68, guayas de limpieza',
    duracionNota: 'Cambio de aceite de la caja Norton y limpieza de guías.',
  },
  {
    // Esta semana: alimenta la ventana «semana».
    equipo: 'EM00062',
    dias: 4,
    tipo: 'Preventivo',
    estado: 'Programada',
    prioridad: 'Baja',
    sistema: 'Transmisión mecánica',
    insumos: 'Aceite ISO 68',
    duracionNota: 'Lubricación semestral de guías y caja de avances.',
  },

  // ─── EM00061 · MANTENIMIENTO · Sierra tronzadora Discover ───
  {
    equipo: 'EM00061',
    dias: -233,
    ejecutadaEn: -233,
    tipo: 'Correctivo',
    estado: 'Ejecutada',
    prioridad: 'Media',
    duracion: '3',
    tecnico: 'Hernán Rojas',
    falla: 'Disco desalineado, corte fuera de escuadra',
    sistema: 'Sistema de corte',
    insumos: 'Disco de corte, brida',
    duracionNota: 'Cambio de disco y alineación del cabezal.',
  },
  {
    // Este mes: alimenta la ventana «mes».
    equipo: 'EM00061',
    dias: 9,
    tipo: 'Preventivo',
    estado: 'Programada',
    prioridad: 'Baja',
    sistema: 'Sistema eléctrico',
    insumos: 'Escobillas de motor',
    duracionNota: 'Revisión de escobillas y del pulsador de parada de emergencia.',
  },

  // ─── EM00032 · REFILADO · Máquina parafinadora ───
  {
    equipo: 'EM00032',
    dias: -344,
    ejecutadaEn: -344,
    tipo: 'Correctivo',
    estado: 'Ejecutada',
    prioridad: 'Alta',
    duracion: '6',
    tecnico: 'Jairo Peña',
    falla: 'Resistencia de la tina de parafina sin calentar',
    sistema: 'Sistema térmico',
    insumos: 'Resistencia de inmersión, termostato',
    duracionNota: 'Cambio de resistencia de inmersión y del termostato.',
  },
  {
    equipo: 'EM00032',
    dias: -159,
    ejecutadaEn: -157,
    tipo: 'Correctivo',
    estado: 'Ejecutada',
    prioridad: 'Media',
    duracion: '3',
    tecnico: 'Hernán Rojas',
    falla: 'Aplicación irregular de parafina sobre el papel',
    sistema: 'Sistema de aplicación',
    insumos: 'Rasqueta, rodillo aplicador',
    duracionNota: 'Rectificado del rodillo aplicador y cambio de rasqueta.',
  },
  {
    // El tercer estado, que si no no se ve nunca en la aplicación.
    equipo: 'EM00032',
    dias: -1,
    tipo: 'Correctivo',
    estado: 'En proceso',
    prioridad: 'Alta',
    tecnico: 'Jairo Peña',
    falla: 'Goteo de parafina en la salida de la tina',
    sistema: 'Sistema de aplicación',
    insumos: 'Empaque de la tina',
    duracionNota: 'En intervención: se está desmontando la tina para cambiar el empaque.',
  },

  // ─── EM00038 · REFILADO · Máquina cortadora de rollos ───
  {
    equipo: 'EM00038',
    dias: -287,
    ejecutadaEn: -287,
    tipo: 'Correctivo',
    estado: 'Ejecutada',
    prioridad: 'Media',
    duracion: '4',
    tecnico: 'Hernán Rojas',
    falla: 'Rebabas en el borde del rollo por cuchilla desgastada',
    sistema: 'Sistema de corte',
    insumos: 'Cuchilla circular',
    duracionNota: 'Cambio del juego de cuchillas circulares.',
  },
  {
    equipo: 'EM00038',
    dias: -121,
    ejecutadaEn: -121,
    tipo: 'Preventivo',
    estado: 'Ejecutada',
    prioridad: 'Baja',
    duracion: '2',
    tecnico: 'Luis Carvajal',
    falla: '',
    sistema: 'Transmisión mecánica',
    insumos: 'Grasa EP2',
    duracionNota: 'Lubricación de rodamientos y revisión de frenos de desenrollado.',
  },
  {
    // Para hoy: alimenta la ventana «hoy».
    equipo: 'EM00038',
    dias: 0,
    tipo: 'Preventivo',
    estado: 'Programada',
    prioridad: 'Media',
    sistema: 'Sistema de corte',
    insumos: 'Cuchilla circular',
    duracionNota: 'Revisión del filo de cuchillas. Programada para hoy.',
  },

  // ─── EM00041 · EMBOLSADO · Báscula digital Pesatronik ───
  {
    equipo: 'EM00041',
    dias: -196,
    ejecutadaEn: -196,
    tipo: 'Predictivo',
    estado: 'Ejecutada',
    prioridad: 'Media',
    duracion: '1.5',
    tecnico: 'Metrología externa',
    falla: '',
    sistema: 'Sistema de pesaje',
    insumos: 'Juego de masas patrón',
    duracionNota: 'Calibración con masas patrón. Error dentro de tolerancia.',
  },
  {
    // Este mes: segunda orden en la ventana «mes».
    equipo: 'EM00041',
    dias: 18,
    tipo: 'Predictivo',
    estado: 'Programada',
    prioridad: 'Media',
    sistema: 'Sistema de pesaje',
    insumos: 'Juego de masas patrón',
    duracionNota: 'Calibración semestral. La anterior venció el mes pasado.',
  },

  // ─── EM00007 · MANIJAS Y ENTORCHADO · Máquina de fabricación de manijas ───
  {
    equipo: 'EM00007',
    dias: -258,
    ejecutadaEn: -258,
    tipo: 'Correctivo',
    estado: 'Ejecutada',
    prioridad: 'Media',
    duracion: '3.5',
    tecnico: 'Jairo Peña',
    falla: 'Pegado deficiente de la manija al cuerpo de la bolsa',
    sistema: 'Sistema de aplicación',
    insumos: 'Boquilla de goma, mangueras',
    duracionNota: 'Limpieza del circuito de goma y cambio de boquilla.',
  },
  {
    equipo: 'EM00007',
    dias: -95,
    ejecutadaEn: -95,
    tipo: 'Correctivo',
    estado: 'Ejecutada',
    prioridad: 'Alta',
    duracion: '5',
    tecnico: 'Hernán Rojas',
    falla: 'Motor del alimentador con sobrecalentamiento',
    sistema: 'Sistema eléctrico',
    insumos: 'Rodamientos de motor, ventilador',
    duracionNota: 'Cambio de rodamientos del motor y del ventilador de refrigeración.',
  },
  {
    // Segunda vencida: refuerza la ventana «vencidas».
    equipo: 'EM00007',
    dias: -4,
    tipo: 'Preventivo',
    estado: 'Programada',
    prioridad: 'Media',
    sistema: 'Transmisión mecánica',
    insumos: 'Grasa EP2, bandas',
    duracionNota: 'Lubricación y revisión de bandas. Pendiente de ejecutar.',
  },
]

/** Índice de máquinas por identificador, para copiar sus datos. */
const porId = new Map(maquinas.map((maquina) => [maquina.id, maquina]))

/**
 * Las órdenes de ejemplo, ya con la forma que guarda la aplicación.
 *
 * Se construyen aquí en lugar de escribirlas enteras para que marca, modelo y
 * serie salgan de la ficha del equipo —con `aplicarDatosDeEquipo`, la misma
 * función que usa el formulario— y no de una copia a mano que podría quedar
 * desfasada.
 */
export const ORDENES_EJEMPLO = GUION.map((fila, indice) => {
  const maquina = porId.get(fila.equipo) ?? null

  const base = {
    ref: `ejemplo-ot-${String(indice + 1).padStart(2, '0')}`,
    numero: String(indice + 1),
    fecha: dia(fila.dias),
    equipo: fila.equipo,
    ubicacion: maquina?.ubicacion ?? '',
    mantenimiento: fila.tipo,
    prioridad: fila.prioridad ?? 'Media',
    estado: fila.estado,
    fechaEjecucion: fila.estado === 'Ejecutada' ? dia(fila.ejecutadaEn ?? fila.dias) : '',
    insumos: fila.insumos ?? '',
    tecnico: fila.tecnico ?? '',
    falla: fila.falla ?? '',
    sistemaIntervenido: fila.sistema ?? '',
    duracion: fila.duracion ?? '',
    seguridad: 'Bloqueo y etiquetado, guantes, gafas de seguridad',
    observaciones: fila.duracionNota ?? '',
    tecnicoResponsable: fila.tecnico ?? '',
    supervisorResponsable: 'Coordinación de mantenimiento',
  }

  return aplicarDatosDeEquipo(base, maquina)
})
