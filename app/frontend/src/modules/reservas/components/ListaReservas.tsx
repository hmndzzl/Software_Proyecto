import { useId, useEffect, useRef, useState } from 'react';
import apiClient from '../../../api/client';
import { useToast } from '../../../context/ToastContext';
import { CardHead } from '../.././../components/ui/Card';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import ReservaEstadoBadge from '../../../components/ui/ReservaEstadoBadge';
import Btn from '../../../components/ui/Btn';
import Modal from '../../../components/ui/Modal';
import { ConfirmDialogContent } from '../../../components/ui/ConfirmDialog';
import DecisionesPanel from '../../../components/ui/DecisionesPanel';
import SortableTh from '../../../components/ui/SortableTh';
import TableFilters from '../../../components/ui/TableFilters';
import { useTableFilters } from '../../../hooks/useTableFilters';
import { useSortableTable } from '../../../hooks/useSortableTable';
import { useAuth } from '../../../context/AuthContext';
import { ROLES } from '../../../utils/roles';
import { ESTADOS_RESERVA, avisoCambioEstadoReserva, etiquetaEstadoReserva, puedeCancelarReserva } from '../../../utils/estadosReserva';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatFecha, formatHora, formatHorario } from '../../../utils/date';
import { manejarClicFila } from '../../../utils/filaClicable';
import type { Espacio } from '../../espacios/components/EspacioCard';
import type { Reserva } from '../../../types';
import styles from './ListaReservas.module.css';
import formStyles from '../../../styles/Form.module.css';
import AforoField, { errorAforo } from '../../../components/ui/AforoField';

type SortKey = 'id' | 'espacio' | 'fecha' | 'estado' | 'solicitante' | 'inicio' | 'fin' | 'titulo' | 'descripcion' | 'aforo';
type Vista = 'detalle' | 'editar' | 'confirmar';
type AccionConfirmar = { estado: number; accion: 'cancelar' | 'rechazar' };
type Pestana = 'todas' | 'pendientes';

const SORT_VALUE: Record<SortKey, (r: Reserva) => string | number> = {
  id: (r) => r.id,
  aforo: r => r.cantidad_personas ?? -1,
  inicio: r => r.hora_inicio,
  fin: r => r.hora_fin,
  titulo: r => r.evento_titulo ?? '',
  descripcion: r => r.evento_descripcion ?? '',
  espacio: (r) => (r.espacio_nombre ?? '').toLowerCase(),
  fecha: (r) => `${r.fecha} ${r.hora_inicio}`,
  estado: (r) => etiquetaEstadoReserva(r.estado_reserva_id),
  solicitante: (r) => (r.solicitante_nombre ?? '').toLowerCase(),
};

