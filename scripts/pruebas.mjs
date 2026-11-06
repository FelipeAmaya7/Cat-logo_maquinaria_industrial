/**
 * Pruebas de los servicios de cálculo.
 *
 *   npm test
 *
 * QUÉ SE PRUEBA Y POR QUÉ ASÍ
 * ---------------------------
 * Los módulos de `src/servicios/` son funciones puras: reciben máquinas y
 * órdenes y devuelven números. No tocan React ni el almacenamiento, así que se
 * pueden comprobar sin montar la aplicación ni abrir el navegador. Ahí está el
 * riesgo real del proyecto —una disponibilidad mal calculada no se ve, miente—,
 * de modo que es ahí donde vale la pena invertir las pruebas.
 *
 * Un solo juego de cinco fichas y seis órdenes ejercita todas las reglas a la
 * vez: placa duplicada, ficha incompleta, equipo fuera de servicio, equipo
 * crítico sin historial, ficha que apunta a un padre inexistente y orden sin
 * fecha. La fecha de «hoy» se inyecta en cada llamada, nunca se usa la del
 * sistema: una prueba cuyo resultado cambia mañana no sirve de nada.
 *
 * No hay framework a propósito: dos ayudantes de ocho líneas bastan y el
 * proyecto no carga otra dependencia.
 */
const S = new URL('../src/servicios', import.meta.url).href
const { calcularAlertas, resumirAlertas } = await import(`${S}/alertas.js`)
const { calidadDelCatalogo, calidadDeFicha, vacio, tonoDeCalidad } = await import(`${S}/calidadDatos.js`)
const { calcularIndicadores, indicadoresDeMaquina, inicioDeObservacion, formatearHoras, formatearPorcentaje } = await import(`${S}/indicadores.js`)
const { agruparProgramacion, plazoDe, diasHasta } = await import(`${S}/programacion.js`)
const { construirTaxonomia } = await import(`${S}/taxonomia.js`)

let ok = 0
const fallos = []
/** Ordena las claves: comparar objetos no debe depender del orden. */
const estable = (v) =>
  v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, estable(v[k])]))
    : v

const es = (nombre, real, esperado) => {
  const a = JSON.stringify(estable(real))
  const b = JSON.stringify(estable(esperado))
  if (a === b) ok++
  else fallos.push(`${nombre}\n          esperado ${b}\n          obtenido ${a}`)
}
const cierto = (nombre, cond) => (cond ? ok++ : fallos.push(nombre))

const HOY = new Date('2026-11-03T00:00:00')
const dia = (n) => {
  const f = new Date(HOY)
  f.setDate(f.getDate() + n)
  return f.toISOString().slice(0, 10)
}

const maquinas = [
  // Completa y con historial real: la única que puede dar indicadores.
  { id: 'a', placaNueva: 'EM001', descripcion: 'Troqueladora', marca: 'Bobst', modelo: 'SP102', ubicacion: 'Corrugado', anioAdquisicion: '2015', disponibilidad: 'Disponible' },
  // Subunidad de «a». Le faltan 3 campos clave; «No registrado» cuenta como vacío.
  { id: 'b', placaNueva: 'EM002', descripcion: 'Guillotina', marca: 'No registrado', modelo: '', ubicacion: 'Corrugado', anioAdquisicion: '', placaPadre: 'EM001' },
  // Repite la placa de a y no tiene ubicacion.
  { id: 'c', placaNueva: 'EM001', descripcion: 'Placa duplicada', marca: 'X', modelo: 'Y', ubicacion: '', anioAdquisicion: '2020' },
  // Apunta a un padre que no existe en el catálogo.
  { id: 'd', placaNueva: 'EM004', descripcion: 'Huerfana', marca: 'Z', modelo: 'W', ubicacion: 'Conversion', anioAdquisicion: '2019' , placaPadre: 'EM999' },
  // Fuera de servicio y crítica, sin ninguna orden.
  { id: 'e', placaNueva: 'EM005', descripcion: 'Caldera', marca: 'ACME', modelo: 'C1', ubicacion: 'Corrugado', anioAdquisicion: '2010', disponibilidad: 'FUERA DE SERVICIO', criticidad: 'Critica' },
]

