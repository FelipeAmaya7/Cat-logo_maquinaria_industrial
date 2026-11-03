import { useState } from 'react'
import { DEFINICIONES, formatear } from '../servicios/indicadores'

/**
 * Color de cada indicador.
 *
 * Solo los cuatro primeros llevan color: son los que se leen de un vistazo. Si
 * las ocho tarjetas fueran de colores distintos parecerían ocho cosas sin
 * relación, que es justo lo que le pasa al tablero que nos sirve de referencia.
 */
const ACENTO = {
  a: 'text-emerald-600',
  mttr: 'text-red-600',
  mtbf: 'text-acento-600',
  mttf: 'text-violet-600',
}

/** Tarjeta de un indicador. */
function Tarjeta({ definicion, valor }) {
  const { clave, sigla, nombre, formula } = definicion

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3.5">
      <div className="flex items-baseline gap-2">
        <span className={`text-sm font-bold ${ACENTO[clave] ?? 'text-gray-700'}`}>{sigla}</span>
        <span className="truncate text-[11px] text-gray-500" title={nombre}>
          {nombre}
        </span>
      </div>

      <p className="mt-1.5 text-2xl font-bold tabular-nums text-gray-900">
        {formatear(clave, valor)}
      </p>
      <p className="mt-0.5 text-[11px] text-gray-400">{formula}</p>
    </div>
  )
}

/**
 * Indicadores de confiabilidad y matriz por equipo.
 *
 * @param {Object} props
 * @param {Object} props.resultado  Lo que devuelve `calcularIndicadores`.
 * @param {(id: string) => void} props.onAbrirEquipo
 */
function Indicadores({ resultado, onAbrirEquipo }) {
  const [verFormulas, setVerFormulas] = useState(false)
  const { matriz, cubiertas, total, totales } = resultado

  if (total === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-gray-800">No hay equipos registrados</p>
      </div>
    )
  }

  return (
    <>
      {/*
        La cobertura se dice siempre, y antes que los números. Promediar sobre
        las máquinas que sí tienen datos y presentarlo como si fuera el parque
        entero es la forma más fácil de que un indicador mienta.
      */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          <strong className="text-gray-900">{cubiertas}</strong> de {total} equipos con datos
          suficientes.{' '}
          <span className="text-gray-500">
            Se necesita al menos una orden de trabajo con fecha: el periodo se mide desde el
            primer registro de mantenimiento, no desde la compra.
          </span>
        </p>

        <button
          type="button"
          onClick={() => setVerFormulas((previo) => !previo)}
          aria-expanded={verFormulas}
          className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          {verFormulas ? 'Ocultar fórmulas' : 'Ver fórmulas'}
        </button>
      </div>

      {verFormulas && (
        <dl className="mb-5 grid grid-cols-1 gap-x-8 gap-y-2 rounded-lg border border-gray-200 bg-white px-5 py-4 text-sm sm:grid-cols-2">
          {DEFINICIONES.map(({ clave, sigla, nombre, formula }) => (
            <div key={clave} className="flex items-baseline gap-2">
              <dt className="w-14 shrink-0 font-bold text-gray-700">{sigla}</dt>
              <dd className="min-w-0 text-gray-600">
                {nombre} <span className="text-gray-400">= {formula}</span>
              </dd>
            </div>
          ))}
          <p className="pt-2 text-xs text-gray-500 sm:col-span-2">
            Solo cuentan las órdenes <strong>ejecutadas</strong> y con duración registrada. El
            periodo va desde la primera orden registrada del equipo hasta hoy.
          </p>
        </dl>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DEFINICIONES.map((definicion) => (
          <Tarjeta key={definicion.clave} definicion={definicion} valor={totales[definicion.clave]} />
        ))}
      </div>

      {matriz.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
          <h3 className="border-b border-gray-200 px-4 py-3 text-sm font-bold text-gray-800">
            Matriz de indicadores por equipo
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th scope="col" className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-600">
                    Equipo
                  </th>
                  {DEFINICIONES.map(({ clave, sigla, nombre }) => (
                    <th
                      key={clave}
                      scope="col"
                      title={nombre}
                      className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-gray-600"
                    >
                      {sigla}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {matriz.map((fila) => (
                  <tr key={fila.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => onAbrirEquipo(fila.id)}
                        className="truncate text-left font-medium text-acento-700 transition hover:underline"
                      >
                        {fila.descripcion}
                      </button>
                    </td>
                    {DEFINICIONES.map(({ clave }) => (
                      <td key={clave} className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-gray-700">
                        {formatear(clave, fila[clave])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

export default Indicadores
