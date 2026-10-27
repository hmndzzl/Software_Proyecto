# Visor de fotografías compartido

Las fotografías de la plataforma se abren en un visor integrado sobre la página. Se aplica a las fotos del listado y detalle de espacios, a la imagen actual y la previsualización de sus formularios y a las fotografías de la landing. Los logos conservan su función de navegación.

## Uso

- Pulsar una fotografía o enfocar su botón y presionar Enter/Espacio.
- Acercar o alejar con los controles; el porcentaje va de 100% (ajustada al espacio disponible) a 300%. Al acercar se puede recorrer la imagen mediante el desplazamiento del visor.
- **Ajustar** vuelve al encuadre inicial sin deformar la imagen.
- Cerrar con la ✕, Escape o pulsando en el fondo exterior. El foco vuelve a la fotografía de origen.

En una tarjeta de espacio, la fotografía abre el visor; el resto de la tarjeta y **Ver detalle** abren la pantalla del espacio. **Editar** mantiene su acción independiente. Abrir o cerrar una fotografía durante una edición conserva los datos sin guardar.

El fondo es marfil difuminado, también en tema oscuro. La fotografía se presenta en una tarjeta flotante cuya altura se adapta a su proporción y al tamaño de pantalla. La apertura dura 200 ms y el cierre 160 ms; la preferencia de movimiento reducido desactiva ambas transiciones.

## Implementación

`ImagenAmpliable` conserva los atributos de la miniatura (`className`, carga diferida, texto alternativo y eventos de carga/error). `triggerClassName` permite dimensionar el botón contenedor en una previsualización. El texto alternativo es obligatorio y se muestra como pie de imagen.

```tsx
<ImagenAmpliable src={fotoUrl} alt="Fotografía del salón parroquial" className={styles.foto} />
```

El visor usa un `dialog` nativo en un portal para aislar el foco y la interacción con la página, incluso si se abrió desde otro modal. Los eventos del visor no se propagan a las tarjetas ni a los atajos de cierre de formularios. Se restaura el foco y el bloqueo de desplazamiento previo al cerrar. Un error de carga permite reintentar.

Los colores están centralizados en `--visor-fondo`, `--visor-panel`, `--visor-texto`, `--visor-borde` y `--visor-acento`. El visor utiliza las mismas imágenes optimizadas disponibles en la aplicación; no publica originales ni cambia el almacenamiento de archivos. Ver [imágenes de fase 1](imagenes-fase1.md) y [gestión de espacios](gestion-espacios.md).

## Verificación

```sh
npm test --prefix app/frontend -- src/components/ui/__tests__/ImagenAmpliable.test.tsx
npm run test:regression --prefix app/frontend -- visor-imagenes.spec.ts
npm run build --prefix app/frontend
npm run lint --prefix app/frontend
```

Las pruebas cubren zoom y ajuste sin deformación, carga/error/reintento, teclado, Escape y foco, formularios anidados, fondo claro en ambos temas, movimiento reducido y fotografías públicas. Playwright revisa tamaños de 375 × 844 y 1280 × 900 y guarda capturas locales del visor. Las imágenes ausentes conservan su respaldo y no abren un visor vacío.
