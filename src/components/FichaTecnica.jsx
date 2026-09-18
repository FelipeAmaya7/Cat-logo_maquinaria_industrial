import { useState } from 'react'
import { rutaImagen } from '../data/maquinas'
import { INSTITUCION, RUTA_LOGO, formatearFechaFormato } from '../data/institucion'

/** Contenedor de la fotografía técnica, con respaldo si el archivo no existe. */
function FotoTecnica({ maquina }) {
  const [falloImagen, setFalloImagen] = useState(false)
  const src = rutaImagen(maquina.imagen)

  return (
    <figure className="flex h-full flex-col">
      <figcaption className="border-b border-gray-300 pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-800">
        Fotografía del equipo
      </figcaption>

      <div className="flex flex-1 items-center justify-center rounded-md border border-gray-200 bg-gray-50 p-3">
        {src && !falloImagen ? (
          <img
            src={src}
            alt={`Fotografía técnica de ${maquina.descripcion}`}
            onError={() => setFalloImagen(true)}
            className="max-h-72 w-full rounded object-contain"
          />
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-2 py-16 text-gray-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-12 w-12"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="8.5" cy="9.5" r="1.5" />
              <path d="m5 18 4.5-5 3 3 2.5-2.5L19 18" />
            </svg>
            <p className="text-xs text-gray-500">Sin fotografía registrada</p>
          </div>
        )}
      </div>
    </figure>
  )
}

/** Membrete del formato: código, fecha y versión, tal como vienen del Excel. */
function MembreteFormato({ maquina }) {
  const filas = [
    ['Código', maquina.codigoFormato],
    ['Fecha', formatearFechaFormato(maquina.fechaFormato)],
    ['Versión', maquina.versionFormato],
  ].filter(([, valor]) => valor)

  if (filas.length === 0) return null

  return (
    <table className="w-full border-collapse text-[11px] sm:w-56">
      <tbody>
        {filas.map(([etiqueta, valor]) => (
          <tr key={etiqueta} className="border-b border-gray-300 last:border-b-0">
            <th
              scope="row"
              className="py-1 pr-3 text-left font-bold uppercase tracking-wide text-gray-800"
            >
              {etiqueta}
            </th>
            <td className="py-1 text-right font-mono text-gray-700">{valor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Vista detallada con el formato de ficha técnica utilizado en planta.
 *
 * @param {Object} props
 * @param {import('../data/maquinas').Maquina} props.maquina  Activo a documentar.
 * @param {() => void} props.onInicio                          Regresa a la vista de catálogo.
 */
function FichaTecnica({ maquina, onInicio }) {
  // Pares etiqueta/valor: la tabla se construye por datos, no por marcado repetido.
  const campos = [
    ['Placa nueva', maquina.placaNueva],
    ['Descripción', maquina.descripcion],
    ['Marca', maquina.marca],
    ['Modelo', maquina.modelo],
    ['Serie', maquina.serie],
    ['Año de adquisición', maquina.anioAdquisicion],
    ['Estado', maquina.estado],
    ['Disponibilidad', maquina.disponibilidad],
    ['Ubicación', maquina.ubicacion],
    ['Piso', maquina.piso],
    ['Turno por día', maquina.turnoPorDia],
    ['Capacidad productiva', maquina.capacidad],
    ['Material', maquina.material],
    ['Color', maquina.color],
    ['Dimensión', maquina.dimension],
    ['Vida útil en años', maquina.vidaUtil],
  ]

  const bloques = [
    ['Función que presta', maquina.funcion],
    ['Material procesado', maquina.materialProcesado],
    ['Especificaciones', maquina.especificaciones],
  ]

  return (
    <section className="mx-auto max-w-5xl" aria-label={`Ficha técnica de ${maquina.descripcion}`}>
      <article className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
        {/* Membrete: logo a la izquierda, acción y metadata a la derecha */}
        <header className="flex flex-col gap-4 border-b border-gray-300 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={RUTA_LOGO}
              alt={`Logo de ${INSTITUCION.nombre}`}
              className="h-11 w-auto shrink-0"
            />
            <div className="border-l border-gray-300 pl-4">
              <h2 className="text-base font-bold uppercase tracking-wide text-gray-800">
                Ficha técnica de maquinaria
              </h2>
              <p className="text-xs text-gray-500">{INSTITUCION.proceso}</p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <button
              type="button"
              onClick={onInicio}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
              INICIO
            </button>

            <MembreteFormato maquina={maquina} />
          </div>
        </header>

        {/* Identificación del activo */}
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-300 bg-gray-50 px-5 py-3">
          <span className="rounded bg-industrial-800 px-2.5 py-1 font-mono text-xs font-semibold text-white">
            {maquina.placaNueva}
          </span>
          <h3 className="text-sm font-bold text-gray-800">{maquina.descripcion}</h3>
        </div>

        <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Tabla de datos clave: solo divisorias horizontales, como la hoja de cálculo */}
          <table className="w-full table-fixed border-collapse text-left">
            <caption className="sr-only">Datos de identificación y operación del equipo</caption>
            <tbody>
              {campos.map(([etiqueta, valor]) => (
                <tr key={etiqueta} className="border-b border-gray-300">
                  <th
                    scope="row"
                    className="w-2/5 py-2 pr-4 align-top text-[11px] font-bold uppercase tracking-wide text-gray-800"
                  >
                    {etiqueta}
                  </th>
                  <td className="py-2 align-top text-sm text-gray-700">{valor}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Contenedor de la foto técnica */}
          <FotoTecnica maquina={maquina} />
        </div>

        {/* Campos de texto extenso */}
        <div className="grid grid-cols-1 gap-5 border-t border-gray-300 px-5 py-5 sm:grid-cols-3">
          {bloques.map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <h4 className="border-b border-gray-300 pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-800">
                {etiqueta}
              </h4>
              <p className="pt-2 text-sm leading-relaxed text-gray-700">{valor}</p>
            </div>
          ))}
        </div>

        {/* Pie de documento */}
        <footer className="grid grid-cols-1 border-t border-gray-300 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-600 sm:grid-cols-3">
          <div className="border-gray-300 px-5 py-3 sm:border-r">
            Elaboró: <span className="font-bold text-gray-800">Mantenimiento</span>
          </div>
          <div className="border-gray-300 px-5 py-3 sm:border-r">
            Revisó: <span className="font-bold text-gray-800">Jefatura de Planta</span>
          </div>
          <div className="px-5 py-3">
            Registro: <span className="font-mono font-bold text-gray-800">{maquina.id}</span>
          </div>
        </footer>
      </article>
    </section>
  )
}

export default FichaTecnica
