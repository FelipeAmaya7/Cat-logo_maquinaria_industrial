/**
 * Hoja de vida de la máquina: resumen y línea de tiempo.
 *
 * Las órdenes de trabajo y los repuestos se registran por separado, pero
 * cuentan la misma historia: qué le ha pasado a esta máquina. Separados obligan
 * a cruzar dos listas mentalmente; juntos y ordenados por fecha se lee de un
 * tirón, que es como lo presentan los sistemas que sirven de referencia.
 *
 * Es solo lectura. Las órdenes se editan en su módulo y los repuestos en su
 * tabla; duplicar aquí los formularios daría dos sitios donde cambiar lo mismo.
 */

import { aFecha, enFecha } from '../servicios/fechas'

/** Marca de cada tipo de suceso en la línea de tiempo. */
const MARCA = {
  Correctivo: { punto: 'bg-red-500', texto: 'text-red-700' },
  Preventivo: { punto: 'bg-acento-500', texto: 'text-acento-700' },
  Predictivo: { punto: 'bg-violet-500', texto: 'text-violet-700' },
  Repuesto: { punto: 'bg-amber-500', texto: 'text-amber-700' },
}

const MARCA_POR_DEFECTO = { punto: 'bg-grafito-400', texto: 'text-grafito-600' }

const enPesos = (valor) =>
  `$${Math.round(valor).toLocaleString('es-CO')}`

/** Dato suelto del resumen. */
function Dato({ etiqueta, valor, acento }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
      <p className={`text-lg font-bold tabular-nums ${acento ?? 'text-gray-900'}`}>{valor}</p>
      <p className="mt-0.5 text-[11px] text-gray-500">{etiqueta}</p>
    </div>
  )
}

/**
 * @param {Object} props
 * @param {Object[]} props.ordenes    Órdenes de ESTA máquina.
 * @param {Object[]} props.repuestos  Repuestos de ESTA máquina.
 * @param {() => void} [props.onCrearOrden]
 */
function HojaDeVida({ ordenes, repuestos, onCrearOrden }) {
  // Un suceso por orden y uno por repuesto, con la forma mínima que la línea
  // de tiempo necesita para pintarlos igual.
  const sucesos = [
    ...ordenes.map((orden) => ({
      clave: `ot-${orden.ref}`,
      fecha: aFecha(orden.fechaEjecucion) ?? aFecha(orden.fecha),
      tipo: orden.mantenimiento || 'Mantenimiento',
      titulo: `OT-${String(orden.numero).padStart(4, '0')}`,
      detalle: orden.falla || orden.observaciones || 'Sin descripción',
      pie: [orden.tecnico, orden.estado].filter(Boolean).join(' · '),
      coste: null,
      pendiente: orden.estado !== 'Ejecutada',
    })),
    ...repuestos.map((entrada) => ({
      clave: `rp-${entrada.ref}`,
      fecha: aFecha(entrada.fecha),
      tipo: 'Repuesto',
      titulo: entrada.repuesto || 'Repuesto',
      detalle: [entrada.referencia, entrada.motivo].filter(Boolean).join(' · ') || 'Sin referencia',
      pie: [entrada.instaladoPor, entrada.proveedor].filter(Boolean).join(' · '),
      coste: (Number(entrada.cantidad) || 0) * (Number(entrada.costoUnitario) || 0),
      pendiente: false,
    })),
  ].sort((a, b) => (b.fecha?.getTime() ?? 0) - (a.fecha?.getTime() ?? 0))

  const ejecutadas = ordenes.filter((orden) => orden.estado === 'Ejecutada')
  const gasto = repuestos.reduce(
    (total, entrada) => total + (Number(entrada.cantidad) || 0) * (Number(entrada.costoUnitario) || 0),
    0,
  )

  const fechasEjecutadas = ejecutadas.map((orden) => aFecha(orden.fechaEjecucion)).filter(Boolean)
  const ultima = fechasEjecutadas.length ? new Date(Math.max(...fechasEjecutadas)) : null

  const pendientes = ordenes
    .filter((orden) => orden.estado !== 'Ejecutada')
    .map((orden) => aFecha(orden.fecha))
    .filter(Boolean)
  const proxima = pendientes.length ? new Date(Math.min(...pendientes)) : null

  return (
    <section aria-label="Hoja de vida del equipo">
      {/*
        El botón de crear la OT vive aquí y no en la cabecera de la ficha: se
        programa un mantenimiento justo después de mirar lo que ya se le ha
        hecho a la máquina, y así llega con el equipo ya elegido.
      */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-800">Hoja de vida</h3>

        {onCrearOrden && (
          <button
            type="button"
            onClick={onCrearOrden}
            className="shrink-0 rounded-md border border-emerald-600 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
          >
            + Crear OT
          </button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Dato etiqueta="Intervenciones" valor={ejecutadas.length} />
        <Dato etiqueta="Gasto en repuestos" valor={enPesos(gasto)} acento="text-amber-700" />
        <Dato etiqueta="Última ejecutada" valor={enFecha(ultima)} />
        <Dato
          etiqueta="Próxima programada"
          valor={enFecha(proxima)}
          acento={proxima && proxima < new Date() ? 'text-red-600' : undefined}
        />
      </div>

      {sucesos.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
          Sin intervenciones ni repuestos registrados para este equipo.
        </p>
      ) : (
        <ol className="space-y-0 border-l border-gray-200 pl-4">
          {sucesos.map((suceso) => {
            const marca = MARCA[suceso.tipo] ?? MARCA_POR_DEFECTO

            return (
              <li key={suceso.clave} className="relative py-2.5">
                <span
                  className={`absolute -left-[21px] top-4 h-2.5 w-2.5 rounded-full ring-2 ring-white ${marca.punto}`}
                  aria-hidden="true"
                />

                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-mono text-[11px] text-grafito-500">
                    {enFecha(suceso.fecha)}
                  </span>
                  <span className={`text-xs font-semibold ${marca.texto}`}>{suceso.tipo}</span>
                  <span className="text-sm font-medium text-gray-900">{suceso.titulo}</span>

                  {suceso.pendiente && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-200">
                      pendiente
                    </span>
                  )}

                  {suceso.coste > 0 && (
                    <span className="ml-auto text-xs font-semibold tabular-nums text-gray-700">
                      {enPesos(suceso.coste)}
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-sm text-gray-600">{suceso.detalle}</p>
                {suceso.pie && <p className="text-[11px] text-gray-400">{suceso.pie}</p>}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export default HojaDeVida
