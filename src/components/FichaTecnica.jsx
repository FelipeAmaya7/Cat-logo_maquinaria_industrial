import { useRef, useState } from "react";
import { resolverFotografia } from "../data/fotografias";
import { INSTITUCION, formatearFechaFormato } from "../data/institucion";
import { GRUPOS_RESUELTOS } from "../data/gruposFicha";
import { descargarFichaExcel } from "../servicios/exportarExcel";
import { descargarFichaHtml } from "../servicios/exportarHtml";
import { TIPOS_IMAGEN, prepararFotografia } from "../servicios/imagen";
import CampoFicha from "./CampoFicha";
import { DistintivoSistema } from "./IconoSistema";

/** Marcador que usa el extractor cuando el formato venía sin diligenciar. */
const SIN_DATO = "No registrado";

/** Año máximo admitido: el próximo, para equipos ya comprometidos en compra. */
const ANIO_MAXIMO = new Date().getFullYear() + 1;
const ANIO_MINIMO = 1900;

/**
 * Campos de la tabla de datos clave, en el orden del formato de planta.
 *
 * Una sola definición alimenta la vista de lectura, la de edición Y la
 * validación, de modo que no puedan quedar desalineadas: agregar un campo aquí
 * lo vuelve editable y validable sin tocar nada más.
 *
 * `tipo` describe el dato esperado; `requerido` marca lo que identifica la
 * ficha y no puede quedar en blanco.
 */
/**
 * Campos de la ficha, derivados de las secciones compartidas.
 *
 * Antes eran dos listas fijas aquí dentro, y cada campo nuevo del modelo se
 * quedaba invisible hasta que alguien se acordaba de añadirlo. Ahora la única
 * fuente es `gruposFicha.js`, que comparte con el formulario de creación.
 */
const CAMPOS = GRUPOS_RESUELTOS.flatMap((grupo) => grupo.campos).filter((c) => !c.extenso)

/** Campos de texto extenso, que se editan con textarea. */
const BLOQUES = GRUPOS_RESUELTOS.flatMap((grupo) => grupo.campos).filter((c) => c.extenso)

/** Todo lo que el formulario controla, en el orden en que se recorre al validar. */
const EDITABLES = [...CAMPOS, ...BLOQUES];

const CAMPO_BASE =
  "w-full rounded border bg-white px-2 py-1 text-sm text-gray-800 outline-none transition focus:ring-2";
const CAMPO_NORMAL =
  "border-gray-300 focus:border-blue-500 focus:ring-blue-200";
const CAMPO_INVALIDO = "border-red-500 focus:border-red-500 focus:ring-red-200";

/** Clase del control según tenga o no un error de validación. */
const claseCampo = (invalido) =>
  `${CAMPO_BASE} ${invalido ? CAMPO_INVALIDO : CAMPO_NORMAL}`;

/**
 * Valida un campo del borrador.
 *
 * `SIN_DATO` siempre se acepta: es el valor que el propio formato usa para lo
 * que no está diligenciado, y obligar a reemplazarlo impediría guardar fichas
 * que en planta siguen incompletas.
 *
 * @returns {string|null} Mensaje de error, o null si el valor es válido.
 */
function validarCampo({ requerido, tipo }, valor) {
  const limpio = valor.trim();

  if (!limpio) return requerido ? "Este dato es obligatorio." : null;
  if (limpio === SIN_DATO) return null;

  if (tipo === "anio") {
    const anio = Number(limpio);
    if (!/^\d{4}$/.test(limpio) || anio < ANIO_MINIMO || anio > ANIO_MAXIMO) {
      return `Escriba un año entre ${ANIO_MINIMO} y ${ANIO_MAXIMO}, o «${SIN_DATO}».`;
    }
  }

  if (tipo === "entero" && !/^\d+$/.test(limpio)) {
    return `Escriba un número entero de años, o «${SIN_DATO}».`;
  }

  return null;
}

/**
 * Valida el borrador completo.
 * @returns {Object<string, string>} Errores indexados por campo; vacío si todo es válido.
 */
