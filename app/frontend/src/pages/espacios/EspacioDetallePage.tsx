import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { avisoCambioEstadoReserva, ESTADOS_RESERVA } from '../../utils/estadosReserva';
import { getApiErrorMessage } from '../../utils/apiError';
import { Espacio } from '../../modules/espacios/components/EspacioCard';
import EspacioGestion from '../../modules/espacios/components/EspacioGestion';
import EspacioFoto from '../../modules/espacios/components/EspacioFoto';
import EspacioQrModal from '../../modules/espacios/components/EspacioQrModal';
import EspacioCalendarioReservas from '../../modules/espacios/components/EspacioCalendarioReservas';
import { Card, CardHead } from '../../components/ui/Card';
import ReservaEstadoBadge from '../../components/ui/ReservaEstadoBadge';
import Badge from '../../components/ui/Badge';
import Btn from '../../components/ui/Btn';
import DetalleEventoModal from '../../components/ui/DetalleEventoModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { ROLES, ROLES_RESERVAS } from '../../utils/roles';
import { useAuth } from '../../context/AuthContext';
import { partesFecha, formatHora as fmtH, formatHorario } from '../../utils/date';
import type { Reserva } from '../../types';
import styles from './EspacioDetallePage.module.css';

export default function EspacioDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [qrAbierto, setQrAbierto] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState<number | null>(null);
  const [detalleEnUsoAbierto, setDetalleEnUsoAbierto] = useState(false);
  const [reservaPorRechazar, setReservaPorRechazar] = useState<Reserva | null>(null);

  const { tieneRol, usuario } = useAuth();
  const esAdminOSacerdote = tieneRol([ROLES.ADMIN, ROLES.SACERDOTE]);
  const puedeReservar = tieneRol(ROLES_RESERVAS);

  const cargarEspacio = () => {
    setCargando(true);
    setError('');
    Promise.all([
      apiClient.get<Espacio>(`/api/espacios/${id}`),
      apiClient.get<Reserva[]>(`/api/reservas?espacio_id=${id}`),
    ])
      .then(([resEspacio, resReservas]) => {
        setEspacio(resEspacio.data);
        setReservas(resReservas.data);
        setCargando(false);
      })
      .catch((err: unknown) => {
        setError(getApiErrorMessage(err, 'Espacio no encontrado', 'message'));
        setCargando(false);
      });
  };

  useEffect(() => {
    cargarEspacio();
  }, [id]);

  const toast = useToast();

  // Misma fuente que el calendario: a lo sumo una reserva confirmada cubre el
  // instante actual (las confirmadas nunca se solapan), así que esto identifica
  // de forma única quién está usando el salón ahora mismo, si alguien lo está.
  const reservaEnUso = reservas.find(r => r.en_uso);

  const cambiarEstado = async (reservaId: number, nuevoEstado: number) => {
    try {
      await apiClient.put(`/api/reservas/${reservaId}/estado`, { estado_id: nuevoEstado });
      const aviso = avisoCambioEstadoReserva(nuevoEstado);
      toast.success(aviso.titulo, aviso.mensaje);
      const res = await apiClient.get<Reserva[]>(`/api/reservas?espacio_id=${id}`);
      setReservas(res.data);
    } catch (err: unknown) {
      toast.error('No se pudo actualizar la reserva', getApiErrorMessage(err, 'Error al cambiar el estado de la reserva.', 'message'));
      throw err;
    }
  };

  // HU-15: check-in real al escanear el QR. "en_uso"/"reservas_checkin_disponible"
  // ya vienen filtrados por rol desde el backend (propia reserva, o cualquiera si
  // el actor es privilegiado) — aquí solo se presentan y se dispara la confirmación.
  const confirmarCheckin = async (reservaId: number) => {
    setCheckinLoading(reservaId);
    try {
      await apiClient.put(`/api/reservas/${reservaId}/checkin`, {});
      toast.success('Check-in registrado', 'El salón ya aparece en uso mientras dure tu reserva.');
      cargarEspacio();
    } catch (err: unknown) {
      toast.error('No se pudo hacer check-in', getApiErrorMessage(err, 'Error al hacer check-in de la reserva.', 'message'));
    } finally {
      setCheckinLoading(null);
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
          <EspacioFoto className={styles.photoSlot} nombre={espacio.nombre} fotoUrl={espacio.foto_url} eager />

          <p className={styles.kicker}>Recinto parroquial</p>
          <h1 className={styles.nombre}>{espacio.nombre}</h1>
          <div className={styles.rule} />
          <EspacioGestion espacio={espacio} onChanged={cargarEspacio} onDeleted={() => navigate('/espacios')} />

          <div className={styles.estadoActualWrap}>
            {reservaEnUso ? (
              <button
                type="button"
                className={styles.estadoActualBtn}
                onClick={() => setDetalleEnUsoAbierto(true)}
                title="Ver quién lo está usando"
              >
                <Badge kind="bad">En uso ahora</Badge>
              </button>
            ) : (
              <Badge kind="ok">Libre</Badge>
            )}
          </div>

          {puedeReservar && (
            <div className={styles.checkinWrap}>
              {espacio.reservas_checkin_disponible && espacio.reservas_checkin_disponible.length > 0 ? (
                espacio.reservas_checkin_disponible.map((r) => (
                  <div key={r.id} className={styles.checkinItem}>
                    <p className={styles.checkinInfo}>
                      {r.solicitante_id === usuario?.id
                        ? 'Se detectó una reserva a tu nombre'
                        : <>Se detectó una reserva a nombre de <strong>{r.solicitante_nombre}</strong></>}
                      {' '}hoy, {formatHorario(r.hora_inicio, r.hora_fin)}.
                      {!r.checkin_en && ' ¿Deseas confirmar el check-in para usar este espacio?'}
                    </p>
                    {r.checkin_en ? (
                      <span className={styles.checkinHecho}>
                        Check-in hecho a las {fmtH(r.checkin_en.split(' ')[1] ?? '')}
                      </span>
                    ) : (
                      <Btn kind="ok" size="sm" onClick={() => confirmarCheckin(r.id)} disabled={checkinLoading === r.id}>
                        {checkinLoading === r.id ? 'Confirmando...' : 'Sí, confirmar check-in'}
                      </Btn>
                    )}
                  </div>
                ))
              ) : (
                <p className={styles.checkinAviso}>No tienes una reserva en este horario.</p>
              )}
            </div>
          )}

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

          {esAdminOSacerdote && (
            <div className={styles.qrBtnWrap}>
              <Btn kind="cream" size="sm" onClick={() => setQrAbierto(true)}
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="21"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="14" y1="17.5" x2="21" y2="17.5"/></svg>}>
                Ver código QR
              </Btn>
            </div>
          )}
        </div>

        {/* Panel derecho — reservas */}
        <Card className={styles.reservasCard}>
          <CardHead
            title="Próximas Reservas"
            hint={`${reservas.length} registradas`}
            right={
              puedeReservar && (
                <Btn kind="gold" size="sm" onClick={() => navigate(`/reservas?espacio_id=${espacio.id}`)}
                  icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}>
                  Reservar
                </Btn>
              )
            }
          />

          {!puedeReservar && (
            <p className={styles.avisoSoloLectura}>
              No tienes permisos para reservar este salón. Si necesitas coordinarlo, contacta a tu coordinador.
            </p>
          )}

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
                    <span className={styles.dateHora}>{formatHorario(r.hora_inicio, r.hora_fin)}</span>
                  </div>

                  {/* Info evento */}
                  <div className={styles.eventInfo}>
                    {r.evento_titulo && <p className={styles.eventTitle}>{r.evento_titulo}</p>}
                    {r.evento_descripcion && <p className={styles.eventDesc}>{r.evento_descripcion}</p>}
                    {!r.evento_titulo && !r.evento_descripcion && (
                      <p className={styles.eventTitle}>Reserva #{r.id}</p>
                    )}
                    <p className={styles.eventSolicitante}>Registrado por: {r.solicitante_nombre ?? 'Desconocido'}</p>
                  </div>

                  {/* Badge + acciones */}
                  <div className={styles.reservaAcciones}>
                    <ReservaEstadoBadge estadoId={r.estado_reserva_id} />
                    {esAdminOSacerdote && r.estado_reserva_id === ESTADOS_RESERVA.PENDIENTE && (
                      <div className={styles.reservaBotones}>
                        <Btn kind="ok" size="sm" onClick={() => { void cambiarEstado(r.id, ESTADOS_RESERVA.CONFIRMADA).catch(() => {}); }}>Aprobar</Btn>
                        <Btn kind="bad" size="sm" onClick={() => setReservaPorRechazar(r)}>Rechazar</Btn>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </Card>

      </div>

      <EspacioCalendarioReservas reservas={reservas} />

      <ConfirmDialog open={reservaPorRechazar !== null} title="Rechazar reserva" confirmLabel="Rechazar reserva"
        description={`¿Rechazar la solicitud de ${reservaPorRechazar?.solicitante_nombre ?? 'esta persona'} para ${reservaPorRechazar?.evento_titulo ?? espacio.nombre}?`}
        onCancel={() => setReservaPorRechazar(null)}
        onConfirm={async () => {
          if (!reservaPorRechazar) return;
          await cambiarEstado(reservaPorRechazar.id, ESTADOS_RESERVA.RECHAZADA);
          setReservaPorRechazar(null);
        }} />

      <EspacioQrModal
        open={qrAbierto}
        espacio={espacio}
        onClose={() => setQrAbierto(false)}
      />

      {detalleEnUsoAbierto && reservaEnUso && (
        <DetalleEventoModal
          open
          onClose={() => setDetalleEnUsoAbierto(false)}
          titulo={reservaEnUso.evento_titulo || `Reserva #${reservaEnUso.id}`}
          fecha={reservaEnUso.fecha}
          horaInicio={reservaEnUso.hora_inicio}
          horaFin={reservaEnUso.hora_fin}
          descripcion={reservaEnUso.evento_descripcion}
          extra={
            <div className={styles.solicitanteEnUsoRow}>
              <p>En uso por: {reservaEnUso.solicitante_nombre ?? 'Desconocido'}</p>
              {reservaEnUso.checkin_en && (
                <p>Check-in hecho a las {fmtH(reservaEnUso.checkin_en.split(' ')[1] ?? '')}</p>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}
