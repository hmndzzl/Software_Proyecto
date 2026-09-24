import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/roles';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import NotificarAusenciaForm from '../../modules/ausencias/components/NotificarAusenciaForm';
import styles from './AusenciasPage.module.css';

export default function AusenciasPage() {
  const { usuario } = useAuth();
  // Este trámite es personal y no admite herencia de roles, igual que la API.
  if (usuario?.rol_id !== ROLES.MINISTRO && usuario?.rol_id !== ROLES.ADMIN) return <Navigate to="/dashboard" replace />;

  return (
    <div className={styles.page}>
      <PageHeader kicker="Servicio parroquial" title="Notificar ausencia"
        subtitle="Informa el periodo en el que no podrás participar en tus servicios." />
      <Card>
        <CardHead title="Nuevo periodo de ausencia" />
        <CardBody><NotificarAusenciaForm /></CardBody>
      </Card>
    </div>
  );
}
