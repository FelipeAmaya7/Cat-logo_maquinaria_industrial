import { plazoDe } from '../servicios/programacion'
import { enFecha } from '../servicios/fechas'

/**
 * Color del encabezado de cada ventana. Mismo criterio que las alertas y la
 * criticidad: rojo lo que ya falló, ámbar lo que está por vencer, gris lo que
 * puede esperar. Un solo lenguaje de color en toda la aplicación.
 */
const CABECERA = {
  alta: 'bg-red-50 text-red-800 border-red-200',
  media: 'bg-amber-50 text-amber-800 border-amber-200',
  baja: 'bg-grafito-50 text-grafito-700 border-gray-200',
}

const ESTILO_TIPO = {
  Correctivo: 'text-red-700',
  Preventivo: 'text-acento-700',
  Predictivo: 'text-violet-700',
}

const ESTILO_PRIORIDAD = {
  Alta: 'bg-red-100 text-red-800 ring-red-200',
  Media: 'bg-amber-50 text-amber-800 ring-amber-200',
  Baja: 'bg-grafito-100 text-grafito-600 ring-grafito-200',
}


/** Una orden pendiente, como fila de la agenda. */
function Fila({ orden, onEditar, onAbrirEquipo }) {
  const vencida = orden.dias !== null && orden.dias < 0

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 transition hover:bg-grafito-50">
      <span className="w-20 shrink-0 font-mono text-[11px] text-grafito-500">
        OT-{String(orden.numero).padStart(4, '0')}
      </span>

      <span className="w-28 shrink-0 text-xs tabular-nums text-gray-600">
        {enFecha(orden.fechaProgramada)}
      </span>

      <span
        className={`w-32 shrink-0 text-xs font-semibold ${
          vencida ? 'text-red-700' : 'text-gray-600'
        }`}
      >
        {plazoDe(orden.dias)}
      </span>

      {/* El equipo lleva a su ficha: desde la agenda se consulta la máquina. */}
      <span className="min-w-0 flex-1">
        {orden.maquina ? (
          <button
            type="button"
            onClick={() => onAbrirEquipo(orden.maquina.id)}
            className="block max-w-full truncate text-left text-sm font-medium text-acento-700 transition hover:underline"
            title={orden.maquina.descripcion}
          >
            {orden.maquina.descripcion}
          </button>
        ) : (
          <span className="text-sm italic text-gray-400">Equipo sin identificar</span>
        )}
      </span>

      <span className={`w-20 shrink-0 text-xs font-semibold ${ESTILO_TIPO[orden.mantenimiento] ?? 'text-gray-500'}`}>
        {orden.mantenimiento || '—'}
      </span>

      {orden.prioridad && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
            ESTILO_PRIORIDAD[orden.prioridad] ?? ''
          }`}
        >
          {orden.prioridad}
        </span>
      )}

      <button
        type="button"
        onClick={() => onEditar(orden)}
        className="shrink-0 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        Abrir
      </button>
    </li>
  )
}

/**
 * Agenda de mantenimiento: lo pendiente, agrupado por cercanía.
 *
 * @param {Object} props
 * @param {Object} props.resultado   Lo que devuelve `agruparProgramacion`.
 * @param {() => void} props.onNueva
 * @param {(orden: Object) => void} props.onEditar
 * @param {(id: string) => void} props.onAbrirEquipo
 * @param {boolean} props.sinEquipos
 */
function Programacion({ resultado, onNueva, onEditar, onAbrirEquipo, sinEquipos }) {
  const { grupos, pendientes, vencidas } = resultado
  const conOrdenes = grupos.filter((grupo) => grupo.ordenes.length > 0)

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          <strong className="text-gray-900">{pendientes}</strong>{' '}
          {pendientes === 1 ? 'orden pendiente' : 'órdenes pendientes'}
          {vencidas > 0 && (
            <>
              {' · '}
              <strong className="text-red-700">{vencidas}</strong>{' '}
              {vencidas === 1 ? 'vencida' : 'vencidas'}
            </>
          )}
        </p>

        <button
          type="button"
          onClick={onNueva}
          disabled={sinEquipos}
          title={sinEquipos ? 'Registra primero una ficha técnica' : undefined}
          className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          + Crear OT
        </button>
      </div>

      {conOrdenes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-gray-800">No hay mantenimientos pendientes</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Todo lo registrado está ejecutado. Las órdenes nuevas aparecen aquí ordenadas por
            fecha.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {conOrdenes.map((grupo) => (
            <section
              key={grupo.clave}
              className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm"
            >
              <header className={`flex items-baseline justify-between gap-3 border-b px-4 py-2.5 ${CABECERA[grupo.gravedad]}`}>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold">{grupo.titulo}</h3>
                  <p className="truncate text-[11px] opacity-80">{grupo.descripcion}</p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums">
                  {grupo.ordenes.length}
                </span>
              </header>

              <ul className="divide-y divide-gray-100">
                {grupo.ordenes.map((orden) => (
                  <Fila
                    key={orden.ref}
                    orden={orden}
                    onEditar={onEditar}
                    onAbrirEquipo={onAbrirEquipo}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}

export default Programacion
