import type { MouseEvent } from 'react';

/** Maneja el clic en una fila de tabla: la abre salvo que el clic venga de un control
 * interactivo dentro de ella (botón, enlace, input...). Patrón usado por las tablas con
 * tarjeta de detalle (grupos, tareas, reservas). */
export function manejarClicFila(abrir: () => void) {
  return (event: MouseEvent<HTMLTableRowElement>) => {
    if ((event.target as HTMLElement).closest('button, input, select, summary, details, a')) return;
    abrir();
  };
}
