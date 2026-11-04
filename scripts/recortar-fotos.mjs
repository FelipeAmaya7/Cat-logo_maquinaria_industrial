/**
 * Recorta las fotografías ya extraídas, quitándoles la ventana del Explorador.
 *
 *   node scripts/recortar-fotos.mjs            # reescribe public/maquinas/
 *   node scripts/recortar-fotos.mjs --dry-run  # solo informa
 *
 * La detección vive en `recorte-captura.mjs` y la comparte `extraer-imagenes`,
 * de modo que una extracción nueva ya sale recortada. Este script existe para
 * las imágenes que YA están en el repositorio: el libro de Excel del que se
 * sacaron no está en el proyecto, así que no se pueden volver a extraer.
 *
 * Reescribe en el sitio. Los archivos están versionados, así que un recorte
 * desafortunado se deshace con `git checkout public/maquinas`.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import sharp from 'sharp'
import { recortarCaptura } from './recorte-captura.mjs'

const CARPETA = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public/maquinas')
const CALIDAD = 82

const esDiagnostico = process.argv.includes('--dry-run')
const archivos = readdirSync(CARPETA).filter((nombre) => nombre.endsWith('.webp'))

let recortadas = 0
let bytesAntes = 0
let bytesDespues = 0

for (const nombre of archivos) {
  const ruta = resolve(CARPETA, nombre)
  const original = readFileSync(ruta)
  bytesAntes += original.length

  const { datos, recortada } = await recortarCaptura(sharp, original)

  if (!recortada) {
    bytesDespues += original.length
    console.log(`  ${nombre.padEnd(17)} sin recorte (no es una captura)`)
    continue
  }

  const final = await sharp(datos).webp({ quality: CALIDAD }).toBuffer()
  const antes = await sharp(original).metadata()
  const despues = await sharp(final).metadata()

  if (!esDiagnostico) writeFileSync(ruta, final)

  recortadas += 1
  bytesDespues += final.length
  console.log(
    `  ${nombre.padEnd(17)} ${String(`${antes.width}x${antes.height}`).padEnd(11)}` +
      `-> ${`${despues.width}x${despues.height}`}`,
  )
}

const enMB = (bytes) => (bytes / 1024 / 1024).toFixed(1) + ' MB'

console.log('')
console.log(`Recortadas : ${recortadas} de ${archivos.length}`)
console.log(`Peso       : ${enMB(bytesAntes)} -> ${enMB(bytesDespues)}`)
if (esDiagnostico) console.log('\n[--dry-run] No se escribió ningún archivo.')
