import { useState } from 'react';
import Btn from '../../components/ui/Btn';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import NotificacionRow from '../../modules/notificaciones/components/NotificacionRow';
import EnviarNotificacionForm from '../../modules/notificaciones/components/EnviarNotificacionForm';
import { useNotificaciones } from '../../modules/notificaciones/hooks/useNotificaciones';
import { usuarioTieneRol, ROLES } from '../../utils/roles';
import styles from './NotificacionesPage.module.css';

const ROLES_PUEDEN_ENVIAR = [ROLES.ADMIN, ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS];

export default function NotificacionesPage() {
  const { notificaciones, cargando, error, marcarLeida, marcarTodasLeidas, refetch } = useNotificaciones();
  const [modalAbierto, setModalAbierto] = useState(false);

  const hayNoLeidas = notificaciones.some((n) => !n.leida);
  const puedeEnviar = usuarioTieneRol(ROLES_PUEDEN_ENVIAR);

  const handleEnviada = async () => {
    setModalAbierto(false);
    await refetch();
  };

  if (cargando) {
    return (
      <div className={styles.page}>
        <PageHeader kicker="Bandeja de entrada" title="Notificaciones" subtitle="Avisos y comunicados dirigidos a tu cuenta." />
        <Card><CardBody><p className={styles.loadingWrap}>Cargando notificaciones…</p></CardBody></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <PageHeader kicker="Bandeja de entrada" title="Notificaciones" subtitle="Avisos y comunicados dirigidos a tu cuenta." />
        <Card><CardBody><p className={styles.errorWrap}>{error}</p></CardBody></Card>
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
            <Btn kind="primary" size="md" onClick={() => setModalAbierto(true)}
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
            <p className={styles.empty}>No tienes notificaciones.</p>
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
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Modal
        open={modalAbierto}
        title="Nueva Notificación"
        onClose={() => setModalAbierto(false)}
        width={540}
      >
        <EnviarNotificacionForm
          onEnviada={handleEnviada}
          onCancelar={() => setModalAbierto(false)}
        />
      </Modal>
    </div>
  );
}
