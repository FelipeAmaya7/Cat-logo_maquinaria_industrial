import { Fragment } from 'react'
import { CAMPOS_ORDEN } from '../data/ordenes'

/** Columnas de la tabla: las demás se ven al desplegar la orden. */
const COLUMNAS_VISIBLES = ['numero', 'fecha', 'equipo', 'mantenimiento', 'tecnico']

const ROTULO = Object.fromEntries(CAMPOS_ORDEN.map(({ campo, rotulo }) => [campo, rotulo]))

/** Campos que se muestran al desplegar una fila. */
const CAMPOS_DETALLE = CAMPOS_ORDEN.filter(({ campo }) => !COLUMNAS_VISIBLES.includes(campo))

/**
 * Listado de órdenes de trabajo.
 *
 * El proyecto de referencia no muestra en pantalla lo que se registra: sus
 * funciones de pintado están vacías y la persona escribe a ciegas. Aquí las
 * órdenes se ven, se despliegan, se editan y se borran.
 *
 * @param {Object} props
 * @param {Object[]} props.ordenes
 * @param {Object[]} props.maquinas             Para mostrar el nombre del equipo.
 * @param {string|null} props.refDesplegada
 * @param {(ref: string|null) => void} props.onDesplegar
 * @param {(orden: Object) => void} props.onEditar
 * @param {(orden: Object) => void} props.onEliminar
 */
function ListaOrdenes({ ordenes, maquinas, refDesplegada, onDesplegar, onEditar, onEliminar }) {
  if (ordenes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-auto h-10 w-10 text-gray-400"
          aria-hidden="true"
        >
          <path d="M9 11h6M9 15h4" />
          <path d="M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1.4.9L12 18l-6.6 2.9A1 1 0 0 1 4 20V5a1 1 0 0 1 1-1Z" />
        </svg>
        <p className="mt-3 text-sm font-semibold text-gray-800">
          No tienes órdenes de trabajo registradas
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          Crea la primera con «+ Nueva orden». Los datos del equipo se copian de su ficha técnica.
        </p>
      </div>
    )
  }

  const nombreEquipo = (id) => {
    const maquina = maquinas.find((m) => m.id === id)
    return maquina ? `${maquina.placaNueva} · ${maquina.descripcion}` : id || '—'
  }

  const celda = (orden, campo) => {
    if (campo === 'equipo') return nombreEquipo(orden.equipo)
    return String(orden[campo] ?? '').trim() || '—'
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-300 bg-gray-50">
              {COLUMNAS_VISIBLES.map((campo) => (
                <th
                  key={campo}
                  scope="col"
                  className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-700"
                >
                  {ROTULO[campo]}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {ordenes.map((orden) => {
              const desplegada = refDesplegada === orden.ref

              return (
                <Fragment key={orden.ref}>
                  <tr className="border-b border-gray-200 align-top">
                    {COLUMNAS_VISIBLES.map((campo) => (
                      <td
                        key={campo}
                        className={`px-4 py-3 text-gray-700 ${
                          campo === 'numero' ? 'font-mono font-semibold text-gray-900' : ''
                        }`}
                      >
                        {celda(orden, campo)}
                      </td>
                    ))}

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onDesplegar(desplegada ? null : orden.ref)}
                          aria-expanded={desplegada}
                          className="rounded border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          {desplegada ? 'Ocultar' : 'Ver todo'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditar(orden)}
                          className="rounded border border-blue-600 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onEliminar(orden)}
                          className="rounded border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>

                  {desplegada && (
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td colSpan={COLUMNAS_VISIBLES.length + 1} className="px-4 py-4">
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                          {CAMPOS_DETALLE.map(({ campo, rotulo }) => (
                            <div key={campo} className="min-w-0">
                              <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                                {rotulo}
                              </dt>
                              <dd className="break-words text-sm text-gray-700">
                                {celda(orden, campo)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ListaOrdenes
