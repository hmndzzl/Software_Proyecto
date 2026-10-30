# Pulido del frontend 
Fecha: 30 de octubre de 2026, America/Guatemala.

Se aplicó una pasada de refinamiento con Frontend Design, Impeccable (`polish` y detector) y UI/UX Pro Max. Se conserva la identidad existente: borgoña y oro, fondos cálidos, Cinzel/Noto Serif, navegación y estructura de las páginas. La intervención se concentra en CSS y tokens; no incorpora dependencias ni modifica contratos del API.

## Ajustes

- Textos secundarios y advertencias con mayor contraste, sin cambiar el significado de los estados.
- Separación del acento de texto y el fondo de acciones principales: en oscuro los enlaces son legibles y los botones conservan el borgoña con texto claro.
- Superficies de notificaciones sin leer y resaltados adaptadas a ambos temas. Se corrigió la combinación de texto claro sobre fondo casi blanco en oscuro.
- Eliminación del padding duplicado de notificaciones, alineándola con las demás pantallas.
- Etiquetas ligeramente más legibles, menos separación entre letras en títulos de tarjeta y botones, y mejor interlineado de encabezados.
- Foco visible de teclado para controles compartidos y contraste del foco en la barra superior. Selección de texto, caret y números tabulares coherentes con la paleta.
- Avisos de éxito y error con márgenes móviles de 16 px, respeto del área segura y controles de cierre más cómodos. El error global usa colores semánticos que funcionan en ambos temas.
- Modales con espaciado móvil más útil, altura dinámica y desplazamiento contenido. El shell también usa la altura dinámica del viewport.
- Preferencia de movimiento reducido en menú lateral, avisos, indicador de carga y resaltado de notificaciones. Entrada de avisos suave, sin rebote.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| Compilación TypeScript + Vite | Correcta |
| ESLint con cero warnings permitidos | Correcto |
| Suite de componentes e integración del frontend | 835 pruebas, 91 archivos, aprobadas |
| Regresión de navegador en Chromium | 78 pruebas aprobadas |
| Revisión visual local | 24 rutas en escritorio de 1440 px y móvil de 390 px; sin desbordamientos ni excepciones de JavaScript en ese recorrido |
| Axe sobre las 24 rutas en ambos temas | 48 escenarios sin infracciones detectadas de las reglas WCAG A/AA seleccionadas |
| Axe sobre avisos, errores en línea y modales | 18 escenarios, a 320/768/1440 px y ambos temas, sin infracciones detectadas |
| Componente de error global aislado y botones de estado | 6 escenarios, a 320/768/1440 px y ambos temas, sin infracciones detectadas |
| Diff | Sin errores de whitespace |

Las 78 regresiones incluyen responsive de páginas principales a 320/390/768/1024 px y pruebas de navegación, formularios, filtros, confirmaciones, contraseñas, calendario, estados y fotografías. Se amplió la regresión de estados para comprobar también el contraste de notificaciones leídas/sin leer en ambos temas. Se actualizó una expectativa del historial de decisiones para el nuevo tono de advertencia; se conserva la aserción.

El detector de Impeccable también señaló patrones estéticos ya existentes. Se revisaron como orientación: no se sustituyeron las fuentes ni los acentos de la identidad actual para satisfacer preferencias genéricas del detector, y no se añadieron supresiones.

## Límites

La revisión usa Chromium y datos ficticios interceptados localmente. No valida por sí sola Safari/Firefox, dispositivos físicos, lectores de pantalla, todos los contenidos posibles ni el servicio real de Clerk. La auditoría automática de accesibilidad complementa la inspección visual y no constituye una certificación WCAG.

No se desplegaron cambios ni se alteró producción. Los hallazgos de seguridad de la auditoría anterior requieren su propia corrección; este pulido visual no los resuelve.
