/** Mismo formato visual de rangos que el portal: HH:MM – HH:MM. */
export function formatHorario(inicio: string, fin: string): string {
  return `${inicio.substring(0, 5)} – ${fin.substring(0, 5)}`;
}
