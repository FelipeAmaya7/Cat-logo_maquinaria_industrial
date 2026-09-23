import { useState } from "react";
import { resolverFotografia } from "../data/fotografias";
import {
  INSTITUCION,
  RUTA_LOGO,
  formatearFechaFormato,
} from "../data/institucion";

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
const CAMPOS = [
  { campo: "placaNueva", etiqueta: "Placa nueva", requerido: true },
  { campo: "descripcion", etiqueta: "Descripción", requerido: true },
  { campo: "marca", etiqueta: "Marca" },
  { campo: "modelo", etiqueta: "Modelo" },
  { campo: "serie", etiqueta: "Serie" },
  { campo: "anioAdquisicion", etiqueta: "Año de adquisición", tipo: "anio" },
  { campo: "estado", etiqueta: "Estado" },
  { campo: "disponibilidad", etiqueta: "Disponibilidad" },
  { campo: "ubicacion", etiqueta: "Ubicación" },
  { campo: "piso", etiqueta: "Piso" },
  { campo: "turnoPorDia", etiqueta: "Turno por día" },
  { campo: "capacidad", etiqueta: "Capacidad productiva" },
  { campo: "material", etiqueta: "Material" },
  { campo: "color", etiqueta: "Color" },
  { campo: "dimension", etiqueta: "Dimensión" },
  { campo: "vidaUtil", etiqueta: "Vida útil en años", tipo: "entero" },
];

/** Campos de texto extenso, que se editan con textarea. */
const BLOQUES = [
  { campo: "funcion", etiqueta: "Función que presta" },
  { campo: "materialProcesado", etiqueta: "Material procesado" },
  { campo: "especificaciones", etiqueta: "Especificaciones" },
];

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
function FotoTecnica({ maquina }) {
  const [falloImagen, setFalloImagen] = useState(false);
  const src = resolverFotografia(maquina.imagen);

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

      {maquina.imagenEsRespaldo && (
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
 *        Persiste los valores editables. Devuelve false si no se pudo guardar.
 */
function FichaTecnica({ maquina, onInicio, onGuardar }) {
  const [borrador, setBorrador] = useState(null);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);

  const editando = borrador !== null;

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
          {/* Membrete: logo a la izquierda, acciones y metadata a la derecha */}
          <header className="flex flex-col gap-4 border-b border-gray-300 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <img
                src={RUTA_LOGO}
                alt={`Logo de ${INSTITUCION.nombre}`}
                className="h-11 w-auto shrink-0"
              />
              <div className="border-l border-gray-300 pl-4">
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

          <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            {/*
              En móvil la tabla se DESPLAZA en lugar de comprimirse: con dos
              columnas por debajo de 360 px los rótulos se partían letra a letra.
              El ancho mínimo fuerza el scroll solo cuando hace falta.
            */}
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[20rem] table-fixed border-collapse text-left">
                <caption className="sr-only">
                  Datos de identificación y operación del equipo
                </caption>
                <tbody>
                  {CAMPOS.map(({ campo, etiqueta, tipo }) => (
                    <tr key={campo} className="border-b border-gray-300">
                      <th
                        scope="row"
                        className="w-2/5 py-2 pr-4 align-top text-[11px] font-bold uppercase tracking-wide text-gray-800"
                      >
                        <label
                          htmlFor={editando ? `campo-${campo}` : undefined}
                        >
                          {etiqueta}
                        </label>
                      </th>
                      <td className="py-2 align-top text-sm text-gray-700">
                        {editando ? (
                          <>
                            <input
                              id={`campo-${campo}`}
                              type="text"
                              inputMode={tipo ? "numeric" : undefined}
                              value={borrador[campo]}
                              onChange={(evento) =>
                                actualizar(campo, evento.target.value)
                              }
                              aria-invalid={Boolean(errores[campo])}
                              aria-describedby={
                                errores[campo] ? `error-${campo}` : undefined
                              }
                              className={claseCampo(Boolean(errores[campo]))}
                            />
                            <ErrorCampo
                              campo={campo}
                              mensaje={errores[campo]}
                            />
                          </>
                        ) : (
                          maquina[campo]
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Contenedor de la foto técnica */}
            <FotoTecnica maquina={maquina} />
          </div>

          {/* Campos de texto extenso */}
          <div className="grid grid-cols-1 gap-5 border-t border-gray-300 px-5 py-5 sm:grid-cols-3">
            {BLOQUES.map(({ campo, etiqueta }) => (
              <div key={campo}>
                <h4 className="border-b border-gray-300 pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-800">
                  <label htmlFor={editando ? `campo-${campo}` : undefined}>
                    {etiqueta}
                  </label>
                </h4>
                {editando ? (
                  <>
                    <textarea
                      id={`campo-${campo}`}
                      rows={4}
                      value={borrador[campo]}
                      onChange={(evento) =>
                        actualizar(campo, evento.target.value)
                      }
                      aria-invalid={Boolean(errores[campo])}
                      aria-describedby={
                        errores[campo] ? `error-${campo}` : undefined
                      }
                      className={`mt-2 ${claseCampo(Boolean(errores[campo]))} resize-y leading-relaxed`}
                    />
                    <ErrorCampo campo={campo} mensaje={errores[campo]} />
                  </>
                ) : (
                  <p className="pt-2 text-sm leading-relaxed text-gray-700">
                    {maquina[campo]}
                  </p>
                )}
              </div>
            ))}
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
