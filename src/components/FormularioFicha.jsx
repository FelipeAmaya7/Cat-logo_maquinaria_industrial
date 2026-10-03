import { useEffect, useRef, useState } from 'react'
import { SIN_DATO, normalizarClave } from '../servicios/anclajeRotulos'
import { GRUPOS_RESUELTOS, REQUERIDOS } from '../data/gruposFicha'
import { TIPOS_IMAGEN, prepararFotografia } from '../servicios/imagen'

/** Todos los campos, en plano, para inicializar y recoger el borrador. */
const CAMPOS = GRUPOS_RESUELTOS.flatMap((grupo) => grupo.campos)

const CAMPO =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
const CAMPO_INVALIDO =
  'w-full rounded-md border border-red-500 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-red-200'
const ETIQUETA = 'mb-1 block text-xs font-bold uppercase tracking-wide text-gray-700'

/**
 * Formulario para crear una ficha técnica de maquinaria industrial sin partir de un archivo de Excel.
 *
 * Los campos que se dejen vacíos se guardan como «No registrado», el mismo
 * marcador que usa el extractor del libro de planta: así una ficha escrita a
 * mano y una importada se comportan igual en el resto de la aplicación.
 *
 * @param {Object} props
 * @param {Set<string>} props.idsUsados
 * @param {(maquina: Object) => {ok: boolean, error?: string}} props.onGuardar
 * @param {() => void} props.onCerrar
 */
function FormularioFicha({ idsUsados, onGuardar, onCerrar }) {
  const [borrador, setBorrador] = useState(() =>
    Object.fromEntries(CAMPOS.map(({ campo }) => [campo, ''])),
  )
  const [imagen, setImagen] = useState(null)
  const [nombreFoto, setNombreFoto] = useState('')
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')

  const entradaFoto = useRef(null)
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

  const elegirFoto = async (archivo) => {
    if (!archivo) return
    setError('')

    const resultado = await prepararFotografia(archivo)
    if (!resultado.ok) {
      setError(resultado.error)
      return
    }

    setImagen(resultado.imagen)
    setNombreFoto(archivo.name)
  }

  /**
   * Pinta el control que corresponde al campo de maquinaria.
   */
  const control = ({ campo, tipo, ph, opciones, requerido }) => {
    const id = `ficha-${campo}`
    const clase = errores[campo] ? CAMPO_INVALIDO : CAMPO
    const comunes = {
      id,
      value: borrador[campo],
      onChange: (evento) => actualizar(campo, evento.target.value),
    }

    if (tipo === 'area') {
      return (
        <textarea
          {...comunes}
          rows={3}
          placeholder={ph ?? undefined}
          className={`${clase} resize-y leading-relaxed`}
        />
      )
    }

    if (tipo === 'select') {
      return (
        <select {...comunes} className={clase}>
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
        {...comunes}
        type={tipo === 'number' ? 'text' : tipo}
        placeholder={ph ?? undefined}
        required={requerido}
        // Un campo numérico no debe rechazar «NO APLICA» en una ficha a medio
        // diligenciar: se deja el teclado numérico sin bloquear el texto.
        inputMode={tipo === 'number' ? 'numeric' : undefined}
        className={clase}
      />
    )
  }

  const guardar = () => {
    const problemas = {}
    for (const campo of REQUERIDOS) {
      if (!borrador[campo].trim()) problemas[campo] = 'Este dato es obligatorio.'
    }

    const placa = borrador.placaNueva.trim()
    const id = normalizarClave(placa).replace(/[^A-Z0-9]/g, '')
    if (!problemas.placaNueva && idsUsados.has(id)) {
      problemas.placaNueva = 'Ya existe una ficha con esa placa en tu catálogo.'
    }

    if (Object.keys(problemas).length > 0) {
      setErrores(problemas)
      setError('Complete los campos marcados.')
      document.getElementById(`ficha-${Object.keys(problemas)[0]}`)?.focus()
      return
    }

    // Lo que se deje vacío queda igual que un campo sin diligenciar del formato.
    const valores = Object.fromEntries(
      CAMPOS.map(({ campo }) => [campo, borrador[campo].trim() || SIN_DATO]),
    )

    const resultado = onGuardar({
      ...valores,
      id: id || `FICHA-${Date.now().toString(36).toUpperCase()}`,
      imagen,
      hoja: 'Creada en la aplicación',
      codigoFormato: null,
      fechaFormato: new Date().toISOString().slice(0, 10),
      versionFormato: null,
      origen: 'formulario',
    })

    if (!resultado.ok) setError(resultado.error)
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
        aria-labelledby="titulo-ficha-nueva"
        tabIndex={-1}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-gray-300 bg-white shadow-xl outline-none sm:max-w-3xl sm:rounded-lg"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-300 bg-white px-5 py-4">
          <div>
            <h2 id="titulo-ficha-nueva" className="text-base font-bold text-gray-800">
              Nueva ficha técnica de maquinaria
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Lo que dejes vacío se guardará como «{SIN_DATO}».
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

        <div className="px-5 py-5">
          {/* Fotografía técnica */}
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center">
            <div className="h-24 w-32 shrink-0 overflow-hidden rounded border border-gray-300 bg-white">
              {imagen ? (
                <img src={imagen} alt="Fotografía de la máquina" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-[11px] text-gray-400">
                  Sin fotografía
                </div>
              )}
            </div>

            <div className="min-w-0">
              <button
                type="button"
                onClick={() => entradaFoto.current?.click()}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {imagen ? 'Cambiar fotografía' : 'Elegir fotografía'}
              </button>
              <p className="mt-1 truncate text-xs text-gray-500">
                {nombreFoto || 'Opcional · se reescala a 1200 px y se guarda en WebP'}
              </p>

              <input
                ref={entradaFoto}
                type="file"
                accept={TIPOS_IMAGEN.join(',')}
                className="hidden"
                onChange={(evento) => elegirFoto(evento.target.files?.[0])}
              />
            </div>
          </div>

          {/* Campos agrupados por secciones técnicas */}
          <div className="space-y-4">
            {GRUPOS_RESUELTOS.map((grupo) => (
              <details
                key={grupo.titulo}
                open={true}
                className="rounded-lg border border-gray-200"
              >
                <summary className="cursor-pointer select-none rounded-lg bg-gray-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-700 hover:bg-gray-100">
                  {grupo.titulo}
                  <span className="ml-2 font-normal normal-case text-gray-400">
                    {grupo.campos.length} campos
                  </span>
                </summary>

                <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2">
                  {grupo.campos.map((definicion) => (
                    <div
                      key={definicion.campo}
                      className={definicion.extenso ? 'sm:col-span-2' : undefined}
                    >
                      <label htmlFor={`ficha-${definicion.campo}`} className={ETIQUETA}>
                        {definicion.rotulo}
                        {definicion.requerido && <span className="text-red-600"> *</span>}
                      </label>

                      {control(definicion)}

                      {errores[definicion.campo] && (
                        <p className="pt-1 text-[11px] text-red-600">
                          {errores[definicion.campo]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
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
            Crear ficha
          </button>
        </footer>
      </div>
    </div>
  )
}

export default FormularioFicha
