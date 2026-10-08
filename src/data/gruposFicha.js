/**
 * Organización de los campos de la ficha en secciones lógicas para maquinaria industrial.
 *
 * Es la ÚNICA fuente de ese orden: la consumen tanto el formulario de creación
 * como la vista de ficha técnica, de modo que no puedan desalinearse.
 *
 * Los rótulos no se escriben aquí: se toman de `MAPA_CAMPOS`, lo que
 * garantiza que un archivo exportado a Excel se pueda volver a leer.
 */
import { MAPA_CAMPOS } from '../servicios/anclajeRotulos'
import { CONTROLES } from './controlesFicha'

/** Campos que se escriben en varias líneas (bloques / textarea). */
export const EXTENSOS = new Set([
  'funcion',
  'materialProcesado',
  'especificaciones',
  'intervenciones',
  'modificaciones',
  'actualizaciones',
  'descripcionOperador',
  'dimension',
])

/** Los dos datos que identifican la ficha y no pueden quedar vacíos. */
export const REQUERIDOS = new Set(['placaNueva', 'descripcion'])

/**
 * Validación de los campos que `CONTROLES` no cubre.
 * Para los demás, el tipo de control ya impone la restricción en el navegador.
 */
export const TIPOS = {
  vidaUtil: 'entero',
}

/**
 * Secciones, en el orden en que se muestran en el formulario y en la ficha.
 */
export const GRUPOS = [
  {
    titulo: 'Identificación',
    campos: [
      'placaNueva',
      'descripcion',
      'placaPadre',
      'cantidad',
      'marca',
      'modelo',
      'serie',
      'numeroMotor',
    ],
  },
  {
    titulo: 'Adquisición y estado',
    campos: [
      'anioAdquisicion',
      'anioInstalacion',
      'nuevoUsado',
      'vidaUtil',
      'estado',
      'disponibilidad',
      'precio',
    ],
  },
  {
    titulo: 'Ubicación y operación',
    campos: [
      'ubicacion',
      'piso',
      'turnoPorDia',
      'capacidad',
      'horasUso',
      'aniosUso',
      'responsable',
    ],
  },
  {
    titulo: 'Operador de la máquina',
    campos: [
      'operadorAsignado',
      'cargoOperador',
      'identificacionOperador',
      'turnoOperador',
      'descripcionOperador',
    ],
  },
  {
    titulo: 'Características físicas',
    campos: [
      'material',
      'color',
      'dimension',
      'longitud',
      'ancho',
      'alto',
      'pesoVacio',
      'pesoBruto',
    ],
  },
  {
    titulo: 'Descripción técnica y proceso',
    campos: [
      'funcion',
      'materialProcesado',
      'especificaciones',
    ],
  },
  {
    titulo: 'Mantenimiento y documentos',
    campos: [
      'fechaUltimaIntervencion',
      'proximoMantenimiento',
      'manualTecnico',
      'vigenciaGarantia',
      'intervenciones',
      'modificaciones',
      'actualizaciones',
    ],
  },
]

/** Rótulo oficial de un campo. */
export const rotuloDe = (campo) => MAPA_CAMPOS[campo] ?? campo

/**
 * Todos los campos agrupados, con su rótulo y tipo ya resueltos.
 * Incluye al final cualquier campo de `MAPA_CAMPOS` que no se haya asignado a
 * una sección, para que añadir uno nuevo nunca lo deje invisible.
 */
export const GRUPOS_RESUELTOS = (() => {
  const asignados = new Set(GRUPOS.flatMap((grupo) => grupo.campos))
  const huerfanos = Object.keys(MAPA_CAMPOS).filter((campo) => !asignados.has(campo))

  const secciones = huerfanos.length
    ? [...GRUPOS, { titulo: 'Otros datos', campos: huerfanos }]
    : GRUPOS

  return secciones.map((grupo) => ({
    ...grupo,
    campos: grupo.campos.map((campo) => {
      const control = CONTROLES[campo] ?? {}
      const tipo = control.tipo ?? (EXTENSOS.has(campo) ? 'area' : 'text')

      return {
        campo,
        // El rótulo del Excel manda si no hay una etiqueta más explícita.
        rotulo: control.etiqueta ?? rotuloDe(campo),
        rotuloExcel: rotuloDe(campo),
        tipo,
        ph: control.ph ?? null,
        opciones: control.opciones ?? null,
        extenso: tipo === 'area',
        requerido: REQUERIDOS.has(campo),
        validacion: TIPOS[campo] ?? null,
      }
    }),
  }))
})()
