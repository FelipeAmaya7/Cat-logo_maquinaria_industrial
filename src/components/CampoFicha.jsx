/**
 * Control de edición de un campo de la ficha técnica.
 *
 * POR QUÉ EXISTE
 * --------------
 * Los mismos datos se escriben en dos pantallas: el formulario de ficha nueva
 * (`FormularioFicha`) y el modo edición de una ficha existente (`FichaTecnica`).
 * Cada una pintaba sus propios controles, y se desincronizaron: el formulario
 * respetaba el `tipo` declarado en `controlesFicha.js` —desplegables, fechas,
 * teclado numérico— y la ficha pintaba una casilla de texto para todo.
 *
 * Con un solo componente eso no puede volver a pasar: declarar una lista nueva
 * en `controlesFicha.js` la hace aparecer en las dos pantallas a la vez.
 *
 * El aspecto NO se decide aquí. Cada pantalla pasa sus clases, porque la tabla
 * de la ficha usa controles compactos y el formulario los usa holgados.
 */

import { useRef } from 'react'
import { SIN_DATO, aFechaIso, esFechaIso } from '../servicios/anclajeRotulos'
import { opcionesConValorActual } from '../data/opcionesCampo'

/**
 * Valor listo para un `<input type="date">`, o null si no se puede afirmar.
 *
 * Devuelve cadena vacía para lo que está sin diligenciar —vacío o el marcador
 * `No registrado`— de modo que el calendario se pinte listo para usarse en vez
 * de degradarse a casilla de texto por un dato que simplemente no existe.
 *
 * El criterio de qué es una fecha NO se decide aquí: se toma de
 * `anclajeRotulos.js`, el mismo que usa el lector de hojas de cálculo. Tener
 * dos reglas distintas para lo mismo es lo que hizo falta arreglar: una de
 * ellas adivinaba el orden de día y mes y producía fechas inexistentes como
 * «2026-22-09», que el navegador acepta en silencio y pinta vacías.
 *
 * @param {string} texto
 * @returns {string|null} ISO, cadena vacía, o null si el texto no es fecha.
 */
function valorParaCalendario(texto) {
  const limpio = String(texto ?? '').trim()
  if (!limpio || limpio === SIN_DATO) return ''
  if (esFechaIso(limpio)) return limpio

  // Convierte lo inequívoco (año primero); lo ambiguo devuelve null a propósito.
  return aFechaIso(limpio)
}

/**
 * Control interactivo de fecha con botón de apertura, hoy y limpiar.
 */
function ControlFecha({
  id,
  valor,
  onCambiar,
  clase,
  invalido,
  describedBy,
  requerido,
  ph,
}) {
  const inputRef = useRef(null)
  const valorIso = valorParaCalendario(valor)
  const esIlegible = valorIso === null

  const fijarHoy = () => {
    const hoy = new Date()
    const y = hoy.getFullYear()
    const m = String(hoy.getMonth() + 1).padStart(2, '0')
    const d = String(hoy.getDate()).padStart(2, '0')
    onCambiar(`${y}-${m}-${d}`)
  }

  const limpiar = () => {
    onCambiar('')
  }

  const abrirCalendario = () => {
    if (!inputRef.current) return
    if (typeof inputRef.current.showPicker === 'function') {
      try {
        inputRef.current.showPicker()
      } catch {
        inputRef.current.focus()
      }
    } else {
      inputRef.current.focus()
    }
  }

  if (esIlegible) {
    return (
      <div className="flex flex-col gap-1">
        <input
          id={id}
          type="text"
          value={valor ?? ''}
          onChange={(e) => onCambiar(e.target.value)}
          placeholder={ph ?? 'AAAA-MM-DD'}
          title="Formato no reconocido. Escríbala como AAAA-MM-DD."
          required={requerido}
          aria-invalid={invalido || undefined}
          aria-describedby={describedBy}
          className={clase}
        />
        <div className="flex items-center gap-2 text-[11px] text-amber-700">
          <span>Formato no estándar.</span>
          <button
            type="button"
            onClick={fijarHoy}
            className="font-semibold underline hover:text-amber-900"
          >
            Fijar hoy
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="date"
          value={valorIso}
          onChange={(e) => onCambiar(e.target.value)}
          required={requerido}
          aria-invalid={invalido || undefined}
          aria-describedby={describedBy}
          className={`${clase} cursor-pointer pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-9 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
        />
        {/*
          Fuera del orden de tabulación y oculto para lectores de pantalla: el
          propio <input type="date"> ya es accesible por teclado, y anunciar dos
          controles para la misma fecha sobra. Pero SÍ debe poder pulsarse con el
          ratón, que es para lo que existe; con `pointer-events-none` el clic no
          llegaba nunca y `abrirCalendario` era código muerto.
        */}
        <button
          type="button"
          onClick={abrirCalendario}
          title="Abrir selector de fecha"
          tabIndex={-1}
          aria-hidden="true"
          className="absolute right-2.5 flex items-center justify-center text-gray-500 transition hover:text-blue-600 focus:outline-none"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5"
            />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={fijarHoy}
          className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition"
          title="Fijar la fecha de hoy"
        >
          Hoy
        </button>
        {valorIso ? (
          <button
            type="button"
            onClick={limpiar}
            className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-200 transition"
            title="Quitar fecha"
          >
            Limpiar
          </button>
        ) : null}
      </div>
    </div>
  )
}

/**
 * @param {Object} props
 * @param {Object} props.definicion  Campo resuelto de `gruposFicha.js`.
 * @param {string} props.id          Identificador del control, para su <label>.
 * @param {string} props.valor
 * @param {(valor: string) => void} props.onCambiar
 * @param {string} props.clase       Clases del control, las decide quien lo usa.
 * @param {boolean} [props.invalido]
 * @param {string} [props.describedBy] Id del mensaje de error asociado.
 * @param {number} [props.filas=3]   Alto de los campos de texto extenso.
 */
function CampoFicha({
  definicion,
  id,
  valor,
  onCambiar,
  clase,
  invalido = false,
  describedBy,
  filas = 3,
}) {
  const { tipo, ph, opciones, requerido } = definicion

  const comunes = {
    id,
    value: valor ?? '',
    onChange: (evento) => onCambiar(evento.target.value),
    'aria-invalid': invalido || undefined,
    'aria-describedby': describedBy,
  }

  if (tipo === 'area') {
    return (
      <textarea
        {...comunes}
        rows={filas}
        placeholder={ph ?? undefined}
        className={`${clase} resize-y leading-relaxed`}
      />
    )
  }

  if (tipo === 'select') {
    const { lista, ajeno } = opcionesConValorActual(opciones, valor)

    return (
      <select {...comunes} className={clase}>
        <option value="">— Seleccione —</option>
        {lista.map((opcion) => (
          <option key={opcion} value={opcion}>
            {opcion === ajeno ? `${opcion} (valor actual)` : opcion}
          </option>
        ))}
      </select>
    )
  }

  if (tipo === 'date') {
    return (
      <ControlFecha
        id={id}
        valor={valor}
        onCambiar={onCambiar}
        clase={clase}
        invalido={invalido}
        describedBy={describedBy}
        requerido={requerido}
        ph={ph}
      />
    )
  }

  return (
    <input
      {...comunes}
      type={tipo === 'number' ? 'text' : tipo}
      inputMode={tipo === 'number' ? 'numeric' : undefined}
      placeholder={ph ?? undefined}
      required={requerido}
      className={clase}
    />
  )
}

export default CampoFicha
