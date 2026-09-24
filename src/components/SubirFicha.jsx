import { useEffect, useRef, useState } from 'react'
import { EXTENSIONES_EXCEL, esArchivoExcel, leerFichaDesdeExcel } from '../servicios/lectorExcel'
import { TIPOS_IMAGEN, prepararFotografia } from '../servicios/imagen'

/** Resumen que se muestra tras leer el archivo, antes de confirmar. */
const CAMPOS_RESUMEN = [
  ['placaNueva', 'Placa'],
  ['descripcion', 'Descripción'],
  ['marca', 'Marca'],
  ['modelo', 'Modelo'],
  ['serie', 'Serie'],
  ['anioAdquisicion', 'Año'],
  ['estado', 'Estado'],
  ['ubicacion', 'Ubicación'],
  ['capacidad', 'Capacidad'],
  ['funcion', 'Función'],
]

/**
 * Modal para incorporar una ficha técnica desde un archivo de Excel.
 *
 * Flujo en dos pasos deliberado: primero se LEE y se muestra lo extraído, y solo
 * después se confirma. Ver los datos antes de guardarlos evita incorporar una
 * ficha mal interpretada, que es el riesgo real de leer hojas hechas a mano.
 *
 * @param {Object} props
 * @param {(maquina: Object) => {ok: boolean, error?: string}} props.onConfirmar
 * @param {() => void} props.onCerrar
 * @param {Set<string>} props.idsCatalogo Identificadores ya presentes en el catálogo,
 *        para anunciar si la ficha se va a añadir o a actualizar.
 */