function validarBorrador(borrador) {
  const errores = {};

  for (const definicion of EDITABLES) {
    const mensaje = validarCampo(definicion, borrador[definicion.campo]);
    if (mensaje) errores[definicion.campo] = mensaje;
  }

  return errores;
}

/** Contenedor de la fotografía técnica, con respaldo si el archivo no existe. */
function FotoTecnica({ maquina, editando, imagen, onCambiarImagen, onError }) {
  const [falloImagen, setFalloImagen] = useState(false);
  // En edicion manda el borrador; en lectura, la ficha guardada.
  const src = resolverFotografia(editando ? imagen : maquina.imagen);
  const entrada = useRef(null);

  const elegir = async (archivo) => {
    if (!archivo) return;

    const resultado = await prepararFotografia(archivo);
    if (!resultado.ok) {
      onError(resultado.error);
      return;
    }

    setFalloImagen(false);
    onCambiarImagen(resultado.imagen);
  };

  return (
    <figure className="flex h-full flex-col">
      <figcaption className="border-b border-gray-300 pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-800">
        Fotografía del equipo
      </figcaption>

      <div className="flex flex-1 items-center justify-center rounded-md border border-gray-200 bg-gray-50 p-3">
        {src && !falloImagen ? (
          <img
            src={src}
            alt={`Fotografía técnica de ${maquina.descripcion}`}
            onError={() => setFalloImagen(true)}
            className="max-h-72 w-full rounded object-contain"
          />
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-2 py-16 text-gray-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-12 w-12"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="8.5" cy="9.5" r="1.5" />
              <path d="m5 18 4.5-5 3 3 2.5-2.5L19 18" />
            </svg>
            <p className="text-xs text-gray-500">Sin fotografía registrada</p>
          </div>
        )}
      </div>

      {editando && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {src ? "Cambiar fotografía" : "Añadir fotografía"}
          </button>

          {src && (
            <button
              type="button"
              onClick={() => onCambiarImagen(null)}
              className="rounded border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              Quitar
            </button>
          )}

          <input
            ref={entrada}
            type="file"
            accept={TIPOS_IMAGEN.join(",")}
            className="hidden"
            onChange={(evento) => elegir(evento.target.files?.[0])}
          />
        </div>
      )}

      {maquina.imagenEsRespaldo && !editando && (
        <p className="pt-2 text-[11px] leading-snug text-amber-700">
          Imagen de referencia: esta ficha no tiene fotografía propia en el
          formato original.
        </p>
      )}
    </figure>
  );
}

