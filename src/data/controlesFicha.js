/**
 * Especificación de los controles del formulario para maquinaria industrial de planta.
 *
 * Configura los tipos de datos, controles (text, number, select, area, date),
 * etiquetas legibles y textos de ejemplo (placeholders) coherentes con equipos
 * industriales de empaques, corrugados e imprenta gráfica.
 */

/** @type {Object<string, {tipo: string, ph?: string, opciones?: string[], etiqueta?: string}>} */
export const CONTROLES = {
  placaNueva: { tipo: "text", ph: "Ej. EM00068", etiqueta: "Código / Placa" },
  placaPadre: { tipo: "text", ph: "Ej. LÍNEA-01 (opcional)", etiqueta: "Código equipo padre / Línea" },
  descripcion: { tipo: "text", ph: "Ej. Flexográfica 4 Colores", etiqueta: "Descripción de la máquina" },
  cantidad: { tipo: "number", ph: "1", etiqueta: "Cantidad" },
  marca: { tipo: "text", ph: "Ej. Bobst, Heidelberg, Yaota, Imomill", etiqueta: "Marca" },
  modelo: { tipo: "text", ph: "Ej. ZX6350A, QMS992B, CYS2060B", etiqueta: "Modelo" },
  serie: { tipo: "text", ph: "Número de serie de fábrica", etiqueta: "Serie" },
  numeroMotor: { tipo: "text", ph: "Ej. TW YD100L-B/4 o 15 kW", etiqueta: "Número de motor / Potencia" },

  anioAdquisicion: { tipo: "number", ph: "2020", etiqueta: "Año de compra" },
  anioInstalacion: { tipo: "number", ph: "2021", etiqueta: "Año instalación" },
  // «No registrado» es una opción real, no un hueco: 15 de las 49 fichas del
  // libro de planta llegaron así, y sin ella el desplegable las dejaba en blanco.
  nuevoUsado: { tipo: "select", opciones: ["NUEVO", "USADO", "No registrado"], etiqueta: "Nuevo-Usado" },
  vidaUtil: { tipo: "number", ph: "15", etiqueta: "Vida útil en años" },
  estado: { tipo: "select", opciones: ["BUENO", "REGULAR", "MALO", "CRÍTICO"], etiqueta: "Estado" },
  // ALMACENADO viene del libro de planta y faltaba aquí. Los estilos de las
  // tarjetas (ListaTarjetas) ya contemplaban USO, ALMACENADO y FUERA DE SERVICIO.
  disponibilidad: { tipo: "select", opciones: ["USO", "DISPONIBLE", "ALMACENADO", "EN MANTENIMIENTO", "FUERA DE SERVICIO", "No registrado"], etiqueta: "Disponibilidad" },
  precio: { tipo: "number", ph: "0", etiqueta: "Precio" },

  ubicacion: { tipo: "text", ph: "Ej. Nave 1, Línea de corrugado, Troquelado", etiqueta: "Ubicación" },
  piso: { tipo: "text", ph: "01", etiqueta: "Piso" },
  turnoPorDia: { tipo: "text", ph: "Ej. 1 de 8 horas, 2 de 10 horas", etiqueta: "Turno por día" },
  capacidad: { tipo: "text", ph: "Ej. 5.000 cajas/hora, 150 m/min", etiqueta: "Capacidad productiva" },
  horasUso: { tipo: "text", ph: "Ej. 1200 horas (horómetro)", etiqueta: "Horas de uso" },
  aniosUso: { tipo: "number", ph: "5", etiqueta: "Años de uso" },
  responsable: { tipo: "text", ph: "Ej. Ing. Carlos Rodríguez", etiqueta: "Responsable del activo" },

  operadorAsignado: { tipo: "text", ph: "Ej. Juan Pérez Gómez", etiqueta: "Operador asignado" },
  cargoOperador: { tipo: "text", ph: "Ej. Operario de impresión flexográfica", etiqueta: "Cargo del operador" },
  identificacionOperador: { tipo: "text", ph: "Ej. CC 1.045.882.331 o código interno", etiqueta: "Identificación / código" },
  turnoOperador: { tipo: "text", ph: "Ej. Turno 1 (6:00 a 14:00)", etiqueta: "Turno del operador" },
  descripcionOperador: { tipo: "area", ph: "Ej. Operario certificado en manejo de flexográfica desde 2021. Autorizado para calibrar rodillos y cambiar cuchillas. Requiere acompañamiento para el ajuste de registro.", etiqueta: "Descripción del operador" },

  material: { tipo: "text", ph: "Ej. Acero, Hierro fundido, Metal", etiqueta: "Material" },
  color: { tipo: "text", ph: "Ej. Verde industrial, Gris, Azul", etiqueta: "Color" },
  dimension: { tipo: "text", ph: "Ej. Formato máx: 1200 x 2400 mm", etiqueta: "Dimensión" },
  longitud: { tipo: "number", ph: "0", etiqueta: "Longitud (m)" },
  ancho: { tipo: "number", ph: "0", etiqueta: "Ancho (m)" },
  alto: { tipo: "number", ph: "0", etiqueta: "Alto (m)" },
  pesoVacio: { tipo: "number", ph: "0", etiqueta: "Peso vacío (kg)" },
  pesoBruto: { tipo: "number", ph: "0", etiqueta: "Peso total / operativo (kg)" },

  funcion: { tipo: "area", ph: "Ej. Impresión flexográfica y ranurado de cajas de cartón corrugado", etiqueta: "Función que presta" },
  materialProcesado: { tipo: "text", ph: "Ej. Cartón corrugado, Papel kraft, Liner", etiqueta: "Material procesado" },
  especificaciones: { tipo: "area", ph: "Ej. Motor trifásico 15 kW 220V/440V, 60 Hz, presión neumática 6 bar", etiqueta: "Especificaciones" },

  fechaUltimaIntervencion: { tipo: "date", etiqueta: "Fecha última intervención" },
  proximoMantenimiento: { tipo: "date", etiqueta: "Próximo mantenimiento programado" },
  manualTecnico: { tipo: "text", ph: "Enlace o código de referencia", etiqueta: "Manual técnico" },
  vigenciaGarantia: { tipo: "text", ph: "Ej. hasta dic 2027", etiqueta: "Vigencia garantía" },
  intervenciones: { tipo: "area", ph: "Ej. Cambio de cuchillas, lubricación de rodamientos, calibración de rodillos", etiqueta: "Intervenciones" },
  modificaciones: { tipo: "area", ph: "Ej. Instalación de variador de frecuencia, adaptación de guías", etiqueta: "Modificaciones" },
  actualizaciones: { tipo: "area", ph: "Ej. Actualización de software PLC Siemens, cambio de pantalla HMI", etiqueta: "Actualizaciones" },
}

