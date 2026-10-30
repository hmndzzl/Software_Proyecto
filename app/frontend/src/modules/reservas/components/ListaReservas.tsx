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
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { ConfirmDialogContent } from '../../../components/ui/ConfirmDialog';
import SortableTh from '../../../components/ui/SortableTh';
import TableFilters from '../../../components/ui/TableFilters';
import { useTableFilters } from '../../../hooks/useTableFilters';
import { useSortableTable } from '../../../hooks/useSortableTable';
import { useAuth } from '../../../context/AuthContext';
import { ROLES } from '../../../utils/roles';
import { ESTADOS_RESERVA, avisoCambioEstadoReserva, etiquetaEstadoReserva, puedeCancelarReserva } from '../../../utils/estadosReserva';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatFecha, formatHora } from '../../../utils/date';
import type { Espacio } from '../../espacios/components/EspacioCard';
import type { Reserva } from '../../../types';
import styles from './ListaReservas.module.css';
import formStyles from '../../../styles/Form.module.css';
import AforoField, { errorAforo } from '../../../components/ui/AforoField';
import DetalleReserva from './DetalleReserva';

type SortKey = 'id' | 'espacio' | 'fecha' | 'estado' | 'solicitante' | 'inicio' | 'fin' | 'titulo' | 'descripcion' | 'aforo';

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
  const confirmacionId = useId();
  const [estadoPorConfirmar, setEstadoPorConfirmar] = useState<{ reserva: Reserva; estado: number; accion: string } | null>(null);
  const [confirmandoCancelacion, setConfirmandoCancelacion] = useState(false);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [loading, setLoading] = useState(true);
  const cargada = useRef(false);
  const cargaInicial = loading && !cargada.current;
  const [error, setError] = useState('');

  const [editando, setEditando] = useState<Reserva | null>(null);
  const [detalle, setDetalle] = useState<Reserva | null>(null);
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

  const filtros = useTableFilters(reservas, {
    persistenceKey: 'reservas',
    search: r => [r.id, r.espacio_nombre, r.evento_titulo, r.evento_descripcion, r.solicitante_nombre],
    date: r => r.fecha,
    selects: [
      { key: 'estado', label: 'Estado', value: r => etiquetaEstadoReserva(r.estado_reserva_id) || 'Desconocido' },
      { key: 'espacio', label: 'Espacio', value: r => r.espacio_nombre ?? 'Sin espacio' },
    ],
  });
  const { sortKey, sortDir, toggleSort, sortedData: reservasOrdenadas } = useSortableTable(filtros.filteredData, SORT_VALUE);

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

  const cambiarEstado = async (id: number, nuevoEstado: number) => {
    try {
      await apiClient.put(`/api/reservas/${id}/estado`, { estado_id: nuevoEstado });
      const aviso = avisoCambioEstadoReserva(nuevoEstado);
      toast.success(aviso.titulo, aviso.mensaje);
      fetchReservas();
    } catch (err: unknown) {
      toast.error('No se pudo actualizar la reserva', getApiErrorMessage(err, 'Error al cambiar el estado de la reserva.', 'message'));
      throw err;
    }
  };

  const confirmarCambioEstado = async () => {
    if (!estadoPorConfirmar) return;
    await cambiarEstado(estadoPorConfirmar.reserva.id, estadoPorConfirmar.estado);
    setEstadoPorConfirmar(null);
  };

  const abrirEdicion = (r: Reserva) => {
    setEditando(r);
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
    setEditMensaje('');
  };

  const cerrarEdicion = () => {
    setConfirmandoCancelacion(false);
    setEditando(null);
    setEditMensaje('');
  };

  const cancelarReservaDesdeEdicion = async () => {
    if (!editando || editLoading) return;
    setEditLoading(true);
    setEditMensaje('');
    try {
      await apiClient.put(`/api/reservas/${editando.id}/estado`, { estado_id: ESTADOS_RESERVA.CANCELADA });
      cerrarEdicion();
      fetchReservas();
    } catch (err: unknown) {
      setEditMensaje(getApiErrorMessage(err, 'Error al cancelar la reserva.', 'message'));
    } finally {
      setEditLoading(false);
    }
  };

  const guardarEdicion = async () => {
    if (!editando || editLoading) return;
    if (!editFecha || !editHoraInicio || !editHoraFin || !editEspacioId || !editTitulo || !editDescripcion) {
      setEditMensaje('Por favor completa todos los campos.');
      return;
    }
    if (editHoraInicio >= editHoraFin) {
      setEditMensaje('La hora de inicio debe ser menor que la hora de fin.');
      return;
    }
    if (editCantidad || editando.cantidad_personas != null) {
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
        await apiClient.put(`/api/reservas/${editando.id}`, datos);
        datosPersistidos.current = JSON.stringify(datos);
        datosGuardados = true;
      }
      if (esAdminOSacerdote && editando.evento_id && editPublico !== Boolean(editando.evento_publico)) {
        await apiClient.patch(`/api/eventos/${editando.evento_id}/publico`, { publico: editPublico });
      }
      cerrarEdicion();
      fetchReservas();
    } catch (err: unknown) {
      setEditMensaje(datosGuardados
        ? 'Los datos se guardaron y la reserva quedó pendiente, pero la visibilidad no pudo confirmarse. Reintenta guardar.'
        : getApiErrorMessage(err, 'Error al guardar los cambios.', 'message'));
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div>
      <CardHead title="Lista de Reservas" hint={!cargaInicial ? `${reservas.length} registradas` : undefined} />
      {!cargaInicial && !error && <TableFilters {...filtros.controls} label="Filtros de reservas" />}

      {detalle && <DetalleReserva reserva={detalle} onClose={() => setDetalle(null)} />}
      {editando && (
        <Modal open title={confirmandoCancelacion ? 'Cancelar reserva' : `Editar Reserva #${editando.id}`}
          closeDisabled={editLoading} describedBy={confirmandoCancelacion ? confirmacionId : undefined}
          initialFocusSelector={confirmandoCancelacion ? '[data-confirm-cancel]' : undefined}
          onClose={() => { if (!editLoading) { if (confirmandoCancelacion) { setConfirmandoCancelacion(false); setEditMensaje(''); } else cerrarEdicion(); } }}>
          {confirmandoCancelacion ? <>
            <ConfirmDialogContent descriptionId={confirmacionId} confirmLabel="Cancelar reserva" busy={editLoading}
              description="¿Estás seguro de que deseas cancelar esta reserva? Se liberará el espacio reservado."
              onConfirm={cancelarReservaDesdeEdicion} onCancel={() => { setConfirmandoCancelacion(false); setEditMensaje(''); }} />
            {editMensaje && <p role="alert" className={`${formStyles.message} ${formStyles.messageError}`}>{editMensaje}</p>}
          </> : <>

            {editando.estado_reserva_id !== ESTADOS_RESERVA.PENDIENTE && (
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

              <AforoField value={editCantidad} onChange={setEditCantidad} capacidad={espacios.find(e => String(e.id) === editEspacioId)?.capacidad} required={editando.cantidad_personas != null} />
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
              {esAdminOSacerdote && editando.evento_id && (
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
              {usuario && editando.solicitante_id === usuario.id && puedeCancelarReserva(editando.estado_reserva_id) && (
                <button
                  type="button"
                  className={`${formStyles.btnDanger} ${styles.btnCancelarReservaModal}`}
                  onClick={() => { setEditMensaje(''); setConfirmandoCancelacion(true); }}
                  disabled={editLoading}
                >
                  Cancelar Reserva
                </button>
              )}
              <button className={formStyles.btnSecondary} onClick={cerrarEdicion} disabled={editLoading}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={guardarEdicion} disabled={editLoading}>
                {editLoading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </>}
        </Modal>
      )}

      {cargaInicial && <LoadingState variant="table" label="Cargando reservas..." />}
      {loading && cargada.current && <p role="status" className={formStyles.fieldNote}>Actualizando reservas…</p>}
      {error && <ErrorState message={error} onRetry={fetchReservas} />}

      {!cargaInicial && !error && reservas.length === 0 && (
        <EmptyState message="No hay reservas registradas." action={<a className="btn-primary" href="/reservas?nueva=1">Solicitar primera reserva</a>} />
      )}

      {!cargaInicial && reservas.length > 0 && (
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reservasOrdenadas.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
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
                  <td>
                    <div className={styles.acciones}>
                      <Btn kind="ghost" size="sm" onClick={() => setDetalle(r)}>Ver detalle</Btn>
                      {esAdminOSacerdote && r.estado_reserva_id === ESTADOS_RESERVA.PENDIENTE && (
                        <>
                          <Btn kind="ok" size="sm" onClick={() => { void cambiarEstado(r.id, ESTADOS_RESERVA.CONFIRMADA).catch(() => {}); }}>
                            Aprobar
                          </Btn>
                          {usuario && r.solicitante_id === usuario.id ? (
                            <Btn kind="bad" size="sm" onClick={() => setEstadoPorConfirmar({ reserva: r, estado: ESTADOS_RESERVA.CANCELADA, accion: 'cancelar' })}>
                              Cancelar
                            </Btn>
                          ) : (
                            <Btn kind="bad" size="sm" onClick={() => setEstadoPorConfirmar({ reserva: r, estado: ESTADOS_RESERVA.RECHAZADA, accion: 'rechazar' })}>
                              Rechazar
                            </Btn>
                          )}
                        </>
                      )}
                      {usuario && (esAdminOSacerdote || r.solicitante_id === usuario.id) && (
                        <Btn kind="ghost" size="sm" onClick={() => abrirEdicion(r)}>
                          Editar
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog open={estadoPorConfirmar !== null}
        title={estadoPorConfirmar?.accion === 'cancelar' ? 'Cancelar reserva' : 'Rechazar reserva'}
        confirmLabel={estadoPorConfirmar?.accion === 'cancelar' ? 'Cancelar reserva' : 'Rechazar reserva'}
        description={estadoPorConfirmar?.accion === 'cancelar'
          ? `¿Cancelar la reserva de ${estadoPorConfirmar.reserva.evento_titulo ?? estadoPorConfirmar.reserva.espacio_nombre} del ${formatFecha(estadoPorConfirmar.reserva.fecha)}? Se liberará el espacio reservado.`
          : `¿Rechazar la solicitud de ${estadoPorConfirmar?.reserva.solicitante_nombre ?? 'esta persona'} para ${estadoPorConfirmar?.reserva.evento_titulo ?? estadoPorConfirmar?.reserva.espacio_nombre}?`}
        onCancel={() => setEstadoPorConfirmar(null)} onConfirm={confirmarCambioEstado} />
    </div>
  );
}
