import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import { Field, SelectUI } from '../../components/ui/Field';
import Btn from '../../components/ui/Btn';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import SortableTh from '../../components/ui/SortableTh';
import { useSortableTable } from '../../hooks/useSortableTable';
import { useToast } from '../../context/ToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import type { Ministro } from '../../types';
import styles from './CoordinadoresMinistrosPage.module.css';

interface Coordinador { id: number; nombre: string; estado_cuenta: string }
interface MinistroAsignado { id: number; nombre: string; correo: string; estado_cuenta: string }
const endpoint = '/api/coordinadores-ministros';
const sortValues = {
  nombre: (m: MinistroAsignado) => m.nombre.toLowerCase(),
  correo: (m: MinistroAsignado) => m.correo.toLowerCase(),
};

export default function CoordinadoresMinistrosPage() {
  const toast = useToast();
  const [coordinadores, setCoordinadores] = useState<Coordinador[]>([]);
  const [ministros, setMinistros] = useState<Ministro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [coordinadorId, setCoordinadorId] = useState('');
  const [ministroId, setMinistroId] = useState('');
  const [asignados, setAsignados] = useState<MinistroAsignado[] | null>(null);
  const [errorAsignados, setErrorAsignados] = useState('');
  const [revisionAsignados, setRevisionAsignados] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [porQuitar, setPorQuitar] = useState<MinistroAsignado | null>(null);
  const { sortKey, sortDir, toggleSort, sortedData } = useSortableTable(asignados ?? [], sortValues);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    Promise.all([
      apiClient.get<Coordinador[]>(endpoint),
      apiClient.get<Ministro[]>('/api/personas'),
    ]).then(([coords, personas]) => {
      if (!vigente) return;
      setCoordinadores(coords.data);
      setMinistros(personas.data);
    }).catch(() => { if (vigente) setError('No se pudieron cargar los coordinadores y ministros.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [revision]);

  useEffect(() => {
    let vigente = true;
    setAsignados(null);
    setErrorAsignados('');
    if (coordinadorId) {
      apiClient.get<MinistroAsignado[]>(`${endpoint}/${coordinadorId}/ministros`)
        .then(res => { if (vigente) setAsignados(res.data); })
        .catch(error => { if (vigente) setErrorAsignados(getApiErrorMessage(error, 'No se pudieron cargar los ministros asignados.')); });
    }
    return () => { vigente = false; };
  }, [coordinadorId, revisionAsignados]);

  const coordinador = coordinadores.find(c => c.id === Number(coordinadorId));
  const disponibles = ministros.filter(m => !asignados?.some(a => a.id === m.id));
  const puedeAsignar = coordinador?.estado_cuenta === 'activa' && asignados !== null && !errorAsignados;

  const asignar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (guardando || !puedeAsignar || !ministroId) return;
    const ministro = disponibles.find(m => m.id === Number(ministroId));
    if (!ministro) return;
    setGuardando(true);
    try {
      await apiClient.put(`${endpoint}/${coordinadorId}/ministros/${ministro.id}`);
      toast.success('Ministro asignado', `${ministro.nombre} ahora está asignado a ${coordinador.nombre}.`);
      setMinistroId('');
      setAsignados(null);
      setRevisionAsignados(n => n + 1);
    } catch (error) {
      toast.error('No se pudo asignar el ministro', getApiErrorMessage(error, 'Intenta de nuevo en unos momentos.'));
    } finally { setGuardando(false); }
  };

  const quitar = async () => {
    if (guardando || !porQuitar) return;
    setGuardando(true);
    try {
      await apiClient.delete(`${endpoint}/${coordinadorId}/ministros/${porQuitar.id}`);
      toast.success('Relación retirada', `${porQuitar.nombre} ya no está asignado a ${coordinador?.nombre}.`);
      setPorQuitar(null);
      setAsignados(null);
      setRevisionAsignados(n => n + 1);
    } catch (error) {
      toast.error('No se pudo quitar el ministro', getApiErrorMessage(error, 'Intenta de nuevo en unos momentos.'));
    } finally { setGuardando(false); }
  };

  return (
    <div className={styles.page}>
      <PageHeader kicker="Organización pastoral" title="Coordinadores de ministros"
        subtitle="Asigna los ministros que acompaña cada coordinador."
        actions={<Link className={styles.link} to="/ministros">Volver a ministros</Link>} />
      {cargando && <LoadingState label="Cargando coordinadores y ministros..." />}
      {error && <ErrorState message={error} onRetry={() => setRevision(n => n + 1)} />}
      {!cargando && !error && <>
        <Card>
          <CardHead title="Seleccionar coordinador" />
          <CardBody>
            {coordinadores.length === 0 ? <EmptyState message="No hay coordinadores de ministros registrados." /> : (
              <Field label="Coordinador de ministros">
                <SelectUI aria-label="Coordinador de ministros" value={coordinadorId} disabled={guardando || porQuitar !== null}
                  onChange={e => { setCoordinadorId(e.target.value); setMinistroId(''); setAsignados(null); setErrorAsignados(''); }}>
                  <option value="">Selecciona un coordinador</option>
                  {coordinadores.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.estado_cuenta !== 'activa' ? ' (cuenta no activa)' : ''}</option>)}
                </SelectUI>
              </Field>
            )}
            <p className={styles.help}>Un ministro puede acompañar a más de un coordinador. Cada asignación se gestiona por separado.</p>
          </CardBody>
        </Card>
        {coordinador && <Card>
          <CardHead title={`Ministros de ${coordinador.nombre}`} hint={asignados ? `${asignados.length} asignados` : undefined} />
          <CardBody>
            {errorAsignados ? <ErrorState message={errorAsignados} onRetry={() => setRevisionAsignados(n => n + 1)} />
              : asignados === null ? <LoadingState label="Cargando ministros asignados..." /> : <>
                {coordinador.estado_cuenta !== 'activa'
                  ? <p className={styles.help}>Esta cuenta no está activa. Puedes quitar relaciones existentes, pero no asignar nuevos ministros.</p>
                  : disponibles.length === 0
                    ? <p className={styles.help}>No hay ministros activos disponibles para agregar a este coordinador.</p>
                    : <form className={styles.assignment} onSubmit={asignar} aria-busy={guardando}>
                      <Field label="Ministro para asignar">
                        <SelectUI aria-label="Ministro para asignar" value={ministroId} onChange={e => setMinistroId(e.target.value)} disabled={guardando || porQuitar !== null} required>
                          <option value="">Selecciona un ministro</option>
                          {disponibles.map(m => <option key={m.id} value={m.id}>{m.nombre} — {m.correo}</option>)}
                        </SelectUI>
                      </Field>
                      <Btn type="submit" disabled={!ministroId || guardando || porQuitar !== null}>{guardando && !porQuitar ? 'Asignando…' : 'Asignar ministro'}</Btn>
                    </form>}
                {asignados.length === 0 ? <EmptyState message="Este coordinador todavía no tiene ministros asignados." /> : (
                  <div className="table-container">
                    <table className="styled-table">
                      <thead><tr>
                        <SortableTh label="Ministro" sortKey="nombre" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                        <SortableTh label="Correo" sortKey="correo" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                        <th>Cuenta</th><th>Acciones</th>
                      </tr></thead>
                      <tbody>{sortedData.map(m => <tr key={m.id}>
                        <td>{m.nombre}</td><td>{m.correo}</td>
                        <td><Badge kind={m.estado_cuenta === 'activa' ? 'ok' : 'neutral'}>{m.estado_cuenta === 'activa' ? 'Activa' : 'No activa'}</Badge></td>
                        <td><Btn type="button" kind="bad" size="sm" disabled={guardando || porQuitar !== null} onClick={() => setPorQuitar(m)} aria-label={`Quitar a ${m.nombre}`}>Quitar</Btn></td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                )}
              </>}
          </CardBody>
        </Card>}
      </>}
      <Modal open={porQuitar !== null} title="Quitar ministro del coordinador" onClose={() => { if (!guardando) setPorQuitar(null); }}>
        <p className={styles.confirmation}>¿Quitar a <strong>{porQuitar?.nombre}</strong> de los ministros de <strong>{coordinador?.nombre}</strong>?</p>
        <p className={styles.help}>Su cuenta, sus tareas y sus relaciones con otros coordinadores se conservarán.</p>
        <div className={styles.actions}>
          <Btn kind="ghost" disabled={guardando} onClick={() => setPorQuitar(null)}>Cancelar</Btn>
          <Btn kind="bad" disabled={guardando} onClick={quitar}>{guardando ? 'Quitando…' : 'Confirmar retiro'}</Btn>
        </div>
      </Modal>
    </div>
  );
}
