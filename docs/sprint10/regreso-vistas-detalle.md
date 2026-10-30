# Regreso desde las vistas de detalle

Implementación del 30 de octubre de 2026.

Se reutiliza el botón secundario del panel, con flecha decorativa, texto explícito, foco de teclado y altura de 44 px. Sus colores provienen de los tokens existentes del tema; la landing conserva su paleta clara.

- Espacios: «Volver a espacios» aparece arriba del detalle, durante la carga y ante un error. Sustituye el enlace poco visible del breadcrumb. Navega a `/espacios` incluso si se entró directamente desde un QR o enlace externo. La restauración existente de filtros y posición sigue funcionando.
- Reservas, mis reservas y cuentas: el detalle ofrece volver a su listado de origen, sin cambiar de ruta ni perder el estado de la lista.
- Grupos y tareas: el detalle ofrece volver al listado. En la gestión de ministros de una tarea, el regreso explícito vuelve al detalle de esa tarea.
- Calendario: una tarea abierta desde un evento regresa al evento; el detalle raíz regresa al calendario.
- Ocupación de espacios y mensajes de contacto: se puede regresar desde sus diálogos de detalle.
- Landing: historia y oración ofrecen botones para regresar a su sección.

El pie de regreso de los diálogos permanece visible mientras el contenido largo se desplaza. Es opcional y respeta el bloqueo del diálogo durante operaciones pendientes. Cuando está presente, sustituye la flecha del encabezado para evitar dos controles de regreso a la misma vista. Los formularios y confirmaciones conservan sus acciones de cancelar; las vistas que ya tenían regreso, como coordinadores de ministros, mantienen su navegación.

## Comprobación

- Pruebas de componentes del regreso durante la carga, rutas de error y callbacks de cierre o regreso anidado, incluido su bloqueo.
- Pruebas en Chromium a 320 y 1440 px, en temas claro y oscuro: entrada directa al espacio, regreso a listados, foco restaurado al control de origen, controles de 44 px, ausencia de desbordamiento y auditoría axe del detalle de grupos.
- Prueba de navegación anidada calendario → evento → tarea → evento → calendario.
- Pruebas de continuidad de filtros y posición al regresar a espacios.
- Comprobación de historia y oración con la preferencia oscura del panel y el portal claro.

Las pruebas de navegador son locales con datos simulados y solicitudes interceptadas. No se modificó producción ni se ejecutaron commits o push.

Resultado final: 892 pruebas de componentes/integración aprobadas; 94 pruebas de Chromium aprobadas en la suite completa y 7 comprobaciones finales específicas aprobadas tras ampliar las verificaciones de regreso. Compilación TypeScript/Vite, lint y `git diff --check` correctos.

Corrección posterior: se eliminó el regreso duplicado del encabezado cuando existe un botón con texto en el pie. El botón conserva el destino anterior y los formularios sin pie mantienen su flecha. Verificación de esta corrección: 893 pruebas de componentes/integración y 7 pruebas de navegador aprobadas; compilación y lint correctos.

Compatibilidad del regreso a 320 px: el botón compartido limita su ancho al contenedor y permite que las etiquetas largas ocupen varias líneas, conservando una altura mínima de 44 px. La regresión de gestión de tareas comprueba también texto ampliado a 20 px y mantiene la comprobación estricta de ausencia de desbordamiento. Se actualizó el escenario de cien ministros para usar el botón con texto que sustituyó la flecha del encabezado.

Verificación de compatibilidad: suite completa de Chromium con 95 pruebas aprobadas; cobertura con 914 pruebas de componentes/integración aprobadas y 95,03 % de ramas (umbral conservado en 95 %). Build, lint y revisión del diff correctos. Ejecución local con las mismas pruebas de CI; no se ejecutó el workflow remoto.
