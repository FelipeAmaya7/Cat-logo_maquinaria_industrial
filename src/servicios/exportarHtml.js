/**
 * Descarga de fichas y catálogo como documento HTML con formato.
 *
 * POR QUÉ HTML Y NO SOLO .XLSX
 * ----------------------------
 * La edición comunitaria de SheetJS —la que usa este proyecto— NO escribe
 * estilos de celda: ni negrita, ni bordes, ni colores, ni combinaciones. Está
 * comprobado: se le pide y el archivo sale sin nada de eso. Por eso un .xlsx
 * generado aquí no puede parecerse al formato impreso de planta.
 *
 * Un documento HTML sí puede, y además sirve para tres cosas a la vez:
 *
 *   - Se abre en el navegador y en el celular con el aspecto correcto.
 *   - Excel abre tablas HTML RESPETANDO bordes, colores y celdas combinadas,
 *     así que el mismo archivo sirve de hoja de cálculo con formato.
 *   - Se imprime o se guarda como PDF desde el propio navegador.
 *
 * El .xlsx sigue existiendo para lo que sí hace mejor: filtrar y analizar.
 */
import { INSTITUCION, formatearFechaFormato } from '../data/institucion'
import { MAPA_CAMPOS, SIN_DATO } from './anclajeRotulos'
import { resolverFotografia } from '../data/fotografias'

/** Campos de la tabla de datos, en el orden del formato de planta. */
const CAMPOS = Object.entries(MAPA_CAMPOS).filter(
  ([campo]) => !['funcion', 'materialProcesado', 'especificaciones'].includes(campo),
)

/** Campos de texto extenso, que van en bloques debajo de la tabla. */
const BLOQUES = [
  ['funcion', 'FUNCIÓN QUE PRESTA'],
  ['materialProcesado', 'MATERIAL PROCESADO'],
  ['especificaciones', 'ESPECIFICACIONES'],
]

const escapar = (texto) =>
  String(texto ?? '').replace(
    /[&<>"']/g,
    (caracter) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter],
  )

const valor = (maquina, campo) => {
  const dato = maquina[campo]
  return dato === null || dato === undefined || dato === '' ? SIN_DATO : String(dato)
}

