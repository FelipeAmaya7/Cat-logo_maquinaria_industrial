import { useState } from 'react'
import {
  CAMPOS_REPUESTO,
  COLUMNAS_VISIBLES_REPUESTO,
  costoTotal,
  repuestoEnBlanco,
} from '../data/repuestos'

const CAMPO =
  'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
const CAMPO_INVALIDO =
  'w-full rounded-md border border-red-500 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-red-200'
const ETIQUETA = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-600'

const ROTULO = Object.fromEntries(CAMPOS_REPUESTO.map(({ campo, rotulo }) => [campo, rotulo]))

/** Campos que solo se ven al desplegar una fila. */
const CAMPOS_DETALLE = CAMPOS_REPUESTO.filter(
  ({ campo }) => !COLUMNAS_VISIBLES_REPUESTO.includes(campo),
)

/** Moneda sin decimales: en planta los repuestos se cotizan en pesos enteros. */
const moneda = (valor) =>
  Number(valor).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

/** Fecha ISO presentada como DD/MM/AAAA, sin pasar por `new Date`. */
function fechaLegible(iso) {
  const partes = String(iso ?? '').split('-')
  if (partes.length !== 3) return iso || '—'

  const [anio, mes, dia] = partes
  return `${dia}/${mes}/${anio}`
}

/**
 * Historial de repuestos de una máquina.
 *
 * Vive dentro de la ficha técnica, pero NO es un campo de la ficha: es una
 * colección aparte (ver `data/repuestos.js`). Por eso se puede añadir un
 * repuesto sin entrar en modo edición — cambiar una pieza no es corregir la
 * ficha— y por eso el formulario aparece y desaparece aquí mismo en lugar de
 * abrir un diálogo: el gesto es anotar algo corto, no diligenciar una ficha.
 *
 * @param {Object} props
 * @param {Object[]} props.entradas          Ya filtradas y ordenadas para esta máquina.
 * @param {string} props.idMaquina
 * @param {(repuesto: Object) => {ok: boolean, error?: string}} props.onGuardar
 * @param {(repuesto: Object) => void} props.onEliminar
 */
