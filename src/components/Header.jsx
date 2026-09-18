import { INSTITUCION, RUTA_LOGO } from '../data/institucion'

/**
 * Encabezado institucional.
 * Componente de presentación puro: no recibe props ni maneja estado.
 *
 * El logo oficial ya contiene el nombre de la empresa, así que el <h1> se deja
 * accesible para lectores de pantalla pero oculto visualmente: así no se repite
 * la marca dos veces en pantalla sin perder la estructura semántica.
 *
 * @param {Object} props
 * @param {string} props.usuario                Usuario con la sesión abierta.
 * @param {() => void} props.onCerrarSesion     Cierra la sesión activa.
 */
function Header({ usuario, onCerrarSesion }) {
  return (
    <header className="border-b-4 border-red-600 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <img
            src={RUTA_LOGO}
            alt={`Logo de ${INSTITUCION.nombre}`}
            className="h-12 w-auto shrink-0"
          />

          <div className="border-l border-gray-300 pl-4">
            <h1 className="sr-only">{INSTITUCION.nombre}</h1>
            <p className="text-sm font-semibold text-gray-800">{INSTITUCION.subtitulo}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-left text-xs leading-relaxed text-gray-500 sm:text-right">
            <p className="font-semibold uppercase tracking-wider text-industrial-800">
              {INSTITUCION.dependencia}
            </p>
            <p>
              Sesión: <span className="font-mono text-gray-700">{usuario}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrarSesion}
            className="shrink-0 rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-700 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
