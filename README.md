# Sistema de Gestión y Fichas Técnicas — Control y registro de maquinaria y equipos

Aplicación web **estática** (sin backend ni base de datos) que consulta el inventario
de maquinaria de planta y muestra la ficha técnica formal de cada activo.

## Stack

| Capa | Tecnología | Razón |
|------|-----------|-------|
| Interfaz | React 19 | Composición por componentes y estado declarativo |
| Empaquetado | Vite | Servidor de desarrollo instantáneo y build estático |
| Estilos | Tailwind CSS 3 | Sistema de utilidades consistente, sin CSS disperso |
| Datos (build) | xlsx + sharp | Leen el Excel y optimizan las fotos antes de compilar |

## Arquitectura

Flujo de datos unidireccional con un único componente con estado (`App.jsx`):

```
src/
├── App.jsx              Controlador de navegación (estado: catálogo | ficha)
├── index.css            Directivas de Tailwind y estilos base
├── components/
│   ├── Autenticacion.jsx Login y registro (demostración, sin servidor)
│   ├── Header.jsx       Encabezado institucional + cerrar sesión
│   ├── Buscador.jsx     Campo controlado; eleva el estado a App
│   ├── ListaTarjetas.jsx Cuadrícula de tarjetas del catálogo
│   └── FichaTecnica.jsx Documento técnico formal + botón INICIO
├── data/
│   ├── maquinas.js      GENERADO: catálogo completo + funciones puras
│   ├── catalogo.js      Recorte visible (6 máquinas) — escrito a mano
│   └── institucion.js   Identidad institucional (logo, textos, formato de fecha)
├── servicios/
│   ├── almacenamiento.js Envoltura segura sobre localStorage
│   └── cuentas.js       Cuentas, sesión y aislamiento por usuario
└── ../scripts/
    ├── extraer-fichas.mjs    Lee las celdas y regenera maquinas.js
    └── extraer-imagenes.mjs  Extrae logo y fotos del ZIP OpenXML
```

Decisiones sustentables académicamente:

1. **Separación datos / presentación.** Los componentes no saben de dónde vienen
   los datos. Sustituir `src/data/maquinas.js` por una llamada a una API no
   obliga a tocar la interfaz.
2. **Lifting state up.** `Buscador` no guarda su propio texto: lo reporta a `App`,
   que es el único responsable de filtrar. Esto evita estados duplicados.
3. **Funciones puras.** `filtrarMaquinas` y `rutaImagen` no dependen de React ni
   del DOM, por lo que son verificables con pruebas unitarias.
4. **Navegación por estado.** Al ser un catálogo de dos vistas, un enrutador sería
   una dependencia innecesaria; `useState` es suficiente y explicable.

## Datos de una máquina

`id`, `placaNueva`, `descripcion`, `anioAdquisicion`, `estado`, `disponibilidad`,
`ubicacion`, `piso`, `marca`, `modelo`, `turnoPorDia`, `capacidad`, `funcion`,
`imagen` (opcional).

## Fotografías y logo

Las imágenes **no están en celdas**: un `.xlsm` es un ZIP en formato OpenXML y
las fotos viven en `xl/media/`. `scripts/extraer-imagenes.mjs` sigue la cadena de
relaciones del paquete (`workbook → sheet → drawing → media`) para saber qué foto
pertenece a qué hoja, y escribe:

- `public/maquinas/<ID>.webp` — una por máquina, nombrada con su placa.

El logo corporativo está incrustado en las 50 hojas y se identifica por esa
frecuencia, pero **no se escribe a disco**: la interfaz usa un ícono genérico, y
detectarlo solo sirve para no confundirlo con la fotografía de una máquina.

El tipo de archivo se deduce de los bytes mágicos, porque Excel guarda varias
fotos como `.tmp` y añade copias `.wdp` (JPEG XR) que ningún navegador muestra.

Antes de escribirlas, `sharp` las reescala a **1200 px de ancho** y las convierte
a **WebP calidad 82**: el conjunto pasa de 22,3 MB a 1,9 MB (92% menos). Si sharp
no pudiera procesar alguna, se guarda el original y el informe lo indica.

Si `imagen` es `null`, el archivo falta o el navegador no puede mostrarlo, la
interfaz cae al recuadro gris "Sin fotografía registrada".

## Acceso y aislamiento de datos

La aplicación pide iniciar sesión antes de mostrar el catálogo. Cuenta
precargada la primera vez que se abre:

| Usuario | Contraseña |
|---------|-----------|
| `jhamilamaya` | `12345` |

Cada cuenta ve **solo** las máquinas que tiene asignadas: `jhamilamaya` arranca
con las 6 del catálogo inicial y cualquier cuenta nueva empieza vacía, con el
mensaje "No tienes fichas técnicas registradas aún". La sesión se guarda en
localStorage, así que sobrevive a una recarga.

> **Alcance de la autenticación.** Es una demostración adecuada para una
> aplicación estática, **no** un control de seguridad: todo ocurre en el
> navegador y cualquiera puede leer o modificar localStorage desde las
> herramientas de desarrollo. Las contraseñas no se guardan en claro (resumen
> SHA-256 con sal por cuenta), pero el aislamiento entre usuarios es una
> separación funcional, no una barrera. Una versión de producción necesita un
> servidor que valide credenciales y emita un token.

### Por qué el recorte vive fuera de `maquinas.js`

`src/data/maquinas.js` lo regenera `npm run datos`: editarlo a mano se pierde en
la siguiente extracción. Por eso la selección de las 6 máquinas está en
`src/data/catalogo.js`, un módulo escrito a mano que consume el generado.

El criterio es: tener fotografía extraída, luego menor cantidad de campos sin
diligenciar y, como desempate, el orden del libro. Se ordena por completitud
porque las primeras hojas son herramientas de taller con la ficha a medio
llenar; tomar "las seis primeras" dejaría cuatro fichas sin capacidad, función,
año ni turno.

## Comandos

```bash
npm install     # instalar dependencias
npm run dev     # servidor de desarrollo (http://localhost:5173)
npm run build   # build estático en dist/
npm run preview # previsualizar el build
npm run lint    # análisis estático
npm run datos   # regenera maquinas.js, el logo y las fotos desde el Excel
```
