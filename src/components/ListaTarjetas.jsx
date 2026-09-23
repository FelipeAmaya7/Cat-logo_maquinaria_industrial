import { useState } from 'react'
import { resolverFotografia } from '../data/fotografias'

/**
 * Colores del distintivo según la disponibilidad operativa.
 * Las claves corresponden a los valores reales del formato de planta.
 */
const ESTILO_DISPONIBILIDAD = {
  USO: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ALMACENADO: 'bg-amber-50 text-amber-700 ring-amber-200',
  'FUERA DE SERVICIO': 'bg-rose-50 text-rose-700 ring-rose-200',
}

const ESTILO_POR_DEFECTO = 'bg-slate-50 text-slate-600 ring-slate-200'

/** Marco de la fotografía con respaldo cuando el archivo aún no existe. */
function Miniatura({ maquina }) {
  const [falloImagen, setFalloImagen] = useState(false)
  const src = resolverFotografia(maquina.imagen)

  if (!src || falloImagen) {
    return (
      <div className="flex h-40 w-full items-center justify-center bg-gray-100 text-gray-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-10 w-10"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="m5 18 4.5-5 3 3 2.5-2.5L19 18" />
        </svg>
        <span className="sr-only">Sin fotografía registrada</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={`Fotografía de ${maquina.descripcion}`}
      loading="lazy"
      onError={() => setFalloImagen(true)}
      className="h-40 w-full bg-gray-100 object-cover"
    />
  )
}

/** Tarjeta individual del catálogo. */
function Tarjeta({ maquina, onSeleccionar }) {
  const estiloBadge = ESTILO_DISPONIBILIDAD[maquina.disponibilidad] ?? ESTILO_POR_DEFECTO

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md">
      <Miniatura maquina={maquina} />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="rounded bg-industrial-800 px-2 py-0.5 font-mono text-[11px] font-semibold text-white">
            {maquina.placaNueva}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${estiloBadge}`}
          >
            {maquina.disponibilidad}
          </span>
        </div>

        <h3 className="text-base font-semibold leading-snug text-gray-800">
          {maquina.descripcion}
        </h3>

        <dl className="space-y-1 text-xs text-slate-600">
          <div className="flex gap-1">
            <dt className="font-semibold text-slate-500">ID:</dt>
            <dd className="font-mono">{maquina.id}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-semibold text-slate-500">Marca:</dt>
            <dd>
              {maquina.marca} · {maquina.modelo}
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-semibold text-slate-500">Ubicación:</dt>
            <dd>{maquina.ubicacion}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => onSeleccionar(maquina)}
          className="mt-auto w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        >
          Ver ficha técnica
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
 * @param {boolean} [props.catalogoVacio]  true cuando el usuario no tiene máquinas
 *                                         asignadas, para distinguir ese caso de
 *                                         una búsqueda sin resultados.
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
          {catalogoVacio ? 'No tienes fichas técnicas registradas aún' : 'Sin coincidencias'}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          {catalogoVacio
            ? 'Tu catálogo está vacío. Cada usuario ve únicamente las máquinas que tiene asignadas.'
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
