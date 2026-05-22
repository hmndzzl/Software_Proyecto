import Btn from '../../components/ui/Btn';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import NotificacionRow from '../../modules/notificaciones/components/NotificacionRow';
import { useNotificaciones } from '../../modules/notificaciones/hooks/useNotificaciones';
import styles from './NotificacionesPage.module.css';

export default function NotificacionesPage() {
  const { notificaciones, cargando, error, marcarLeida, marcarTodasLeidas } = useNotificaciones();
  const hayNoLeidas = notificaciones.some((n) => !n.leida);

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
    </div>
  );
}
