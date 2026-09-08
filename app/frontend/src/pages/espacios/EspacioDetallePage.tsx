import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { Espacio } from '../../modules/espacios/components/EspacioCard';
import { Card, CardHead } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import type { BadgeKind } from '../../components/ui/Badge';
import Btn from '../../components/ui/Btn';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { ROLES, usuarioTieneRol } from '../../utils/roles';
import { partesFecha, formatHora as fmtH } from '../../utils/date';
import styles from './EspacioDetallePage.module.css';

interface Reserva {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado_reserva_id: number;
  evento_titulo: string | null;
  evento_descripcion: string | null;
}

const ESTADO_LABEL: Record<number, string>   = { 1: 'Pendiente', 2: 'Confirmada', 3: 'Rechazada' };
const ESTADO_KIND: Record<number, BadgeKind> = { 1: 'pendiente', 2: 'confirmada', 3: 'rechazada' };

export default function EspacioDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const esAdminOSacerdote = usuarioTieneRol([ROLES.ADMIN, ROLES.SACERDOTE]);

  const cargarEspacio = () => {
    setCargando(true);
    setError('');
    Promise.all([
      apiClient.get(`/api/espacios/${id}`),
      apiClient.get(`/api/reservas?espacio_id=${id}`),
    ])
      .then(([resEspacio, resReservas]) => {
        setEspacio(resEspacio.data);
        setReservas(resReservas.data);
        setCargando(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Espacio no encontrado');
        setCargando(false);
      });
  };

  useEffect(() => {
    cargarEspacio();
  }, [id]);

  const cambiarEstado = async (reservaId: number, nuevoEstado: number) => {
    try {
      await apiClient.put(`/api/reservas/${reservaId}/estado`, { estado_id: nuevoEstado });
      const res = await apiClient.get(`/api/reservas?espacio_id=${id}`);
      setReservas(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al cambiar el estado de la reserva');
    }
  };

  if (cargando) return <LoadingState label="Cargando..." />;

  if (error || !espacio) {
    return (
      <div className={styles.page}>
        <Btn kind="ghost" size="sm" onClick={() => navigate('/espacios')}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>}>
          Volver a Espacios
        </Btn>
        <ErrorState message={error || 'Espacio no encontrado'} onRetry={cargarEspacio} />
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <button className={styles.breadcrumbLink} onClick={() => navigate('/espacios')}>Espacios</button>
        <span className={styles.breadcrumbSep}>›</span>
        <span className={styles.breadcrumbCurrent}>{espacio.nombre}</span>
      </div>

      <div className={styles.grid}>

        {/* Panel izquierdo — info del espacio */}
        <div className={styles.infoPanel}>
          <div className={styles.photoSlot}>[ foto · {espacio.nombre.toLowerCase()} ]</div>

          <p className={styles.kicker}>Recinto parroquial</p>
          <h1 className={styles.nombre}>{espacio.nombre}</h1>
          <div className={styles.rule} />

          <div className={styles.infoCards}>
            <div className={styles.infoCard}>
              <span className={styles.infoCardLabel}>Capacidad</span>
              <span className={styles.infoCardValue}>
                {espacio.capacidad != null ? `${espacio.capacidad} personas` : 'No definida'}
              </span>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.infoCardLabel}>Tipo</span>
              <span className={styles.infoCardValue}>Parroquial</span>
            </div>
          </div>
        </div>

        {/* Panel derecho — reservas */}
        <Card>
          <CardHead
            title="Próximas Reservas"
            hint={`${reservas.length} registradas`}
            right={
              <Btn kind="gold" size="sm" onClick={() => navigate('/reservas')}
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}>
                Reservar
              </Btn>
            }
          />

          {reservas.length === 0 ? (
            <EmptyState message="No hay reservas para este espacio." />
          ) : (
            <div className={styles.reservaList}>
              {reservas.map(r => (
                <div key={r.id} className={styles.reservaItem}>

                  {/* Bloque fecha */}
                  <div className={styles.dateBlock}>
                    <span className={styles.dateMes}>{partesFecha(r.fecha).mesAbrev}</span>
                    <span className={styles.dateDay}>{partesFecha(r.fecha).dia}</span>
                    <span className={styles.dateHora}>{fmtH(r.hora_inicio)}–{fmtH(r.hora_fin)}</span>
                  </div>

                  {/* Info evento */}
                  <div className={styles.eventInfo}>
                    {r.evento_titulo && <p className={styles.eventTitle}>{r.evento_titulo}</p>}
                    {r.evento_descripcion && <p className={styles.eventDesc}>{r.evento_descripcion}</p>}
                    {!r.evento_titulo && !r.evento_descripcion && (
                      <p className={styles.eventTitle}>Reserva #{r.id}</p>
                    )}
                  </div>

                  {/* Badge + acciones */}
                  <div className={styles.reservaAcciones}>
                    <Badge kind={ESTADO_KIND[r.estado_reserva_id] ?? 'neutral'}>
                      {ESTADO_LABEL[r.estado_reserva_id] ?? 'Desconocido'}
                    </Badge>
                    {esAdminOSacerdote && r.estado_reserva_id === 1 && (
                      <div className={styles.reservaBotones}>
                        <Btn kind="ok" size="sm" onClick={() => cambiarEstado(r.id, 2)}>Aprobar</Btn>
                        <Btn kind="bad" size="sm" onClick={() => cambiarEstado(r.id, 3)}>Rechazar</Btn>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
