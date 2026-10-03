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

import { esFechaIso } from '../servicios/anclajeRotulos'
import { opcionesConValorActual } from '../data/opcionesCampo'

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
            {/* Se marca lo que no estaba previsto, para que se note y se pueda corregir. */}
            {opcion === ajeno ? `${opcion} (valor actual)` : opcion}
          </option>
        ))}
      </select>
    )
  }

  // Un calendario solo acepta AAAA-MM-DD; con cualquier otra cosa se pinta
  // VACÍO y el dato se pierde al guardar. Una fecha venida de una hoja de
  // cálculo puede llegar como «9/22/26», así que si no se reconoce el formato
  // se degrada a casilla de texto: se ve, se puede corregir y no se pierde.
  const fechaIlegible = tipo === 'date' && valor && !esFechaIso(valor)

  return (
    <input
      {...comunes}
      // Un campo numérico no debe rechazar «No registrado» en una ficha a medio
      // diligenciar: se deja el teclado numérico sin bloquear el texto.
      type={tipo === 'number' || fechaIlegible ? 'text' : tipo}
      inputMode={tipo === 'number' ? 'numeric' : undefined}
      placeholder={fechaIlegible ? 'AAAA-MM-DD' : (ph ?? undefined)}
      title={fechaIlegible ? 'Formato no reconocido. Escríbala como AAAA-MM-DD.' : undefined}
      required={requerido}
      className={clase}
    />
  )
}

export default CampoFicha
