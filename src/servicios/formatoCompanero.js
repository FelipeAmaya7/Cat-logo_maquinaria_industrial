/**
 * Estructura de libro compatible con el formato del proyecto de referencia.
 *
 * El archivo que sirvió de modelo organiza la información en TRES hojas —
 * «Registro de datos», «Ordenes de trabajo» y «Ficha técnica»— y este módulo
 * reproduce esa disposición para que ambos trabajos se lean igual.
 *
 * DOS DIFERENCIAS DELIBERADAS
 * ---------------------------
 * 1. Las columnas de su hoja «Ficha técnica» describen vehículos eléctricos
 *    (VIN, batería en kWh, SOAT, pasajeros de pie). Aquí se usan los rótulos
 *    de `MAPA_CAMPOS`, que son los del formato de planta real. Copiar sus
 *    columnas dejaría 37 campos vacíos y ninguno de los nuestros.
 *
 * 2. «Ordenes de trabajo» se escribe con sus encabezados pero SIN filas: este
 *    sistema no registra órdenes de trabajo todavía. El archivo de referencia
 *    también venía vacío, así que la hoja se ve igual; queda como plantilla
 *    lista para diligenciar.
 */
import { MAPA_CAMPOS } from './anclajeRotulos'

/** Hoja 1: registro de equipos. Columnas del archivo de referencia. */
export const REGISTRO_DE_DATOS = {
  hoja: 'Registro de datos',
  columnas: [
    ['marca', 'Marca'],
    ['modelo', 'Modelo'],
    ['serie', 'Serie'],
    ['placaNueva', 'Código'],
    ['anioAdquisicion', 'Año de compra'],
    ['precio', 'Precio'],
    ['anioInstalacion', 'Año instalación'],
    ['ubicacion', 'Ubicación'],
    ['responsable', 'Responsable'],
    ['fechaUltimaIntervencion', 'Fecha última intervención'],
    ['intervenciones', 'Intervenciones'],
    ['modificaciones', 'Modificaciones'],
    ['actualizaciones', 'Actualizaciones'],
  ],
}

/** Hoja 2: órdenes de trabajo. Encabezados del archivo de referencia, sin datos. */
export const ORDENES_DE_TRABAJO = {
  hoja: 'Ordenes de trabajo',
  columnas: [
    'N° de orden',
    'Fecha',
    'Equipo a intervenir',
    'Marca',
    'Modelo',
    'Serie',
    'Ubicación',
    'Mantenimiento',
    'Insumos / repuestos',
    'Técnico',
    'Falla',
    'Sistema intervenido',
    'Duración de la reparación',
    'Seguridad',
    'Observaciones',
    'Técnico responsable',
    'Supervisor responsable',
  ],
}

/** Hoja 3: ficha técnica, con los rótulos del formato de planta. */
export const FICHA_TECNICA = {
  hoja: 'Ficha técnica',
  columnas: [['id', 'ID'], ...Object.entries(MAPA_CAMPOS).map(([campo, rotulo]) => [campo, rotulo])],
}