const ordenes = [
  { ref: 'o1', numero: 1, equipo: 'a', estado: 'Ejecutada', fecha: dia(-120), fechaEjecucion: dia(-120), duracion: '4', mantenimiento: 'Correctivo', prioridad: 'Alta' },
  { ref: 'o2', numero: 2, equipo: 'a', estado: 'Ejecutada', fecha: dia(-60), fechaEjecucion: dia(-60), duracion: '2', mantenimiento: 'Correctivo', prioridad: 'Media' },
  { ref: 'o3', numero: 3, equipo: 'a', estado: 'Programada', fecha: dia(-10), mantenimiento: 'Preventivo', prioridad: 'Alta' },
  { ref: 'o4', numero: 4, equipo: 'b', estado: 'Programada', fecha: dia(0), mantenimiento: 'Preventivo', prioridad: 'Media' },
  { ref: 'o5', numero: 5, equipo: 'b', estado: 'Programada', fecha: dia(5), mantenimiento: 'Preventivo', prioridad: 'Baja' },
  { ref: 'o6', numero: 6, equipo: 'd', estado: 'Programada', fecha: '', mantenimiento: 'Predictivo', prioridad: 'Alta' },
]

console.log('--- PROGRAMACION')
es('diasHasta(hoy)', diasHasta(new Date(`${dia(0)}T00:00:00`), HOY), 0)
es('plazoDe(0)', plazoDe(0), 'Hoy')
es('plazoDe(1)', plazoDe(1), 'Mañana')
es('plazoDe(-3)', plazoDe(-3), 'Venció hace 3 días')
es('plazoDe(null)', plazoDe(null), 'Sin fecha')

const prog = agruparProgramacion(ordenes, maquinas, HOY)
es('pendientes', prog.pendientes, 4)
es('vencidas', prog.vencidas, 1)
es('reparto por ventana',
  Object.fromEntries(prog.grupos.map((g) => [g.clave, g.ordenes.length])),
  { vencidas: 1, hoy: 1, semana: 1, mes: 0, despues: 0, sinFecha: 1 })
cierto('las ejecutadas no entran', prog.grupos.every((g) => g.ordenes.every((o) => o.estado !== 'Ejecutada')))
es('suma de grupos = pendientes', prog.grupos.reduce((t, g) => t + g.ordenes.length, 0), prog.pendientes)
cierto('cada orden trae su maquina resuelta', prog.grupos.flatMap((g) => g.ordenes).every((o) => Boolean(o.maquina)))
cierto('la orden sin fecha tiene dias null', prog.grupos.find((g) => g.clave === 'sinFecha').ordenes[0].dias === null)
const vencida = prog.grupos.find((g) => g.clave === 'vencidas').ordenes[0]
es('la vencida lleva -10 dias', vencida.dias, -10)
es('la vencida es la OT 3', vencida.numero, 3)

console.log('--- ALERTAS')
const alertas = calcularAlertas({ maquinas, ordenes, repuestos: [] }, HOY)
const familia = (clave) => clave.replace(/-.*$/, '')
const porFamilia = {}
for (const a of alertas) porFamilia[familia(a.clave)] = (porFamilia[familia(a.clave)] ?? 0) + 1
console.log('    ', JSON.stringify(porFamilia))
es('familias y conteos', porFamilia, { orden: 3, placa: 1, ficha: 2, parada: 1, sin: 1 })
es('total de alertas', alertas.length, 8)
cierto('gravedad valida', alertas.every((a) => ['alta', 'media', 'baja'].includes(a.gravedad)))
cierto('clave unica', new Set(alertas.map((a) => a.clave)).size === alertas.length)
cierto('todas con titulo, detalle y destino', alertas.every((a) => a.titulo && a.detalle && a.destino?.vista))
const peso = { alta: 0, media: 1, baja: 2 }
cierto('ordenadas por gravedad', alertas.every((a, i) => i === 0 || peso[alertas[i - 1].gravedad] <= peso[a.gravedad]))
cierto('la orden vencida es gravedad alta', alertas.find((a) => a.clave === 'orden-o3').gravedad === 'alta')
cierto('la orden de hoy es media', alertas.find((a) => a.clave === 'orden-o4').gravedad === 'media')
cierto('la orden sin fecha no alerta', !alertas.some((a) => a.clave === 'orden-o6'))
const resumen = resumirAlertas(alertas)
es('resumen suma el total', resumen.altas + resumen.medias + resumen.bajas, alertas.length)
es('resumen.total', resumen.total, alertas.length)
es('sin alertas el resumen es cero', resumirAlertas([]), { total: 0, altas: 0, medias: 0, bajas: 0 })

