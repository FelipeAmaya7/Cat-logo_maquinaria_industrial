/**
 * Calidad de los datos de las fichas.
 *
 * Módulo PURO. Un catálogo de equipos no sirve de nada si media ficha está
 * en blanco: los indicadores salen sesgados, la taxonomía queda coja y nadie
 * sabe qué falta hasta que lo necesita. Esto lo mide y lo pone por delante.
 *
 * Se miden dos cosas distintas, y a propósito no se mezclan en un solo número:
 *
 *   - COMPLETITUD: qué porcentaje de los campos del formato está diligenciado.
 *     Da la foto general.
 *   - CAMPOS CLAVE: los pocos sin los cuales no se puede hacer mantenimiento.
 *     Una ficha al 80 % sin marca ni ubicación está peor que una al 50 % que
 *     sí los tiene, y un promedio solo nunca diría eso.
 */
// El marcador de «sin diligenciar» lo pone el extractor, así que su definición
// vive con él. Se reexporta porque la completitud de datos es justo lo que lo
// interpreta, y así el resto del proyecto lo pide a un solo módulo.
import { MAPA_CAMPOS, SIN_DATO } from './anclajeRotulos'

export { SIN_DATO }

/** Todos los campos del formato oficial. */
export const CAMPOS_EVALUADOS = Object.keys(MAPA_CAMPOS)

/**
 * Lo mínimo para poder mantener el equipo.
 *
 * Es la misma lista que usa el panel de alertas, importada de aquí para que no
 * puedan discrepar: si mañana se decide que la criticidad es imprescindible,
 * se añade en un solo sitio.
 */
export const CAMPOS_CLAVE = ['marca', 'modelo', 'ubicacion', 'anioAdquisicion']

/** Un campo cuenta como vacío si no tiene texto o trae el marcador del formato. */
export function vacio(valor) {
  const texto = String(valor ?? '').trim()
  return !texto || texto === SIN_DATO
}

/**
 * Calidad de una ficha.
 *
 * @returns {{id, descripcion, placaNueva, completos, total, porcentaje, faltantes, faltanClave}}
 */
export function calidadDeFicha(maquina) {
  const faltantes = CAMPOS_EVALUADOS.filter((campo) => vacio(maquina[campo]))
  const completos = CAMPOS_EVALUADOS.length - faltantes.length

  return {
    id: maquina.id,
    descripcion: maquina.descripcion,
    placaNueva: maquina.placaNueva,
    completos,
    total: CAMPOS_EVALUADOS.length,
    porcentaje: completos / CAMPOS_EVALUADOS.length,
    faltantes,
    faltanClave: CAMPOS_CLAVE.filter((campo) => vacio(maquina[campo])),
  }
}

/**
 * Calidad del catálogo completo.
 *
 * El promedio se calcula sobre los campos totales, no promediando porcentajes:
 * así una ficha no pesa más que otra por tener menos campos aplicables.
 *
 * @param {Object[]} maquinas
 */
export function calidadDelCatalogo(maquinas) {
  const fichas = maquinas.map(calidadDeFicha)

  const completos = fichas.reduce((suma, ficha) => suma + ficha.completos, 0)
  const total = fichas.reduce((suma, ficha) => suma + ficha.total, 0)

  // Qué campo falta más veces: dice dónde conviene invertir el tiempo de
  // digitación, en lugar de pedir «completen todo».
  const huecos = new Map()
  for (const ficha of fichas) {
    for (const campo of ficha.faltantes) {
      huecos.set(campo, (huecos.get(campo) ?? 0) + 1)
    }
  }

  const masVacios = [...huecos.entries()]
    .map(([campo, cuantas]) => ({ campo, rotulo: MAPA_CAMPOS[campo], cuantas }))
    .sort((a, b) => b.cuantas - a.cuantas || a.rotulo.localeCompare(b.rotulo, 'es'))

  return {
    fichas,
    porcentaje: total > 0 ? completos / total : 0,
    completas: fichas.filter((ficha) => ficha.faltantes.length === 0).length,
    sinCamposClave: fichas.filter((ficha) => ficha.faltanClave.length > 0).length,
    /** Las peores primero: por dónde empezar a completar. */
    peores: [...fichas].sort((a, b) => a.porcentaje - b.porcentaje),
    masVacios,
  }
}

/** Color del porcentaje, con los mismos cortes en toda la aplicación. */
export function tonoDeCalidad(porcentaje) {
  if (porcentaje >= 0.8) return 'emerald'
  if (porcentaje >= 0.5) return 'amber'
  return 'red'
}
