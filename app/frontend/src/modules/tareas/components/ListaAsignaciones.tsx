import { useId, useState, useEffect, useRef } from 'react';
import apiClient from '../../../api/client';
import { useToast } from '../../../context/ToastContext';
import Btn from '../../../components/ui/Btn';
import { CardHead, CardBody } from '../../../components/ui/Card';
import Modal from '../../../components/ui/Modal';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import SortableTh from '../../../components/ui/SortableTh';
import TableFilters from '../../../components/ui/TableFilters';
import { normalizarBusqueda, useTableFilters } from '../../../hooks/useTableFilters';
import { useSortableTable } from '../../../hooks/useSortableTable';
import { useAuth } from '../../../context/AuthContext';
import { ROLES, rolTieneAcceso } from '../../../utils/roles';
import { formatFecha, formatHorario } from '../../../utils/date';
import type { Ministro, Tarea, AsignadoInfo } from '../../../types';
import { getApiErrorMessage } from '../../../utils/apiError';
import styles from './ListaAsignaciones.module.css';
import form from '../../../styles/Form.module.css';
import EventoTareaSelect from './EventoTareaSelect';
import SelectorMinistros from './SelectorMinistros';
import ResumenMinistros from './ResumenMinistros';

type Vista = 'detalle' | 'editar' | 'ministros' | 'eliminar' | 'quitar';
interface AlertaAsignacion {
  persona_id?: number;
  ministro_no_disponible?: boolean;
  tope_servicios_superado?: boolean;
  servicios_en_el_mes?: number;
  tope_servicios_mes?: number;
}
type SortKey = 'tarea' | 'responsable' | 'fecha' | 'horario';
const SORT_VALUE: Record<SortKey, (tarea: Tarea) => string> = {
  tarea: tarea => tarea.titulo.toLowerCase(),
  responsable: tarea => tarea.asignados.map(a => a.nombre).sort().join(', ').toLowerCase(),
  fecha: tarea => `${tarea.fecha} ${tarea.hora_inicio}`,
  horario: tarea => tarea.hora_inicio,
};
const POR_PAGINA = 10;

