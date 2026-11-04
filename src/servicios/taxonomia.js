/**
 * Taxonomía de activos, según ISO 14224.
 *
 * Módulo PURO. La norma clasifica los activos en nueve niveles, de la industria
 * a la pieza suelta. Esta aplicación NO los tiene todos, y fingir lo contrario
 * sería el tipo de adorno que no resiste una pregunta. Lo que hay es esto:
 *
 *   Nivel 4 · Planta        → la empresa; es una sola, así que está implícita.
 *   Nivel 5 · Sección       → el campo UBICACIÓN de la ficha.
 *   Nivel 6 · Equipo        → la máquina que no depende de otra.
 *   Nivel 7 · Subunidad     → la máquina cuyo campo PLACAPADRE apunta a otra.
 *
 * Los niveles 8 y 9 (componente y pieza) necesitarían un registro por pieza que
 * hoy no existe; lo más cercano es el historial de repuestos de cada ficha.
 *
 * El árbol se construye con datos que YA están en el formato de planta: no se
 * inventa ninguna jerarquía nueva ni se pide volver a clasificar nada.
 */

import { SIN_DATO } from './calidadDatos'

/** Niveles que esta aplicación puede sostener con sus datos. */
export const NIVELES = [
  { nivel: 4, nombre: 'Planta', origen: 'La empresa' },
  { nivel: 5, nombre: 'Sección', origen: 'Campo UBICACIÓN' },
  { nivel: 6, nombre: 'Equipo', origen: 'Ficha sin equipo padre' },
  { nivel: 7, nombre: 'Subunidad', origen: 'Ficha con PLACAPADRE' },
]

const limpio = (valor) => {
  const texto = String(valor ?? '').trim()
  return !texto || texto === SIN_DATO ? '' : texto
}

/** Clave de comparación de placas: ni el espacio ni la caja deben importar. */
const clavePlaca = (valor) => limpio(valor).toUpperCase()

/**
 * Construye el árbol Sección → Equipo → Subunidad.
 *
 * @param {Object[]} maquinas
 * @returns {{secciones: Array, huerfanas: Array, resumen: Object}}
 */
export function construirTaxonomia(maquinas) {
  // Índice de placas para resolver PLACAPADRE. Si dos fichas comparten placa se
  // queda la primera: el panel de alertas ya avisa del duplicado, y aquí lo
  // único que se puede hacer es no romperse por ello.
  const porPlaca = new Map()
  for (const maquina of maquinas) {
    const placa = clavePlaca(maquina.placaNueva)
    if (placa && !porPlaca.has(placa)) porPlaca.set(placa, maquina)
  }

  const subunidadesDe = new Map()
  const raices = []
  const huerfanas = []

  for (const maquina of maquinas) {
    const padre = clavePlaca(maquina.placaPadre)

    // Una ficha es subunidad solo si su padre existe y no es ella misma.
    if (padre && porPlaca.has(padre) && porPlaca.get(padre).id !== maquina.id) {
      const idPadre = porPlaca.get(padre).id
      if (!subunidadesDe.has(idPadre)) subunidadesDe.set(idPadre, [])
      subunidadesDe.get(idPadre).push(maquina)
      continue
    }

    // Apunta a un padre que no está en el catálogo: se trata como equipo, pero
    // se señala, porque es un dato roto que conviene corregir.
    if (padre && !porPlaca.has(padre)) huerfanas.push({ maquina, padre })

    raices.push(maquina)
  }

  const porSeccion = new Map()
  for (const maquina of raices) {
    const seccion = limpio(maquina.ubicacion) || 'Sin ubicación asignada'
    if (!porSeccion.has(seccion)) porSeccion.set(seccion, [])
    porSeccion.get(seccion).push({
      maquina,
      subunidades: subunidadesDe.get(maquina.id) ?? [],
    })
  }

  const secciones = [...porSeccion.entries()]
    .map(([nombre, equipos]) => ({
      nombre,
      equipos: equipos.sort((a, b) =>
        String(a.maquina.descripcion).localeCompare(String(b.maquina.descripcion), 'es'),
      ),
      total: equipos.reduce((suma, equipo) => suma + 1 + equipo.subunidades.length, 0),
      // «Sin ubicación» al final: es un cajón de sastre, no una sección real.
      sinUbicacion: nombre === 'Sin ubicación asignada',
    }))
    .sort(
      (a, b) =>
        Number(a.sinUbicacion) - Number(b.sinUbicacion) ||
        a.nombre.localeCompare(b.nombre, 'es'),
    )

  const subunidades = [...subunidadesDe.values()].reduce(
    (suma, lista) => suma + lista.length,
    0,
  )

  return {
    secciones,
    huerfanas,
    resumen: {
      secciones: secciones.filter((seccion) => !seccion.sinUbicacion).length,
      equipos: raices.length,
      subunidades,
      sinUbicacion: porSeccion.get('Sin ubicación asignada')?.length ?? 0,
    },
  }
}
