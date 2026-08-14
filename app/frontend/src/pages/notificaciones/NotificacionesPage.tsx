import { useState } from 'react';
import Btn from '../../components/ui/Btn';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import NotificacionRow from '../../modules/notificaciones/components/NotificacionRow';
import EnviarNotificacionForm from '../../modules/notificaciones/components/EnviarNotificacionForm';
import ModalExcusaAsistencia from '../../modules/notificaciones/components/ModalExcusaAsistencia';
import { useNotificaciones } from '../../modules/notificaciones/hooks/useNotificaciones';
import { usuarioTieneRol, ROLES } from '../../utils/roles';
import type { Notificacion } from '../../types';
import styles from './NotificacionesPage.module.css';

const ROLES_PUEDEN_ENVIAR = [ROLES.ADMIN, ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS];

export default function NotificacionesPage() {
  const {
    notificaciones,
    cargando,
    error,
    marcarLeida,
    marcarTodasLeidas,
    confirmarAsistencia,
    excusarAsistencia,
    refetch,
  } = useNotificaciones();

  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false);
  const [notifSeleccionadaExcusa, setNotifSeleccionadaExcusa] = useState<Notificacion | null>(null);

  const hayNoLeidas = notificaciones.some((n) => !n.leida);
  const puedeEnviar = usuarioTieneRol(ROLES_PUEDEN_ENVIAR);

  const handleEnviada = async () => {
    setModalNuevaAbierto(false);
    await refetch();
  };

  const handleConfirmarExcusa = async (notificacionId: number, motivo: string) => {
    await excusarAsistencia(notificacionId, motivo);
  };

  if (cargando) {
    return (
      <div className={styles.page}>
        <PageHeader kicker="Bandeja de entrada" title="Notificaciones" subtitle="Avisos y comunicados dirigidos a tu cuenta." />
        <Card><CardBody><LoadingState label="Cargando notificaciones…" /></CardBody></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <PageHeader kicker="Bandeja de entrada" title="Notificaciones" subtitle="Avisos y comunicados dirigidos a tu cuenta." />
        <Card><CardBody><ErrorState message={error} onRetry={refetch} /></CardBody></Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Bandeja de entrada"
        title="Notificaciones"
        subtitle="Avisos y comunicados dirigidos a tu cuenta."
        actions={
          puedeEnviar ? (
            <Btn kind="primary" size="md" onClick={() => setModalNuevaAbierto(true)}
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              }
            >
              Nueva notificación
            </Btn>
          ) : undefined
        }
      />

      <Card>
        <CardHead
          title="MIS NOTIFICACIONES"
          hint={`${notificaciones.length} notificaciones`}
          right={
            hayNoLeidas ? (
              <Btn kind="gold" size="sm" onClick={marcarTodasLeidas}>
                Marcar todas como leídas
              </Btn>
            ) : undefined
          }
        />
        <CardBody>
          {notificaciones.length === 0 ? (
            <EmptyState message="No tienes notificaciones." />
          ) : (
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th>Fecha</th>
                  <th>Mensaje</th>
                  <th>Remitente</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {notificaciones.map((n) => (
                  <NotificacionRow
                    key={n.id}
                    notificacion={n}
                    onMarcarLeida={marcarLeida}
                    onConfirmarAsistencia={confirmarAsistencia}
                    onExcusarAsistencia={(notif) => setNotifSeleccionadaExcusa(notif)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Modal para redactar nueva notificación */}
      <Modal
        open={modalNuevaAbierto}
        title="Nueva Notificación"
        onClose={() => setModalNuevaAbierto(false)}
        width={540}
      >
        <EnviarNotificacionForm
          onEnviada={handleEnviada}
          onCancelar={() => setModalNuevaAbierto(false)}
        />
      </Modal>

      {/* Modal para excusar asistencia */}
      <ModalExcusaAsistencia
        open={!!notifSeleccionadaExcusa}
        notificacion={notifSeleccionadaExcusa}
        onClose={() => setNotifSeleccionadaExcusa(null)}
        onConfirmar={handleConfirmarExcusa}
      />
    </div>
  );
}
