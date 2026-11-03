/**
 * Registra el hook de resolución antes de que Node cargue nada.
 *
 * `resolver-extension.mjs` es el hook; este archivo es quien lo instala. Node
 * exige separarlos: el hook se ejecuta en un hilo aparte, así que no puede
 * registrarse a sí mismo. Se usa con `node --import`, que es lo que hace
 * `npm test`.
 */
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register(new URL('./resolver-extension.mjs', pathToFileURL(import.meta.filename)))
