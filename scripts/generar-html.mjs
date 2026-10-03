/**
 * Genera un catálogo en UN SOLO archivo HTML autocontenido.
 *
 * Uso:
 *   node scripts/generar-html.mjs            # todas las fichas
 *   node scripts/generar-html.mjs --catalogo # solo las 6 del catálogo inicial
 *
 * Para qué sirve
 * --------------
 * La aplicación React necesita `npm install` y un servidor. Este archivo no:
 * se abre con doble clic, funciona sin conexión, se manda por correo o por
 * WhatsApp y se ve igual en el computador y en el celular. Es el formato para
 * entregar o sustentar, no para trabajar.
 *
 * Todo va incrustado: los datos como JSON y las fotografías como data URL, de
 * modo que no hay ni una sola petición de red salvo la librería de Excel, que
 * se pide al CDN solo si alguien pulsa "Descargar".
 *
 * NO es una segunda aplicación que haya que mantener: se GENERA a partir de los
 * mismos datos que consume la aplicación React.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { register } from 'node:module'

// `src/` importa sin extensión (idioma de Vite) y Node las exige: este hook
// cubre la diferencia para poder consumir el mismo código sin modificarlo.
register('./resolver-extension.mjs', import.meta.url)

const raizProyecto = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CARPETA_MAQUINAS = resolve(raizProyecto, 'public/maquinas')

const { maquinas } = await import('../src/data/maquinas.js')
const { catalogoInicial } = await import('../src/data/catalogo.js')
const { INSTITUCION } = await import('../src/data/institucion.js')

const soloCatalogo = process.argv.includes('--catalogo')
const seleccion = soloCatalogo ? catalogoInicial : maquinas
const ARCHIVO_SALIDA = resolve(
  raizProyecto,
  soloCatalogo ? 'catalogo-maquinaria.html' : 'catalogo-maquinaria-completo.html',
)

/** Campos que se muestran en la ficha, en el orden del formato de planta. */
const CAMPOS = [
  ['placaNueva', 'Placa nueva'],
  ['descripcion', 'Descripción'],
  ['marca', 'Marca'],
  ['modelo', 'Modelo'],
  ['serie', 'Serie'],
  ['anioAdquisicion', 'Año de adquisición'],
  ['estado', 'Estado'],
  ['disponibilidad', 'Disponibilidad'],
  ['ubicacion', 'Ubicación'],
  ['piso', 'Piso'],
  ['turnoPorDia', 'Turno por día'],
  ['capacidad', 'Capacidad productiva'],
  ['material', 'Material'],
  ['color', 'Color'],
  ['dimension', 'Dimensión'],
  ['vidaUtil', 'Vida útil (años)'],
]

const BLOQUES = [
  ['funcion', 'Función que presta'],
  ['materialProcesado', 'Material procesado'],
  ['especificaciones', 'Especificaciones'],
]

/** Convierte una fotografía del disco en un data URL. */
function incrustarImagen(nombre) {
  if (!nombre) return null

  const ruta = resolve(CARPETA_MAQUINAS, nombre)
  if (!existsSync(ruta)) return null

  const extension = nombre.split('.').pop().toLowerCase()
  const tipo = extension === 'webp' ? 'image/webp' : extension === 'png' ? 'image/png' : 'image/jpeg'

  return `data:${tipo};base64,${readFileSync(ruta).toString('base64')}`
}

// --- Preparación de los datos ------------------------------------------------

let conFoto = 0
const datos = seleccion.map((maquina) => {
  const imagen = incrustarImagen(maquina.imagen)
  if (imagen) conFoto += 1

  return { ...maquina, imagen }
})

/** Escapa lo que va DENTRO de la etiqueta <script> para no cerrarla por accidente. */
const jsonSeguro = JSON.stringify(datos).replace(/</g, '\\u003c')

const escapar = (texto) =>
  String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const generado = new Date().toLocaleString('es-CO')