export default function ListaAsignaciones({ refreshKey, onCambio }: { refreshKey?: number; onCambio?: () => void }) {
  const id = useId();
  const { usuario } = useAuth();
  const toast = useToast();
  const esMinistro = usuario?.rol_id === ROLES.MINISTRO;
  const puedeGestionar = rolTieneAcceso(usuario?.rol_id, [ROLES.COORDINADOR_MINISTROS]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ministros, setMinistros] = useState<Ministro[]>([]);
  const [errorMinistros, setErrorMinistros] = useState(false);
  const [cargandoMinistros, setCargandoMinistros] = useState(false);
  const [revisionMinistros, setRevisionMinistros] = useState(0);
  const [activaId, setActivaId] = useState<number | null>(null);
  const [vista, setVista] = useState<Vista>('detalle');
  const [ocupado, setOcupado] = useState(false);
  const [porQuitar, setPorQuitar] = useState<AsignadoInfo | null>(null);
  const [reemplazando, setReemplazando] = useState<number | null>(null);
  const [nuevos, setNuevos] = useState<number[]>([]);
  const [busquedaAsignados, setBusquedaAsignados] = useState('');
  const [edicion, setEdicion] = useState({ titulo: '', descripcion: '', fecha: '', hora_inicio: '', hora_fin: '', evento_id: null as number | null });
  const [pagina, setPagina] = useState(1);
  const contenido = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activaId !== null) contenido.current?.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled), button:not(:disabled)')?.focus();
  }, [vista, activaId]);
  const activa = tareas.find(t => t.id === activaId);
  const asignadosVisibles = activa?.asignados.filter(a => normalizarBusqueda(a.nombre).includes(normalizarBusqueda(busquedaAsignados))) ?? [];
  const puedeGestionarMinistro = (personaId: number) => puedeGestionar && !cargandoMinistros && !errorMinistros
    && (usuario?.rol_id !== ROLES.COORDINADOR_MINISTROS || ministros.some(m => m.id === personaId));
  const puedeEditar = (tarea: Tarea) => puedeGestionar && (usuario?.rol_id !== ROLES.COORDINADOR_MINISTROS
    || tarea.asignados.some(a => puedeGestionarMinistro(a.persona_id)));

  const filtros = useTableFilters(tareas, {
    search: tarea => [tarea.id, tarea.titulo, tarea.descripcion, ...tarea.asignados.map(a => a.nombre)],
    date: tarea => tarea.fecha,
    selects: esMinistro ? [] : [
      { key: 'ministro', label: 'Ministro', value: tarea => tarea.asignados.map(a => a.nombre) },
      { key: 'asignacion', label: 'Asignación', value: tarea => tarea.asignados.length ? 'Con ministro' : 'Sin ministro' },
    ],
  });
  const { sortKey, sortDir, toggleSort, sortedData } = useSortableTable(filtros.filteredData, SORT_VALUE);
  const claveFiltros = JSON.stringify([filtros.controls.query, filtros.controls.from, filtros.controls.to,
    filtros.controls.selects.map(select => select.value), sortKey, sortDir]);
  useEffect(() => { setPagina(1); }, [claveFiltros]);
  const paginas = Math.max(1, Math.ceil(sortedData.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas);
  const visibles = sortedData.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);

  useEffect(() => {
    if (!puedeGestionar) return;
    let vigente = true;
    setCargandoMinistros(true);
    setErrorMinistros(false);
    apiClient.get<Ministro[]>('/api/personas').then(res => { if (vigente) setMinistros(res.data); })
      .catch(() => { if (vigente) { setMinistros([]); setErrorMinistros(true); } })
      .finally(() => { if (vigente) setCargandoMinistros(false); });
    return () => { vigente = false; };
  }, [puedeGestionar, refreshKey, revisionMinistros]);

  const cargar = async () => {
    setCargando(true); setError('');
    try {
      const params = esMinistro && usuario ? { persona_id: usuario.id } : undefined;
      const res = await apiClient.get<Tarea[]>('/api/tareas', { params });
      setTareas(res.data);
    } catch { setError('Error al obtener los datos'); }
    finally { setCargando(false); }
  };
  useEffect(() => { void cargar(); }, [refreshKey, usuario?.id, esMinistro]);
  const refrescar = () => { if (onCambio) onCambio(); else void cargar(); };
  const abrir = (tarea: Tarea, destino: Vista = 'detalle') => {
    setActivaId(tarea.id); setVista(destino); setReemplazando(null); setNuevos([]);
    setBusquedaAsignados('');
    if (destino === 'editar') setEdicion({ titulo: tarea.titulo, descripcion: tarea.descripcion,
      fecha: tarea.fecha.slice(0, 10), hora_inicio: tarea.hora_inicio.slice(0, 5), hora_fin: tarea.hora_fin.slice(0, 5), evento_id: tarea.evento_id ?? null });
  };
  const cerrar = () => { if (!ocupado) setActivaId(null); };
  const guardarEdicion = async () => {
    if (!activa || ocupado) return;
    if (!edicion.titulo.trim() || !edicion.descripcion.trim() || !edicion.fecha || !edicion.hora_inicio || !edicion.hora_fin) {
      toast.error('Faltan datos', 'Por favor completa todos los campos.'); return;
    }
    if (edicion.hora_inicio >= edicion.hora_fin) { toast.error('Horario inválido', 'La hora de inicio debe ser menor que la hora de fin.'); return; }
    setOcupado(true);
    try {
      await apiClient.put(`/api/tareas/${activa.id}`, edicion);
      setTareas(prev => prev.map(t => t.id === activa.id ? { ...t, ...edicion } : t));
      toast.success('Tarea actualizada', `Los cambios en "${edicion.titulo}" se guardaron.`);
      setVista('detalle'); refrescar();
    } catch (err) { toast.error('No se pudo actualizar la tarea', getApiErrorMessage(err, 'Error al guardar los cambios.')); }
    finally { setOcupado(false); }
  };
  const guardarMinistros = async () => {
    if (!activa || ocupado || !nuevos.length) return;
    setOcupado(true);
    try {
      const res = await apiClient.post<{ alertas?: AlertaAsignacion[] }>('/api/tareas/asignar', { tarea_id: activa.id, persona_ids: nuevos });
      const avisos = (res.data.alertas ?? []).flatMap(alerta => {
        const nombre = ministros.find(m => m.id === alerta.persona_id)?.nombre ?? 'Un ministro';
        return [alerta.ministro_no_disponible && `${nombre} está marcado como no disponible.`,
          alerta.tope_servicios_superado && `${nombre} tendría ${alerta.servicios_en_el_mes} servicios este mes (tope: ${alerta.tope_servicios_mes}).`].filter(Boolean);
      });
      setNuevos([]); toast.success('Ministros agregados', avisos.length ? avisos.join(' ') : 'Las asignaciones se guardaron correctamente.'); refrescar();
    } catch (err) { toast.error('No se pudo guardar la asignación', getApiErrorMessage(err, 'Error al asignar ministros.')); }
    finally { setOcupado(false); }
  };
  const reasignar = async (personaActualId: number, personaNuevaId: number) => {
    if (!activa || ocupado || personaActualId === personaNuevaId) return;
    setOcupado(true);
    try {
      const res = await apiClient.put<{ alerta?: AlertaAsignacion }>('/api/tareas/asignar', {
        tarea_id: activa.id, persona_actual_id: personaActualId, persona_nueva_id: personaNuevaId,
      });
      const alerta = res.data.alerta;
      const avisos = [alerta?.ministro_no_disponible && 'Está marcado como no disponible.',
        alerta?.tope_servicios_superado && `Tendría ${alerta.servicios_en_el_mes} servicios este mes (tope: ${alerta.tope_servicios_mes}).`].filter(Boolean);
      toast.success('Responsable actualizado', avisos.length ? avisos.join(' ') : 'El cambio se guardó correctamente.');
      setReemplazando(null); refrescar();
    } catch (err) { toast.error('No se pudo reasignar la tarea', getApiErrorMessage(err, 'Error al reasignar la tarea.')); }
    finally { setOcupado(false); }
  };
  const confirmarEliminacion = async () => {
    if (!activa || ocupado || (vista === 'quitar' && !porQuitar)) return;
    setOcupado(true);
    try {
      if (vista === 'quitar') {
        await apiClient.delete('/api/tareas/asignar', { data: { tarea_id: activa.id, persona_id: porQuitar!.persona_id } });
        setVista('ministros'); setPorQuitar(null);
        toast.success('Asignación eliminada', 'El ministro fue retirado de esta tarea.');
      } else {
        await apiClient.delete(`/api/tareas/${activa.id}`); setActivaId(null);
        toast.success('Tarea eliminada', 'La tarea se eliminó por completo.');
      }
      refrescar();
    } catch (err) { toast.error('No se pudo completar la acción', getApiErrorMessage(err, 'Error al eliminar. Inténtalo nuevamente.')); }
    finally { setOcupado(false); }
  };
  const tituloModal = activa ? vista === 'editar' ? `Editar Tarea #${activa.id}` : vista === 'ministros' ? `Ministros de ${activa.titulo}`
    : vista === 'eliminar' ? 'Eliminar tarea' : vista === 'quitar' ? 'Quitar ministro' : activa.titulo : '';

  return <>
    <CardHead title={esMinistro ? 'Mis Tareas' : 'Asignaciones Actuales'} />
    <CardBody>
      <TableFilters {...filtros.controls} label="Filtros de tareas" />
      {cargando ? <LoadingState label="Cargando asignaciones..." /> : error ? <ErrorState message={error} onRetry={cargar} />
        : !tareas.length ? <EmptyState message={esMinistro ? 'No tienes tareas asignadas en este momento.' : 'No hay tareas asignadas en este momento.'} />
        : <>
          <div className={`table-container ${styles.tabla}`}>
            <table className="styled-table">
              <thead><tr>
                <SortableTh label="Tarea" sortKey="tarea" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                {!esMinistro && <SortableTh label="Ministros asignados" sortKey="responsable" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />}
                <SortableTh label="Fecha" sortKey="fecha" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Horario" sortKey="horario" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                {puedeGestionar && <th>Acciones</th>}
              </tr></thead>
              <tbody>{visibles.map(tarea => <tr key={tarea.id} className={styles.fila} onClick={event => {
                if ((event.target as HTMLElement).closest('button, input, select, summary, details')) return;
                event.currentTarget.querySelector<HTMLButtonElement>('[data-detalle]')?.focus(); abrir(tarea);
              }}>
                <td><button type="button" data-detalle className={styles.enlace} onClick={() => abrir(tarea)}>{tarea.titulo}</button></td>
                {!esMinistro && <td><ResumenMinistros asignados={tarea.asignados} tarea={tarea.titulo} onVer={() => abrir(tarea)} /></td>}
                <td>{formatFecha(tarea.fecha)}</td><td>{formatHorario(tarea.hora_inicio, tarea.hora_fin)}</td>
                {puedeGestionar && <td><div className={styles.acciones}>
                  {puedeEditar(tarea) && <Btn type="button" kind="ghost" size="sm" onClick={() => abrir(tarea, 'editar')}>Editar</Btn>}
                  <Btn type="button" kind="ghost" size="sm" onClick={() => abrir(tarea, 'ministros')}>Gestionar ministros</Btn>
                  {puedeEditar(tarea) && <details><summary>Más opciones</summary>
                    <Btn type="button" kind="bad" size="sm" onClick={() => abrir(tarea, 'eliminar')}>Eliminar tarea</Btn>
                  </details>}
                </div></td>}
              </tr>)}</tbody>
            </table>
          </div>
          <nav className={styles.paginacion} aria-label="Paginación de tareas">
            <Btn type="button" kind="ghost" size="sm" disabled={actual === 1} onClick={() => setPagina(actual - 1)}>Anterior</Btn>
            <span aria-live="polite">Página {actual} de {paginas} · {sortedData.length} {sortedData.length === 1 ? 'tarea' : 'tareas'}</span>
            <Btn type="button" kind="ghost" size="sm" disabled={actual === paginas} onClick={() => setPagina(actual + 1)}>Siguiente</Btn>
          </nav>
        </>}
    </CardBody>
    <Modal open={Boolean(activa)} title={tituloModal} onClose={cerrar} width={720}
      onBack={vista !== 'detalle' ? () => { if (!ocupado) { setVista(vista === 'quitar' ? 'ministros' : 'detalle'); setReemplazando(null); } } : undefined}>
      {activa && <div ref={contenido} className={styles.detalle}>
        {vista === 'detalle' && <>
          <dl className={styles.datos}>
            <div><dt>Descripción</dt><dd>{activa.descripcion}</dd></div>
            <div><dt>Fecha</dt><dd>{formatFecha(activa.fecha)}</dd></div>
            <div><dt>Horario</dt><dd>{formatHorario(activa.hora_inicio, activa.hora_fin)}</dd></div>
          </dl>
          <h3>Ministros asignados ({activa.asignados.length})</h3>
          {activa.asignados.length > 4 && <div className={form.field}>
            <label htmlFor={`${id}-buscar-asignados`} className={form.label}>Buscar ministro asignado</label>
            <input id={`${id}-buscar-asignados`} className={form.input} type="search" value={busquedaAsignados}
              placeholder="Buscar por nombre…" onChange={event => setBusquedaAsignados(event.target.value)} />
          </div>}
          {activa.asignados.length ? <>
            <ul className={styles.personas} aria-label="Ministros de la tarea">
              {asignadosVisibles.map(a => <li key={a.persona_id} className={styles.persona}>
                <span className={styles.avatar} aria-hidden="true">{a.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte[0]).join('')}</span>
                <span>{a.nombre}</span>
              </li>)}
            </ul>
            {!asignadosVisibles.length && <p role="status">No hay ministros asignados que coincidan con la búsqueda.</p>}
          </> : <p>Sin ministro asignado</p>}
          {puedeGestionar && <div className={styles.accionesTarjeta}>
            {puedeEditar(activa) && <Btn type="button" kind="ghost" onClick={() => abrir(activa, 'editar')}>Editar tarea</Btn>}
            <Btn type="button" onClick={() => abrir(activa, 'ministros')}>Gestionar ministros</Btn>
            {puedeEditar(activa) && <Btn type="button" kind="bad" onClick={() => setVista('eliminar')}>Eliminar tarea</Btn>}
          </div>}
        </>}
        {vista === 'editar' && <form className={form.form} onSubmit={event => { event.preventDefault(); void guardarEdicion(); }}>
          <fieldset className={styles.campos} disabled={ocupado}>
            <EventoTareaSelect value={edicion.evento_id} disabled={ocupado} onChange={(evento_id, evento) => setEdicion(prev => ({ ...prev, evento_id, ...(evento ? { fecha: evento.fecha.slice(0, 10) } : {}) }))} />
            {(['titulo', 'descripcion', 'fecha', 'hora_inicio', 'hora_fin'] as const).map(campo => <div key={campo} className={form.field}>
              <label htmlFor={`${id}-${campo}`} className={`${form.label} ${form.required}`}>{({ titulo: 'Título:', descripcion: 'Descripción:', fecha: 'Fecha:', hora_inicio: 'Hora de Inicio:', hora_fin: 'Hora de Fin:' })[campo]}</label>
              <input id={`${id}-${campo}`} className={form.input} aria-required="true" type={campo === 'fecha' ? 'date' : campo.startsWith('hora_') ? 'time' : 'text'}
                value={edicion[campo]} onChange={event => setEdicion(prev => ({ ...prev, [campo]: event.target.value }))} />
            </div>)}
            <div className={styles.acciones}>
              <Btn type="button" kind="ghost" onClick={() => setVista('detalle')}>Cancelar</Btn>
              <Btn type="submit">{ocupado ? 'Guardando...' : 'Guardar cambios'}</Btn>
            </div>
          </fieldset>
        </form>}
        {vista === 'ministros' && <>
          {cargandoMinistros ? <LoadingState label="Cargando ministros..." /> : errorMinistros ? <ErrorState message="No se pudo cargar tu directorio de ministros." onRetry={() => setRevisionMinistros(n => n + 1)} /> : <>
            <div className={styles.lista}><ul>{activa.asignados.map(a => <li key={a.persona_id} className={styles.miembro}>
              <span>{a.nombre}</span>
              {puedeGestionarMinistro(a.persona_id) && <div className={styles.acciones}>
                {reemplazando === a.persona_id ? <div className={form.field}>
                  <label htmlFor={`${id}-reemplazo`}>Responsable de {activa.titulo}</label>
                  <select id={`${id}-reemplazo`} className={form.input} value={a.persona_id} disabled={ocupado} autoFocus
                    onChange={event => void reasignar(a.persona_id, Number(event.target.value))}>
                    {ministros.filter(m => m.id === a.persona_id || !activa.asignados.some(otro => otro.persona_id === m.id)).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                  <Btn type="button" kind="ghost" size="sm" disabled={ocupado} onClick={() => setReemplazando(null)}>Cancelar reemplazo</Btn>
                </div> : <Btn type="button" kind="ghost" size="sm" disabled={ocupado} title="Cambiar responsable" onClick={() => setReemplazando(a.persona_id)}>Reemplazar</Btn>}
                <Btn type="button" kind="ghost" size="sm" disabled={ocupado} aria-label={`Quitar a ${a.nombre}`}
                  onClick={() => { setPorQuitar(a); setVista('quitar'); }}>Quitar</Btn>
              </div>}
            </li>)}</ul></div>
            {!activa.asignados.length && <p>Sin ministro asignado. Puedes agregar ministros sin volver a crear la tarea.</p>}
            <SelectorMinistros key={activa.id} ministros={ministros} seleccionados={nuevos} yaAsignados={activa.asignados.map(a => a.persona_id)} onChange={setNuevos} disabled={ocupado} />
            <Btn type="button" disabled={ocupado || !nuevos.length} onClick={guardarMinistros}>{ocupado ? 'Guardando...' : 'Agregar seleccionados'}</Btn>
          </>}
        </>}
        {(vista === 'eliminar' || vista === 'quitar') && <>
          <p>{vista === 'quitar' ? `¿Quitar a ${porQuitar?.nombre} de la tarea "${activa.titulo}"? La tarea y los demás ministros se conservarán.`
            : `¿Eliminar la tarea "${activa.titulo}"? Se borrarán todas sus asignaciones y solicitudes de cambio de turno. Esta acción no se puede deshacer.`}</p>
          <div className={styles.acciones}>
            <Btn type="button" kind="ghost" disabled={ocupado} onClick={() => setVista(vista === 'quitar' ? 'ministros' : 'detalle')}>Cancelar</Btn>
            <Btn type="button" kind="bad" disabled={ocupado} onClick={confirmarEliminacion}>{ocupado ? 'Procesando...' : vista === 'quitar' ? 'Quitar ministro' : 'Eliminar tarea'}</Btn>
          </div>
        </>}
      </div>}
    </Modal>
  </>;
}