/** Quita de un nombre de archivo lo que los sistemas de ficheros no admiten. */
const nombreSeguro = (texto) =>
  String(texto ?? '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)

/**
 * Estilos del documento.
 *
 * Se escriben EN LÍNEA en cada celda además de en la hoja de estilos: Excel
 * ignora buena parte del CSS de `<style>` pero sí respeta el atributo `style`
 * de cada `<td>`. Esa duplicación es lo que hace que el archivo se vea igual
 * en el navegador y en Excel.
 */
const BORDE = 'border:1px solid #9ca3af'
const CELDA_ROTULO = `${BORDE};background:#e5e7eb;font-weight:bold;font-size:11px;padding:6px 8px;text-align:left;vertical-align:top;width:34%`
const CELDA_VALOR = `${BORDE};padding:6px 8px;font-size:12px;vertical-align:top`

/** Marca la descarga de un texto como archivo. */
function descargar(contenido, nombreArchivo, tipo) {
  const blob = new Blob(['﻿' + contenido], { type: tipo })
  const url = URL.createObjectURL(blob)

  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)

  // Liberar en el siguiente ciclo: revocar de inmediato cancela la descarga
  // en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Membrete superior, común a la ficha y al catálogo. */
const membrete = (subtitulo) => `
  <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
    <tr>
      <td style="${BORDE};padding:10px 12px;vertical-align:middle">
        <div style="font-size:14px;font-weight:bold;letter-spacing:.4px">${escapar(INSTITUCION.titulo)}</div>
        <div style="font-size:11px;color:#4b5563;padding-top:2px">${escapar(subtitulo)}</div>
      </td>
      <td style="${BORDE};padding:10px 12px;font-size:11px;width:34%;vertical-align:middle">
        <div><b>${escapar(INSTITUCION.dependencia)}</b></div>
        <div style="color:#4b5563">Generado: ${escapar(new Date().toLocaleString('es-CO'))}</div>
      </td>
    </tr>
  </table>`

/** Envoltura del documento. */
const documento = (titulo, cuerpo) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapar(titulo)}</title>
<style>
  body{font-family:"Segoe UI",Arial,sans-serif;color:#1f2937;margin:0;padding:18px;background:#fff;font-size:12px}
  .hoja{max-width:1000px;margin:0 auto}
  table{border-collapse:collapse}
  h2{font-size:13px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.4px}
  @media print{body{padding:0} .no-imprimir{display:none}}
</style>
</head>
<body><div class="hoja">${cuerpo}</div></body>
</html>`

/**
 * Descarga una ficha técnica como documento HTML con el formato de planta.
 *
 * @param {Object} maquina
 * @returns {{ok: boolean, error?: string, archivo?: string}}
 */
export function descargarFichaHtml(maquina) {
  if (!maquina) return { ok: false, error: 'No hay ficha que exportar.' }

  try {
    const foto = resolverFotografia(maquina.imagen)

    const filas = CAMPOS.map(
      ([campo, rotulo]) =>
        `<tr><td style="${CELDA_ROTULO}">${escapar(rotulo)}</td>` +
        `<td style="${CELDA_VALOR}">${escapar(valor(maquina, campo))}</td></tr>`,
    ).join('')

    const bloques = BLOQUES.map(
      ([campo, rotulo]) =>
        `<tr><td style="${CELDA_ROTULO};width:auto">${escapar(rotulo)}</td></tr>` +
        `<tr><td style="${CELDA_VALOR}">${escapar(valor(maquina, campo))}</td></tr>`,
    ).join('')

    const cuerpo = `
      ${membrete('Ficha técnica de maquinaria')}
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
        <tr>
          <td style="${BORDE};background:#1f2937;color:#fff;padding:8px 12px;font-size:13px;font-weight:bold">
            ${escapar(maquina.placaNueva)} &nbsp;·&nbsp; ${escapar(maquina.descripcion)}
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="vertical-align:top;padding-right:12px;width:58%">
            <table style="width:100%;border-collapse:collapse">${filas}</table>
          </td>
          <td style="vertical-align:top">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="${CELDA_ROTULO};width:auto;text-align:center">FOTOGRAFÍA DEL EQUIPO</td></tr>
              <tr><td style="${CELDA_VALOR};text-align:center;height:220px">${
                foto
                  ? `<img src="${foto}" alt="Fotografía de ${escapar(maquina.descripcion)}" style="max-width:100%;max-height:300px">`
                  : '<span style="color:#9ca3af">Sin fotografía registrada</span>'
              }</td></tr>
            </table>
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:14px">${bloques}</table>

      <table style="width:100%;border-collapse:collapse;margin-top:14px">
        <tr>
          <td style="${CELDA_VALOR};width:33%">Elaboró: <b>Mantenimiento</b></td>
          <td style="${CELDA_VALOR};width:33%">Revisó: <b>Jefatura de Planta</b></td>
          <td style="${CELDA_VALOR}">Registro: <b>${escapar(maquina.id)}</b></td>
        </tr>
      </table>

      ${
        maquina.codigoFormato
          ? `<p style="font-size:10px;color:#6b7280;margin-top:10px">Formato ${escapar(
              maquina.codigoFormato,
            )} · ${escapar(formatearFechaFormato(maquina.fechaFormato))} · ${escapar(
              maquina.versionFormato ?? '',
            )}</p>`
          : ''
      }`

    const archivo = `ficha-${nombreSeguro(maquina.id)}.html`
    descargar(documento(`Ficha técnica ${maquina.id}`, cuerpo), archivo, 'text/html;charset=utf-8')

    return { ok: true, archivo }
  } catch {
    return { ok: false, error: 'No se pudo generar el documento HTML.' }
  }
}

/**
 * Descarga el catálogo como una tabla HTML con formato.
 *
 * @param {Object[]} maquinas
 * @returns {{ok: boolean, error?: string, archivo?: string}}
 */
export function descargarCatalogoHtml(maquinas) {
  if (!maquinas || maquinas.length === 0) {
    return { ok: false, error: 'No hay fichas que exportar.' }
  }

  try {
    const columnas = [['id', 'ID'], ...CAMPOS]

    const encabezado = columnas
      .map(([, rotulo]) => `<th style="${CELDA_ROTULO};width:auto">${escapar(rotulo)}</th>`)
      .join('')

    const filas = maquinas
      .map(
        (maquina, indice) =>
          `<tr style="background:${indice % 2 ? '#f9fafb' : '#fff'}">` +
          columnas
            .map(([campo]) => `<td style="${CELDA_VALOR}">${escapar(valor(maquina, campo))}</td>`)
            .join('') +
          '</tr>',
      )
      .join('')

    const cuerpo = `
      ${membrete(`Catálogo de maquinaria · ${maquinas.length} fichas`)}
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>${encabezado}</tr></thead>
        <tbody>${filas}</tbody>
      </table>`

    const archivo = `catalogo-maquinaria-${new Date().toISOString().slice(0, 10)}.html`
    descargar(documento('Catálogo de maquinaria', cuerpo), archivo, 'text/html;charset=utf-8')

    return { ok: true, archivo }
  } catch {
    return { ok: false, error: 'No se pudo generar el documento HTML.' }
  }
}
