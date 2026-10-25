import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Btn from '../../components/ui/Btn';
import SortableTh from '../../components/ui/SortableTh';
import { useSortableTable } from '../../hooks/useSortableTable';
import { normalizarBusqueda } from '../../hooks/useTableFilters';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import NotificacionRow from '../../modules/notificaciones/components/NotificacionRow';
import PapeleraRow from '../../modules/notificaciones/components/PapeleraRow';
import EnviadaRow from '../../modules/notificaciones/components/EnviadaRow';
import EnviarNotificacionForm from '../../modules/notificaciones/components/EnviarNotificacionForm';
import ModalExcusaAsistencia from '../../modules/notificaciones/components/ModalExcusaAsistencia';
import { useNotificaciones } from '../../modules/notificaciones/hooks/useNotificaciones';
import { usePapelera } from '../../modules/notificaciones/hooks/usePapelera';
import { useNotificacionesEnviadas } from '../../modules/notificaciones/hooks/useNotificacionesEnviadas';
import { ROLES } from '../../utils/roles';
import { useAuth } from '../../context/AuthContext';
import type { Notificacion } from '../../types';
import styles from './NotificacionesPage.module.css';
import { Field, InputUI, SelectUI } from '../../components/ui/Field';
import { enRangoEnvio } from '../../modules/notificaciones/utils/fechaNotificacion';

const ROLES_PUEDEN_ENVIAR = [ROLES.ADMIN, ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS];
type Vista = 'recibidas' | 'enviadas' | 'papelera';

const SORT_COMUN = {
  fecha: (n: { fecha: string; enviado_en?: string | null }) => Date.parse(n.enviado_en ?? n.fecha) || 0,
  mensaje: (n: { mensaje: string }) => n.mensaje.toLowerCase(),
  remitente: (n: { remitente_nombre: string | null }) => (n.remitente_nombre ?? 'Sistema').toLowerCase(),
  tipo: (n: { tipo: string }) => n.tipo,
};