function SubirFicha({ onConfirmar, onCerrar, idsCatalogo }) {
  const [maquina, setMaquina] = useState(null)
  const [faltantes, setFaltantes] = useState([])
  const [nombreExcel, setNombreExcel] = useState('')
  const [fotografia, setFotografia] = useState(null)
  const [nombreFoto, setNombreFoto] = useState('')
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)

  const entradaExcel = useRef(null)
  const entradaFoto = useRef(null)
  const dialogo = useRef(null)

  // Cerrar con Escape es lo que cualquiera espera de un diálogo.
  useEffect(() => {
    const alPulsar = (evento) => {
      if (evento.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [onCerrar])

  // El foco entra al diálogo para que el teclado no siga en la página de atrás.
  useEffect(() => {
    dialogo.current?.focus()
  }, [])

  const procesarExcel = async (archivo) => {
    if (!archivo) return

    setError('')
    setProcesando(true)

    const resultado = await leerFichaDesdeExcel(archivo)

    setProcesando(false)

    if (!resultado.ok) {
      setMaquina(null)
      setError(resultado.error)
      return
    }

    setMaquina(resultado.maquina)
    setFaltantes(resultado.faltantes ?? [])
    setNombreExcel(archivo.name)
  }

  const procesarFoto = async (archivo) => {
    if (!archivo) return

    setError('')
    const resultado = await prepararFotografia(archivo)

    if (!resultado.ok) {
      setError(resultado.error)
      return
    }

    setFotografia(resultado.imagen)
    setNombreFoto(archivo.name)
  }

  const alSoltar = (evento) => {
    evento.preventDefault()
    setArrastrando(false)

    const archivo = evento.dataTransfer.files?.[0]
    if (!archivo) return

    // Se acepta soltar cualquiera de los dos: se decide por el tipo de archivo.
    if (esArchivoExcel(archivo)) procesarExcel(archivo)
    else if (TIPOS_IMAGEN.includes(archivo.type)) procesarFoto(archivo)
    else setError(`Suelte un archivo ${EXTENSIONES_EXCEL.join(' / ')} o una imagen.`)
  }

  // La ficha ya está en el catálogo: subirla de nuevo la actualiza, no la duplica.
  const yaExiste = Boolean(maquina && idsCatalogo?.has(maquina.id))

  const confirmar = () => {
    const resultado = onConfirmar({ ...maquina, imagen: fotografia })
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
        aria-labelledby="titulo-subir-ficha"
        tabIndex={-1}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-gray-300 bg-white shadow-xl outline-none sm:max-w-2xl sm:rounded-lg"
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-300 px-5 py-4">
          <div>
            <h2 id="titulo-subir-ficha" className="text-base font-bold text-gray-800">
              Subir ficha técnica
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              El archivo se procesa en tu equipo; no se envía a ningún servidor.
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

        <div className="space-y-5 px-5 py-5">
          {/* Zona de arrastre */}
          <div
            onDragOver={(evento) => {
              evento.preventDefault()
              setArrastrando(true)
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={alSoltar}
            className={`rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
              arrastrando ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto h-9 w-9 text-gray-400"
              aria-hidden="true"
            >
              <path d="M12 16V4m0 0L8 8m4-4 4 4" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>

            <p className="mt-3 text-sm text-gray-700">
              Arrastra aquí el archivo de Excel, o
            </p>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => entradaExcel.current?.click()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                Seleccionar Excel
              </button>
              <button
                type="button"
                onClick={() => entradaFoto.current?.click()}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              >
                Seleccionar fotografía
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Formatos: {EXTENSIONES_EXCEL.join(', ')} · La fotografía es opcional
            </p>

            <input
              ref={entradaExcel}
              type="file"
              accept={EXTENSIONES_EXCEL.join(',')}
              className="hidden"
              onChange={(evento) => procesarExcel(evento.target.files?.[0])}
            />
            <input
              ref={entradaFoto}
              type="file"
              accept={TIPOS_IMAGEN.join(',')}
              className="hidden"
              onChange={(evento) => procesarFoto(evento.target.files?.[0])}
            />
          </div>

          {procesando && <p className="text-sm text-gray-500">Leyendo el archivo…</p>}

          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {/* Resumen de lo extraído */}
          {maquina && (
            <section className="rounded-lg border border-gray-300">
              <h3 className="border-b border-gray-300 bg-gray-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-700">
                Datos leídos de «{nombreExcel}»
              </h3>

              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <dl className="min-w-0 space-y-1.5 text-sm">
                  {CAMPOS_RESUMEN.map(([campo, etiqueta]) => (
                    <div key={campo} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                      <dt className="shrink-0 text-xs font-bold uppercase tracking-wide text-gray-500 sm:w-28">
                        {etiqueta}
                      </dt>
                      <dd className="min-w-0 break-words text-gray-800">{maquina[campo]}</dd>
                    </div>
                  ))}
                </dl>

                <div className="sm:w-40">
                  {fotografia ? (
                    <figure>
                      <img
                        src={fotografia}
                        alt="Fotografía seleccionada"
                        className="h-32 w-full rounded border border-gray-200 object-cover sm:h-40"
                      />
                      <figcaption className="mt-1 truncate text-[11px] text-gray-500">
                        {nombreFoto}
                      </figcaption>
                    </figure>
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 px-2 text-center text-[11px] text-gray-500 sm:h-40">
                      Sin fotografía: se usará el recuadro gris
                    </div>
                  )}
                </div>
              </div>

              {yaExiste && (
                <p className="border-t border-gray-200 bg-blue-50 px-4 py-2 text-[11px] leading-snug text-blue-800">
                  Ya existe una ficha con la placa <strong>{maquina.placaNueva}</strong> (
                  <span className="font-mono">{maquina.id}</span>). Al confirmar se
                  ACTUALIZARÁ con los datos de este archivo; no se creará una copia.
                </p>
              )}

              {faltantes.length > 0 && (
                <p className="border-t border-gray-200 px-4 py-2 text-[11px] leading-snug text-amber-700">
                  {faltantes.length} rótulo(s) no aparecían en la hoja; esos campos quedaron como
                  «No registrado» y puedes completarlos después con «Editar información».
                </p>
              )}
            </section>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-gray-300 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!maquina}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {yaExiste ? 'Actualizar ficha existente' : 'Añadir al catálogo'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default SubirFicha