// La hora del día NO debe cambiar el resultado. Restar dos Date da
// milisegundos: una orden programada a medianoche, mirada a las tres de la
// tarde, parecía vencida del día anterior. Esta es la prueba que faltaba.
console.log('--- ALERTAS: independencia de la hora')
for (const hora of ['00:00:00', '09:30:00', '15:00:00', '23:59:00']) {
  const ahora = new Date(`2026-11-03T${hora}`)
  const a = calcularAlertas({ maquinas, ordenes, repuestos: [] }, ahora)
  const hoyMismo = a.find((x) => x.clave === 'orden-o4')
  const atrasada = a.find((x) => x.clave === 'orden-o3')
  es(`a las ${hora}: la de hoy no esta vencida`, hoyMismo.gravedad, 'media')
  es(`a las ${hora}: la de hoy dice 0 dias`, hoyMismo.detalle, 'Programada en 0 días')
  es(`a las ${hora}: la atrasada sigue en 10 dias`, atrasada.detalle, '10 días sin ejecutar')
  const pr = agruparProgramacion(ordenes, maquinas, ahora)
  es(`a las ${hora}: programacion cuenta 1 vencida`, pr.vencidas, 1)
  es(`a las ${hora}: alertas y programacion coinciden`,
    a.filter((x) => x.gravedad === 'alta' && x.clave.startsWith('orden-')).length, pr.vencidas)
}

console.log('--- INDICADORES')
es('vacio()', [vacio('No registrado'), vacio(''), vacio('   '), vacio('Bobst')], [true, true, true, false])
es('inicioDeObservacion = primera orden con fecha',
  inicioDeObservacion(ordenes.filter((o) => o.equipo === 'a')).toISOString().slice(0, 10), dia(-120))
es('sin fechas no hay periodo', inicioDeObservacion([{ ref: 'x', fecha: '' }]), null)

const ind = calcularIndicadores(maquinas, ordenes, HOY)
es('cubiertas / total', [ind.cubiertas, ind.total], [1, 5])
es('solo el equipo a entra en la matriz', ind.matriz.map((f) => f.id), ['a'])
const fa = ind.matriz[0]
es('periodo = 120 dias x 24 h', fa.periodo, 120 * 24)
es('n = correctivas ejecutadas', fa.n, 2)
es('mt = 4 + 2', fa.mt, 6)
es('rt = solo correctivas', fa.rt, 6)
es('tto = periodo - mt', fa.tto, 120 * 24 - 6)
es('mttr = rt / n', fa.mttr, 3)
es('mtbf = tto / n', fa.mtbf, (120 * 24 - 6) / 2)
es('mttf = tto / (n + 1)', fa.mttf, (120 * 24 - 6) / 3)
cierto('disponibilidad coherente', Math.abs(fa.a - fa.tto / fa.periodo) < 1e-9)
cierto('disponibilidad entre 0 y 1', fa.a > 0.99 && fa.a < 1)
es('la OT programada no cuenta como ejecutada', fa.mt, 6)
es('equipo con historial solo de hoy o futuro = null', indicadoresDeMaquina(maquinas[1], ordenes.filter((o) => o.equipo === 'b'), HOY), null)
es('equipo sin ordenes = null', indicadoresDeMaquina(maquinas[2], [], HOY), null)
es('orden sin fecha no abre periodo', indicadoresDeMaquina(maquinas[3], ordenes.filter((o) => o.equipo === 'd'), HOY), null)
es('totales se recalculan, no se promedian', [ind.totales.mt, ind.totales.n, ind.totales.mttr], [6, 2, 3])
es('formatearHoras(3.5) conserva el decimal', formatearHoras(3.5), '3,5 h')
es('formatearHoras(null)', formatearHoras(null), '—')
cierto('formatearHoras(1437) sin decimales', !formatearHoras(1437).includes(','))
es('formatearPorcentaje(null)', formatearPorcentaje(null), '—')

