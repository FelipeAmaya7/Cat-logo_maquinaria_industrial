import { useEffect, useRef, useState } from 'react'
import { CAMPOS_ORDEN, aplicarDatosDeEquipo, ordenEnBlanco } from '../data/ordenes'

const CAMPO =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
const CAMPO_AUTO = `${CAMPO} bg-gray-50 text-gray-600`
const CAMPO_INVALIDO =
  'w-full rounded-md border border-red-500 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-red-200'
const ETIQUETA = 'mb-1 block text-xs font-bold uppercase tracking-wide text-gray-700'

/**
 * Formulario de orden de trabajo, en un diálogo.
 *
 * Los campos marca, modelo, serie y ubicación NO se escriben: se copian de la
 * ficha al elegir el equipo y quedan de solo lectura. Así una orden nunca
 * contradice a la ficha del activo al que se refiere.
 *
 * @param {Object} props
 * @param {Object|null} props.orden        Orden a editar, o null para crear una nueva.
 * @param {number} props.siguienteNumero   Consecutivo sugerido al crear.
 * @param {Object[]} props.maquinas        Catálogo del usuario, para el desplegable.
 * @param {(orden: Object) => {ok: boolean, error?: string}} props.onGuardar
 * @param {() => void} props.onCerrar
 */
function FormularioOrden({ orden, siguienteNumero, maquinas, onGuardar, onCerrar }) {
  const [borrador, setBorrador] = useState(
    () => orden ?? { ...ordenEnBlanco(siguienteNumero), ref: `ot-${Date.now().toString(36)}` },
  )
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')

  const dialogo = useRef(null)

  useEffect(() => {
    const alPulsar = (evento) => {
      if (evento.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [onCerrar])

  useEffect(() => {
    dialogo.current?.focus()
  }, [])

  const actualizar = (campo, valor) => {
    setBorrador((previo) => ({ ...previo, [campo]: valor }))
    setErrores((previos) => {
      if (!previos[campo]) return previos
      const siguientes = { ...previos }
      delete siguientes[campo]
      return siguientes
    })
  }

  /** Al elegir equipo se copian sus datos; el resto del borrador no se toca. */
  const elegirEquipo = (id) => {
    const maquina = maquinas.find((m) => m.id === id) ?? null
    setBorrador((previo) => aplicarDatosDeEquipo({ ...previo, equipo: id }, maquina))
    setErrores((previos) => {
      const siguientes = { ...previos }
      delete siguientes.equipo
      return siguientes
    })
  }

  const guardar = () => {
    const problemas = {}
    for (const { campo, requerido, rotulo } of CAMPOS_ORDEN) {
      if (requerido && !String(borrador[campo] ?? '').trim()) {
        problemas[campo] = `${rotulo} es obligatorio.`
      }
    }

    if (Object.keys(problemas).length > 0) {
      setErrores(problemas)
      setError('Complete los campos marcados.')
      document.getElementById(`orden-${Object.keys(problemas)[0]}`)?.focus()
      return
    }

    const resultado = onGuardar(borrador)
    if (!resultado.ok) setError(resultado.error)
  }

  /** Pinta el control que corresponde al tipo del campo. */
  const control = ({ campo, rotulo, tipo, ph, opciones, soloLectura }) => {
    const invalido = Boolean(errores[campo])
    const id = `orden-${campo}`
    const clase = invalido ? CAMPO_INVALIDO : CAMPO

    if (tipo === 'equipo') {
      return (
        <select
          id={id}
          value={borrador[campo] ?? ''}
          onChange={(evento) => elegirEquipo(evento.target.value)}
          className={clase}
        >
          <option value="">— Seleccione un equipo —</option>
          {maquinas.map((maquina) => (
            <option key={maquina.id} value={maquina.id}>
              {maquina.placaNueva} · {maquina.descripcion}
            </option>
          ))}
        </select>
      )
    }

    if (tipo === 'auto') {
      return (
        <input
          id={id}
          type="text"
          value={borrador[campo] ?? ''}
          readOnly
          placeholder={ph ?? undefined}
          className={CAMPO_AUTO}
        />
      )
    }

    if (tipo === 'area') {
      return (
        <textarea
          id={id}
          rows={3}
          placeholder={ph ?? undefined}
          value={borrador[campo] ?? ''}
          onChange={(evento) => actualizar(campo, evento.target.value)}
          className={`${clase} resize-y leading-relaxed`}
        />
      )
    }

    if (tipo === 'select') {
      return (
        <select
          id={id}
          value={borrador[campo] ?? ''}
          onChange={(evento) => actualizar(campo, evento.target.value)}
          className={clase}
        >
          <option value="">— Seleccione —</option>
          {opciones.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        id={id}
        type={tipo === 'fecha' ? 'date' : 'text'}
        inputMode={tipo === 'numero' ? 'numeric' : undefined}
        value={borrador[campo] ?? ''}
        onChange={(evento) => actualizar(campo, evento.target.value)}
        placeholder={ph ?? undefined}
        readOnly={soloLectura}
        className={soloLectura ? CAMPO_AUTO : clase}
        aria-label={rotulo}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar()
      }}
    >
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-orden"
        tabIndex={-1}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-gray-300 bg-white shadow-xl outline-none sm:max-w-3xl sm:rounded-lg"
      >
        <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-gray-300 bg-white px-5 py-4">
          <div>
            <h2 id="titulo-orden" className="text-base font-bold text-gray-800">
              {orden ? 'Editar orden de trabajo' : 'Nueva orden de trabajo'}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Los datos del equipo se copian de su ficha técnica.
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="shrink-0 rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
          {CAMPOS_ORDEN.map((definicion) => (
            <div
              key={definicion.campo}
              className={definicion.tipo === 'area' ? 'sm:col-span-2' : undefined}
            >
              <label htmlFor={`orden-${definicion.campo}`} className={ETIQUETA}>
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
            className="mx-5 mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-gray-300 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
          >
            {orden ? 'Guardar cambios' : 'Agregar orden'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default FormularioOrden
