import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface StatCard {
  label: string;
  value: number | string;
  loading: boolean;
}

interface TareaProxima {
  id: number;
  fecha: string;
  hora_inicio: string;
  descripcion: string;
}

const ACCESOS = [
  { label: 'Ministros',  to: '/ministros',  color: '#fff9e6', border: '#FFD900' },
  { label: 'Tareas',     to: '/tareas',     color: '#f0f9ff', border: '#60b8e0' },
  { label: 'Reservas',   to: '/reservas',   color: '#f0fff4', border: '#68d391' },
  { label: 'Grupos',     to: '/grupos',     color: '#fef3f2', border: '#fc8181' },
  { label: 'Espacios',   to: '/espacios',   color: '#f5f0ff', border: '#b794f4' },
];

export default function DashboardPage() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const token = localStorage.getItem('token');

  const [stats, setStats] = useState({
    grupos:    { value: 0, loading: true },
    ministros: { value: 0, loading: true },
    espacios:  { value: 0, loading: true },
    pendientes:{ value: 0, loading: true },
  });
  const [tareasProximas, setTareasProximas] = useState<TareaProxima[]>([]);
  const [tareasLoading, setTareasLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    const base = import.meta.env.VITE_API_URL;
    const hoy = new Date().toISOString().split('T')[0];

    const fetchStat = (url: string, key: keyof typeof stats, filter?: (d: any[]) => number) =>
      fetch(`${base}${url}`, { headers })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data: any[]) => {
          const value = filter ? filter(data) : data.length;
          setStats(prev => ({ ...prev, [key]: { value, loading: false } }));
        })
        .catch(() => setStats(prev => ({ ...prev, [key]: { value: '—', loading: false } })));

    fetchStat('/api/grupos',   'grupos');
    fetchStat('/api/personas', 'ministros');
    fetchStat('/api/espacios', 'espacios');
    fetchStat('/api/reservas', 'pendientes', (data) =>
      data.filter((r: any) => r.estado_reserva_id === 1).length
    );

    fetch(`${base}/api/tareas`, { headers })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: TareaProxima[]) => {
        const proximas = data
          .filter(t => t.fecha >= hoy)
          .sort((a, b) => a.fecha.localeCompare(b.fecha))
          .slice(0, 5);
        setTareasProximas(proximas);
      })
      .catch(() => {})
      .finally(() => setTareasLoading(false));
  }, []);

  const formatFecha = (fecha: string) => {
    const [y, m, d] = fecha.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  };

  const formatHora = (hora: string) => hora.substring(0, 5);

  const STAT_CARDS: (StatCard & { accent: string })[] = [
    { label: 'Grupos Parroquiales', ...stats.grupos,    accent: '#fc8181' },
    { label: 'Ministros',          ...stats.ministros, accent: '#FFD900' },
    { label: 'Espacios',           ...stats.espacios,  accent: '#b794f4' },
    { label: 'Reservas Pendientes',...stats.pendientes, accent: '#68d391' },
  ];

  return (
    <div className="page-container">
      <div className="content-container">

        {/* Bienvenida */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#111', marginBottom: '4px' }}>
            Bienvenido, {usuario?.nombre ?? 'Usuario'}
          </h2>
          <p style={{ color: '#777', fontSize: '14px' }}>
            Panel de administración — Parroquia San Pedro Nolasco
          </p>
        </div>

        {/* Tarjetas de resumen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {STAT_CARDS.map(card => (
            <div key={card.label} style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderTop: `4px solid ${card.accent}`,
            }}>
              <p style={{ fontSize: '13px', color: '#777', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {card.label}
              </p>
              <p style={{ fontSize: '36px', fontWeight: 700, color: '#111' }}>
                {card.loading ? '...' : card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Fila inferior: Próximas tareas + Accesos rápidos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

          {/* Próximas tareas */}
          <div className="card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              Próximas Tareas
            </h3>
            {tareasLoading && <p style={{ color: '#999', fontSize: '14px' }}>Cargando...</p>}
            {!tareasLoading && tareasProximas.length === 0 && (
              <p style={{ color: '#999', fontSize: '14px' }}>No hay tareas próximas.</p>
            )}
            {!tareasLoading && tareasProximas.map(t => (
              <div key={t.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid #f5f5f5',
                gap: '12px',
              }}>
                <span style={{ fontSize: '14px', color: '#333', fontWeight: 600, flex: 1 }}>
                  {t.descripcion}
                </span>
                <span style={{
                  fontSize: '12px',
                  color: '#555',
                  backgroundColor: '#f5f5f5',
                  padding: '4px 10px',
                  borderRadius: '50px',
                  whiteSpace: 'nowrap',
                }}>
                  {formatFecha(t.fecha)} · {formatHora(t.hora_inicio)}
                </span>
              </div>
            ))}
            <Link to="/tareas" style={{ display: 'inline-block', marginTop: '16px', fontSize: '13px', color: '#555', fontWeight: 600, textDecoration: 'none' }}>
              Ver todas las tareas →
            </Link>
          </div>

          {/* Accesos rápidos */}
          <div className="card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              Accesos Rápidos
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {ACCESOS.map(a => (
                <Link
                  key={a.to}
                  to={a.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    backgroundColor: a.color,
                    border: `1.5px solid ${a.border}`,
                    borderRadius: '12px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '14px',
                    color: '#333',
                    textAlign: 'center',
                    transition: 'opacity 0.15s',
                  }}
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
