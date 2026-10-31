import type { ReactNode } from 'react';
import DetalleConDecisiones from '../../../components/ui/DetalleConDecisiones';
import ReservaEstadoBadge from '../../../components/ui/ReservaEstadoBadge';
import type { Reserva } from '../../../types';
import { formatFecha, formatHorario } from '../../../utils/date';

export default function DetalleReserva({ reserva, onClose, returnLabel = 'Volver a reservas', acciones }: { reserva: Reserva; onClose: () => void; returnLabel?: string; acciones?: ReactNode }) {
  return <DetalleConDecisiones titulo={`Detalle de reserva #${reserva.id}`} endpoint={`/api/reservas/${reserva.id}/decisiones`} onClose={onClose} returnLabel={returnLabel} acciones={acciones}
    campos={[
      { etiqueta: 'Actividad', valor: reserva.evento_titulo ?? 'Sin título' },
      { etiqueta: 'Descripción', valor: reserva.evento_descripcion ?? 'Sin descripción' },
      { etiqueta: 'Espacio', valor: reserva.espacio_nombre ?? 'Sin espacio' },
      { etiqueta: 'Fecha', valor: formatFecha(reserva.fecha) },
      { etiqueta: 'Horario', valor: formatHorario(reserva.hora_inicio, reserva.hora_fin) },
      { etiqueta: 'Solicitante', valor: reserva.solicitante_nombre ?? 'No disponible' },
      { etiqueta: 'Personas esperadas', valor: reserva.cantidad_personas ?? 'No registrado' },
      { etiqueta: 'Estado actual', valor: <ReservaEstadoBadge estadoId={reserva.estado_reserva_id} /> },
    ]} />;
}