console.log('--- TAXONOMIA')
const tax = construirTaxonomia(maquinas)
es('equipos nivel 6', tax.resumen.equipos, 4)
es('subunidades nivel 7', tax.resumen.subunidades, 1)
es('secciones (sin contar el cajon de sastre)', tax.resumen.secciones, 2)
es('fichas sin ubicacion', tax.resumen.sinUbicacion, 1)
es('huerfanas', tax.huerfanas.length, 1)
es('la huerfana apunta a EM999', tax.huerfanas[0].padre, 'EM999')
es('b cuelga de a', tax.secciones.find((s) => s.nombre === 'Corrugado').equipos.find((e) => e.maquina.id === 'a').subunidades.map((m) => m.id), ['b'])
cierto('«sin ubicacion» va al final', tax.secciones[tax.secciones.length - 1].sinUbicacion === true)
es('ningun activo se pierde ni se duplica',
  tax.secciones.reduce((t, s) => t + s.equipos.length + s.equipos.reduce((u, e) => u + e.subunidades.length, 0), 0),
  maquinas.length)
es('el total de la seccion incluye subunidades', tax.secciones.find((s) => s.nombre === 'Corrugado').total, 3)
// Un padre que es la propia ficha no debe crear un bucle ni perderla.
const bucle = construirTaxonomia([{ id: 'z', placaNueva: 'EM100', descripcion: 'Se apunta a si misma', placaPadre: 'EM100', ubicacion: 'Taller' }])
es('autorreferencia no rompe', bucle.resumen.equipos, 1)
es('autorreferencia no cuenta como subunidad', bucle.resumen.subunidades, 0)
es('catalogo vacio no rompe', construirTaxonomia([]).resumen, { secciones: 0, equipos: 0, subunidades: 0, sinUbicacion: 0 })

console.log('--- CALIDAD DE DATOS')
const cal = calidadDelCatalogo(maquinas)
es('evalua las 5 fichas', cal.fichas.length, 5)
cierto('porcentaje entre 0 y 1', cal.porcentaje >= 0 && cal.porcentaje <= 1)
es('fichas sin algun campo clave', cal.sinCamposClave, 2)
cierto('peores de menor a mayor', cal.peores.every((f, i) => i === 0 || cal.peores[i - 1].porcentaje <= f.porcentaje))
cierto('masVacios de mayor a menor', cal.masVacios.every((c, i) => i === 0 || cal.masVacios[i - 1].cuantas >= c.cuantas))
cierto('todo campo listado tiene rotulo del formato', cal.masVacios.every((c) => typeof c.rotulo === 'string' && c.rotulo.length > 0))
es('«No registrado» cuenta como faltante', calidadDeFicha(maquinas[1]).faltanClave.sort(), ['anioAdquisicion', 'marca', 'modelo'])
es('completos + faltantes = total', (() => { const f = calidadDeFicha(maquinas[0]); return f.completos + f.faltantes.length })(), calidadDeFicha(maquinas[0]).total)
es('catalogo vacio da 0 y no NaN', calidadDelCatalogo([]).porcentaje, 0)
es('tonos', [tonoDeCalidad(0.95), tonoDeCalidad(0.8), tonoDeCalidad(0.7), tonoDeCalidad(0.3)], ['emerald', 'emerald', 'amber', 'red'])

// ───────────────────────────────────────────────────────────────────────────
// DATOS DE EJEMPLO
//
// Son los que verá cualquiera que abra la aplicación publicada, así que tienen
// que cumplir solos lo que la interfaz da por supuesto: que el equipo exista,
// que una orden ejecutada traiga duración, que las fechas sean coherentes. Un
// ejemplo mal formado no rompe la aplicación: la deja mintiendo en silencio.
// ───────────────────────────────────────────────────────────────────────────
console.log('--- DATOS DE EJEMPLO')
const D = new URL('../src/data', import.meta.url).href
const { ORDENES_EJEMPLO } = await import(`${D}/ordenes-ejemplo.js`)
const { REPUESTOS_EJEMPLO } = await import(`${D}/repuestos-ejemplo.js`)
const { maquinas: LIBRO } = await import(`${D}/maquinas.js`)
const { catalogoInicial: CATALOGO, IDS_REFERENCIA } = await import(`${D}/catalogo.js`)

