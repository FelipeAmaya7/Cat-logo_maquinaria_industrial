import { useEffect, useMemo, useState } from 'react'
import BarraLateral from './components/BarraLateral'
import { estaDisponible } from './servicios/almacenamiento'
import Buscador from './components/Buscador'
import ListaTarjetas from './components/ListaTarjetas'
import FichaTecnica from './components/FichaTecnica'
import SubirFicha from './components/SubirFicha'
import FormularioFicha from './components/FormularioFicha'
import FormularioOrden from './components/FormularioOrden'
import ListaOrdenes from './components/ListaOrdenes'
import { filtrarMaquinas } from './data/maquinas'
import { obtenerMaquinasPorId } from './data/catalogo'
import { MAPA_CAMPOS } from './servicios/anclajeRotulos'
import { repuestosDeMaquina } from './data/repuestos'
import { descargarCatalogoExcel } from './servicios/exportarExcel'
import { descargarCatalogoHtml } from './servicios/exportarHtml'
import {
  eliminarMaquina,
  eliminarOrden,
  vaciarTodo,
  guardarEdicion,
  guardarMaquinaPropia,
  leerEdiciones,
  idsDelCatalogo,
  maquinasPropias,
  leerOrdenes,
  leerRepuestos,
  guardarRepuesto,
  eliminarRepuesto,
  guardarOrden,
  siguienteNumeroOrden,
  sembrarDatosIniciales,
} from './servicios/datos'

/** Campos que un archivo de Excel puede traer; los demás no se tocan al importar. */
const CAMPOS_IMPORTABLES = Object.keys(MAPA_CAMPOS)

/** Vistas disponibles una vez iniciada la sesión. */
/** Iconos de la barra lateral: trazo simple, para que se lean a 18 px. */
const ICONO = {
  catalogo: (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5v-7Z" />
      <path d="M3 8.5 12 13l9-4.5M12 13v7" />
    </svg>
  ),
  ordenes: (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <path d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2Z" />
      <path d="M9 9h6M9 13h4" />
    </svg>
  ),
}

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
 *   - El catálogo se resuelve a partir de los identificadores guardados, no
 *     del archivo generado: así una ficha creada a mano y una del libro de
 *     planta se tratan igual.
 *   - De la ficha abierta se guarda su ID, no el objeto. Al aplicar una edición
 *     el objeto se recalcula solo, sin necesidad de sincronizar dos estados.
 */
