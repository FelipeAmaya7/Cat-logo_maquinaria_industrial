/**
 * Ícono técnico genérico del sistema: un engranaje.
 *
 * Sustituye al logo corporativo que antes encabezaba la aplicación. Vive en un
 * componente propio porque lo usan tres pantallas (acceso, encabezado y ficha):
 * tenerlo en un solo sitio evita que se desincronicen y deja un único punto de
 * cambio si algún día se adopta otra marca.
 *
 * @param {Object} props
 * @param {string} [props.className] Clases del <svg>; el tamaño lo decide quien lo usa.
 */
function IconoSistema({ className = 'h-6 w-6' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

/**
 * Distintivo cuadrado con el ícono dentro, tal como aparece en los encabezados.
 *
 * @param {Object} props
 * @param {string} [props.className] Clases del recuadro.
 * @param {string} [props.claseIcono] Clases del ícono interior.
 */
export function DistintivoSistema({
  className = 'h-12 w-12',
  claseIcono = 'h-6 w-6',
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md bg-industrial-800 text-white ${className}`}
    >
      <IconoSistema className={claseIcono} />
    </div>
  )
}

export default IconoSistema