function HistorialRepuestos({ entradas, idMaquina, onGuardar, onEliminar }) {
  const [borrador, setBorrador] = useState(null)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [refDesplegada, setRefDesplegada] = useState(null)

  const editando = borrador !== null

  const abrirNuevo = () => {
    setBorrador(repuestoEnBlanco(idMaquina))
    setErrores({})
    setError('')
  }

  const abrirExistente = (entrada) => {
    setBorrador({ ...entrada })
    setErrores({})
    setError('')
  }

  const cerrar = () => {
    setBorrador(null)
    setErrores({})
    setError('')
  }

  const actualizar = (campo, valor) => {
    setBorrador((previo) => ({ ...previo, [campo]: valor }))
    setErrores((previos) => {
      if (!previos[campo]) return previos
      const siguientes = { ...previos }
      delete siguientes[campo]
      return siguientes
    })
  }

  const guardar = () => {
    const problemas = {}
    for (const { campo, requerido } of CAMPOS_REPUESTO) {
      if (requerido && !String(borrador[campo] ?? '').trim()) {
        problemas[campo] = 'Obligatorio.'
      }
    }

    if (Object.keys(problemas).length > 0) {
      setErrores(problemas)
      setError('Completa la fecha y el nombre del repuesto.')
      return
    }

    const resultado = onGuardar(borrador)
    if (!resultado.ok) {
      setError(resultado.error)
      return
    }

    cerrar()
  }

  const control = ({ campo, tipo, ph }) => {
    const clase = errores[campo] ? CAMPO_INVALIDO : CAMPO
    const comunes = {
      id: `repuesto-${campo}`,
      value: borrador[campo] ?? '',
      onChange: (evento) => actualizar(campo, evento.target.value),
      className: clase,
    }

    if (tipo === 'area') {
      return <textarea {...comunes} rows={2} placeholder={ph} className={`${clase} resize-y`} />
    }

    return (
      <input
        {...comunes}
        type={tipo === 'fecha' ? 'date' : 'text'}
        // Igual que en la ficha: un numérico no debe rechazar texto en un
        // registro a medio llenar, así que se pide el teclado sin bloquearlo.
        inputMode={tipo === 'numero' ? 'numeric' : undefined}
        placeholder={ph}
      />
    )
  }

  const total = costoTotal(entradas)

  return (
    <section className="border-t border-gray-300 px-5 py-5" aria-label="Historial de repuestos">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-800">
            Historial de repuestos
          </h4>
          <p className="mt-0.5 text-xs text-gray-500">
            {entradas.length === 0
              ? 'Sin repuestos registrados en esta máquina.'
              : `${entradas.length} ${entradas.length === 1 ? 'cambio registrado' : 'cambios registrados'}${
                  total > 0 ? ` · ${moneda(total)} acumulado` : ''
                }`}
          </p>
        </div>

        {!editando && (
          <button
            type="button"
            onClick={abrirNuevo}
            className="shrink-0 rounded-md border border-blue-600 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            + Añadir repuesto
          </button>
        )}
      </div>

      {/* Formulario, aquí mismo: el gesto es anotar algo corto. */}
      {editando && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPOS_REPUESTO.map((definicion) => (
              <div
                key={definicion.campo}
                className={definicion.tipo === 'area' ? 'sm:col-span-2 lg:col-span-3' : undefined}
              >
                <label htmlFor={`repuesto-${definicion.campo}`} className={ETIQUETA}>
                  {definicion.rotulo}
                  {definicion.requerido && <span className="text-red-600"> *</span>}
                </label>
                {control(definicion)}
                {errores[definicion.campo] && (
                  <p className="pt-1 text-[11px] text-red-600">{errores[definicion.campo]}</p>
                )}
              </div>
            ))}
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cerrar}
              className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
            >
              Guardar repuesto
            </button>
          </div>
        </div>
      )}

      {entradas.length > 0 && (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Repuestos cambiados en esta máquina</caption>
            <thead>
              <tr className="border-b border-gray-300">
                {COLUMNAS_VISIBLES_REPUESTO.map((campo) => (
                  <th
                    key={campo}
                    scope="col"
                    className="py-2 pr-3 text-[11px] font-bold uppercase tracking-wide text-gray-600"
                  >
                    {ROTULO[campo]}
                  </th>
                ))}
                <th scope="col" className="py-2 text-right text-[11px] font-bold uppercase tracking-wide text-gray-600">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {entradas.map((entrada) => {
                const desplegada = refDesplegada === entrada.ref

                return (
                  <tr key={entrada.ref} className="border-b border-gray-200 align-top">
                    <td colSpan={COLUMNAS_VISIBLES_REPUESTO.length + 1} className="p-0">
                      <div className="flex flex-wrap items-start gap-2 py-2">
                        <button
                          type="button"
                          onClick={() => setRefDesplegada(desplegada ? null : entrada.ref)}
                          aria-expanded={desplegada}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="grid grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-4">
                            <span className="font-mono text-xs text-gray-600">
                              {fechaLegible(entrada.fecha)}
                            </span>
                            <span className="font-semibold text-gray-800">{entrada.repuesto}</span>
                            <span className="text-xs text-gray-600">
                              {entrada.cantidad || '—'}{' '}
                              {Number(entrada.cantidad) === 1 ? 'unidad' : 'unidades'}
                            </span>
                            <span className="truncate text-xs text-gray-600">
                              {entrada.instaladoPor || '—'}
                            </span>
                          </span>
                        </button>

                        <span className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => abrirExistente(entrada)}
                            className="rounded px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => onEliminar(entrada)}
                            className="rounded px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                          >
                            Quitar
                          </button>
                        </span>
                      </div>

                      {desplegada && (
                        <dl className="mb-2 grid grid-cols-1 gap-x-4 gap-y-1 rounded-md bg-gray-50 px-3 py-2 text-xs sm:grid-cols-2">
                          {CAMPOS_DETALLE.map(({ campo, rotulo }) => (
                            <div key={campo} className="flex gap-2">
                              <dt className="shrink-0 font-semibold text-gray-500">{rotulo}:</dt>
                              <dd className="min-w-0 break-words text-gray-800">
                                {campo === 'costoUnitario' && entrada[campo]
                                  ? moneda(entrada[campo])
                                  : entrada[campo] || '—'}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default HistorialRepuestos
