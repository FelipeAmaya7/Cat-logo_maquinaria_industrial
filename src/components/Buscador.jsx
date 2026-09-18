/**
 * Barra de búsqueda por nombre, placa o ID.
 *
 * Componente controlado: no guarda estado propio, lo eleva a App.jsx
 * (patrón "lifting state up"), de modo que el filtrado ocurre en un solo lugar.
 *
 * @param {Object} props
 * @param {string} props.termino             Texto actual de búsqueda.
 * @param {(valor: string) => void} props.onBuscar  Notifica cada cambio al contenedor.
 * @param {number} props.resultados          Cantidad de coincidencias encontradas.
 * @param {number} props.total               Cantidad total de máquinas del catálogo.
 */
function Buscador({ termino, onBuscar, resultados, total }) {
  return (
    <section className="mb-6" aria-label="Búsqueda de maquinaria">
      <label
        htmlFor="buscador-maquinas"
        className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-800"
      >
        Buscar máquina
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>

        <input
          id="buscador-maquinas"
          type="search"
          value={termino}
          onChange={(evento) => onBuscar(evento.target.value)}
          placeholder="Nombre, placa o ID (ej.: flexográfica, EM00012, YAOTA)"
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 bg-white py-3 pl-10 pr-24 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />

        {termino && (
          <button
            type="button"
            onClick={() => onBuscar('')}
            className="absolute inset-y-0 right-0 my-1.5 mr-1.5 rounded px-3 text-xs font-semibold uppercase tracking-wide text-blue-600 transition hover:bg-blue-50"
          >
            Limpiar
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-500" role="status">
        Mostrando <strong className="text-gray-800">{resultados}</strong> de {total}{' '}
        {total === 1 ? 'máquina registrada' : 'máquinas registradas'}
      </p>
    </section>
  )
}

export default Buscador
