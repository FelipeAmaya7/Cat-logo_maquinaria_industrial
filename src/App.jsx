import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import Buscador from './components/Buscador'
import ListaTarjetas from './components/ListaTarjetas'
import FichaTecnica from './components/FichaTecnica'
import Autenticacion from './components/Autenticacion'
import { filtrarMaquinas } from './data/maquinas'
import { obtenerMaquinasPorId } from './data/catalogo'
import {
  cerrarSesion,
  leerSesion,
  maquinasDeUsuario,
  sembrarDatosIniciales,
} from './servicios/cuentas'

/** Vistas disponibles una vez iniciada la sesión. */
const VISTAS = {
  CATALOGO: 'catalogo',
  FICHA: 'ficha',
}

/**
 * Controlador de sesión y navegación.
 *
 * La aplicación es estática (sin router ni backend): la vista activa se decide
 * con estado local, lo que mantiene el árbol de componentes simple y explicable.
 * App es el único componente con estado; los demás reciben datos por props.
 *
 * El catálogo NO es el listado completo: se resuelve a partir de los
 * identificadores asignados al usuario con la sesión abierta, de modo que dos
 * cuentas distintas nunca comparten fichas.
 */
function App() {
  const [sesion, setSesion] = useState(null)
  const [listo, setListo] = useState(false)
  const [vista, setVista] = useState(VISTAS.CATALOGO)
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState(null)
  const [termino, setTermino] = useState('')

  // Al arrancar: precarga la cuenta inicial y recupera la sesión persistida.
  // El sembrado es asíncrono porque el resumen de la contraseña usa Web Crypto.
  useEffect(() => {
    let vigente = true

    sembrarDatosIniciales().then(() => {
      if (!vigente) return
      setSesion(leerSesion())
      setListo(true)
    })

    // Evita actualizar el estado si el componente se desmontó antes de terminar.
    return () => {
      vigente = false
    }
  }, [])

  // Máquinas asignadas al usuario actual.
  const catalogoUsuario = useMemo(
    () => (sesion ? obtenerMaquinasPorId(maquinasDeUsuario(sesion.usuario)) : []),
    [sesion],
  )

  // Se recalcula solo cuando cambia el catálogo o el término de búsqueda.
  const maquinasFiltradas = useMemo(
    () => filtrarMaquinas(catalogoUsuario, termino),
    [catalogoUsuario, termino],
  )

  /** Abre la ficha técnica del activo seleccionado. */
  const abrirFicha = (maquina) => {
    setMaquinaSeleccionada(maquina)
    setVista(VISTAS.FICHA)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Regresa al catálogo conservando el filtro aplicado. */
  const volverAlCatalogo = () => {
    setVista(VISTAS.CATALOGO)
    setMaquinaSeleccionada(null)
  }

  /** Cierra la sesión y devuelve la aplicación a su estado inicial. */
  const salir = () => {
    cerrarSesion()
    setSesion(null)
    setVista(VISTAS.CATALOGO)
    setMaquinaSeleccionada(null)
    setTermino('')
  }

  // Mientras se lee el almacenamiento no se decide qué vista corresponde: pintar
  // el login aquí provocaría un parpadeo en cada recarga con sesión abierta.
  if (!listo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-sm text-gray-500">Cargando…</p>
      </div>
    )
  }

  if (!sesion) return <Autenticacion onAutenticar={setSesion} />

  const enFicha = vista === VISTAS.FICHA && maquinaSeleccionada !== null

  return (
    <div className="flex min-h-screen flex-col">
      <Header usuario={sesion.usuario} onCerrarSesion={salir} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {enFicha ? (
          <FichaTecnica maquina={maquinaSeleccionada} onInicio={volverAlCatalogo} />
        ) : (
          <>
            {/* Sin máquinas asignadas el buscador no aporta nada. */}
            {catalogoUsuario.length > 0 && (
              <Buscador
                termino={termino}
                onBuscar={setTermino}
                resultados={maquinasFiltradas.length}
                total={catalogoUsuario.length}
              />
            )}
            <ListaTarjetas
              maquinas={maquinasFiltradas}
              onSeleccionar={abrirFicha}
              catalogoVacio={catalogoUsuario.length === 0}
            />
          </>
        )}
      </main>

      <footer className="border-t border-gray-300 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-500 sm:px-6">
          Empaques &amp; Cartones · Catálogo técnico de maquinaria industrial
        </div>
      </footer>
    </div>
  )
}

export default App
