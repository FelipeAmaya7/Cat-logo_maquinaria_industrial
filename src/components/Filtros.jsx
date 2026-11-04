/**
 * Barra de filtros por desplegables.
 *
 * Un solo componente para equipos y para órdenes: cambia la lista de filtros,
 * no la mecánica. Cada filtro declara de qué campo saca sus opciones y, si no
 * se le dan, se calculan a partir de los propios datos — así una ubicación
 * nueva aparece en el desplegable sin tocar código.
 *
 * No guarda estado: lo eleva al contenedor, que es quien filtra. Con el estado
 * aquí dentro habría dos fuentes de verdad sobre lo que se está viendo.
 *
 * @param {Object} props
 * @param {Array<{campo: string, etiqueta: string, opciones?: string[]}>} props.filtros
 * @param {Object<string, string>} props.valores      Filtro -> valor elegido ('' = todos).
 * @param {(campo: string, valor: string) => void} props.onCambiar
 * @param {Object[]} props.datos                      Para deducir las opciones.
 * @param {number} props.resultados
 * @param {number} props.total
 */
function Filtros({ filtros, valores, onCambiar, datos, resultados, total }) {
  /** Valores distintos de un campo, ordenados y sin los vacíos. */
  const opcionesDe = (campo) =>
    [
      ...new Set(
        datos
          .map((registro) => String(registro[campo] ?? '').trim())
          .filter((valor) => valor && valor !== 'No registrado'),
      ),
    ].sort((a, b) => a.localeCompare(b, 'es'))

  const hayFiltroActivo = Object.values(valores).some(Boolean)

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {filtros.map(({ campo, etiqueta, opciones }) => {
        const lista = opciones ?? opcionesDe(campo)
        if (lista.length === 0) return null

        return (
          <label key={campo} className="min-w-0">
            <span className="sr-only">{etiqueta}</span>
            <select
              value={valores[campo] ?? ''}
              onChange={(evento) => onCambiar(campo, evento.target.value)}
              className={`max-w-[14rem] rounded-md border bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-acento-500 focus:ring-2 focus:ring-acento-200 ${
                valores[campo]
                  ? 'border-acento-400 font-medium text-acento-800'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              <option value="">{etiqueta}</option>
              {lista.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </label>
        )
      })}

      {hayFiltroActivo && (
        <button
          type="button"
          onClick={() => filtros.forEach(({ campo }) => onCambiar(campo, ''))}
          className="rounded-md px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-acento-700 transition hover:bg-acento-50"
        >
          Limpiar filtros
        </button>
      )}

      <p className="ml-auto text-xs text-gray-500" role="status">
        <strong className="text-gray-800">{resultados}</strong> de {total}
      </p>
    </div>
  )
}

export default Filtros
