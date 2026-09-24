import { useState } from 'react'
import { INSTITUCION } from '../data/institucion'
import { DistintivoSistema } from './IconoSistema'
import { autenticar, registrar, LONGITUD_MINIMA_CONTRASENA } from '../servicios/cuentas'
import { estaDisponible } from '../servicios/almacenamiento'

const MODOS = {
  INGRESO: 'ingreso',
  REGISTRO: 'registro',
}

/** Clases compartidas por los campos del formulario. */
const CAMPO =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'

const ETIQUETA = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-700'

/**
 * Vista de acceso: inicio de sesión y registro en un solo formulario.
 *
 * No guarda la sesión: cuando las credenciales son válidas avisa al contenedor
 * con `onAutenticar`, que es quien decide qué hacer. Así este componente sigue
 * siendo reemplazable sin tocar la lógica de navegación.
 *
 * @param {Object} props
 * @param {(sesion: {usuario: string}) => void} props.onAutenticar
 */
function Autenticacion({ onAutenticar }) {
  const [modo, setModo] = useState(MODOS.INGRESO)
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const esRegistro = modo === MODOS.REGISTRO
  // Se evalúa una vez por montaje: el permiso no cambia mientras dura la sesión.
  const [almacenamientoOk] = useState(estaDisponible)

  /** Limpia el formulario al alternar entre ingreso y registro. */
  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo)
    setError('')
    setContrasena('')
    setConfirmacion('')
  }

  const enviar = async (evento) => {
    evento.preventDefault()
    setError('')
    setEnviando(true)

    const resultado = esRegistro
      ? await registrar(usuario, contrasena, confirmacion)
      : await autenticar(usuario, contrasena)

    setEnviando(false)

    if (!resultado.ok) {
      setError(resultado.error)
      return
    }

    onAutenticar(resultado.sesion)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 py-10">
      <main className="w-full max-w-sm px-4 sm:max-w-md sm:px-0">
        <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
          {/* Membrete del sistema: ícono genérico, sin marca corporativa */}
          <div className="border-b-4 border-industrial-800 px-6 py-6 text-center">
            <DistintivoSistema className="mx-auto h-12 w-12" claseIcono="h-6 w-6" />
            <h1 className="mt-3 text-sm font-bold uppercase tracking-wide text-gray-800">
              {INSTITUCION.titulo}
            </h1>
            <p className="text-xs text-gray-500">{INSTITUCION.subtitulo}</p>
            <p className="mt-1 text-xs text-gray-500">{INSTITUCION.dependencia}</p>
          </div>

          {/* Selector de modo */}
          <div className="grid grid-cols-2 border-b border-gray-300" role="tablist">
            {[
              [MODOS.INGRESO, 'Iniciar sesión'],
              [MODOS.REGISTRO, 'Crear cuenta'],
            ].map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={modo === valor}
                onClick={() => cambiarModo(valor)}
                className={`px-4 py-3 text-sm font-semibold transition ${
                  modo === valor
                    ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-b-2 border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>

          <form onSubmit={enviar} className="space-y-4 px-6 py-6">
            {!almacenamientoOk && (
              <p
                role="alert"
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
              >
                Este navegador tiene el almacenamiento local bloqueado (suele pasar en
                ventana privada). No se podrán guardar cuentas ni mantener la sesión.
              </p>
            )}
            <div>
              <label htmlFor="usuario" className={ETIQUETA}>
                Usuario
              </label>
              <input
                id="usuario"
                name="username"
                type="text"
                value={usuario}
                onChange={(evento) => setUsuario(evento.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                required
                className={CAMPO}
                placeholder="nombre.usuario"
              />
            </div>

            <div>
              <label htmlFor="contrasena" className={ETIQUETA}>
                Contraseña
              </label>
              <input
                id="contrasena"
                name="password"
                type="password"
                value={contrasena}
                onChange={(evento) => setContrasena(evento.target.value)}
                autoComplete={esRegistro ? 'new-password' : 'current-password'}
                required
                className={CAMPO}
                placeholder="••••••"
              />
              {esRegistro && (
                <p className="mt-1 text-xs text-gray-500">
                  Mínimo {LONGITUD_MINIMA_CONTRASENA} caracteres.
                </p>
              )}
            </div>

            {esRegistro && (
              <div>
                <label htmlFor="confirmacion" className={ETIQUETA}>
                  Confirmar contraseña
                </label>
                <input
                  id="confirmacion"
                  name="confirmPassword"
                  type="password"
                  value={confirmacion}
                  onChange={(evento) => setConfirmacion(evento.target.value)}
                  autoComplete="new-password"
                  required
                  className={CAMPO}
                  placeholder="••••••"
                />
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {enviando ? 'Verificando…' : esRegistro ? 'Crear cuenta e ingresar' : 'Ingresar'}
            </button>

            {esRegistro && (
              <p className="text-xs leading-relaxed text-gray-500">
                Las cuentas nuevas inician con el catálogo vacío. Cada usuario solo ve las
                fichas técnicas que tiene asignadas.
              </p>
            )}
          </form>
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
          Acceso de demostración: las cuentas se guardan en este navegador mediante
          localStorage, sin servidor.
        </p>
      </main>
    </div>
  )
}

export default Autenticacion
