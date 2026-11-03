import { useState } from 'react'
import { NIVELES } from '../servicios/taxonomia'
import { tonoDeCalidad } from '../servicios/calidadDatos'

/** Clases por tono, escritas enteras: Tailwind no ve las clases construidas. */
const TONO = {
  emerald: { texto: 'text-emerald-700', barra: 'bg-emerald-500' },
  amber: { texto: 'text-amber-700', barra: 'bg-amber-500' },
  red: { texto: 'text-red-700', barra: 'bg-red-500' },
}

const porcentaje = (valor) => `${Math.round(valor * 100)}%`

/** Dato suelto del encabezado. */
function Dato({ etiqueta, valor, acento }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className={`text-2xl font-bold tabular-nums ${acento ?? 'text-gray-900'}`}>{valor}</p>
      <p className="mt-0.5 text-xs text-gray-500">{etiqueta}</p>
    </div>
  )
}

/** Barra de completitud de una ficha. */
function Barra({ valor }) {
  const tono = TONO[tonoDeCalidad(valor)]

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${tono.barra}`} style={{ width: porcentaje(valor) }} />
      </div>
      <span className={`w-10 shrink-0 text-right text-xs font-semibold tabular-nums ${tono.texto}`}>
        {porcentaje(valor)}
      </span>
    </div>
  )
}

/** Jerarquía Sección → Equipo → Subunidad. */
function Jerarquia({ taxonomia, onAbrirEquipo }) {
  const { secciones, huerfanas, resumen } = taxonomia

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato etiqueta="Secciones (nivel 5)" valor={resumen.secciones} />
        <Dato etiqueta="Equipos (nivel 6)" valor={resumen.equipos} />
        <Dato etiqueta="Subunidades (nivel 7)" valor={resumen.subunidades} acento="text-acento-700" />
        <Dato
          etiqueta="Sin ubicación asignada"
          valor={resumen.sinUbicacion}
          acento={resumen.sinUbicacion > 0 ? 'text-amber-600' : undefined}
        />
      </div>

      {/* Qué nivel de la norma sale de qué dato: sin esto, la clasificación
          parecería una invención de la aplicación. */}
      <dl className="mb-5 grid grid-cols-1 gap-x-8 gap-y-1.5 rounded-lg border border-gray-200 bg-white px-5 py-4 text-sm sm:grid-cols-2">
        {NIVELES.map(({ nivel, nombre, origen }) => (
          <div key={nivel} className="flex items-baseline gap-2">
            <dt className="w-24 shrink-0 font-semibold text-gray-700">
              Nivel {nivel} · {nombre}
            </dt>
            <dd className="min-w-0 text-gray-500">{origen}</dd>
          </div>
        ))}
        <p className="pt-2 text-xs text-gray-500 sm:col-span-2">
          Los niveles 8 y 9 de la norma (componente y pieza) necesitan un registro por pieza que
          el formato de planta no tiene; lo más cercano es el historial de repuestos de cada
          ficha.
        </p>
      </dl>

      {huerfanas.length > 0 && (
        <p className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {huerfanas.length}{' '}
          {huerfanas.length === 1 ? 'ficha apunta' : 'fichas apuntan'} a un equipo padre que no
          está en el catálogo ({huerfanas.map(({ padre }) => padre).join(', ')}). Se muestran como
          equipos, pero el código está mal escrito o falta esa ficha.
        </p>
      )}

      <div className="space-y-3">
        {secciones.map((seccion) => (
          <section
            key={seccion.nombre}
            className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm"
          >
            <header className="flex items-baseline justify-between gap-3 border-b border-gray-200 bg-grafito-50 px-4 py-2.5">
              <h3
                className={`truncate text-sm font-bold ${
                  seccion.sinUbicacion ? 'text-amber-800' : 'text-gray-800'
                }`}
              >
                {seccion.nombre}
              </h3>
              <span className="shrink-0 text-xs tabular-nums text-gray-500">
                {seccion.total} {seccion.total === 1 ? 'activo' : 'activos'}
              </span>
            </header>

            <ul className="divide-y divide-gray-100">
              {seccion.equipos.map(({ maquina, subunidades }) => (
                <li key={maquina.id} className="px-4 py-2">
                  <div className="flex items-baseline gap-2.5">
                    <span className="w-24 shrink-0 truncate font-mono text-[11px] text-grafito-500">
                      {maquina.placaNueva}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAbrirEquipo(maquina.id)}
                      className="min-w-0 truncate text-left text-sm text-gray-800 transition hover:text-acento-700 hover:underline"
                    >
                      {maquina.descripcion}
                    </button>
                  </div>

                  {subunidades.length > 0 && (
                    <ul className="mt-1 space-y-1 border-l border-gray-200 pl-4">
                      {subunidades.map((subunidad) => (
                        <li key={subunidad.id} className="flex items-baseline gap-2.5">
                          <span className="w-20 shrink-0 truncate font-mono text-[11px] text-grafito-400">
                            {subunidad.placaNueva}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAbrirEquipo(subunidad.id)}
                            className="min-w-0 truncate text-left text-sm text-gray-600 transition hover:text-acento-700 hover:underline"
                          >
                            {subunidad.descripcion}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}

/** Completitud de las fichas y dónde están los huecos. */
function Calidad({ calidad, onAbrirEquipo }) {
  const { fichas, peores, masVacios, completas, sinCamposClave } = calidad
  const tono = TONO[tonoDeCalidad(calidad.porcentaje)]

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato etiqueta="Campos diligenciados" valor={porcentaje(calidad.porcentaje)} acento={tono.texto} />
        <Dato etiqueta="Fichas completas" valor={completas} />
        <Dato
          etiqueta="Sin algún campo clave"
          valor={sinCamposClave}
          acento={sinCamposClave > 0 ? 'text-red-600' : undefined}
        />
        <Dato etiqueta="Fichas evaluadas" valor={fichas.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm lg:col-span-3">
          <header className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-bold text-gray-800">Fichas por completar</h3>
            <p className="text-[11px] text-gray-500">
              De menos a más completa: por aquí conviene empezar.
            </p>
          </header>

          <ul className="divide-y divide-gray-100">
            {peores.slice(0, 12).map((ficha) => (
              <li key={ficha.id} className="flex items-center gap-3 px-4 py-2">
                <button
                  type="button"
                  onClick={() => onAbrirEquipo(ficha.id)}
                  className="min-w-0 flex-1 truncate text-left text-sm text-gray-800 transition hover:text-acento-700 hover:underline"
                  title={ficha.descripcion}
                >
                  {ficha.descripcion}
                </button>

                {ficha.faltanClave.length > 0 && (
                  <span className="hidden shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-red-200 sm:block">
                    faltan datos clave
                  </span>
                )}

                <Barra valor={ficha.porcentaje} />
              </li>
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm lg:col-span-2">
          <header className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-bold text-gray-800">Campos que más faltan</h3>
            <p className="text-[11px] text-gray-500">
              En cuántas fichas está vacío cada campo del formato.
            </p>
          </header>

          <ul className="divide-y divide-gray-100">
            {masVacios.slice(0, 12).map(({ campo, rotulo, cuantas }) => (
              <li key={campo} className="flex items-baseline gap-3 px-4 py-2">
                <span className="min-w-0 flex-1 truncate text-xs uppercase tracking-wide text-gray-600">
                  {rotulo}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-800">
                  {cuantas}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}

const PESTANAS = [
  { clave: 'jerarquia', texto: 'Jerarquía de activos' },
  { clave: 'calidad', texto: 'Calidad de datos' },
]

/**
 * Taxonomía ISO 14224 y calidad de los datos.
 *
 * Van juntas porque se responden entre sí: la jerarquía solo es fiable si las
 * fichas tienen ubicación y placa, y la calidad de datos es justo lo que mide
 * si eso se cumple.
 *
 * @param {Object} props
 * @param {Object} props.taxonomia   Lo que devuelve `construirTaxonomia`.
 * @param {Object} props.calidad     Lo que devuelve `calidadDelCatalogo`.
 * @param {(id: string) => void} props.onAbrirEquipo
 */
function Taxonomia({ taxonomia, calidad, onAbrirEquipo }) {
  const [pestana, setPestana] = useState('jerarquia')

  if (calidad.fichas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-gray-800">No hay equipos registrados</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-5 flex gap-1 rounded-lg border border-gray-300 bg-white p-1 sm:w-fit">
        {PESTANAS.map(({ clave, texto }) => (
          <button
            key={clave}
            type="button"
            onClick={() => setPestana(clave)}
            aria-current={pestana === clave ? 'page' : undefined}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition sm:flex-none ${
              pestana === clave
                ? 'bg-acento-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-grafito-50'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {pestana === 'jerarquia' ? (
        <Jerarquia taxonomia={taxonomia} onAbrirEquipo={onAbrirEquipo} />
      ) : (
        <Calidad calidad={calidad} onAbrirEquipo={onAbrirEquipo} />
      )}
    </>
  )
}

export default Taxonomia