/** Membrete del formato: código, fecha y versión, tal como vienen del Excel. */
function MembreteFormato({ maquina }) {
  const filas = [
    ["Código", maquina.codigoFormato],
    ["Fecha", formatearFechaFormato(maquina.fechaFormato)],
    ["Versión", maquina.versionFormato],
  ].filter(([, valor]) => valor);

  if (filas.length === 0) return null;

  return (
    <table className="w-full border-collapse text-[11px] sm:w-56">
      <tbody>
        {filas.map(([etiqueta, valor]) => (
          <tr
            key={etiqueta}
            className="border-b border-gray-300 last:border-b-0"
          >
            <th
              scope="row"
              className="py-1 pr-3 text-left font-bold uppercase tracking-wide text-gray-800"
            >
              {etiqueta}
            </th>
            <td className="py-1 text-right font-mono text-gray-700">{valor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Mensaje de error de un campo, debajo de su control. */
function ErrorCampo({ campo, mensaje }) {
  if (!mensaje) return null;

  return (
    <p
      id={`error-${campo}`}
      className="pt-1 text-[11px] leading-snug text-red-600"
    >
      {mensaje}
    </p>
  );
}

/**
 * Presenta un campo en modo lectura: da formato legible a fechas y evita
 * que los campos no diligenciados se muestren como huecos en blanco.
 */
function renderValorLectura(definicion, valor) {
  const vacio =
    valor === undefined ||
    valor === null ||
    String(valor).trim() === "" ||
    valor === SIN_DATO;

  if (vacio) {
    return <span className="text-xs italic text-gray-400">{SIN_DATO}</span>;
  }

  if (definicion.tipo === "date") {
    const texto = String(valor).trim();
    let formateado = texto;
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      const [y, m, d] = texto.split("-");
      formateado = `${d}/${m}/${y}`;
    }

    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-gray-800">
        <svg
          className="h-3.5 w-3.5 shrink-0 text-blue-600"
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
        {formateado}
      </span>
    );
  }

  return valor;
}

/**
 * Vista detallada con el formato de ficha técnica utilizado en planta.
 *
 * El modo edición usa un BORRADOR local: los cambios no tocan la máquina hasta
 * que se pulsa Guardar, de modo que Cancelar no necesita deshacer nada ni
 * escribir en el almacenamiento.
 *
 * Al guardar se entregan TODOS los valores editables, no solo los que se
 * tocaron en esta sesión. Cuál es "el cambio" solo puede decidirse contra la
 * ficha ORIGINAL, y esta vista recibe la ficha ya parcheada con las ediciones
 * anteriores: calcular aquí la diferencia hacía que cada guardado descartara
 * los anteriores.
 *
 * @param {Object} props
 * @param {import('../data/maquinas').Maquina} props.maquina  Activo a documentar.
 * @param {() => void} props.onInicio                          Regresa a la vista de catálogo.
 * @param {(idMaquina: string, valores: Object<string, string>) => boolean} props.onGuardar
 * @param {(maquina: Object) => void} props.onEliminar  Quita la ficha del catálogo.
 *        Persiste los valores editables. Devuelve false si no se pudo guardar.
 */
function FichaTecnica({ maquina, onInicio, onGuardar, onEliminar }) {
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [borrador, setBorrador] = useState(null);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [descargando, setDescargando] = useState(false);

  const editando = borrador !== null;

  /**
   * Exporta la ficha a un .xlsx real.
   *
   * Exporta `maquina`, que es lo GUARDADO, no el borrador: así lo que el archivo
   * contiene coincide siempre con lo que muestra la ficha. Por eso el botón solo
   * aparece en modo lectura, donde ambas cosas son la misma.
   */
  const descargar = async () => {
    setDescargando(true);
    const resultado = await descargarFichaExcel(maquina);
    setDescargando(false);

    if (!resultado.ok) setError(resultado.error);
    else setError("");
  };

  /**
   * Descarga la ficha como documento HTML con el formato de planta.
   *
   * Sincrónica, a diferencia de la de Excel: solo arma el documento, sin cargar
   * ninguna librería. Por eso no necesita estado de "Generando…".
   */
  const descargarHtml = () => {
    const resultado = descargarFichaHtml(maquina);
    setError(resultado.ok ? "" : resultado.error);
  };

  /** Entra en edición copiando los valores actuales al borrador. */
  const empezarEdicion = () => {
    const inicial = {};
    for (const { campo } of EDITABLES) {
      inicial[campo] = String(maquina[campo] ?? "");
    }

    setBorrador(inicial);
    setErrores({});
    setError("");
    setGuardado(false);
  };

  /** Descarta el borrador: los valores originales nunca llegaron a tocarse. */
  const cancelar = () => {
    setBorrador(null);
    setErrores({});
    setError("");
  };

  /** Actualiza un campo y retira su error mientras la persona lo corrige. */
  const actualizar = (campo, valor) => {
    setBorrador((previo) => ({ ...previo, [campo]: valor }));

    setErrores((previos) => {
      if (!previos[campo]) return previos;
      const siguientes = { ...previos };
      delete siguientes[campo];
      return siguientes;
    });
  };

  const guardar = (evento) => {
    evento?.preventDefault();

    // El submit del formulario (tecla Enter) puede llegar sin borrador abierto.
    if (!borrador) return;

    const problemas = validarBorrador(borrador);
    if (Object.keys(problemas).length > 0) {
      setErrores(problemas);
      setError(
        "Revise los campos marcados: hay datos obligatorios vacíos o con formato inválido.",
      );
      document.getElementById(`campo-${Object.keys(problemas)[0]}`)?.focus();
      return;
    }

    const valores = {};
    for (const { campo } of EDITABLES) {
      valores[campo] = borrador[campo].trim();
    }

    if (!onGuardar(maquina.id, valores)) {
      setError("No se pudieron guardar los cambios en este navegador.");
      return;
    }

    // La ficha vuelve por props ya actualizada: basta con soltar el borrador
    // para que la vista de lectura muestre los datos nuevos sin recargar.
    setBorrador(null);
    setErrores({});
    setError("");
    setGuardado(true);
  };

  /** Valor mostrado; el borrador manda mientras se edita. */
  const valorDe = (campo) => (editando ? borrador[campo] : maquina[campo]);

  return (
    <section
      className="mx-auto max-w-5xl"
      aria-label={`Ficha técnica de ${maquina.descripcion}`}
    >
      <form onSubmit={guardar} noValidate>
        <article className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
          {/* Membrete: distintivo a la izquierda, acciones y metadata a la derecha */}
          <header className="flex flex-col gap-4 border-b border-gray-300 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <DistintivoSistema className="h-11 w-11" claseIcono="h-6 w-6" />
              <div className="min-w-0 border-l border-gray-300 pl-4">
                <h2 className="text-base font-bold uppercase tracking-wide text-gray-800">
                  Ficha técnica de maquinaria
                </h2>
                <p className="text-xs text-gray-500">{INSTITUCION.proceso}</p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              {/*
                TODOS estos botones son type="button", incluido "Guardar cambios".
                Con type="submit" aparecía un fallo difícil de ver: React reutiliza
                el mismo nodo <button> entre los dos estados, y al pulsar "Editar"
                el cambio de estado se aplica de forma síncrona ANTES de que el
                navegador ejecute la acción por defecto del clic. Ese mismo nodo ya
                era submit, así que enviaba el formulario y guardaba de inmediato:
                los campos nunca llegaban a verse. Las `key` distintas refuerzan la
                separación haciendo que React monte nodos independientes.
              */}
              <div className="flex flex-wrap gap-2">
                {editando ? (
                  <>
                    <button
                      key="guardar"
                      type="button"
                      onClick={guardar}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                    >
                      Guardar cambios
                    </button>
                    <button
                      key="cancelar"
                      type="button"
                      onClick={cancelar}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      key="descargar"
                      type="button"
                      onClick={descargar}
                      disabled={descargando}
                      className="rounded-md border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                    >
                      {descargando ? "Generando…" : "Descargar en Excel (.xlsx)"}
                    </button>
                    <button
                      key="descargar-html"
                      type="button"
                      onClick={descargarHtml}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                    >
                      Descargar en HTML
                    </button>
                    <button
                      key="eliminar"
                      type="button"
                      onClick={() => setConfirmandoBorrado(true)}
                      className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
                    >
                      Eliminar
                    </button>
                    <button
                      key="editar"
                      type="button"
                      onClick={empezarEdicion}
                      className="rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                    >
                      Editar información
                    </button>
                    <button
                      key="inicio"
                      type="button"
                      onClick={onInicio}
                      className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                    >
                      INICIO
                    </button>
                  </>
                )}
              </div>

              <MembreteFormato maquina={maquina} />
            </div>
          </header>

          {error && (
            <p
              role="alert"
              className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {confirmandoBorrado && !editando && (
            <div className="flex flex-col gap-3 border-b border-red-200 bg-red-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-red-800">
                ¿Eliminar la ficha <b>{maquina.placaNueva}</b> de tu catálogo? Esta acción no se
                puede deshacer.
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmandoBorrado(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => onEliminar(maquina)}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          )}

          {editando && (
            <p className="border-b border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-800">
              Modo edición. Los cambios se guardan solo para tu usuario en este
              navegador.
            </p>
          )}

          {guardado && !editando && (
            <p
              role="status"
              className="border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800"
            >
              Cambios guardados en esta ficha.
            </p>
          )}

          {/* Identificación del activo */}
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-300 bg-gray-50 px-5 py-3">
            <span className="rounded bg-industrial-800 px-2.5 py-1 font-mono text-xs font-semibold text-white">
              {valorDe("placaNueva")}
            </span>
            <h3 className="text-sm font-bold text-gray-800">
              {valorDe("descripcion")}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  Datos de identificación y operación del equipo
                </caption>
                <tbody className="divide-y divide-gray-200 block sm:table-row-group">
                  {CAMPOS.map((definicion) => {
                    const { campo, rotulo } = definicion

                    return (
                    <tr key={campo} className="py-2.5 block sm:table-row sm:py-0">
                      <th
                        scope="row"
                        className="block sm:table-cell sm:w-2/5 sm:py-2.5 sm:pr-4 align-top text-xs font-bold uppercase tracking-wide text-gray-800 pb-1 sm:pb-0"
                      >
                        <label
                          htmlFor={editando ? `campo-${campo}` : undefined}
                        >
                          {rotulo}
                        </label>
                      </th>
                      <td className="block sm:table-cell sm:w-3/5 sm:py-2.5 align-top text-sm text-gray-700">
                        {editando ? (
                          <>
                            <CampoFicha
                              definicion={definicion}
                              id={`campo-${campo}`}
                              valor={borrador[campo]}
                              onCambiar={(valor) => actualizar(campo, valor)}
                              clase={claseCampo(Boolean(errores[campo]))}
                              invalido={Boolean(errores[campo])}
                              describedBy={
                                errores[campo] ? `error-${campo}` : undefined
                              }
                            />
                            <ErrorCampo
                              campo={campo}
                              mensaje={errores[campo]}
                            />
                          </>
                        ) : (
                          renderValorLectura(definicion, maquina[campo])
                        )}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Contenedor de la foto técnica */}
            <FotoTecnica
              maquina={maquina}
              editando={editando}
              imagen={editando ? borrador.imagen : null}
              onCambiarImagen={(dato) => actualizar("imagen", dato)}
              onError={setError}
            />
          </div>

          {/* Campos de texto extenso */}
          <div className="grid grid-cols-1 gap-5 border-t border-gray-300 px-5 py-5 md:grid-cols-3">
            {BLOQUES.map((definicion) => {
              const { campo, rotulo } = definicion

              return (
              <div key={campo}>
                <h4 className="border-b border-gray-300 pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-800">
                  <label htmlFor={editando ? `campo-${campo}` : undefined}>
                    {rotulo}
                  </label>
                </h4>
                {editando ? (
                  <>
                    <CampoFicha
                      definicion={definicion}
                      id={`campo-${campo}`}
                      valor={borrador[campo]}
                      onCambiar={(valor) => actualizar(campo, valor)}
                      clase={`mt-2 ${claseCampo(Boolean(errores[campo]))}`}
                      invalido={Boolean(errores[campo])}
                      describedBy={
                        errores[campo] ? `error-${campo}` : undefined
                      }
                      filas={4}
                    />
                    <ErrorCampo campo={campo} mensaje={errores[campo]} />
                  </>
                ) : (
                  <p className="pt-2 text-sm leading-relaxed text-gray-700">
                    {renderValorLectura(definicion, maquina[campo])}
                  </p>
                )}
              </div>
              )
            })}
          </div>

          {/* Pie de documento */}
          <footer className="grid grid-cols-1 border-t border-gray-300 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-600 sm:grid-cols-3">
            <div className="border-gray-300 px-5 py-3 sm:border-r">
              Elaboró:{" "}
              <span className="font-bold text-gray-800">Mantenimiento</span>
            </div>
            <div className="border-gray-300 px-5 py-3 sm:border-r">
              Revisó:{" "}
              <span className="font-bold text-gray-800">
                Jefatura de Planta
              </span>
            </div>
            <div className="px-5 py-3">
              Registro:{" "}
              <span className="font-mono font-bold text-gray-800">
                {maquina.id}
              </span>
            </div>
          </footer>
        </article>
      </form>
    </section>
  );
}

export default FichaTecnica;