// --- Documento ---------------------------------------------------------------

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapar(INSTITUCION.titulo)}</title>
<style>
  :root{
    --fondo:#f3f4f6; --papel:#ffffff; --borde:#d1d5db; --borde-suave:#e5e7eb;
    --texto:#1f2937; --tenue:#6b7280; --acento:#2563eb; --acento-oscuro:#1d4ed8;
    --exito:#047857; --exito-suave:#ecfdf5; --aviso:#b45309; --aviso-suave:#fffbeb;
    --sombra:0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.1);
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{
    margin:0; background:var(--fondo); color:var(--texto);
    font-family:"Segoe UI",Roboto,-apple-system,"Helvetica Neue",Arial,sans-serif;
    font-size:14px; line-height:1.5;
  }
  .contenedor{max-width:1100px; margin:0 auto; padding:0 16px}

  header.app{background:var(--papel); border-bottom:4px solid var(--acento); box-shadow:var(--sombra)}
  header.app .contenedor{display:flex; flex-wrap:wrap; align-items:center; gap:16px; padding-top:16px; padding-bottom:16px}
  .marca{display:flex; align-items:center; gap:14px; min-width:0; flex:1}
  .icono{width:44px; height:44px; flex:none; display:grid; place-items:center;
    border:1px solid var(--borde); border-radius:10px; background:#f9fafb; color:var(--acento)}
  .titulo{font-size:15px; font-weight:700; letter-spacing:.02em; margin:0; text-transform:uppercase}
  .subtitulo{margin:2px 0 0; font-size:12px; color:var(--tenue)}

  .barra{display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin:24px 0 18px}
  .buscador{position:relative; flex:1; min-width:220px}
  .buscador input{
    width:100%; padding:11px 14px 11px 38px; font-size:14px; color:var(--texto);
    background:var(--papel); border:1px solid var(--borde); border-radius:8px; box-shadow:var(--sombra);
    outline:none; transition:border-color .15s, box-shadow .15s;
  }
  .buscador input:focus{border-color:var(--acento); box-shadow:0 0 0 3px #bfdbfe}
  .buscador svg{position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#9ca3af}

  button{font-family:inherit; font-size:14px; font-weight:600; cursor:pointer; border-radius:8px;
    padding:10px 16px; border:1px solid transparent; transition:background .15s, border-color .15s}
  .btn-principal{background:var(--acento); color:#fff}
  .btn-principal:hover{background:var(--acento-oscuro)}
  .btn-secundario{background:var(--papel); color:var(--texto); border-color:var(--borde); box-shadow:var(--sombra)}
  .btn-secundario:hover{background:#f9fafb}
  button:disabled{opacity:.55; cursor:not-allowed}

  .conteo{font-size:12px; color:var(--tenue); margin:0 0 16px}

  .rejilla{display:grid; gap:18px; grid-template-columns:1fr}
  @media(min-width:640px){.rejilla{grid-template-columns:repeat(2,1fr)}}
  @media(min-width:960px){.rejilla{grid-template-columns:repeat(3,1fr)}}

  .tarjeta{background:var(--papel); border:1px solid var(--borde); border-radius:10px; overflow:hidden;
    box-shadow:var(--sombra); display:flex; flex-direction:column; transition:transform .15s, border-color .15s}
  .tarjeta:hover{transform:translateY(-2px); border-color:#93c5fd}
  .tarjeta .foto{height:160px; background:#f3f4f6; display:grid; place-items:center; color:#9ca3af}
  .tarjeta .foto img{width:100%; height:100%; object-fit:cover; display:block}
  .tarjeta .cuerpo{padding:14px; display:flex; flex-direction:column; gap:10px; flex:1}
  .fila-etiquetas{display:flex; justify-content:space-between; align-items:flex-start; gap:8px}
  .placa{background:#1f2937; color:#fff; font-family:ui-monospace,Consolas,monospace;
    font-size:11px; font-weight:600; padding:3px 8px; border-radius:4px}
  .pastilla{font-size:11px; font-weight:500; padding:3px 9px; border-radius:999px; border:1px solid}
  .p-uso{background:var(--exito-suave); color:var(--exito); border-color:#a7f3d0}
  .p-alm{background:var(--aviso-suave); color:var(--aviso); border-color:#fde68a}
  .p-otro{background:#f8fafc; color:#64748b; border-color:#e2e8f0}
  .tarjeta h3{margin:0; font-size:15px; font-weight:600; line-height:1.35}
  .meta{margin:0; font-size:12px; color:var(--tenue); display:grid; gap:3px}
  .meta b{color:#4b5563; font-weight:600}

  .vacio{background:var(--papel); border:1px dashed var(--borde); border-radius:10px;
    padding:48px 20px; text-align:center; color:var(--tenue)}

  dialog.ficha{border:none; border-radius:10px; padding:0; width:min(900px,96vw); max-height:92vh;
    box-shadow:0 10px 40px rgba(16,24,40,.2)}
  dialog.ficha::backdrop{background:rgba(17,24,39,.55)}
  .ficha-cab{display:flex; flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:flex-start;
    padding:16px 20px; border-bottom:1px solid var(--borde)}
  .ficha-cab h2{margin:0; font-size:15px; font-weight:700; text-transform:uppercase; letter-spacing:.02em}
  .ficha-cab p{margin:2px 0 0; font-size:12px; color:var(--tenue)}
  .ficha-ident{display:flex; flex-wrap:wrap; gap:10px; align-items:center;
    padding:12px 20px; background:#f9fafb; border-bottom:1px solid var(--borde)}
  .ficha-cuerpo{padding:20px; display:grid; gap:22px; grid-template-columns:1fr}
  @media(min-width:860px){.ficha-cuerpo{grid-template-columns:1.1fr 1fr}}
  .tabla-envoltura{overflow-x:auto}
  table.datos{width:100%; min-width:320px; border-collapse:collapse}
  table.datos th{width:40%; text-align:left; vertical-align:top; padding:8px 14px 8px 0;
    font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:#374151}
  table.datos td{padding:8px 0; vertical-align:top; color:#374151; word-break:break-word}
  table.datos tr{border-bottom:1px solid var(--borde)}
  .ficha-foto{border:1px solid var(--borde-suave); border-radius:8px; background:#f9fafb;
    padding:10px; display:grid; place-items:center; min-height:200px}
  .ficha-foto img{max-width:100%; max-height:300px; object-fit:contain; border-radius:4px}
  .bloques{padding:0 20px 20px; display:grid; gap:18px; grid-template-columns:1fr}
  @media(min-width:720px){.bloques{grid-template-columns:repeat(3,1fr)}}
  .bloques h4{margin:0 0 8px; padding-bottom:8px; border-bottom:1px solid var(--borde);
    font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.03em}
  .bloques p{margin:0; color:#374151}
  .ficha-pie{display:grid; gap:0; grid-template-columns:1fr; border-top:1px solid var(--borde);
    background:#f9fafb; font-size:11px; text-transform:uppercase; color:var(--tenue)}
  @media(min-width:640px){.ficha-pie{grid-template-columns:repeat(3,1fr)}}
  .ficha-pie div{padding:12px 20px}
  @media(min-width:640px){.ficha-pie div+div{border-left:1px solid var(--borde)}}

  footer.app{margin-top:40px; padding:20px 0; border-top:1px solid var(--borde); background:var(--papel)}
  footer.app p{margin:0; font-size:12px; color:var(--tenue)}

  @media print{
    body{background:#fff}
    .barra,.conteo,header.app,footer.app,.no-imprimir{display:none !important}
    dialog.ficha{position:static; display:block; box-shadow:none; width:100%; max-height:none}
  }
</style>
</head>
<body>

<header class="app">
  <div class="contenedor">
    <div class="marca">
      <span class="icono" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
             stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5v-7Z"/><path d="M3 8.5 12 13l9-4.5"/><path d="M12 13v7"/>
        </svg>
      </span>
      <div style="min-width:0">
        <h1 class="titulo">${escapar(INSTITUCION.titulo)}</h1>
        <p class="subtitulo">${escapar(INSTITUCION.subtitulo)}</p>
      </div>
    </div>
    <div style="font-size:12px; color:var(--tenue); text-align:right">
      <div style="font-weight:600; color:#374151; text-transform:uppercase; letter-spacing:.04em">${escapar(INSTITUCION.dependencia)}</div>
      <div>Generado el ${escapar(generado)}</div>
    </div>
  </div>
</header>

<main class="contenedor">
  <div class="barra no-imprimir">
    <div class="buscador">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
      </svg>
      <input id="buscar" type="search" placeholder="Buscar por nombre, placa o ID" autocomplete="off">
    </div>
    <button type="button" class="btn-principal" id="exportar">Descargar en Excel</button>
  </div>

  <p class="conteo" id="conteo"></p>
  <div class="rejilla" id="rejilla"></div>
</main>

<footer class="app">
  <div class="contenedor">
    <p>${escapar(INSTITUCION.titulo)} · ${datos.length} fichas · ${conFoto} con fotografía · Documento autocontenido</p>
  </div>
</footer>

<dialog class="ficha" id="dialogo"></dialog>

<script>
const MAQUINAS = ${jsonSeguro};
const CAMPOS = ${JSON.stringify(CAMPOS)};
const BLOQUES = ${JSON.stringify(BLOQUES)};

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

const SIN_FOTO = '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" ' +
  'stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/>' +
  '<path d="m5 18 4.5-5 3 3 2.5-2.5L19 18"/></svg>';

const clasePastilla = (d) =>
  d === 'USO' ? 'p-uso' : d === 'ALMACENADO' ? 'p-alm' : 'p-otro';

const rejilla = document.getElementById('rejilla');
const conteo = document.getElementById('conteo');
const dialogo = document.getElementById('dialogo');
let visibles = MAQUINAS;

function pintar(lista) {
  visibles = lista;
  conteo.textContent = 'Mostrando ' + lista.length + ' de ' + MAQUINAS.length +
    (MAQUINAS.length === 1 ? ' ficha' : ' fichas');

  if (!lista.length) {
    rejilla.innerHTML = '<div class="vacio" style="grid-column:1/-1">' +
      '<strong>Sin coincidencias</strong><br>Verifique el nombre, la placa o el ID.</div>';
    return;
  }

  rejilla.innerHTML = lista.map((m, i) =>
    '<article class="tarjeta">' +
      '<div class="foto">' + (m.imagen
        ? '<img src="' + m.imagen + '" alt="Fotografía de ' + esc(m.descripcion) + '" loading="lazy">'
        : SIN_FOTO) + '</div>' +
      '<div class="cuerpo">' +
        '<div class="fila-etiquetas">' +
          '<span class="placa">' + esc(m.placaNueva) + '</span>' +
          '<span class="pastilla ' + clasePastilla(m.disponibilidad) + '">' + esc(m.disponibilidad) + '</span>' +
        '</div>' +
        '<h3>' + esc(m.descripcion) + '</h3>' +
        '<p class="meta">' +
          '<span><b>ID:</b> ' + esc(m.id) + '</span>' +
          '<span><b>Marca:</b> ' + esc(m.marca) + ' · ' + esc(m.modelo) + '</span>' +
          '<span><b>Ubicación:</b> ' + esc(m.ubicacion) + '</span>' +
        '</p>' +
        '<button type="button" class="btn-principal" style="margin-top:auto; width:100%" data-ver="' + i + '">' +
          'Ver ficha técnica</button>' +
      '</div>' +
    '</article>').join('');
}

function abrirFicha(m) {
  dialogo.innerHTML =
    '<div class="ficha-cab">' +
      '<div><h2>Ficha técnica de maquinaria</h2><p>${escapar(INSTITUCION.proceso)}</p></div>' +
      '<div style="display:flex; gap:8px; flex-wrap:wrap">' +
        '<button type="button" class="btn-secundario" id="imprimir">Imprimir</button>' +
        '<button type="button" class="btn-principal" id="cerrar">Cerrar</button>' +
      '</div>' +
    '</div>' +
    '<div class="ficha-ident">' +
      '<span class="placa">' + esc(m.placaNueva) + '</span>' +
      '<strong style="font-size:14px">' + esc(m.descripcion) + '</strong>' +
    '</div>' +
    '<div class="ficha-cuerpo">' +
      '<div class="tabla-envoltura"><table class="datos"><tbody>' +
        CAMPOS.map(([c, e]) => '<tr><th>' + esc(e) + '</th><td>' + esc(m[c]) + '</td></tr>').join('') +
      '</tbody></table></div>' +
      '<div class="ficha-foto">' + (m.imagen
        ? '<img src="' + m.imagen + '" alt="Fotografía técnica de ' + esc(m.descripcion) + '">'
        : '<div style="color:#9ca3af; text-align:center">' + SIN_FOTO +
          '<p style="font-size:12px; margin:8px 0 0">Sin fotografía registrada</p></div>') +
      '</div>' +
    '</div>' +
    '<div class="bloques">' +
      BLOQUES.map(([c, e]) => '<div><h4>' + esc(e) + '</h4><p>' + esc(m[c]) + '</p></div>').join('') +
    '</div>' +
    '<div class="ficha-pie">' +
      '<div>Elaboró: <strong>Mantenimiento</strong></div>' +
      '<div>Revisó: <strong>Jefatura de Planta</strong></div>' +
      '<div>Registro: <strong>' + esc(m.id) + '</strong></div>' +
    '</div>';

  dialogo.querySelector('#cerrar').onclick = () => dialogo.close();
  dialogo.querySelector('#imprimir').onclick = () => window.print();
  dialogo.showModal();
}

rejilla.addEventListener('click', (e) => {
  const boton = e.target.closest('[data-ver]');
  if (boton) abrirFicha(visibles[Number(boton.dataset.ver)]);
});

document.getElementById('buscar').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  pintar(!q ? MAQUINAS : MAQUINAS.filter((m) =>
    [m.descripcion, m.placaNueva, m.id].join(' ').toLowerCase().includes(q)));
});

// La librería de Excel se pide al CDN solo al pulsar el botón: el archivo abre
// y se consulta sin conexión; solo la descarga necesita red.
document.getElementById('exportar').addEventListener('click', async function () {
  const boton = this;
  boton.disabled = true;
  boton.textContent = 'Generando…';

  try {
    if (!window.XLSX) {
      await new Promise((listo, falla) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = listo;
        s.onerror = () => falla(new Error('sin red'));
        document.head.appendChild(s);
      });
    }

    const limpio = (v) => { const t = String(v ?? '').trim(); return t === 'No registrado' ? '' : t; };
    const cols = CAMPOS.concat(BLOQUES);
    const filas = [['ID'].concat(cols.map(([, e]) => e))]
      .concat(visibles.map((m) => [m.id].concat(cols.map(([c]) => limpio(m[c])))));

    const hoja = XLSX.utils.aoa_to_sheet(filas);
    hoja['!cols'] = [{ wch: 14 }].concat(cols.map(([c]) =>
      ({ wch: c === 'funcion' ? 60 : c === 'descripcion' ? 46 : 20 })));

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Catálogo');
    XLSX.writeFile(libro, 'catalogo-maquinaria.xlsx');
  } catch {
    alert('No se pudo descargar la librería de Excel. Se necesita conexión solo para exportar.');
  } finally {
    boton.disabled = false;
    boton.textContent = 'Descargar en Excel';
  }
});

pintar(MAQUINAS);
</script>
</body>
</html>
`

writeFileSync(ARCHIVO_SALIDA, html, 'utf8')

const pesoMB = (Buffer.byteLength(html, 'utf8') / 1024 / 1024).toFixed(1)
console.log(`Fichas incluidas : ${datos.length}${soloCatalogo ? ' (catálogo inicial)' : ' (todas)'}`)
console.log(`Con fotografía   : ${conFoto}`)
console.log(`Peso del archivo : ${pesoMB} MB`)
console.log(`\nEscrito: ${ARCHIVO_SALIDA.split(/[\\/]/).pop()}`)