export default function ListaReservas({ refreshKey }: { refreshKey?: number }) {
  const id = useId();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [loading, setLoading] = useState(true);
  const cargada = useRef(false);
  const cargaInicial = loading && !cargada.current;
  const [error, setError] = useState('');

  const [activa, setActiva] = useState<Reserva | null>(null);
  const [vista, setVista] = useState<Vista>('detalle');
  const [accionConfirmar, setAccionConfirmar] = useState<AccionConfirmar | null>(null);
  const [accionOcupado, setAccionOcupado] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const [resaltarId, setResaltarId] = useState<number | null>(null);

  const [editFecha, setEditFecha] = useState('');
  const [editHoraInicio, setEditHoraInicio] = useState('');
  const [editHoraFin, setEditHoraFin] = useState('');
  const [editEspacioId, setEditEspacioId] = useState('');
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editCantidad, setEditCantidad] = useState('');
  const [editMensaje, setEditMensaje] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editPublico, setEditPublico] = useState(false);
  const datosPersistidos = useRef('');

  const { usuario } = useAuth();
  const esAdminOSacerdote = usuario && (
    usuario.rol_id === ROLES.SACERDOTE || usuario.rol_id === ROLES.ADMIN
  );

  const [pestana, setPestana] = useState<Pestana>('todas');
  const reservasPendientes = reservas.filter(r => r.estado_reserva_id === ESTADOS_RESERVA.PENDIENTE);
  const reservasBase = esAdminOSacerdote && pestana === 'pendientes' ? reservasPendientes : reservas;

  const filtros = useTableFilters(reservasBase, {
    persistenceKey: 'reservas',
    search: r => [r.id, r.espacio_nombre, r.evento_titulo, r.evento_descripcion, r.solicitante_nombre],
    date: r => r.fecha,
    selects: [
      { key: 'estado', label: 'Estado', value: r => etiquetaEstadoReserva(r.estado_reserva_id) || 'Desconocido' },
      { key: 'espacio', label: 'Espacio', value: r => r.espacio_nombre ?? 'Sin espacio' },
    ],
  });
  const { sortKey, sortDir, toggleSort, sortedData: reservasOrdenadas } = useSortableTable(filtros.filteredData, SORT_VALUE);

  const cambiarPestana = (nueva: Pestana) => {
    filtros.controls.clear();
    setPestana(nueva);
  };

  const fetchReservas = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<Reserva[]>('/api/reservas');
      setReservas(response.data);
      cargada.current = true;
    } catch {
      setError('Error de red al obtener las reservas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservas();
    apiClient.get<Espacio[]>('/api/espacios').then(res => setEspacios(res.data)).catch(() => {});
  }, [refreshKey]);

  const toast = useToast();

  const cambiarEstado = async (reservaId: number, nuevoEstado: number) => {
    try {
      await apiClient.put(`/api/reservas/${reservaId}/estado`, { estado_id: nuevoEstado });
      const aviso = avisoCambioEstadoReserva(nuevoEstado);
      toast.success(aviso.titulo, aviso.mensaje);
      fetchReservas();
    } catch (err: unknown) {
      toast.error('No se pudo actualizar la reserva', getApiErrorMessage(err, 'Error al cambiar el estado de la reserva.', 'message'));
      throw err;
    }
  };

  const abrir = (r: Reserva, destino: Vista = 'detalle') => {
    setActiva(r);
    setVista(destino);
    setAccionConfirmar(null);
    setEditMensaje('');
    if (destino === 'editar') {
      setEditFecha(r.fecha.split('T')[0]);
      setEditHoraInicio(r.hora_inicio.substring(0, 5));
      setEditHoraFin(r.hora_fin.substring(0, 5));
      setEditEspacioId(r.espacio_id ? String(r.espacio_id) : '');
      setEditTitulo(r.evento_titulo ?? '');
      setEditDescripcion(r.evento_descripcion ?? '');
      setEditCantidad(r.cantidad_personas == null ? '' : String(r.cantidad_personas));
      setEditPublico(Boolean(r.evento_publico));
      datosPersistidos.current = JSON.stringify({
        fecha: r.fecha.split('T')[0], hora_inicio: r.hora_inicio.substring(0, 5),
        hora_fin: r.hora_fin.substring(0, 5), espacio_id: Number(r.espacio_id),
        titulo: r.evento_titulo ?? '', descripcion: r.evento_descripcion ?? '',
        ...(r.cantidad_personas != null ? { cantidad_personas: r.cantidad_personas } : {}),
      });
    }
  };

  const cerrar = () => {
    if (editLoading || accionOcupado || reabriendo) return;
    setActiva(null);
    setVista('detalle');
    setAccionConfirmar(null);
    setEditMensaje('');
  };

  const volver = () => {
    if (editLoading || accionOcupado || reabriendo) return;
    setVista('detalle');
    setAccionConfirmar(null);
    setEditMensaje('');
  };

  /** Marca la fila con un destello breve al cerrar la tarjeta tras aplicar un cambio,
   * para que no se pierda de vista en la tabla al volver. */
  const marcarExito = (reservaId: number) => {
    setResaltarId(reservaId);
    window.setTimeout(() => setResaltarId(prev => (prev === reservaId ? null : prev)), 2600);
  };

  const aprobar = async () => {
    if (!activa) return;
    try {
      await cambiarEstado(activa.id, ESTADOS_RESERVA.CONFIRMADA);
      marcarExito(activa.id);
      cerrar();
    } catch {
      // El aviso de error ya se mostró en cambiarEstado; se deja la tarjeta abierta para reintentar.
    }
  };

  const pedirConfirmacion = (accion: AccionConfirmar['accion']) => {
    setAccionConfirmar({ accion, estado: accion === 'cancelar' ? ESTADOS_RESERVA.CANCELADA : ESTADOS_RESERVA.RECHAZADA });
    setVista('confirmar');
  };

  const confirmarAccion = async () => {
    if (!activa || !accionConfirmar || accionOcupado) return;
    setAccionOcupado(true);
    try {
      await cambiarEstado(activa.id, accionConfirmar.estado);
      marcarExito(activa.id);
      cerrar();
    } catch {
      // El aviso de error ya se mostró en cambiarEstado; se deja la confirmación abierta para reintentar.
    } finally {
      setAccionOcupado(false);
    }
  };

  const reabrirSolicitud = async () => {
    if (!activa || reabriendo) return;
    setReabriendo(true);
    try {
      await cambiarEstado(activa.id, ESTADOS_RESERVA.PENDIENTE);
      marcarExito(activa.id);
      cerrar();
    } catch {
      // El aviso de error ya se mostró en cambiarEstado; se deja la tarjeta abierta para reintentar.
    } finally {
      setReabriendo(false);
    }
  };

  const guardarEdicion = async () => {
    if (!activa || editLoading) return;
    if (!editFecha || !editHoraInicio || !editHoraFin || !editEspacioId || !editTitulo || !editDescripcion) {
      setEditMensaje('Por favor completa todos los campos.');
      return;
    }
    if (editHoraInicio >= editHoraFin) {
      setEditMensaje('La hora de inicio debe ser menor que la hora de fin.');
      return;
    }
    if (editCantidad || activa.cantidad_personas != null) {
      const errorCantidad = errorAforo(editCantidad, espacios.find(e => String(e.id) === editEspacioId)?.capacidad);
      if (errorCantidad) { setEditMensaje(errorCantidad); return; }
    }
    setEditLoading(true);
    setEditMensaje('');
    let datosGuardados = false;
    try {
      const datos = {
        fecha: editFecha,
        hora_inicio: editHoraInicio,
        hora_fin: editHoraFin,
        espacio_id: Number(editEspacioId),
        titulo: editTitulo,
        descripcion: editDescripcion,
        ...(editCantidad ? { cantidad_personas: Number(editCantidad) } : {}),
      };
      if (JSON.stringify(datos) !== datosPersistidos.current) {
        await apiClient.put(`/api/reservas/${activa.id}`, datos);
        datosPersistidos.current = JSON.stringify(datos);
        datosGuardados = true;
      }
      if (esAdminOSacerdote && activa.evento_id && editPublico !== Boolean(activa.evento_publico)) {
        await apiClient.patch(`/api/eventos/${activa.evento_id}/publico`, { publico: editPublico });
      }
      marcarExito(activa.id);
      cerrar();
      fetchReservas();
    } catch (err: unknown) {
      setEditMensaje(datosGuardados
        ? 'Los datos se guardaron y la reserva quedó pendiente, pero la visibilidad no pudo confirmarse. Reintenta guardar.'
        : getApiErrorMessage(err, 'Error al guardar los cambios.', 'message'));
    } finally {
      setEditLoading(false);
    }
  };

  const campos = (r: Reserva) => [
    { etiqueta: 'Actividad', valor: r.evento_titulo ?? 'Sin título' },
    { etiqueta: 'Descripción', valor: r.evento_descripcion ?? 'Sin descripción' },
    { etiqueta: 'Espacio', valor: r.espacio_nombre ?? 'Sin espacio' },
    { etiqueta: 'Fecha', valor: formatFecha(r.fecha) },
    { etiqueta: 'Horario', valor: formatHorario(r.hora_inicio, r.hora_fin) },
    { etiqueta: 'Solicitante', valor: r.solicitante_nombre ?? 'No disponible' },
    { etiqueta: 'Personas esperadas', valor: r.cantidad_personas ?? 'No registrado' },
    { etiqueta: 'Estado actual', valor: <ReservaEstadoBadge estadoId={r.estado_reserva_id} /> },
  ];

  const tituloModal = !activa ? '' : vista === 'editar' ? `Editar Reserva #${activa.id}`
    : vista === 'confirmar' ? (accionConfirmar?.accion === 'cancelar' ? 'Cancelar reserva' : 'Rechazar reserva')
    : `Detalle de reserva #${activa.id}`;

  return (
    <div>
      <CardHead title="Lista de Reservas" hint={!cargaInicial ? `${reservasBase.length} registradas` : undefined} />

      {esAdminOSacerdote && !cargaInicial && (
        <div className={styles.tabs}>
          <Btn kind={pestana === 'todas' ? 'primary' : 'ghost'} size="sm" onClick={() => cambiarPestana('todas')}>
            Todas
          </Btn>
          <Btn kind={pestana === 'pendientes' ? 'primary' : 'ghost'} size="sm" onClick={() => cambiarPestana('pendientes')}>
            Pendientes de aprobación ({reservasPendientes.length})
          </Btn>
        </div>
      )}

      {!cargaInicial && !error && <TableFilters {...filtros.controls} label="Filtros de reservas" />}

      {activa && (
        <Modal open title={tituloModal} width={vista === 'detalle' ? 640 : 520}
          closeDisabled={editLoading || accionOcupado || reabriendo}
          describedBy={vista === 'confirmar' ? `${id}-confirmacion` : undefined}
          initialFocusSelector={vista === 'confirmar' ? '[data-confirm-cancel]' : undefined}
          returnLabel={vista === 'detalle' ? 'Volver a reservas' : undefined}
          onBack={vista !== 'detalle' ? volver : undefined}
          onClose={cerrar}>
          {vista === 'detalle' && (
            <DecisionesPanel endpoint={`/api/reservas/${activa.id}/decisiones`} campos={campos(activa)} acciones={<>
              {esAdminOSacerdote && activa.estado_reserva_id === ESTADOS_RESERVA.PENDIENTE && (
                <Btn kind="ok" onClick={() => { void aprobar(); }}>Aprobar</Btn>
              )}
              {esAdminOSacerdote
                && (activa.estado_reserva_id === ESTADOS_RESERVA.PENDIENTE || activa.estado_reserva_id === ESTADOS_RESERVA.CONFIRMADA)
                && usuario?.id !== activa.solicitante_id && (
                <Btn kind="bad" onClick={() => pedirConfirmacion('rechazar')}>Rechazar</Btn>
              )}
              {usuario && activa.solicitante_id === usuario.id && puedeCancelarReserva(activa.estado_reserva_id) && (
                <Btn kind="bad" onClick={() => pedirConfirmacion('cancelar')}>Cancelar reserva</Btn>
              )}
              {usuario && (esAdminOSacerdote || activa.solicitante_id === usuario.id) && (
                <Btn kind="ghost" onClick={() => abrir(activa, 'editar')}>Editar</Btn>
              )}
            </>} />
          )}

          {vista === 'confirmar' && accionConfirmar && (
            <ConfirmDialogContent
              descriptionId={`${id}-confirmacion`}
              confirmLabel={accionConfirmar.accion === 'cancelar' ? 'Cancelar reserva' : 'Rechazar reserva'}
              busy={accionOcupado}
              onConfirm={confirmarAccion}
              onCancel={volver}
              description={accionConfirmar.accion === 'cancelar'
                ? `¿Cancelar la reserva de ${activa.evento_titulo ?? activa.espacio_nombre} del ${formatFecha(activa.fecha)}? Se liberará el espacio reservado.`
                : activa.estado_reserva_id === ESTADOS_RESERVA.CONFIRMADA
                  ? `¿Rechazar la reserva ya aprobada de ${activa.solicitante_nombre ?? 'esta persona'} para ${activa.evento_titulo ?? activa.espacio_nombre}? Se liberará el espacio reservado.`
                  : `¿Rechazar la solicitud de ${activa.solicitante_nombre ?? 'esta persona'} para ${activa.evento_titulo ?? activa.espacio_nombre}?`}
            />
          )}

          {vista === 'editar' && (<>
            {esAdminOSacerdote
              && (activa.estado_reserva_id === ESTADOS_RESERVA.RECHAZADA || activa.estado_reserva_id === ESTADOS_RESERVA.CANCELADA) && (
              <div className={styles.avisoReabrir}>
                <span>Esta solicitud {activa.estado_reserva_id === ESTADOS_RESERVA.RECHAZADA ? 'fue rechazada' : 'fue cancelada'}.</span>
                <Btn type="button" kind="ghost" size="sm" disabled={reabriendo} onClick={() => { void reabrirSolicitud(); }}>
                  {reabriendo ? 'Reabriendo...' : 'Reabrir solicitud'}
                </Btn>
              </div>
            )}

            {activa.estado_reserva_id !== ESTADOS_RESERVA.PENDIENTE && (
              <div className={formStyles.modalWarning}>
                Si modificas los datos de la reserva, volverá a estado <strong>Pendiente</strong> para re-aprobación. Cambiar solo la visibilidad pública conserva su estado.
              </div>
            )}

            {editMensaje && (
              <p className={`${formStyles.message} ${formStyles.messageError}`}>{editMensaje}</p>
            )}

            <fieldset className={formStyles.form} disabled={editLoading} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <div className={formStyles.field}>
                <label htmlFor="editar-reserva-espacio" className={`${formStyles.label} ${formStyles.required}`}>Espacio:</label>
                <select id="editar-reserva-espacio" className={formStyles.input} value={editEspacioId} onChange={e => setEditEspacioId(e.target.value)}>
                  <option value="">-- Selecciona un espacio --</option>
                  {espacios.map(esp => (
                    <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                  ))}
                </select>
              </div>

              <AforoField value={editCantidad} onChange={setEditCantidad} capacidad={espacios.find(e => String(e.id) === editEspacioId)?.capacidad} required={activa.cantidad_personas != null} />
              <div className={formStyles.field}>
                <label htmlFor="editar-reserva-fecha" className={`${formStyles.label} ${formStyles.required}`}>Fecha:</label>
                <input id="editar-reserva-fecha" type="date" className={formStyles.input} value={editFecha} onChange={e => setEditFecha(e.target.value)} />
              </div>
              <div className={formStyles.fieldRow}>
                <div className={formStyles.field}>
                  <label htmlFor="editar-reserva-inicio" className={`${formStyles.label} ${formStyles.required}`}>Hora de Inicio:</label>
                  <input id="editar-reserva-inicio" type="time" className={formStyles.input} value={editHoraInicio} onChange={e => setEditHoraInicio(e.target.value)} />
                </div>
                <div className={formStyles.field}>
                  <label htmlFor="editar-reserva-fin" className={`${formStyles.label} ${formStyles.required}`}>Hora de Fin:</label>
                  <input id="editar-reserva-fin" type="time" className={formStyles.input} value={editHoraFin} onChange={e => setEditHoraFin(e.target.value)} />
                </div>
              </div>

              <div className={formStyles.field}>
                <label htmlFor="editar-reserva-titulo" className={`${formStyles.label} ${formStyles.required}`}>Título del Evento:</label>
                <input id="editar-reserva-titulo" type="text" className={formStyles.input} value={editTitulo} onChange={e => setEditTitulo(e.target.value)} />
              </div>

              <div className={formStyles.field}>
                <label htmlFor="editar-reserva-descripcion" className={`${formStyles.label} ${formStyles.required}`}>Descripción del Evento:</label>
                <input id="editar-reserva-descripcion" type="text" className={formStyles.input} value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)} />
              </div>
              {esAdminOSacerdote && activa.evento_id && (
                <div className={formStyles.field}>
                  <label className={formStyles.checkboxLabel}>
                    <input type="checkbox" checked={editPublico} onChange={e => setEditPublico(e.target.checked)} />
                    Mostrar en la agenda pública
                  </label>
                  <p className={formStyles.fieldNote}>Aparecerá si la reserva está aprobada y el evento no ha terminado. Al desmarcar y guardar, dejará de mostrarse.</p>
                </div>
              )}
            </fieldset>

            <div className={formStyles.modalActions}>
              <button className={formStyles.btnSecondary} onClick={volver} disabled={editLoading}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={guardarEdicion} disabled={editLoading}>
                {editLoading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </>)}
        </Modal>
      )}

      {cargaInicial && <LoadingState variant="table" label="Cargando reservas..." />}
      {loading && cargada.current && <p role="status" className={formStyles.fieldNote}>Actualizando reservas…</p>}
      {error && <ErrorState message={error} onRetry={fetchReservas} />}

      {!cargaInicial && !error && reservas.length === 0 && (
        <EmptyState message="No hay reservas registradas." action={<a className="btn-primary" href="/reservas?nueva=1">Solicitar primera reserva</a>} />
      )}

      {!cargaInicial && !error && reservas.length > 0 && reservasBase.length === 0 && (
        <EmptyState message="No hay solicitudes pendientes de aprobación." />
      )}

      {!cargaInicial && reservasBase.length > 0 && (
        <div className="table-container">
          <table className="styled-table">
            <thead>
              <tr>
                <SortableTh label="#" sortKey="id" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Espacio" sortKey="espacio" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Fecha" sortKey="fecha" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Hora Inicio" sortKey="inicio" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Hora Fin" sortKey="fin" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Título del Evento" sortKey="titulo" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Descripción" sortKey="descripcion" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Registrado por" sortKey="solicitante" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Estado" sortKey="estado" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Personas esperadas" sortKey="aforo" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {reservasOrdenadas.map((r) => (
                <tr key={r.id}
                  className={`${styles.fila}${r.estado_reserva_id === ESTADOS_RESERVA.PENDIENTE ? ` ${styles.filaPendiente}` : ''}${r.id === resaltarId ? ` ${styles.filaResaltada}` : ''}`}
                  onClick={manejarClicFila(() => abrir(r))}>
                  <td><button type="button" className={styles.enlace} onClick={() => abrir(r)}>{r.id}</button></td>
                  <td>{r.espacio_nombre ?? '—'}</td>
                  <td>{formatFecha(r.fecha)}</td>
                  <td className={styles.horaCell}>{formatHora(r.hora_inicio)}</td>
                  <td className={styles.horaCell}>{formatHora(r.hora_fin)}</td>
                  <td>{r.evento_titulo ?? '—'}</td>
                  <td>{r.evento_descripcion ?? '—'}</td>
                  <td>{r.solicitante_nombre ?? '—'}</td>
                  <td>
                    <ReservaEstadoBadge estadoId={r.estado_reserva_id} />
                  </td>
                  <td>{r.cantidad_personas ?? 'No registrado'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