export default function NotificacionesPage() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');
  const [lectura, setLectura] = useState('');
  const rangoInvalido = Boolean(desde && hasta && desde > hasta);
  const {
    notificaciones,
    cargando,
    error,
    marcarLeida,
    marcarNoLeida,
    eliminar,
    marcarTodasLeidas,
    confirmarAsistencia,
    cancelarAsistencia,
    cancelarInasistencia,
    excusarAsistencia,
    refetch,
  } = useNotificaciones();

  const { tieneRol } = useAuth();
  const puedeEnviar = tieneRol(ROLES_PUEDEN_ENVIAR);
  const { enviadas, cargando: cargandoEnviadas, error: errorEnviadas, refetch: refetchEnviadas } = useNotificacionesEnviadas(puedeEnviar);
  const { papelera, cargando: cargandoPapelera, error: errorPapelera, restaurar, vaciar, refetch: refetchPapelera } = usePapelera();

  const [vista, setVista] = useState<Vista>('recibidas');
  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false);
  const [notifSeleccionadaExcusa, setNotifSeleccionadaExcusa] = useState<Notificacion | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const resaltarId = searchParams.get('resaltar') ? Number(searchParams.get('resaltar')) : null;

  // Viene del clic en una notificación desde el menú de la campana: desplaza
  // hasta esa fila y la resalta unos segundos, luego limpia el parámetro.
  useEffect(() => {
    if (cargando || resaltarId == null) return;
    document.getElementById(`notificacion-${resaltarId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timeout = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('resaltar');
        return next;
      }, { replace: true });
    }, 2500);
    return () => clearTimeout(timeout);
  }, [cargando, resaltarId]);

  const hayNoLeidas = notificaciones.some((n) => !n.leida);
  const filtrar = <T extends { enviado_en?: string | null; mensaje: string; tipo: string; remitente_nombre?: string | null; destinatarios_nombres?: string | null },>(lista: T[]) =>
    lista.filter(n => {
      const remitente = 'remitente_nombre' in n ? n.remitente_nombre ?? 'Sistema' : '';
      const texto = normalizarBusqueda([n.mensaje, remitente, n.destinatarios_nombres].join(' '));
      return !rangoInvalido && enRangoEnvio(n.enviado_en, desde, hasta)
        && (!tipo || n.tipo === tipo)
        && normalizarBusqueda(busqueda).split(/\s+/).every(termino => texto.includes(termino));
    });
  const recibidasFiltradas = filtrar(notificaciones).filter(n => !lectura || (n.leida ? 'leida' : 'no-leida') === lectura);
  const enviadasFiltradas = filtrar(enviadas);
  const papeleraFiltrada = filtrar(papelera);
  const filtrando = Boolean(desde || hasta || busqueda || tipo || (vista === 'recibidas' && lectura));
  const sinResultados = busqueda || tipo || (vista === 'recibidas' && lectura)
    ? 'No hay notificaciones que coincidan con los filtros.' : 'No hay notificaciones en el rango seleccionado.';
  const recibidasSort = useSortableTable(recibidasFiltradas, { ...SORT_COMUN, estado: (n: Notificacion) => n.leida ? 'Leída' : 'No leída' });
  const enviadasSort = useSortableTable(enviadasFiltradas, {
    fecha: SORT_COMUN.fecha, mensaje: SORT_COMUN.mensaje, tipo: SORT_COMUN.tipo,
    destinatarios: (n: (typeof enviadas)[number]) => (n.destinatarios_nombres ?? '').toLowerCase(),
    lecturas: (n: (typeof enviadas)[number]) => Number(n.total_leidas),
  });
  const papeleraSort = useSortableTable(papeleraFiltrada, SORT_COMUN);
  const totalVista = vista === 'recibidas' ? notificaciones.length : vista === 'enviadas' ? enviadas.length : papelera.length;
  const totalFiltrado = vista === 'recibidas' ? recibidasFiltradas.length : vista === 'enviadas' ? enviadasFiltradas.length : papeleraFiltrada.length;

  const handleEnviada = async () => {
    setModalNuevaAbierto(false);
    await refetch();
  };

  const handleConfirmarExcusa = async (notificacionId: number, motivo: string) => {
    await excusarAsistencia(notificacionId, motivo);
  };

  const handleVaciarPapelera = async () => {
    if (!window.confirm('¿Seguro que deseas vaciar la papelera? Esta acción no se puede deshacer.')) return;
    await vaciar();
  };

  // useNotificaciones y usePapelera mantienen listas independientes: al mover o
  // restaurar hay que refrescar la otra para que aparezca sin recargar la página.
  const handleEliminar = async (id: number) => {
    await eliminar(id);
    refetchPapelera();
  };

  const handleRestaurar = async (id: number) => {
    await restaurar(id);
    refetch();
  };

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Bandeja de entrada"
        title="Notificaciones"
        subtitle="Avisos y comunicados dirigidos a tu cuenta."
        actions={
          puedeEnviar && vista === 'recibidas' ? (
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

      <div className={styles.tabs}>
        <Btn kind={vista === 'recibidas' ? 'primary' : 'ghost'} size="sm" onClick={() => setVista('recibidas')}>
          Recibidas
        </Btn>
        {puedeEnviar && (
          <Btn kind={vista === 'enviadas' ? 'primary' : 'ghost'} size="sm" onClick={() => setVista('enviadas')}>
            Enviadas
          </Btn>
        )}
        <Btn kind={vista === 'papelera' ? 'primary' : 'ghost'} size="sm" onClick={() => setVista('papelera')}>
          Papelera
        </Btn>
      </div>

      <Card>
        <CardBody>
          <div className={styles.filtros}>
            <Field label="Buscar">
              <InputUI aria-label="Buscar" type="search" placeholder="Mensaje, remitente o destinatario…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </Field>
            <Field label="Tipo">
              <SelectUI aria-label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="">Todos</option><option value="global">Global</option><option value="grupo">Grupo</option><option value="individual">Individual</option>
              </SelectUI>
            </Field>
            {vista === 'recibidas' && <Field label="Estado de lectura">
              <SelectUI aria-label="Estado de lectura" value={lectura} onChange={e => setLectura(e.target.value)}>
                <option value="">Todos</option><option value="leida">Leídas</option><option value="no-leida">No leídas</option>
              </SelectUI>
            </Field>}
            <Field label="Desde (fecha y hora)">
              <InputUI aria-label="Desde (fecha y hora)" type="datetime-local" value={desde} onChange={e => setDesde(e.target.value)} />
            </Field>
            <Field label="Hasta (fecha y hora)">
              <InputUI aria-label="Hasta (fecha y hora)" type="datetime-local" value={hasta} onChange={e => setHasta(e.target.value)} />
            </Field>
            <Btn kind="primary" onClick={() => { setDesde(''); setHasta(''); setBusqueda(''); setTipo(''); setLectura(''); }} disabled={!filtrando}>Limpiar filtros</Btn>
          </div>
          <p className={styles.ayudaFiltro}>Horario de Guatemala. Puedes indicar uno o ambos límites. El minuto final está incluido.</p>
          {(desde || hasta) && <p className={styles.ayudaFiltro}>Las notificaciones antiguas sin hora registrada no se incluyen en la búsqueda por rango.</p>}
          <p className={styles.ayudaFiltro} aria-live="polite">Mostrando {totalFiltrado} de {totalVista} registros.</p>
          {rangoInvalido && <p role="alert">La fecha y hora inicial no puede ser posterior a la final.</p>}
        </CardBody>
      </Card>

      {vista === 'recibidas' && (
        <Card>
          <CardHead
            title="MIS NOTIFICACIONES"
            hint={!cargando && !error ? `${recibidasFiltradas.length} notificaciones` : undefined}
            right={
              hayNoLeidas ? (
                <Btn kind="gold" size="sm" onClick={marcarTodasLeidas}>
                  Marcar todas como leídas
                </Btn>
              ) : undefined
            }
          />
          <CardBody>
            {cargando ? (
              <LoadingState label="Cargando notificaciones…" />
            ) : error ? (
              <ErrorState message={error} onRetry={refetch} />
            ) : recibidasFiltradas.length === 0 ? (
              <EmptyState message={filtrando ? sinResultados : "No tienes notificaciones."} />
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr>
                      <SortableTh label="Fecha y hora de envío" sortKey="fecha" activeKey={recibidasSort.sortKey} dir={recibidasSort.sortDir} onSort={recibidasSort.toggleSort} />
                      <SortableTh label="Mensaje" sortKey="mensaje" activeKey={recibidasSort.sortKey} dir={recibidasSort.sortDir} onSort={recibidasSort.toggleSort} />
                      <SortableTh label="Remitente" sortKey="remitente" activeKey={recibidasSort.sortKey} dir={recibidasSort.sortDir} onSort={recibidasSort.toggleSort} />
                      <SortableTh label="Tipo" sortKey="tipo" activeKey={recibidasSort.sortKey} dir={recibidasSort.sortDir} onSort={recibidasSort.toggleSort} />
                      <SortableTh label="Estado" sortKey="estado" activeKey={recibidasSort.sortKey} dir={recibidasSort.sortDir} onSort={recibidasSort.toggleSort} />
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recibidasSort.sortedData.map((n) => (
                      <NotificacionRow
                        key={n.id}
                        notificacion={n}
                        onMarcarLeida={marcarLeida}
                        onMarcarNoLeida={marcarNoLeida}
                        onConfirmarAsistencia={confirmarAsistencia}
                        onCancelarAsistencia={cancelarAsistencia}
                        onCancelarInasistencia={cancelarInasistencia}
                        onExcusarAsistencia={(notif) => setNotifSeleccionadaExcusa(notif)}
                        onEliminar={handleEliminar}
                        resaltada={n.id === resaltarId}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {vista === 'enviadas' && puedeEnviar && (
        <Card>
          <CardHead
            title="NOTIFICACIONES ENVIADAS"
            hint={!cargandoEnviadas && !errorEnviadas ? `${enviadasFiltradas.length} notificaciones` : undefined}
          />
          <CardBody>
            {cargandoEnviadas ? (
              <LoadingState label="Cargando notificaciones enviadas…" />
            ) : errorEnviadas ? (
              <ErrorState message={errorEnviadas} onRetry={refetchEnviadas} />
            ) : enviadasFiltradas.length === 0 ? (
              <EmptyState message={filtrando ? sinResultados : "No has enviado notificaciones."} />
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table} style={{ tableLayout: 'fixed', minWidth: 700 }}>
                  <colgroup>
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '22%' }} />
                  </colgroup>
                  <thead className={styles.thead}>
                    <tr>
                      <SortableTh label="Fecha y hora de envío" sortKey="fecha" activeKey={enviadasSort.sortKey} dir={enviadasSort.sortDir} onSort={enviadasSort.toggleSort} />
                      <SortableTh label="Mensaje" sortKey="mensaje" activeKey={enviadasSort.sortKey} dir={enviadasSort.sortDir} onSort={enviadasSort.toggleSort} />
                      <SortableTh label="Destinatarios" sortKey="destinatarios" activeKey={enviadasSort.sortKey} dir={enviadasSort.sortDir} onSort={enviadasSort.toggleSort} />
                      <SortableTh label="Tipo" sortKey="tipo" activeKey={enviadasSort.sortKey} dir={enviadasSort.sortDir} onSort={enviadasSort.toggleSort} />
                      <SortableTh label="Lecturas" sortKey="lecturas" activeKey={enviadasSort.sortKey} dir={enviadasSort.sortDir} onSort={enviadasSort.toggleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {enviadasSort.sortedData.map((n) => (
                      <EnviadaRow key={n.id} notificacion={n} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {vista === 'papelera' && (
        <Card>
          <CardHead
            title="PAPELERA"
            hint={!cargandoPapelera && !errorPapelera ? `${papeleraFiltrada.length} notificaciones (se purgan a los 15 días)` : undefined}
            right={
              papelera.length > 0 ? (
                <Btn kind="bad" size="sm" onClick={handleVaciarPapelera}>
                  Vaciar papelera
                </Btn>
              ) : undefined
            }
          />
          <CardBody>
            {cargandoPapelera ? (
              <LoadingState label="Cargando papelera…" />
            ) : errorPapelera ? (
              <ErrorState message={errorPapelera} onRetry={refetchPapelera} />
            ) : papeleraFiltrada.length === 0 ? (
              <EmptyState message={filtrando ? sinResultados : "La papelera está vacía."} />
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr>
                      <SortableTh label="Fecha y hora de envío" sortKey="fecha" activeKey={papeleraSort.sortKey} dir={papeleraSort.sortDir} onSort={papeleraSort.toggleSort} />
                      <SortableTh label="Mensaje" sortKey="mensaje" activeKey={papeleraSort.sortKey} dir={papeleraSort.sortDir} onSort={papeleraSort.toggleSort} />
                      <SortableTh label="Remitente" sortKey="remitente" activeKey={papeleraSort.sortKey} dir={papeleraSort.sortDir} onSort={papeleraSort.toggleSort} />
                      <SortableTh label="Tipo" sortKey="tipo" activeKey={papeleraSort.sortKey} dir={papeleraSort.sortDir} onSort={papeleraSort.toggleSort} />
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {papeleraSort.sortedData.map((n) => (
                      <PapeleraRow key={n.id} notificacion={n} onRestaurar={handleRestaurar} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

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