const idsCatalogo = new Set(CATALOGO.map((m) => m.id))
const equiposConOrden = new Set(ORDENES_EJEMPLO.map((o) => o.equipo))

// EL CATALOGO DE REFERENCIA
//
// Se recorto el libro de planta a doce fichas escogidas a mano. Una lista
// escrita a mano contra un archivo GENERADO (`npm run datos` rehace
// `maquinas.js` desde el Excel) es justo donde se cuelan los desajustes: basta
// que el Excel cambie una placa para que el catalogo se quede corto en
// silencio. Por eso se comprueba aqui y no en la interfaz.
es('el catalogo de referencia tiene 12 fichas', CATALOGO.length, 12)
es('no sobra ni falta ninguna respecto a la lista', CATALOGO.length, IDS_REFERENCIA.length)
cierto('todo id de referencia existe en el libro de planta',
  IDS_REFERENCIA.every((id) => LIBRO.some((m) => m.id === id)))
cierto('ningun id repetido en la lista de referencia',
  new Set(IDS_REFERENCIA).size === IDS_REFERENCIA.length)
cierto('las doce tienen fotografia, que es la razon de haberlas elegido',
  CATALOGO.every((m) => Boolean(m.imagen)))
cierto('ninguna placa repetida: el defecto del libro no entra en la muestra',
  new Set(CATALOGO.map((m) => m.placaNueva)).size === CATALOGO.length)

cierto('hay ordenes de ejemplo', ORDENES_EJEMPLO.length >= 25)
es('cubren 10 equipos', equiposConOrden.size, 10)
cierto('todo equipo referenciado existe en el catalogo de referencia',
  [...equiposConOrden].every((id) => idsCatalogo.has(id)))
es('dos equipos quedan sin historial, a proposito', CATALOGO.length - equiposConOrden.size, 2)
cierto('ninguna ref repetida', new Set(ORDENES_EJEMPLO.map((o) => o.ref)).size === ORDENES_EJEMPLO.length)
cierto('ningun numero de orden repetido', new Set(ORDENES_EJEMPLO.map((o) => o.numero)).size === ORDENES_EJEMPLO.length)
cierto('todo estado es uno de los tres validos',
  ORDENES_EJEMPLO.every((o) => ['Programada', 'En proceso', 'Ejecutada'].includes(o.estado)))
cierto('todo tipo es uno de los tres validos',
  ORDENES_EJEMPLO.every((o) => ['Correctivo', 'Preventivo', 'Predictivo'].includes(o.mantenimiento)))

// Sin estas dos, una orden no entra en los indicadores y el ejemplo no sirve.
const ejecutadas = ORDENES_EJEMPLO.filter((o) => o.estado === 'Ejecutada')
cierto('hay suficientes ejecutadas', ejecutadas.length >= 18)
cierto('toda ejecutada tiene fecha de ejecucion', ejecutadas.every((o) => o.fechaEjecucion))
cierto('toda ejecutada tiene duracion numerica',
  ejecutadas.every((o) => Number.isFinite(Number(o.duracion)) && Number(o.duracion) > 0))
cierto('ninguna se ejecuto antes de programarse',
  ejecutadas.every((o) => o.fechaEjecucion >= o.fecha))
cierto('ninguna pendiente trae fecha de ejecucion',
  ORDENES_EJEMPLO.filter((o) => o.estado !== 'Ejecutada').every((o) => !o.fechaEjecucion))
cierto('marca y modelo salen de la ficha, no de una copia a mano',
  ORDENES_EJEMPLO.every((o) => {
    const m = CATALOGO.find((x) => x.id === o.equipo)
    return o.marca === (m.marca ?? '') && o.modelo === (m.modelo ?? '') && o.serie === (m.serie ?? '')
  }))

