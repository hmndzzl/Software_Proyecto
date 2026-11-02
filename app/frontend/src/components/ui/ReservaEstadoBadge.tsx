import Badge from './Badge';
import { obtenerEstadoReserva } from '../../utils/estadosReserva';

interface ReservaEstadoBadgeProps {
  estadoId: number;
  title?: string;
  className?: string;
}

/** Presentación uniforme del estado de una reserva en tablas, listas y tarjetas. */
export default function ReservaEstadoBadge({ estadoId, title, className }: ReservaEstadoBadgeProps) {
  const estado = obtenerEstadoReserva(estadoId);

  return (
    <Badge kind={estado.kind} title={title} className={className}>
      {estado.label}
    </Badge>
  );
}
