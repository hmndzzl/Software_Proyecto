import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { formatFecha, formatHora, partesFecha } from '../../utils/date';
import logoImg from '../../assets/logo-parroquia.jpeg';
import './AgendaPublicaPage.css';

interface EventoPublico {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  nombre_espacio: string | null;
}

function IconoCalendario() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18" />
    </svg>
  );
}

function IconoReloj() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconoUbicacion() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default function AgendaPublicaPage() {
  const [eventos, setEventos] = useState<EventoPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargarAgenda = useCallback(async () => {
    setCargando(true);
    setError(false);
    try {
      const respuesta = await apiClient.get<EventoPublico[]>('/api/public/agenda');
      setEventos(Array.isArray(respuesta.data) ? respuesta.data : []);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarAgenda();
  }, [cargarAgenda]);

  return (
    <div className="agenda-publica">
      <header className="agenda-header">
        <div className="agenda-wrap agenda-header-inner">
          <Link className="agenda-brand" to="/" aria-label="Volver al portal de Parroquia San Pedro Nolasco">
            <img src={logoImg} alt="" />
            <span>
              <small>PARROQUIA</small>
              <strong>SAN PEDRO NOLASCO</strong>
            </span>
          </Link>
          <nav aria-label="Navegación pública">
            <Link to="/">Volver al portal</Link>
            <Link className="agenda-login" to="/login">Iniciar sesión</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="agenda-hero" aria-labelledby="agenda-titulo">
          <div className="agenda-wrap">
            <p className="agenda-kicker">Comunidad en movimiento</p>
            <h1 id="agenda-titulo">Agenda parroquial</h1>
            <p>Conoce las próximas actividades públicas de nuestra comunidad.</p>
          </div>
        </section>

        <section className="agenda-content agenda-wrap" aria-live="polite" aria-busy={cargando}>
          {cargando && (
            <div className="agenda-state" role="status">
              <span className="agenda-loader" aria-hidden="true" />
              <p>Cargando actividades…</p>
            </div>
          )}

          {error && !cargando && (
            <div className="agenda-state agenda-error" role="alert">
              <p>No pudimos cargar la agenda en este momento.</p>
              <button type="button" onClick={() => void cargarAgenda()}>Reintentar</button>
            </div>
          )}

          {!cargando && !error && eventos.length === 0 && (
            <div className="agenda-state agenda-empty">
              <span className="agenda-empty-icon" aria-hidden="true"><IconoCalendario /></span>
              <h2>Aún no hay actividades publicadas</h2>
              <p>Pronto compartiremos aquí las próximas actividades de la parroquia.</p>
              <Link to="/#contacto">Contáctanos para más información</Link>
            </div>
          )}

          {!cargando && !error && eventos.length > 0 && (
            <ol className="agenda-list" aria-label="Próximas actividades">
              {eventos.map((evento) => {
                const { dia, mesAbrev } = partesFecha(evento.fecha);
                return (
                  <li key={evento.id} className="agenda-item">
                    <time className="agenda-date" dateTime={evento.fecha} aria-label={formatFecha(evento.fecha)}>
                      <span>{dia}</span>
                      <small>{mesAbrev}</small>
                    </time>
                    <article className="agenda-card">
                      <p className="agenda-full-date">{formatFecha(evento.fecha)}</p>
                      <h2>{evento.titulo}</h2>
                      {evento.descripcion.trim() && <p className="agenda-description">{evento.descripcion}</p>}
                      <dl className="agenda-details">
                        <div>
                          <dt><IconoReloj />Horario</dt>
                          <dd>{formatHora(evento.hora_inicio)} – {formatHora(evento.hora_fin)}</dd>
                        </div>
                        {evento.nombre_espacio && (
                          <div>
                            <dt><IconoUbicacion />Lugar</dt>
                            <dd>{evento.nombre_espacio}</dd>
                          </div>
                        )}
                      </dl>
                    </article>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>

      <footer className="agenda-footer">
        <div className="agenda-wrap">
          <p>Parroquia San Pedro Nolasco · Guatemala</p>
          <Link to="/">Inicio</Link>
        </div>
      </footer>
    </div>
  );
}
