import { resumirAlertas } from '../servicios/alertas'

/** Color del punto según la gravedad: el mismo criterio que la criticidad. */
const COLOR = {
  alta: 'bg-red-500',
  media: 'bg-amber-500',
  baja: 'bg-grafito-400',
}

/** Tono del motivo, a la derecha de cada fila. */
const TEXTO = {
  alta: 'text-red-700',
  media: 'text-amber-700',
  baja: 'text-grafito-500',
}

/** Tarjeta de conteo de la cabecera. */
function Conteo({ etiqueta, valor, acento }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className={`text-2xl font-bold tabular-nums ${acento}`}>{valor}</p>
      <p className="mt-0.5 text-xs text-gray-500">{etiqueta}</p>
    </div>
  )
}

/**
 * Panel de mantenimiento: qué pasa hoy.
 *
 * Todas las filas salen de los datos ya registrados; ninguna se escribe a mano.
 * Y cada una es pulsable: una alerta que no lleva a la orden o al equipo que la
 * provoca obliga a buscarlos a mano y deja de ahorrar trabajo.
 *
 * @param {Object} props
 * @param {Array} props.alertas
 * @param {(destino: Object) => void} props.onAbrir
 */
function PanelAlertas({ alertas, onAbrir }) {
  const resumen = resumirAlertas(alertas)

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Conteo etiqueta="Alertas activas" valor={resumen.total} acento="text-gray-900" />
        <Conteo etiqueta="Requieren acción" valor={resumen.altas} acento="text-red-600" />
        <Conteo etiqueta="Por vigilar" valor={resumen.medias} acento="text-amber-600" />
        <Conteo etiqueta="Informativas" valor={resumen.bajas} acento="text-grafito-500" />
      </div>

      {alertas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-gray-800">Sin alertas</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            No hay órdenes vencidas, códigos repetidos ni fichas incompletas.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
          <ul className="divide-y divide-gray-200">
            {alertas.map((alerta) => (
              <li key={alerta.clave}>
                <button
                  type="button"
                  onClick={() => onAbrir(alerta.destino)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-acento-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-acento-400"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${COLOR[alerta.gravedad]}`}
                    aria-hidden="true"
                  />

                  <span className="w-28 shrink-0 truncate font-mono text-[11px] text-grafito-500">
                    {alerta.codigo}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                    {alerta.titulo}
                  </span>

                  <span
                    className={`hidden shrink-0 text-xs font-medium sm:block ${TEXTO[alerta.gravedad]}`}
                  >
                    {alerta.detalle}
                  </span>

                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

export default PanelAlertas
