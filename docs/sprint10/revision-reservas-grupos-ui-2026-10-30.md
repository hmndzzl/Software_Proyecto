# Revisión de reservas, grupos y panel — 30 de octubre de 2026

Se mantuvo el diseño existente y se corrigieron problemas de interacción detectados en la revisión del rediseño.

## Correcciones

- Crear grupos indica «Creando…» y bloquea los campos y los envíos repetidos durante el guardado. Crear y editar rechazan nombres compuestos solo por espacios, recortan espacios exteriores y respetan los 200 caracteres del esquema de datos.
- Los formularios de grupos distinguen carga, error recuperable y catálogo vacío de coordinadores. Se puede reintentar sin borrar el nombre ni la selección. El texto explica la restricción existente de un grupo por coordinador.
- Reservas distingue un fallo al cargar espacios de un catálogo vacío y ofrece reintento conservando los campos. Un fallo del catálogo no implica que el espacio de un enlace QR haya desaparecido.
- La consulta de ocupación distingue carga, respuesta válida y error recuperable. Solo muestra el calendario de ocupación y «Horario disponible» después de una respuesta válida para el espacio elegido; se descartan respuestas de selecciones anteriores. Si falla la consulta, explica que no se pudo comprobar la disponibilidad y ofrece reintentar. La solicitud sigue su flujo de revisión existente.
- Durante el envío de una reserva se bloquean los campos y las tarjetas de espacios para evitar modificaciones que se perderían al completarse el guardado.
- Las pestañas de cuentas se distribuyen en dos filas hasta 480 px, con controles de al menos 44 px de alto.

## Verificación

- 48 capturas de 24 rutas a 390 y 1440 px: sin desbordamientos del documento ni errores de JavaScript. Inspección visual de reservas, grupos, landing y vistas representativas del panel.
- Suite completa inicial de Chromium: 83 pruebas aprobadas, incluidos accesibilidad pública, navegación, permisos, filtros, formularios, visor y adaptación móvil.
- Después de las correcciones finales: 19 pruebas de Chromium aprobadas de continuidad, flujos principales, decisiones y los nuevos escenarios de reservas/grupos/cuentas. Incluyen auditoría axe del editor de grupos a 375 y 1440 px en ambos temas, selección múltiple, edición, recuperación de errores y guardado pendiente.
- Suite final de componentes e integración: 890 pruebas aprobadas.
- Compilación TypeScript/Vite, lint y revisión de espacios del diff aprobados.

Se aplicaron frontend-design, Impeccable, UI/UX Pro Max y Ponytail, junto con las pautas de revisión, implementación incremental y pruebas de agent-skills. No se añadieron dependencias ni se reemplazó la identidad visual.

Las pruebas se ejecutaron localmente con datos ficticios y solicitudes interceptadas. No equivalen a una validación del backend desplegado o de todos los estados posibles de producción. No se hicieron commits ni push.