/** Controles del formulario de órdenes de trabajo, enfocados en maquinaria de planta. */
export const CONTROLES_ORDEN = [
  {
    "etiqueta": "N° de orden",
    "tipo": "text",
    "readOnly": true
  },
  {
    "etiqueta": "Fecha",
    "tipo": "date"
  },
  {
    "etiqueta": "Equipo a intervenir",
    "tipo": "select"
  },
  {
    "etiqueta": "Ubicación",
    "tipo": "text",
    "ph": "Ej. Nave 1, Línea de corrugado, Troquelado"
  },
  {
    "etiqueta": "Marca",
    "tipo": "text",
    "ph": "Se completa al elegir el equipo",
    "readOnly": true
  },
  {
    "etiqueta": "Modelo",
    "tipo": "text",
    "ph": "Se completa al elegir el equipo",
    "readOnly": true
  },
  {
    "etiqueta": "Serie",
    "tipo": "text",
    "ph": "Se completa al elegir el equipo",
    "readOnly": true
  },
  {
    "etiqueta": "Mantenimiento",
    "tipo": "select",
    "opciones": [
      "Correctivo",
      "Preventivo",
      "Predictivo"
    ]
  },
  {
    "etiqueta": "Insumos / repuestos",
    "tipo": "text",
    "ph": "Ej. Rodamientos, cuchillas, bandas de transmisión, sellos"
  },
  {
    "etiqueta": "Técnico",
    "tipo": "text",
    "ph": "Nombre del técnico"
  },
  {
    "etiqueta": "Falla",
    "tipo": "text",
    "ph": "Descripción de la falla"
  },
  {
    "etiqueta": "Sistema intervenido",
    "tipo": "text",
    "ph": "Ej. Sistema neumático, transmisión mecánica, sistema eléctrico"
  },
  {
    "etiqueta": "Duración de la reparación",
    "tipo": "text",
    "ph": "Ej. 2 horas"
  },
  {
    "etiqueta": "Seguridad",
    "tipo": "text",
    "ph": "Elementos y medidas de seguridad usadas"
  },
  {
    "etiqueta": "Observaciones",
    "tipo": "area",
    "ph": "Observaciones generales"
  },
  {
    "etiqueta": "Técnico responsable",
    "tipo": "text",
    "ph": "Nombre"
  },
  {
    "etiqueta": "Supervisor responsable",
    "tipo": "text",
    "ph": "Nombre"
  }
]