function App() {
  // Hasta que el almacenamiento esté leído no se sabe qué pintar.
  const [listo, setListo] = useState(false)
  const [vista, setVista] = useState(VISTAS.CATALOGO)
  const [idSeleccionado, setIdSeleccionado] = useState(null)
  const [termino, setTermino] = useState('')
  const [ediciones, setEdiciones] = useState({})
  const [propias, setPropias] = useState([])
  const [idsCatalogo, setIdsCatalogo] = useState([])
  const [subiendo, setSubiendo] = useState(false)
  const [exportando, setExportando] = useState(false)
  // { texto, error }: un mismo recuadro sirve para confirmar y para avisar de un fallo.
  const [aviso, setAviso] = useState({ texto: '', error: false })
  const [ordenes, setOrdenes] = useState([])
  const [repuestos, setRepuestos] = useState([])
  const [creandoFicha, setCreandoFicha] = useState(false)
  const [ordenEnEdicion, setOrdenEnEdicion] = useState(null)
  const [ordenDesplegada, setOrdenDesplegada] = useState(null)
  const [confirmandoVaciado, setConfirmandoVaciado] = useState(false)
  // Se evalúa una vez: el permiso no cambia mientras la pestaña está abierta.
  const [almacenamientoOk] = useState(estaDisponible)

  // Al arrancar se prepara el catálogo y se lee todo lo guardado.
  useEffect(() => {
    let vigente = true

    sembrarDatosIniciales().then(() => {
      if (!vigente) return

      setEdiciones(leerEdiciones())
      setIdsCatalogo(idsDelCatalogo())
      setPropias(maquinasPropias())
      setOrdenes(leerOrdenes())
      setRepuestos(leerRepuestos())
      setListo(true)
    })

    // Evita actualizar el estado si el componente se desmontó antes de terminar.
    return () => {
      vigente = false
    }
  }, [])

  // Máquinas TAL COMO vienen de su origen: las del libro de planta más las
  // creadas o cargadas a mano. Es la referencia contra la que se decide qué
  // cuenta como edición.
  //
  // Los identificadores viven en estado y NO se leen aquí del almacenamiento:
  // un `useMemo` que lee por su cuenta no se entera de los cambios, y bastaba
  // con que una acción tocara los ids sin tocar `propias` para que el catálogo
  // se quedara congelado.
  const catalogoBase = useMemo(
    () => [...obtenerMaquinasPorId(idsCatalogo), ...propias],
    [idsCatalogo, propias],
  )

  // El mismo catálogo con las ediciones aplicadas encima.
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

    const resultado = guardarEdicion(idMaquina, cambios)
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
    const resultado = guardarMaquinaPropia({
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

  /** Exporta a .xlsx el catálogo completo, con sus ediciones. */
  const exportarCatalogo = async () => {
    setExportando(true)
    const resultado = await descargarCatalogoExcel(catalogoUsuario, {
      ordenes,
      repuestos,
    })
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
    const resultado = guardarMaquinaPropia(maquina)
    if (!resultado.ok) return resultado

    setPropias(resultado.maquinas)
    setCreandoFicha(false)
    setTermino('')
    informar(`Ficha «${maquina.descripcion}» creada.`)
    return { ok: true }
  }

  /** Quita una ficha del catálogo y vuelve al listado. */
  const quitarFicha = (maquina) => {
    const resultado = eliminarMaquina(maquina.id)
    if (!resultado.ok) {
      informar(resultado.error, true)
      return
    }

    setPropias(resultado.maquinas)
    setIdsCatalogo(resultado.ids)
    setIdSeleccionado(null)
    setVista(VISTAS.CATALOGO)
    informar(`Ficha «${maquina.descripcion}» eliminada.`)
  }

  /** Crea o actualiza una orden de trabajo. */
  const aplicarOrden = (orden) => {
    const resultado = guardarOrden(orden)
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

  /**
   * Crea o actualiza una entrada del historial de repuestos.
   * Devuelve el resultado en vez de solo avisar, porque el formulario vive
   * dentro de la ficha y necesita saber si cerrarse o mantener lo escrito.
   */
  const aplicarRepuesto = (repuesto) => {
    const resultado = guardarRepuesto(repuesto)
    if (!resultado.ok) return resultado

    setRepuestos(resultado.repuestos)
    informar(
      resultado.actualizada
        ? `Repuesto «${repuesto.repuesto}» actualizado.`
        : `Repuesto «${repuesto.repuesto}» añadido al historial.`,
    )
    return { ok: true }
  }

  /** Elimina una entrada del historial de repuestos. */
  const quitarRepuesto = (repuesto) => {
    const resultado = eliminarRepuesto(repuesto.ref)
    if (!resultado.ok) {
      informar(resultado.error, true)
      return
    }

    setRepuestos(resultado.repuestos)
    informar(`Repuesto «${repuesto.repuesto}» quitado del historial.`)
  }

  /** Elimina una orden de trabajo. */
  const quitarOrden = (orden) => {
    const resultado = eliminarOrden(orden.ref)
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
  /** Borra el catálogo, las órdenes y los repuestos. */
  const vaciarCatalogo = () => {
    const resultado = vaciarTodo()
    setConfirmandoVaciado(false)

    if (!resultado.ok) {
      informar(resultado.error, true)
      return
    }

    setIdsCatalogo([])
    setPropias([])
    setOrdenes([])
    setEdiciones({})
    setIdSeleccionado(null)
    setTermino('')
    setVista(VISTAS.CATALOGO)
    informar('Se vaciaron las fichas y las órdenes.')
  }

  // Mientras se lee el almacenamiento no hay nada que pintar todavía.
  if (!listo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grafito-50">
        <p className="text-sm text-gray-500">Cargando…</p>
      </div>
    )
  }

  const enFicha = vista === VISTAS.FICHA && maquinaSeleccionada !== null

  const modulos = [
    { clave: VISTAS.CATALOGO, texto: 'Equipos', cuenta: catalogoUsuario.length, icono: ICONO.catalogo },
    { clave: VISTAS.ORDENES, texto: 'Órdenes de trabajo', cuenta: ordenes.length, icono: ICONO.ordenes },
  ]

  /** Título de la pantalla actual, para la cabecera del contenido. */
  const tituloVista = enFicha
    ? 'Ficha técnica'
    : (modulos.find((m) => m.clave === vista)?.texto ?? 'Equipos')

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <BarraLateral
        vista={vista}
        onCambiar={(clave) => {
          setVista(clave)
          setIdSeleccionado(null)
        }}
        modulos={modulos}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabecera del contenido: dice dónde estás y deja sitio a las acciones. */}
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-acento-700">
              Mantenimiento
            </p>
            <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl">{tituloVista}</h1>
          </div>
        </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {/*
          Sin almacenamiento no se guarda nada, y el fallo es silencioso: se
          registran órdenes y repuestos durante un rato y se pierden al
          recargar. Más vale decirlo al entrar.
        */}
        {!almacenamientoOk && (
          <p
            role="alert"
            className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            Este navegador tiene el almacenamiento local bloqueado (suele pasar en ventana
            privada). Puedes consultar el catálogo, pero <b>nada de lo que registres se
            guardará</b> al recargar. Descarga el Excel antes de cerrar.
          </p>
        )}

        {enFicha ? (
          <FichaTecnica
            // Cambiar de ficha monta un componente nuevo: un borrador a medias
            // nunca puede quedar colgado sobre otra máquina.
            key={maquinaSeleccionada.id}
            maquina={maquinaSeleccionada}
            onInicio={volverAlCatalogo}
            onGuardar={aplicarEdicion}
            onEliminar={quitarFicha}
            repuestos={repuestosDeMaquina(repuestos, maquinaSeleccionada.id)}
            onGuardarRepuesto={aplicarRepuesto}
            onEliminarRepuesto={quitarRepuesto}
          />
        ) : (
          <>
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
            <div className="mb-6 flex flex-col gap-3">
              {/* Sin máquinas asignadas el buscador no aporta nada. */}
              {catalogoUsuario.length > 0 && (
                <Buscador
                  termino={termino}
                  onBuscar={setTermino}
                  resultados={maquinasFiltradas.length}
                  total={catalogoUsuario.length}
                />
              )}

              {/* Barra de acciones organizada por grupos: creación/importación y exportación/mantenimiento */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setCreandoFicha(true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 sm:px-3.5 sm:text-sm"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Nueva ficha
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubiendo(true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-emerald-600 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 sm:px-3.5 sm:text-sm"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                    Subir ficha (Excel)
                  </button>

                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {catalogoUsuario.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={exportarCatalogo}
                        disabled={exportando}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 sm:px-3.5 sm:text-sm"
                      >
                        <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                        {exportando ? 'Generando…' : 'Catálogo (.xlsx)'}
                      </button>

                      <button
                        type="button"
                        onClick={exportarCatalogoHtml}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 sm:px-3.5 sm:text-sm"
                      >
                        <svg className="h-4 w-4 text-acento-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                        Catálogo (.html)
                      </button>
                    </>
                  )}


                  {(catalogoUsuario.length > 0 || ordenes.length > 0) && (
                    <button
                      type="button"
                      onClick={() => setConfirmandoVaciado(true)}
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-2 text-xs font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 sm:px-3 sm:text-sm"
                    >
                      Vaciar todo
                    </button>
                  )}
                </div>
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
                    onClick={vaciarCatalogo}
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
      </div>

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

    </div>
  )
}

export default App
