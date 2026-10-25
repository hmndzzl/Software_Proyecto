import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import type { VistaCalendario } from '../../api/calendario';
import type { Ministro } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ROLES, rolTieneAcceso } from '../../utils/roles';
import PageHeader from '../../components/ui/PageHeader';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import CompromisosDia from './CompromisosDia';
import DetalleCompromiso from './DetalleCompromiso';
import CalendarioMes from './CalendarioMes';
import { claveDia, compromisosPorDia, diasSemana, diasMes, desplazarMes, fechaCompleta, type Compromiso } from './calendario.utils';
import { useCalendario } from './useCalendario';
import styles from './CalendarioPage.module.css';

export default function CalendarioPage() {
  const { usuario } = useAuth();
  const puedeCoordinar = rolTieneAcceso(usuario?.rol_id, [ROLES.COORDINADOR_MINISTROS]);
  const [fecha, setFecha] = useState(() => new Date());
  const [periodo, setPeriodo] = useState<'semana' | 'mes'>('semana');
  const [vista, setVista] = useState<VistaCalendario>(() => puedeCoordinar ? 'coordinacion' : 'personal');
  const [personaId, setPersonaId] = useState('');
  const [ministros, setMinistros] = useState<Ministro[]>([]);
  const [errorMinistros, setErrorMinistros] = useState(false);
  const [cargandoMinistros, setCargandoMinistros] = useState(puedeCoordinar);
  const [intentoMinistros, setIntentoMinistros] = useState(0);
  const [seleccion, setSeleccion] = useState<{ tipo: Compromiso['tipo']; id: number } | null>(null);
  const dias = periodo === 'semana' ? diasSemana(fecha) : diasMes(fecha);
  const inicio = claveDia(dias[0]);
  const fin = claveDia(dias[dias.length - 1]);
  const { datos, loading, error, reintentar } = useCalendario(inicio, fin, vista, personaId);
  const porDia = compromisosPorDia(datos);
  const hoy = claveDia(new Date());
  const item: Compromiso | undefined = seleccion?.tipo === 'evento'
    ? datos.eventos.filter(e => e.id === seleccion.id).map(dato => ({ tipo: 'evento' as const, dato }))[0]
    : seleccion?.tipo === 'tarea' ? datos.tareas.filter(t => t.id === seleccion.id).map(dato => ({ tipo: 'tarea' as const, dato }))[0] : undefined;

  useEffect(() => {
    if (!puedeCoordinar) return;
    let vigente = true;
    setCargandoMinistros(true);
    setErrorMinistros(false);
    apiClient.get<Ministro[]>('/api/personas').then(res => { if (vigente) setMinistros(res.data); })
      .catch(() => { if (vigente) setErrorMinistros(true); })
      .finally(() => { if (vigente) setCargandoMinistros(false); });
    return () => { vigente = false; };
  }, [puedeCoordinar, usuario?.id, intentoMinistros]);

  const seleccionar = (compromiso: Compromiso) => setSeleccion({ tipo: compromiso.tipo, id: compromiso.dato.id });
  const navegar = (cantidad: number) => {
    const siguiente = periodo === 'mes' ? desplazarMes(fecha, cantidad) : new Date(fecha);
    if (periodo === 'semana') siguiente.setDate(fecha.getDate() + cantidad * 7);
    setSeleccion(null);
    setFecha(siguiente);
  };
  const persona = ministros.find(m => String(m.id) === personaId);
  const resumen = vista === 'personal' ? 'Mis compromisos' : vista === 'parroquial' ? 'Eventos de la parroquia'
    : persona ? `Horario de ${persona.nombre}` : usuario?.rol_id === ROLES.COORDINADOR_MINISTROS ? 'Todos mis ministros y eventos' : 'Todos los ministros y eventos';

  return <div className={styles.page}>
    <PageHeader title="Calendario" subtitle="Consulta tus compromisos y conoce quién sirve en cada misa o evento." />
    <div className={styles.controls}>
      <div className={styles.filters}>
        <div className={styles.field}>
          <label htmlFor="calendario-vista">Qué deseas consultar</label>
          <select id="calendario-vista" value={vista} onChange={e => { setVista(e.target.value as VistaCalendario); setPersonaId(''); setSeleccion(null); }}>
            {puedeCoordinar && <option value="coordinacion">Calendario de coordinación</option>}
            <option value="personal">Mis compromisos</option>
            <option value="parroquial">Eventos de la parroquia</option>
          </select>
        </div>
        {puedeCoordinar && vista === 'coordinacion' && <div className={styles.field}>
          <label htmlFor="calendario-ministro">Ver horario de un ministro</label>
          <select id="calendario-ministro" value={personaId} disabled={cargandoMinistros || errorMinistros} onChange={e => { setPersonaId(e.target.value); setSeleccion(null); }}>
            <option value="">{usuario?.rol_id === ROLES.COORDINADOR_MINISTROS ? 'Todos mis ministros' : 'Todos los ministros'}</option>
            {ministros.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          {cargandoMinistros && <span role="status">Cargando ministros…</span>}
          {errorMinistros && <span role="alert">No se pudo cargar el selector. <button type="button" onClick={() => setIntentoMinistros(n => n + 1)}>Reintentar ministros</button></span>}
          {!cargandoMinistros && !errorMinistros && !ministros.length && <span>No hay ministros activos en tu directorio.</span>}
        </div>}
      </div>
      <div className={styles.navigation}>
        <div className={styles.buttons} role="group" aria-label="Período del calendario">
          <button type="button" aria-pressed={periodo === 'semana'} onClick={() => { setPeriodo('semana'); setSeleccion(null); }}>Semana</button>
          <button type="button" aria-pressed={periodo === 'mes'} onClick={() => { setPeriodo('mes'); setSeleccion(null); }}>Mes</button>
        </div>
        <strong>{periodo === 'semana' ? `Semana del ${fechaCompleta(inicio)} al ${fechaCompleta(fin)}` : fecha.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })}</strong>
        <div className={styles.buttons}>
          <button type="button" onClick={() => navegar(-1)}>{periodo === 'semana' ? 'Semana anterior' : 'Mes anterior'}</button>
          <button type="button" className={styles.todayButton} onClick={() => { setFecha(new Date()); setSeleccion(null); }}>Hoy</button>
          <button type="button" onClick={() => navegar(1)}>{periodo === 'semana' ? 'Semana siguiente' : 'Mes siguiente'}</button>
        </div>
      </div>
    </div>
    <p role="status" className={styles.summary}>{resumen}</p>
    <p className={styles.note}>Cada evento reúne sus tareas y ministros. Selecciona un compromiso para ver el detalle.</p>
    {loading && <LoadingState label="Cargando calendario…" />}
    {error && <ErrorState message={error} onRetry={reintentar} />}
    {!loading && !error && periodo === 'semana' && <div className={styles.weekGrid}>
      {dias.map(dia => {
        const clave = claveDia(dia);
        return <section key={clave} className={`${styles.day} ${clave === hoy ? styles.today : ''}`} aria-label={fechaCompleta(clave)}>
          <h2 className={styles.dayTitle}>{fechaCompleta(clave)}{clave === hoy && <span className={styles.todayLabel}>Hoy</span>}</h2>
          <div className={styles.dayContent}><CompromisosDia items={porDia.get(clave) ?? []} onSeleccionar={seleccionar} /></div>
        </section>;
      })}
    </div>}
    {!loading && !error && periodo === 'mes' && <CalendarioMes key={`${claveDia(fecha)}-${vista}-${personaId}`} fecha={fecha} dias={dias} porDia={porDia} onSeleccionar={seleccionar} />}
    {!loading && !error && item && <DetalleCompromiso item={item} onClose={() => setSeleccion(null)} />}
  </div>;
}
