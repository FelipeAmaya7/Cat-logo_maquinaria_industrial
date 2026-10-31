/**
 * Criticidad: una misma familia con intensidad creciente.
 *
 * No son cuatro colores sin relación entre sí: el ojo lee la escala y sabe cuál
 * arde primero, sin tener que descifrar una leyenda.
 *
 * Las claves van normalizadas —sin tildes y en mayúsculas— porque el valor
 * llega escrito de dos maneras: «Crítica» si se eligió en el formulario, o
 * «CRÍTICA» si vino de una hoja de Excel, donde todo está en mayúsculas.
 * Comparar en crudo dejaba sin color justo a las fichas importadas.
 */
const ESTILO_CRITICIDAD = {
  CRITICA: 'bg-criticidad-critica text-red-900 ring-red-300',
  ALTA: 'bg-criticidad-alta text-orange-900 ring-orange-300',
  MEDIA: 'bg-criticidad-media text-amber-900 ring-amber-300',
  BAJA: 'bg-criticidad-baja text-grafito-600 ring-grafito-300',
}

const ESTILO_POR_DEFECTO = 'bg-grafito-50 text-grafito-500 ring-grafito-200'

/** Punto de color del estado operativo. */
const COLOR_ESTADO = {
  USO: 'bg-emerald-500',
  ALMACENADO: 'bg-amber-500',
  'FUERA DE SERVICIO': 'bg-red-500',
}

/** Quita tildes y mayúsculas para comparar valores escritos de varias formas. */
const normalizar = (texto) =>
  String(texto ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Marcador que usa el extractor cuando el formato venía sin diligenciar. */
const SIN_DATO = 'No registrado'

/**
 * Tarjeta individual del catálogo.
 *
 * SIN fotografía, a propósito. Las imágenes del libro de planta son capturas de
 * pantalla: traen un listado de archivos pegado a la izquierda y la máquina a la
 * derecha, así que en una franja de tarjeta se ve el listado y no el equipo.
 * Además solo 26 de las 49 fichas tienen imagen. La fotografía se muestra en la
 * ficha técnica, donde hay sitio para verla entera.
 */
function Tarjeta({ maquina, onSeleccionar }) {
  const criticidad = normalizar(maquina.criticidad)
  const sinClasificar = !criticidad || criticidad === normalizar(SIN_DATO)
  const estiloBadge = ESTILO_CRITICIDAD[criticidad] ?? ESTILO_POR_DEFECTO

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-acento-400 hover:shadow-md">
      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[11px] font-semibold tracking-wide text-grafito-500">
            {maquina.placaNueva}
          </span>

          <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-gray-600">
            <span
              className={`h-2 w-2 rounded-full ${
                COLOR_ESTADO[normalizar(maquina.disponibilidad)] ?? 'bg-grafito-400'
              }`}
              aria-hidden="true"
            />
            {maquina.disponibilidad}
          </span>
        </div>

        <h3 className="text-sm font-semibold leading-snug text-gray-900">{maquina.descripcion}</h3>

        <dl className="space-y-1 text-xs text-slate-600">
          <div className="flex items-baseline gap-1.5">
            <dt className="shrink-0 font-semibold text-slate-500">Marca:</dt>
            <dd className="truncate text-gray-700" title={`${maquina.marca} · ${maquina.modelo}`}>
              {maquina.marca} · {maquina.modelo}
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="shrink-0 font-semibold text-slate-500">Ubicación:</dt>
            <dd className="truncate text-gray-700" title={maquina.ubicacion}>
              {maquina.ubicacion}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => onSeleccionar(maquina)}
          className="mt-auto flex w-full items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 text-left transition hover:border-acento-400 hover:bg-acento-50 focus:outline-none focus:ring-2 focus:ring-acento-400 focus:ring-offset-1"
        >
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ring-1 ${estiloBadge}`}>
            {sinClasificar ? 'Sin clasificar' : maquina.criticidad}
          </span>

          <span className="flex items-center gap-1 text-xs font-semibold text-acento-700">
            Ver ficha
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </button>
      </div>
    </article>
  )
}

/**
 * Cuadrícula de tarjetas del catálogo.
 *
 * @param {Object} props
 * @param {import('../data/maquinas').Maquina[]} props.maquinas  Listado ya filtrado.
 * @param {(maquina: Object) => void} props.onSeleccionar        Abre la ficha técnica.
 * @param {boolean} [props.catalogoVacio]  true cuando no hay ninguna ficha registrada,
 *                                         para distinguir ese caso de una búsqueda
 *                                         sin resultados.
 */
function ListaTarjetas({ maquinas, onSeleccionar, catalogoVacio = false }) {
  if (maquinas.length === 0) {
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
          <path d="M14 3v5h5" />
          <path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7Z" />
          <path d="M9 13h6M9 17h4" />
        </svg>

        <p className="mt-3 text-sm font-semibold text-gray-800">
          {catalogoVacio ? 'No hay fichas técnicas registradas' : 'Sin coincidencias'}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          {catalogoVacio
            ? 'Crea una con «+ Nueva ficha» o cárgala desde un archivo de Excel.'
            : 'Verifique el nombre, la placa o el ID ingresado.'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {maquinas.map((maquina) => (
        <Tarjeta key={maquina.id} maquina={maquina} onSeleccionar={onSeleccionar} />
      ))}
    </div>
  )
}

export default ListaTarjetas
