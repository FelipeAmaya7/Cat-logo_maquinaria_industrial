/**
 * Hook de resolución para Node.
 *
 * El código de `src/` usa importaciones sin extensión (`./maquinas`), que es el
 * idioma de Vite. Node, en cambio, las exige. En lugar de ensuciar `src/` con
 * extensiones solo para los scripts, este hook reintenta añadiendo `.js`.
 *
 * Así los scripts de Node consumen exactamente el mismo código que el navegador.
 */
export async function resolve(especificador, contexto, siguiente) {
  try {
    return await siguiente(especificador, contexto)
  } catch (error) {
    if (especificador.startsWith('.')) return siguiente(especificador + '.js', contexto)
    throw error
  }
}
