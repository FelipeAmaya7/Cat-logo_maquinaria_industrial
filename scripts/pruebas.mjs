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

console.log('\n=========================================')
console.log(`  ${ok} comprobaciones pasaron`)
if (fallos.length) {
  console.log(`  ${fallos.length} FALLARON:`)
  for (const f of fallos) console.log(`      x ${f}`)
  process.exitCode = 1
} else {
  console.log('  sin fallos')
}
