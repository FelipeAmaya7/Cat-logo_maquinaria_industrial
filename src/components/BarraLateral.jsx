import { INSTITUCION } from '../data/institucion'

/**
 * Barra lateral de navegación.
 *
 * Reemplaza a las pestañas sueltas que había sobre el catálogo. El cambio no es
 * estético: con pestañas, cada módulo nuevo competía por un espacio horizontal
 * que se acababa pronto. La barra crece hacia abajo y deja sitio para los
 * módulos que faltan (programación, indicadores, taxonomía).
 *
 * En móvil no hay barra: se convierte en una fila de pestañas desplazable,
 * porque 220 px de ancho fijo se comen media pantalla de un teléfono.
 *
 * @param {Object} props
 * @param {string} props.vista                 Módulo activo.
 * @param {(vista: string) => void} props.onCambiar
 * @param {Array<{clave: string, texto: string, cuenta?: number, icono: JSX.Element}>} props.modulos
 */
function BarraLateral({ vista, onCambiar, modulos }) {
  return (
    <>
      {/* Escritorio: columna fija a la izquierda */}
      <aside className="hidden w-60 shrink-0 flex-col bg-grafito-950 lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-sm font-bold uppercase leading-tight tracking-wide text-white">
            {INSTITUCION.titulo}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-grafito-400">
            {INSTITUCION.subtitulo}
          </p>
        </div>

        <nav className="flex-1 px-3 py-4">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-grafito-500">
            Mantenimiento
          </p>

          <ul className="space-y-1">
            {modulos.map(({ clave, texto, cuenta, icono }) => {
              const activo = vista === clave

              return (
                <li key={clave}>
                  <button
                    type="button"
                    onClick={() => onCambiar(clave)}
                    aria-current={activo ? 'page' : undefined}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                      activo
                        ? 'bg-acento-600 text-white shadow-sm'
                        : 'text-grafito-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="shrink-0" aria-hidden="true">
                      {icono}
                    </span>
                    <span className="flex-1 text-left">{texto}</span>

                    {cuenta !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                          activo ? 'bg-white/20 text-white' : 'bg-white/10 text-grafito-300'
                        }`}
                      >
                        {cuenta}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <p className="border-t border-white/10 px-5 py-4 text-[11px] leading-snug text-grafito-500">
          Los datos se guardan en este navegador. Exporta a Excel para llevarlos
          a otro equipo.
        </p>
      </aside>

      {/* Móvil y tableta: pestañas desplazables */}
      <nav className="flex gap-1 overflow-x-auto bg-grafito-950 px-2 py-2 no-scrollbar lg:hidden">
        {modulos.map(({ clave, texto, cuenta, icono }) => {
          const activo = vista === clave

          return (
            <button
              key={clave}
              type="button"
              onClick={() => onCambiar(clave)}
              aria-current={activo ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                activo ? 'bg-acento-600 text-white' : 'text-grafito-300 hover:bg-white/5'
              }`}
            >
              <span aria-hidden="true">{icono}</span>
              {texto}
              {cuenta !== undefined && (
                <span className="rounded-full bg-white/15 px-1.5 text-[11px] tabular-nums">
                  {cuenta}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </>
  )
}

export default BarraLateral