// Varias ordenes por equipo: con una sola, el MTBF es todo el periodo y no
// informa de nada. Esta es la razon de que sean ~30 y no 10.
const porEquipo = {}
for (const o of ORDENES_EJEMPLO) porEquipo[o.equipo] = (porEquipo[o.equipo] ?? 0) + 1
cierto('cada equipo tiene entre 2 y 4 ordenes',
  Object.values(porEquipo).every((n) => n >= 2 && n <= 4))
const correctivosPorEquipo = {}
for (const o of ejecutadas.filter((x) => x.mantenimiento === 'Correctivo')) {
  correctivosPorEquipo[o.equipo] = (correctivosPorEquipo[o.equipo] ?? 0) + 1
}
cierto('al menos 4 equipos con 2+ correctivos, para que el MTBF promedie',
  Object.values(correctivosPorEquipo).filter((n) => n >= 2).length >= 4)

// Las vistas, alimentadas con los ejemplos.
const indEj = calcularIndicadores(CATALOGO, ORDENES_EJEMPLO)
es('los 10 equipos quedan cubiertos por los indicadores', indEj.cubiertas, 10)
es('el total que reporta el indicador es el del catalogo', indEj.total, 12)
cierto('disponibilidad global entre 0 y 1', indEj.totales.a > 0 && indEj.totales.a <= 1)
cierto('MTTR global razonable (entre 1 y 12 h)', indEj.totales.mttr >= 1 && indEj.totales.mttr <= 12)
cierto('MTBF global positivo y menor que el periodo', indEj.totales.mtbf > 0 && indEj.totales.mtbf < indEj.totales.periodo)
cierto('toda fila tiene disponibilidad valida', indEj.matriz.every((f) => f.a > 0 && f.a <= 1))
cierto('ninguna fila con mas mantenimiento que periodo', indEj.matriz.every((f) => f.mt <= f.periodo))

const progEj = agruparProgramacion(ORDENES_EJEMPLO, CATALOGO)
const conOrdenes = progEj.grupos.filter((g) => g.ordenes.length > 0).map((g) => g.clave)
cierto('la programacion llena al menos 4 ventanas distintas', conOrdenes.length >= 4)
cierto('hay vencidas, para que se vea el caso urgente', progEj.vencidas >= 1)
cierto('hay algo para hoy', progEj.grupos.find((g) => g.clave === 'hoy').ordenes.length >= 1)
es('pendientes = ordenes no ejecutadas', progEj.pendientes, ORDENES_EJEMPLO.length - ejecutadas.length)

const alertasEj = calcularAlertas({ maquinas: CATALOGO, ordenes: ORDENES_EJEMPLO, repuestos: REPUESTOS_EJEMPLO })
cierto('las alertas encuentran algo que decir', alertasEj.length > 0)
cierto('alguna alerta es de orden vencida', alertasEj.some((a) => a.clave.startsWith('orden-') && a.gravedad === 'alta'))

// Repuestos: la hoja de vida mezcla las dos colecciones, asi que deben casar.
cierto('hay repuestos de ejemplo', REPUESTOS_EJEMPLO.length >= 8)
cierto('ninguna ref de repuesto repetida',
  new Set(REPUESTOS_EJEMPLO.map((r) => r.ref)).size === REPUESTOS_EJEMPLO.length)
cierto('todo repuesto apunta a un equipo del catalogo',
  REPUESTOS_EJEMPLO.every((r) => idsCatalogo.has(r.idMaquina)))
cierto('todo repuesto cuelga de un equipo que tiene ordenes',
  REPUESTOS_EJEMPLO.every((r) => equiposConOrden.has(r.idMaquina)))
cierto('todo repuesto tiene fecha', REPUESTOS_EJEMPLO.every((r) => Boolean(r.fecha)))
cierto('cantidad y costo son numeros positivos',
  REPUESTOS_EJEMPLO.every((r) => Number(r.cantidad) > 0 && Number(r.costoUnitario) > 0))
cierto('el gasto total es mayor que cero, para que la hoja de vida no muestre $0',
  REPUESTOS_EJEMPLO.reduce((t, r) => t + Number(r.cantidad) * Number(r.costoUnitario), 0) > 0)
