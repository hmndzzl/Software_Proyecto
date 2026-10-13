import Badge from './Badge';
import { obtenerEstadoReserva } from '../../utils/estadosReserva';

interface ReservaEstadoBadgeProps {
  estadoId: number;
  title?: string;
}

/** Presentación uniforme del estado de una reserva en tablas, listas y tarjetas. */
export default function ReservaEstadoBadge({ estadoId, title }: ReservaEstadoBadgeProps) {
  const estado = obtenerEstadoReserva(estadoId);

  return (
    <Badge kind={estado.kind} title={title}>
      {estado.label}
    </Badge>
  );
}
