import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { listarMensajesContactoApi, type MensajeContacto } from '../../api/contacto';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/roles';
import { formatFecha, formatFechaHora } from '../../utils/date';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead } from '../../components/ui/Card';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import Btn from '../../components/ui/Btn';
import Modal from '../../components/ui/Modal';
import SortableTh from '../../components/ui/SortableTh';
import TableFilters from '../../components/ui/TableFilters';
import { useSortableTable } from '../../hooks/useSortableTable';
import { useTableFilters } from '../../hooks/useTableFilters';
import styles from './MensajesContactoPage.module.css';

const resumen = (texto: string) => (texto.length > 80 ? `${texto.slice(0, 80).trimEnd()}…` : texto);

export default function MensajesContactoPage() {
  const { usuario } = useAuth();
  const [mensajes, setMensajes] = useState<MensajeContacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState<MensajeContacto | null>(null);
  const autorizado = usuario?.rol_id === ROLES.SACERDOTE || usuario?.rol_id === ROLES.ADMIN;

  const filtros = useTableFilters(mensajes, {
    search: m => [m.nombre, m.correo, m.telefono, m.motivo, m.mensaje],
    date: m => m.fecha,
    selects: [{ key: 'motivo', label: 'Motivo', value: m => m.motivo }],
  });
  const orden = useSortableTable(filtros.filteredData, {
    nombre: (m: MensajeContacto) => m.nombre.toLowerCase(),
    motivo: (m: MensajeContacto) => m.motivo.toLowerCase(),
    fecha: (m: MensajeContacto) => m.creado_en,
  });

  const cargar = useCallback(() => {
    setLoading(true);
    setError('');
    listarMensajesContactoApi()
      .then(setMensajes)
      .catch(() => setError('Error al obtener los mensajes de contacto'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (autorizado) cargar();
  }, [autorizado, cargar]);

  // Igual que la API: solo Sacerdote y Admin ven los mensajes.
  if (!autorizado) return <Navigate to="/dashboard" replace />;

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Administración"
        title="Mensajes de contacto"
        subtitle="Consulta los mensajes enviados desde el formulario de contacto del sitio público."
      />

      <Card>
        <CardHead title="Mensajes recibidos" hint={!loading && !error ? `${mensajes.length} mensajes` : undefined} />

        {loading && <LoadingState variant="table" label="Cargando mensajes..." />}
        {!loading && !error && mensajes.length > 0 && <TableFilters {...filtros.controls} label="Filtros de mensajes" />}
        {error && <ErrorState message={error} onRetry={cargar} />}
        {!loading && !error && mensajes.length === 0 && <EmptyState message="Aún no se han recibido mensajes de contacto." />}

        {!loading && !error && mensajes.length > 0 && (
          <div className="table-container">
            <table className="styled-table">
              <thead>
                <tr>
                  <SortableTh label="Fecha" sortKey="fecha" activeKey={orden.sortKey} dir={orden.sortDir} onSort={orden.toggleSort} />
                  <SortableTh label="Nombre" sortKey="nombre" activeKey={orden.sortKey} dir={orden.sortDir} onSort={orden.toggleSort} />
                  <SortableTh label="Motivo" sortKey="motivo" activeKey={orden.sortKey} dir={orden.sortDir} onSort={orden.toggleSort} />
                  <th>Mensaje</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orden.sortedData.map(m => (
                  <tr key={m.id}>
                    <td>{formatFecha(m.fecha)}</td>
                    <td>
                      <span className={styles.nombre}>{m.nombre}</span>
                      <span className={styles.correo}>{m.correo}</span>
                    </td>
                    <td><span className={styles.motivoBadge}>{m.motivo}</span></td>
                    <td className={styles.resumen}>{resumen(m.mensaje)}</td>
                    <td>
                      <Btn kind="ghost" size="sm" onClick={() => setDetalle(m)}>Ver mensaje</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orden.sortedData.length === 0 && <EmptyState message="Ningún mensaje coincide con los filtros." />}
          </div>
        )}
      </Card>

      {detalle && (
        <Modal open title={`Mensaje de ${detalle.nombre}`} subtitle={detalle.motivo} onClose={() => setDetalle(null)} width={640}>
          <dl className={styles.campos}>
            <div><dt>Recibido</dt><dd>{formatFechaHora(detalle.creado_en)}</dd></div>
            <div><dt>Nombre</dt><dd>{detalle.nombre}</dd></div>
            <div><dt>Correo</dt><dd><a href={`mailto:${detalle.correo}`}>{detalle.correo}</a></dd></div>
            <div><dt>Teléfono</dt><dd>{detalle.telefono ?? 'No proporcionado'}</dd></div>
          </dl>
          <h3 className={styles.titulo}>Mensaje</h3>
          <p className={styles.cuerpo}>{detalle.mensaje}</p>
        </Modal>
      )}
    </div>
  );
}