cierto('cada repuesto cita el numero de su orden',
  REPUESTOS_EJEMPLO.every((r) => ORDENES_EJEMPLO.some((o) => String(o.numero) === String(r.ordenTrabajo))))

// COHERENCIA REPUESTO <-> ORDEN
//
// Aqui habia dos desajustes de verdad, y ninguno rompia nada: una entrada
// colgaba de la orden equivocada y mostraba una pieza montada en una maquina
// que nunca la llevo, con fecha FUTURA ademas, porque esa orden todavia estaba
// programada. La hoja de vida lo habria ensenado tal cual. Ahora la entrada
// hereda equipo, fecha y tecnico de su orden, y lo unico que hay que acertar
// es a que orden se engancha. Esto comprueba ese enganche.
const ordenDe = (r) => ORDENES_EJEMPLO.find((o) => String(o.numero) === String(r.ordenTrabajo))
cierto('todo repuesto cuelga de una orden EJECUTADA, no de una pendiente',
  REPUESTOS_EJEMPLO.every((r) => ordenDe(r)?.estado === 'Ejecutada'))
cierto('el repuesto es del mismo equipo que su orden',
  REPUESTOS_EJEMPLO.every((r) => ordenDe(r)?.equipo === r.idMaquina))
cierto('el repuesto lleva la fecha de ejecucion de su orden',
  REPUESTOS_EJEMPLO.every((r) => ordenDe(r)?.fechaEjecucion === r.fecha))
cierto('lo instala el tecnico que firmo la orden',
  REPUESTOS_EJEMPLO.every((r) => ordenDe(r)?.tecnico === r.instaladoPor))
const hoyISO = new Date().toLocaleDateString('en-CA')
cierto('ninguna pieza esta instalada en el futuro',
  REPUESTOS_EJEMPLO.every((r) => r.fecha <= hoyISO))
cierto('el motivo del repuesto habla de la misma falla que la orden',
  REPUESTOS_EJEMPLO.every((r) => Boolean(r.motivo) && Boolean(r.referencia) && Boolean(r.proveedor)))

// LA TAXONOMIA DE LAS DOCE
//
// Dos de las doce entraron para que el arbol tenga un nivel 7 real: EM00014
// es el sistema hidraulico de la impresora EM00012. Sin esa pareja el arbol
// seria plano y la vista no demostraria la parte de la norma que dice
// sostener.
const taxEj = construirTaxonomia(CATALOGO)
es('el arbol reparte las doce en seis secciones', taxEj.resumen.secciones, 6)
es('once equipos y una subunidad', taxEj.resumen.equipos, 11)
es('la subunidad de nivel 7 existe', taxEj.resumen.subunidades, 1)
cierto('y es EM00014 colgando de EM00012',
  taxEj.secciones
    .flatMap((sec) => sec.equipos)
    .some((eq) => eq.maquina.id === 'EM00012' && eq.subunidades.some((su) => su.id === 'EM00014')))
es('ninguna ficha huerfana: ningun padre apunta fuera del catalogo', taxEj.huerfanas.length, 0)
cierto('la seccion de cada ficha es su campo UBICACION',
  taxEj.secciones.every((sec) => sec.equipos.every((eq) => eq.maquina.ubicacion === sec.nombre)))

// ───────────────────────────────────────────────────────────────────────────
// EL SEMBRADO
//
// Es la parte con riesgo real: si sembrara sin comprobar, al subir la version
// del catalogo borraria el historial de quien ya use la aplicacion. Las tres
// ramas se prueban con un localStorage simulado.
// ───────────────────────────────────────────────────────────────────────────
console.log('--- SEMBRADO')

/** localStorage de mentira, suficiente para lo que usa `almacenamiento.js`. */
function montarAlmacen(inicial = {}) {
  const datos = new Map(Object.entries(inicial))
  globalThis.window = {
    localStorage: {
      getItem: (k) => (datos.has(k) ? datos.get(k) : null),
      setItem: (k, v) => datos.set(k, String(v)),
      removeItem: (k) => datos.delete(k),
      get length() { return datos.size },
      key: (i) => [...datos.keys()][i] ?? null,
    },
  }
  // Object.keys(window.localStorage) lo usa la migracion de claves antiguas.
  for (const k of datos.keys()) globalThis.window.localStorage[k] = datos.get(k)
  return datos
}

