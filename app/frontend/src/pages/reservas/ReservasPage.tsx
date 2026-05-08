import { useState } from 'react';
import CrearReservaForm from '../../modules/reservas/components/CrearReservaForm';
import ListaReservas from '../../modules/reservas/components/ListaReservas';
import styles from './ReservasPage.module.css';

export default function ReservasPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleReservaCreada = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="card">
          <h2 className="card-title">Gestión de Reservas</h2>

          <div className={styles.formWrapper}>
            <CrearReservaForm onReservaCreada={handleReservaCreada} />
          </div>

          <ListaReservas refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
