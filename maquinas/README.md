# Fotografías de máquinas

**Carpeta generada.** Las imágenes las escribe `npm run datos`, que las extrae de
`xl/media/` dentro del libro de Excel (un `.xlsm` es un contenedor ZIP en formato
OpenXML). No hace falta copiarlas a mano.

## Convención de nombres

```
public/maquinas/<ID>.webp
```

`<ID>` es el identificador de la máquina en `src/data/maquinas.js`, que a su vez
es su **placa de inventario** (por ejemplo `EM00068.webp`). Cuando varias hojas
comparten placa, el script añade un sufijo (`EM00057-2.webp`).

## Optimización

El Excel guarda las fotos a resolución de cámara. El script las reescala a
**1200 px de ancho** como máximo y las convierte a **WebP con calidad 82**, lo
que reduce el conjunto de 22,3 MB a 1,9 MB (92% menos) sin pérdida visible.

Para leer el original se identifica el formato por sus **bytes mágicos**, no por
la extensión: varias fotos vienen como `.tmp` siendo PNG reales.

> La carpeta se **vacía de imágenes** en cada ejecución de `npm run datos`, para
> no dejar archivos huérfanos de una extracción anterior. El único archivo que
> sobrevive es este README.

El campo `imagen` de cada máquina guarda solo el nombre del archivo; la función
`rutaImagen()` construye la ruta pública completa.

## Añadir una foto a mano

No conviene: `npm run datos` vacía esta carpeta y regenera
`src/data/maquinas.js`, así que cualquier archivo suelto se perdería. Lo
sostenible es **incrustar la foto en la hoja del Excel** y volver a ejecutar el
script, que la optimizará y la vinculará sola.

## Si no hay imagen

Cuando `imagen` es `null` —o el archivo no existe, o el navegador no puede
mostrarlo— la interfaz cae al recuadro gris "Sin fotografía registrada", tanto en
la tarjeta del catálogo como en la ficha técnica.