const P = 'fichas-tecnicas:'

// Rama 1: navegador nuevo, ninguna clave. Debe sembrar.
{
  const datos = montarAlmacen()
  const { sembrarDatosIniciales, leerOrdenes, leerRepuestos } = await import(`${S}/datos.js?r=1`)
  await sembrarDatosIniciales()
  es('navegador nuevo: siembra las ordenes', JSON.parse(datos.get(P + 'ordenes-trabajo')).length, ORDENES_EJEMPLO.length)
  es('navegador nuevo: siembra los repuestos', JSON.parse(datos.get(P + 'repuestos')).length, REPUESTOS_EJEMPLO.length)
  es('navegador nuevo: leerOrdenes las devuelve', leerOrdenes().length, ORDENES_EJEMPLO.length)
  es('navegador nuevo: leerRepuestos los devuelve', leerRepuestos().length, REPUESTOS_EJEMPLO.length)
}

// Rama 2: clave presente pero vacia (el caso de quien borro sus pruebas).
// Debe sembrar: no hay nada que perder.
{
  const datos = montarAlmacen({ [P + 'ordenes-trabajo']: '[]', [P + 'repuestos']: '[]' })
  const { sembrarDatosIniciales } = await import(`${S}/datos.js?r=2`)
  await sembrarDatosIniciales()
  es('lista vacia: siembra igualmente', JSON.parse(datos.get(P + 'ordenes-trabajo')).length, ORDENES_EJEMPLO.length)
}

// Rama 3: LA IMPORTANTE. Hay ordenes propias. No debe tocarlas.
{
  const mias = [{ ref: 'mia-1', numero: '901', equipo: 'EM00034', estado: 'Ejecutada', fecha: '2026-01-15', fechaEjecucion: '2026-01-15', duracion: '3', mantenimiento: 'Correctivo' }]
  const datos = montarAlmacen({
    [P + 'ordenes-trabajo']: JSON.stringify(mias),
    [P + 'repuestos']: JSON.stringify([{ ref: 'mio-1', idMaquina: 'EM00034', fecha: '2026-01-15', repuesto: 'Pieza mia' }]),
  })
  const { sembrarDatosIniciales, leerOrdenes } = await import(`${S}/datos.js?r=3`)
  await sembrarDatosIniciales()
  es('ordenes propias: NO se sobrescriben', JSON.parse(datos.get(P + 'ordenes-trabajo')), mias)
  es('ordenes propias: leerOrdenes devuelve las suyas', leerOrdenes().length, 1)
  es('repuestos propios: NO se sobrescriben', JSON.parse(datos.get(P + 'repuestos')).length, 1)
  cierto('ordenes propias: el catalogo si se resincroniza', datos.has(P + 'catalogo'))
}

// Rama 4: idempotencia. Sembrar dos veces no duplica nada.
{
  const datos = montarAlmacen()
  const { sembrarDatosIniciales } = await import(`${S}/datos.js?r=4`)
  await sembrarDatosIniciales()
  const primera = datos.get(P + 'ordenes-trabajo')
  await sembrarDatosIniciales()
  es('sembrar dos veces no cambia nada', datos.get(P + 'ordenes-trabajo'), primera)
}

delete globalThis.window

// El aviso de que son datos inventados tiene que estar en el archivo: es lo
// que impide que alguien los confunda con el historial real de la planta.
const { readFileSync } = await import('node:fs')
for (const archivo of ['ordenes-ejemplo.js', 'repuestos-ejemplo.js']) {
  const texto = readFileSync(new URL(`../src/data/${archivo}`, import.meta.url), 'utf8')
  cierto(`${archivo} advierte que no son datos reales`,
    /NO SON EL HISTORIAL REAL/.test(texto))
}

console.log('\n=========================================')
console.log(`  ${ok} comprobaciones pasaron`)
if (fallos.length) {
  console.log(`  ${fallos.length} FALLARON:`)
  for (const f of fallos) console.log(`      x ${f}`)
  process.exitCode = 1
} else {
  console.log('  sin fallos')
}
