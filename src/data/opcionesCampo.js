/**
 * Opciones de un desplegable, garantizando que el valor guardado esté entre
 * ellas.
 *
 * Un `<select>` solo puede mostrar lo que tiene en su lista. Si el valor
 * guardado no aparece, el navegador lo pinta EN BLANCO: el campo parece vacío
 * sin estarlo, y al guardar se pierde el dato sin aviso.
 *
 * Pasa de verdad: `disponibilidad` tenía una máquina en «ALMACENADO» y
 * `nuevoUsado` quince en «No registrado», valores que las listas no traían.
 * Ampliar las listas en `controlesFicha.js` arregla esos dos casos; esto
 * arregla también los que no se pueden prever, como un valor nuevo llegado de
 * un Excel importado.
 *
 * Vive fuera de `CampoFicha.jsx` para que ese archivo solo exporte componentes,
 * que es lo que necesita el recargado en caliente de Vite.
 *
 * @param {string[]} opciones Valores declarados en `controlesFicha.js`.
 * @param {string} valor      Valor actual del campo.
 * @returns {{lista: string[], ajeno: string|null}} `ajeno` es el valor que hubo
 *          que añadir, o null si ya estaba contemplado.
 */
export function opcionesConValorActual(opciones, valor) {
  const lista = opciones ?? []
  const actual = String(valor ?? '').trim()

  if (!actual || lista.includes(actual)) return { lista, ajeno: null }

  // El valor guardado va primero: es el que el desplegable debe mostrar.
  return { lista: [actual, ...lista], ajeno: actual }
}
