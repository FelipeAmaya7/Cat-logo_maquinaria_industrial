import { useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import Buscador from './components/Buscador'
import ListaTarjetas from './components/ListaTarjetas'
import FichaTecnica from './components/FichaTecnica'
import Autenticacion from './components/Autenticacion'
import SubirFicha from './components/SubirFicha'
import FormularioFicha from './components/FormularioFicha'
import FormularioOrden from './components/FormularioOrden'
import ListaOrdenes from './components/ListaOrdenes'
import { leerLibroCompleto } from './servicios/lectorLibro'
import { filtrarMaquinas } from './data/maquinas'
import { obtenerMaquinasPorId } from './data/catalogo'
import { INSTITUCION } from './data/institucion'
import { MAPA_CAMPOS } from './servicios/anclajeRotulos'
import { descargarCatalogoExcel } from './servicios/exportarExcel'
import { descargarCatalogoHtml } from './servicios/exportarHtml'
import {
  cerrarSesion,
  eliminarMaquina,
  eliminarOrden,
  importarLibro,
  vaciarDatosDeUsuario,
  guardarEdicion,
  guardarMaquinaPropia,
  leerEdiciones,
  leerSesion,
  maquinasDeUsuario,
  maquinasPropias,
  ordenesDeUsuario,
  guardarOrden,
  siguienteNumeroOrden,
  sembrarDatosIniciales,
} from './servicios/cuentas'

/** Campos que un archivo de Excel puede traer; los demás no se tocan al importar. */
const CAMPOS_IMPORTABLES = Object.keys(MAPA_CAMPOS)

/** Vistas disponibles una vez iniciada la sesión. */
const VISTAS = {
  CATALOGO: 'catalogo',
  FICHA: 'ficha',
  ORDENES: 'ordenes',
}

/**
 * Controlador de sesión y navegación.
 *
 * La aplicación es estática (sin router ni backend): la vista activa se decide
 * con estado local, lo que mantiene el árbol de componentes simple y explicable.
 * App es el único componente con estado; los demás reciben datos por props.
 *
 * Dos decisiones que sostienen el resto:
 *
 *   - El catálogo NO es el listado completo: se resuelve a partir de los
 *     identificadores asignados al usuario, así dos cuentas nunca comparten
 *     fichas.
 *   - De la ficha abierta se guarda su ID, no el objeto. Al aplicar una edición
 *     el objeto se recalcula solo, sin necesidad de sincronizar dos estados.
 */
function App() {
  const [sesion, setSesion] = useState(null)
  const [listo, setListo] = useState(false)
  const [vista, setVista] = useState(VISTAS.CATALOGO)
  const [idSeleccionado, setIdSeleccionado] = useState(null)
  const [termino, setTermino] = useState('')
  const [ediciones, setEdiciones] = useState({})
  const [propias, setPropias] = useState([])
  const [subiendo, setSubiendo] = useState(false)
  const [exportando, setExportando] = useState(false)
  // { texto, error }: un mismo recuadro sirve para confirmar y para avisar de un fallo.
  const [aviso, setAviso] = useState({ texto: '', error: false })
  const [ordenes, setOrdenes] = useState([])
  const [creandoFicha, setCreandoFicha] = useState(false)
  const [ordenEnEdicion, setOrdenEnEdicion] = useState(null)
  const [ordenDesplegada, setOrdenDesplegada] = useState(null)
  const [confirmandoVaciado, setConfirmandoVaciado] = useState(false)
  const entradaLibro = useRef(null)

  /**
   * Único punto donde cambia el usuario activo.
   *
   * Las ediciones se cargan aquí, junto con la sesión, en lugar de en un efecto
   * que reaccione a `sesion`: así no se dispara un render en cascada y ambos
   * estados no pueden quedar desincronizados ni por un instante.
   */
  const aplicarSesion = (nuevaSesion) => {
    setSesion(nuevaSesion)
    setEdiciones(nuevaSesion ? leerEdiciones(nuevaSesion.usuario) : {})
    setPropias(nuevaSesion ? maquinasPropias(nuevaSesion.usuario) : [])
    setOrdenes(nuevaSesion ? ordenesDeUsuario(nuevaSesion.usuario) : [])
    setAviso({ texto: '', error: false })
  }

  // Al arrancar: precarga la cuenta inicial y recupera la sesión persistida.
  // El sembrado es asíncrono porque el resumen de la contraseña usa Web Crypto.
  useEffect(() => {
    let vigente = true

    sembrarDatosIniciales().then(() => {
      if (!vigente) return
      const persistida = leerSesion()
      setSesion(persistida)
      setEdiciones(persistida ? leerEdiciones(persistida.usuario) : {})
      setPropias(persistida ? maquinasPropias(persistida.usuario) : [])
      setOrdenes(persistida ? ordenesDeUsuario(persistida.usuario) : [])
      setListo(true)
    })

    // Evita actualizar el estado si el componente se desmontó antes de terminar.
    return () => {
      vigente = false
    }
  }, [])

  // Máquinas del usuario TAL COMO vienen de su origen: las asignadas del libro
  // oficial más las que él mismo cargó desde un archivo de Excel.
  // Esta es la referencia contra la que se decide qué cuenta como edición.
  const catalogoBase = useMemo(() => {
    if (!sesion) return []
    return [...obtenerMaquinasPorId(maquinasDeUsuario(sesion.usuario)), ...propias]
  }, [sesion, propias])

  // El mismo catálogo con las ediciones del usuario aplicadas encima.
  const catalogoUsuario = useMemo(
    () =>
      catalogoBase.map((maquina) =>
        ediciones[maquina.id] ? { ...maquina, ...ediciones[maquina.id] } : maquina,
      ),
    [catalogoBase, ediciones],
  )

  // Se recalcula solo cuando cambia el catálogo o el término de búsqueda.
  const maquinasFiltradas = useMemo(
    () => filtrarMaquinas(catalogoUsuario, termino),
    [catalogoUsuario, termino],
  )

  const maquinaSeleccionada =
    catalogoUsuario.find((maquina) => maquina.id === idSeleccionado) ?? null

  /** Abre la ficha técnica del activo seleccionado. */
  const abrirFicha = (maquina) => {
    setIdSeleccionado(maquina.id)
    setVista(VISTAS.FICHA)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Regresa al catálogo conservando el filtro aplicado. */
  const volverAlCatalogo = () => {
    setVista(VISTAS.CATALOGO)
    setIdSeleccionado(null)
  }

  /**
   * Persiste la edición de una ficha.
   *
   * La ficha entrega TODOS sus valores editables y el parche se calcula aquí,
   * contra la máquina ORIGINAL del catálogo generado. Hacerlo en la ficha era
   * el origen del fallo: allí la máquina ya llega parcheada, así que la
   * diferencia solo contenía lo tocado en esa sesión y cada guardado
   * sobrescribía el parche anterior, borrando las ediciones previas.
   *
   * Calcularlo contra el original mantiene el parche mínimo y autocorrectivo:
   * un campo devuelto a su valor de fábrica desaparece del parche solo.
   *
   * @param {string} idMaquina
   * @param {Object<string, string>} valores Valores editables completos.
   * @returns {boolean} false si el navegador no permitió escribir.
   */
  const aplicarEdicion = (idMaquina, valores) => {
    const original = catalogoBase.find((maquina) => maquina.id === idMaquina)
    if (!original) return false

    const cambios = {}
    for (const [campo, valor] of Object.entries(valores)) {
      if (valor !== String(original[campo] ?? '')) cambios[campo] = valor
    }

    const resultado = guardarEdicion(sesion.usuario, idMaquina, cambios)
    if (resultado.ok) setEdiciones({ ...resultado.ediciones })
    return resultado.ok
  }

  /**
   * Incorpora al catálogo una ficha leída de un archivo de Excel.
   *
   * El identificador sale de la placa, así que subir de nuevo una ficha ya
   * conocida ACTUALIZA la existente. Cómo se actualiza depende de su origen:
   *
   *   - Ficha del libro oficial: el archivo se guarda como EDICIÓN (un parche),
   *     igual que si se hubiera escrito en el formulario. Así el dato de fábrica
   *     sigue intacto y una futura reextracción del Excel no se pierde.
   *   - Ficha cargada por la persona: no existe fuera de aquí, así que su copia
   *     se reemplaza entera.
   *
   * @returns {{ok: boolean, error?: string}}
   */
  const importarFicha = (maquina) => {
    const esPropia = propias.some((existente) => existente.id === maquina.id)
    const enCatalogo = catalogoBase.some((existente) => existente.id === maquina.id)

    const cerrar = (mensaje) => {
      setSubiendo(false)
      setTermino('')
      setAviso({ texto: mensaje, error: false })
      return { ok: true }
    }

    // Ficha del libro oficial: se traduce a un parche de edición.
    if (enCatalogo && !esPropia) {
      const valores = {}
      for (const campo of CAMPOS_IMPORTABLES) {
        valores[campo] = String(maquina[campo] ?? '')
      }

      if (!aplicarEdicion(maquina.id, valores)) {
        return { ok: false, error: 'No se pudieron guardar los cambios en este navegador.' }
      }

      return cerrar(`Ficha «${maquina.descripcion}» actualizada desde el archivo.`)
    }

    // Una recarga sin fotografía no debe borrar la que ya tenía la ficha.
    const previa = propias.find((existente) => existente.id === maquina.id)
    const resultado = guardarMaquinaPropia(sesion.usuario, {
      ...maquina,
      imagen: maquina.imagen ?? previa?.imagen ?? null,
    })
    if (!resultado.ok) return resultado

    setPropias(resultado.maquinas)

    return cerrar(
      resultado.actualizada
        ? `Ficha «${maquina.descripcion}» actualizada desde el archivo.`
        : `Ficha «${maquina.descripcion}» añadida a tu catálogo.`,
    )
  }

  /** Exporta a .xlsx el catálogo completo del usuario, con sus ediciones. */
  const exportarCatalogo = async () => {
    setExportando(true)
    const resultado = await descargarCatalogoExcel(catalogoUsuario, { usuario: sesion.usuario, ordenes })
    setExportando(false)

    setAviso(
      resultado.ok
        ? { texto: `Catálogo descargado como «${resultado.archivo}».`, error: false }
        : { texto: resultado.error, error: true },
    )
  }

  /** Descarga el catálogo como documento HTML con formato. */
  const exportarCatalogoHtml = () => {
    const resultado = descargarCatalogoHtml(catalogoUsuario)
    setAviso(
      resultado.ok
        ? { texto: `Catálogo descargado como «${resultado.archivo}».`, error: false }
        : { texto: resultado.error, error: true },
    )
  }

  /** Mensaje de la barra superior; `error` lo pinta en rojo. */
  const informar = (texto, error = false) => setAviso({ texto, error })

  /**
   * Incorpora una ficha creada a mano, con la misma vía que las importadas:
   * el origen cambia, pero el almacenamiento y el catálogo no distinguen.
   */
  const crearFicha = (maquina) => {
    const resultado = guardarMaquinaPropia(sesion.usuario, maquina)
    if (!resultado.ok) return resultado

    setPropias(resultado.maquinas)
    setCreandoFicha(false)
    setTermino('')
    informar(`Ficha «${maquina.descripcion}» creada.`)
    return { ok: true }
  }

  /** Quita una ficha del catálogo del usuario y vuelve al listado. */
  const quitarFicha = (maquina) => {
    const resultado = eliminarMaquina(sesion.usuario, maquina.id)
    if (!resultado.ok) {
      informar(resultado.error, true)
      return
    }

    setPropias(resultado.maquinas)
    setIdSeleccionado(null)
    setVista(VISTAS.CATALOGO)
    informar(`Ficha «${maquina.descripcion}» eliminada.`)
  }

  /** Crea o actualiza una orden de trabajo. */
  const aplicarOrden = (orden) => {
    const resultado = guardarOrden(sesion.usuario, orden)
    if (!resultado.ok) return resultado

    setOrdenes(resultado.ordenes)
    setOrdenEnEdicion(null)
    informar(
      resultado.actualizada
        ? `Orden N° ${orden.numero} actualizada.`
        : `Orden N° ${orden.numero} registrada.`,
    )
    return { ok: true }
  }

  /** Elimina una orden de trabajo. */
  const quitarOrden = (orden) => {
    const resultado = eliminarOrden(sesion.usuario, orden.ref)
    if (!resultado.ok) {
      informar(resultado.error, true)
      return
    }

    setOrdenes(resultado.ordenes)
    informar(`Orden N° ${orden.numero} eliminada.`)
  }

  /**
   * Carga un LIBRO completo: sus tres hojas de una vez.
   *
   * Es distinto de «Subir ficha», que lee una sola ficha en disposición
   * vertical. Aquí entra un inventario entero, incluidas las órdenes.
   */
  const abrirLibro = async (archivo) => {
    if (!archivo) return
    informar('Leyendo el archivo…')

    const leido = await leerLibroCompleto(archivo, {
      idsUsados: new Set(catalogoBase.map((maquina) => maquina.id)),
    })

    if (!leido.ok) {
      informar(leido.error, true)
      return
    }

    const resultado = importarLibro(sesion.usuario, leido)
    if (!resultado.ok) {
      informar(resultado.error, true)
      return
    }

    setPropias(resultado.maquinas)
    setOrdenes(resultado.ordenes)
    setVista(VISTAS.CATALOGO)

    const partes = [`${leido.maquinas.length} ficha(s)`, `${leido.ordenes.length} orden(es)`]
    informar(
      `Importado: ${partes.join(' y ')}.` +
        (resultado.omitidas ? ` Se omitieron ${resultado.omitidas} por placa repetida.` : ''),
    )
  }

  /** Borra todo lo del usuario y lo deja con el catálogo vacío. */
  const vaciarTodo = () => {
    const resultado = vaciarDatosDeUsuario(sesion.usuario)
    setConfirmandoVaciado(false)

    if (!resultado.ok) {
      informar(resultado.error, true)
      return
    }

    setPropias([])
    setOrdenes([])
    setEdiciones({})
    setIdSeleccionado(null)
    setTermino('')
    setVista(VISTAS.CATALOGO)
    informar('Se vaciaron tus fichas y órdenes.')
  }

  /** Cierra la sesión y devuelve la aplicación a su estado inicial. */
  const salir = () => {
    cerrarSesion()
    aplicarSesion(null)
    setVista(VISTAS.CATALOGO)
    setIdSeleccionado(null)
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

  if (!sesion) return <Autenticacion onAutenticar={aplicarSesion} />

  const enFicha = vista === VISTAS.FICHA && maquinaSeleccionada !== null

  return (
    <div className="flex min-h-screen flex-col">
      <Header usuario={sesion.usuario} onCerrarSesion={salir} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {enFicha ? (
          <FichaTecnica
            // Cambiar de ficha monta un componente nuevo: un borrador a medias
            // nunca puede quedar colgado sobre otra máquina.
            key={maquinaSeleccionada.id}
            maquina={maquinaSeleccionada}
            onInicio={volverAlCatalogo}
            onGuardar={aplicarEdicion}
            onEliminar={quitarFicha}
          />
        ) : (
          <>
            {/* Dos areas de trabajo: el inventario y las intervenciones. */}
            <div className="mb-6 flex gap-1 border-b border-gray-300" role="tablist">
              {[
                [VISTAS.CATALOGO, 'Catálogo', catalogoUsuario.length],
                [VISTAS.ORDENES, 'Órdenes de trabajo', ordenes.length],
              ].map(([clave, texto, cuenta]) => (
                <button
                  key={clave}
                  type="button"
                  role="tab"
                  aria-selected={vista === clave}
                  onClick={() => setVista(clave)}
                  className={`-mb-px rounded-t-md border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                    vista === clave
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  {texto}
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {cuenta}
                  </span>
                </button>
              ))}
            </div>

            {vista === VISTAS.ORDENES ? (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-500">
                    {ordenes.length} {ordenes.length === 1 ? 'orden registrada' : 'órdenes registradas'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOrdenEnEdicion({})}
                    disabled={catalogoUsuario.length === 0}
                    title={
                      catalogoUsuario.length === 0
                        ? 'Registra primero una ficha técnica'
                        : undefined
                    }
                    className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    + Nueva orden
                  </button>
                </div>

                <ListaOrdenes
                  ordenes={ordenes}
                  maquinas={catalogoUsuario}
                  refDesplegada={ordenDesplegada}
                  onDesplegar={setOrdenDesplegada}
                  onEditar={setOrdenEnEdicion}
                  onEliminar={quitarOrden}
                />
              </>
            ) : (
              <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              {/* Sin máquinas asignadas el buscador no aporta nada. */}
              <div className="min-w-0 flex-1">
                {catalogoUsuario.length > 0 && (
                  <Buscador
                    termino={termino}
                    onBuscar={setTermino}
                    resultados={maquinasFiltradas.length}
                    total={catalogoUsuario.length}
                  />
                )}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCreandoFicha(true)}
                  className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                >
                  + Nueva ficha
                </button>

                <button
                  type="button"
                  onClick={() => setSubiendo(true)}
                  className="rounded-md border border-emerald-600 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                >
                  Subir ficha (Excel)
                </button>

                {catalogoUsuario.length > 0 && (
                  <button
                    type="button"
                    onClick={exportarCatalogo}
                    disabled={exportando}
                    className="rounded-md border border-emerald-600 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                  >
                    {exportando ? 'Generando…' : 'Descargar catálogo (.xlsx)'}
                  </button>
                )}

                {catalogoUsuario.length > 0 && (
                  <button
                    type="button"
                    onClick={exportarCatalogoHtml}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                  >
                    Descargar catálogo (.html)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => entradaLibro.current?.click()}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                >
                  Abrir libro (.xlsx)
                </button>

                <input
                  ref={entradaLibro}
                  type="file"
                  accept=".xlsx,.xls,.xlsm"
                  className="hidden"
                  onChange={(evento) => {
                    abrirLibro(evento.target.files?.[0])
                    // Permite volver a elegir el mismo archivo.
                    evento.target.value = ''
                  }}
                />

                {(catalogoUsuario.length > 0 || ordenes.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setConfirmandoVaciado(true)}
                    className="rounded-md border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
                  >
                    Vaciar todo
                  </button>
                )}
              </div>
            </div>

            {confirmandoVaciado && (
              <div className="mb-5 flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-red-800">
                  ¿Borrar <b>todas</b> tus fichas y órdenes? Descarga el Excel antes si no quieres
                  perderlas. Esta acción no se puede deshacer.
                </p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmandoVaciado(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={vaciarTodo}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                  >
                    Sí, vaciar
                  </button>
                </div>
              </div>
            )}

            {aviso.texto && (
              <p
                role={aviso.error ? 'alert' : 'status'}
                className={`mb-5 rounded-md border px-4 py-3 text-sm ${
                  aviso.error
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                {aviso.texto}
              </p>
            )}
            <ListaTarjetas
              maquinas={maquinasFiltradas}
              onSeleccionar={abrirFicha}
              catalogoVacio={catalogoUsuario.length === 0}
            />
              </>
            )}
          </>
        )}
      </main>

      {subiendo && (
        <SubirFicha
          onConfirmar={importarFicha}
          onCerrar={() => setSubiendo(false)}
          idsCatalogo={new Set(catalogoBase.map((maquina) => maquina.id))}
        />
      )}

      {creandoFicha && (
        <FormularioFicha
          onGuardar={crearFicha}
          onCerrar={() => setCreandoFicha(false)}
          idsUsados={new Set(catalogoBase.map((maquina) => maquina.id))}
        />
      )}

      {ordenEnEdicion && (
        <FormularioOrden
          // Una orden nueva llega como objeto vacío; una existente trae `ref`.
          orden={ordenEnEdicion.ref ? ordenEnEdicion : null}
          siguienteNumero={siguienteNumeroOrden(ordenes)}
          maquinas={catalogoUsuario}
          onGuardar={aplicarOrden}
          onCerrar={() => setOrdenEnEdicion(null)}
        />
      )}

      <footer className="border-t border-gray-300 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-500 sm:px-6">
          {INSTITUCION.titulo} · {INSTITUCION.subtitulo}
        </div>
      </footer>
    </div>
  )
}

export default App
