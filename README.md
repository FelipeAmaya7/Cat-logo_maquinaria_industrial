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
│   ├── BarraLateral.jsx Navegación por módulos
│   ├── Buscador.jsx     Campo controlado; eleva el estado a App
│   ├── ListaTarjetas.jsx Cuadrícula de equipos (código, estado, criticidad)
│   ├── FichaTecnica.jsx Documento técnico + repuestos de la máquina
│   ├── FormularioFicha.jsx  Alta de una ficha sin partir de un Excel
│   ├── FormularioOrden.jsx  Alta de una orden de trabajo
│   └── ListaOrdenes.jsx     Listado de órdenes
├── data/
│   ├── maquinas.js      GENERADO: las 49 fichas + funciones puras
│   ├── catalogo.js      Orden y resolución del catálogo — escrito a mano
│   ├── gruposFicha.js   Secciones del formulario de ficha
│   ├── ordenes.js       Campos de las órdenes de trabajo
│   └── institucion.js   Textos del sistema y formato de fecha
├── servicios/
│   ├── almacenamiento.js Envoltura segura sobre localStorage
│   └── datos.js         Catálogo, ediciones, órdenes y repuestos
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

## Datos y almacenamiento

**No hay inicio de sesión.** La aplicación se abre y se usa: es una herramienta
de planta, no un sistema con cuentas. Todo se guarda en el `localStorage` del
navegador bajo una sola colección de claves.

Consecuencia que conviene tener presente: **los datos son de ese navegador**. No
viajan entre equipos ni se respaldan solos. El puente para llevarlos a otro sitio
es la exportación a Excel.

Si el navegador bloquea el almacenamiento —ventana privada, datos de sitio
desactivados— la aplicación lo avisa al entrar: el catálogo se puede consultar,
pero nada de lo que se registre sobrevive a una recarga.

### Por qué el catálogo vive fuera de `maquinas.js`

`src/data/maquinas.js` lo regenera `npm run datos`: editarlo a mano se pierde en
la siguiente extracción. Por eso el orden y la resolución del catálogo están en
`src/data/catalogo.js`, un módulo escrito a mano que consume el generado.

Las 49 fichas se ordenan por completitud —menos campos vacíos primero— y, a
igualdad, por el orden del libro.

## Comandos

```bash
npm install     # instalar dependencias
npm run dev     # servidor de desarrollo (http://localhost:5173)
npm run build   # build estático en dist/
npm run preview # previsualizar el build
npm run lint    # análisis estático
npm run datos   # regenera maquinas.js, el logo y las fotos desde el Excel
```
