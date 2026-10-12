import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../../assets/logo-parroquia.jpeg';
import './PublicPortal.css';

export const PUBLIC_NAV_LINKS = [
  { id: 'quienes-somos', label: 'Quiénes Somos' },
  { id: 'valores', label: 'Nuestros Valores' },
  { id: 'contacto', label: 'Contáctanos' },
] as const;

// TODO: sustituir estas rutas cuando se publiquen las redes oficiales.
const REDES = [
  { nombre: 'Facebook', url: '#', path: 'M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.2c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.5v3.3h2.8V22h3.4v-10.2h2.8l.4-3.3H14z' },
  { nombre: 'Instagram', url: '#', path: 'M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.8s0-3.6.1-4.8C2.4 4 3.9 2.4 7.2 2.3c1.2-.1 1.6-.1 4.8-.1zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z' },
  { nombre: 'TikTok', url: '#', path: 'M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2V2h-3.4v13.7a2.9 2.9 0 0 1-5.2 1.7 2.9 2.9 0 0 1 3.2-4.5V9.4a6.3 6.3 0 0 0-5.4 10.7 6.3 6.3 0 0 0 10.8-4.4V8.7a8.2 8.2 0 0 0 4.8 1.5V6.8c-.3 0-.7 0-1-.1z' },
];

function LoginIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M14 16l4-4-4-4M18 12H9" />
    </svg>
  );
}

interface PublicPortalLayoutProps {
  page: 'landing' | 'agenda-publica';
  activeSection?: number;
  onSectionClick?: (index: number) => void;
  children: ReactNode;
}

export default function PublicPortalLayout({ page, activeSection, onSectionClick, children }: PublicPortalLayoutProps) {
  const [open, setOpen] = useState(false);
  const isLanding = page === 'landing';
  const sectionHref = (id: string) => isLanding ? `#${id}` : `/#${id}`;
  const selectSection = (index: number) => {
    setOpen(false);
    onSectionClick?.(index);
  };

  return (
    <div className={`public-portal ${page}`}>
      <header className={`nav${open ? ' open' : ''}`}>
        <div className="wrap nav-in">
          <a href={isLanding ? '#home' : '/'} className="brand" onClick={() => selectSection(0)}>
            <img src={logoImg} alt="Parroquia San Pedro Nolasco" className="brand-logo" />
            <span className="brand-txt">
              <span className="brand-top">PARROQUIA</span>
              <span className="brand-name">SAN PEDRO NOLASCO</span>
            </span>
          </a>
          <nav id="navegacion-principal" className="nav-links" aria-label="Navegación principal">
            {PUBLIC_NAV_LINKS.map((link, index) => (
              <a key={link.id} href={sectionHref(link.id)} className={isLanding && index === activeSection ? 'active' : undefined}
                aria-current={isLanding && index === activeSection ? 'location' : undefined}
                onClick={() => selectSection(index)}>
                {link.label}
              </a>
            ))}
            <Link to="/login" className="btn-login"><LoginIcon />INICIAR SESIÓN</Link>
          </nav>
          <Link to="/login" className="btn-login nav-login"><LoginIcon />INICIAR SESIÓN</Link>
          <button type="button" className="burger" aria-label="Menú" aria-controls="navegacion-principal"
            aria-expanded={open} onClick={() => setOpen(value => !value)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </header>

      {children}

      <footer className="foot">
        <div className="wrap">
          <div className="foot-in">
            <div>
              <div className="brand foot-brand">
                <img src={logoImg} alt="" className="brand-logo" />
                <span className="brand-txt"><span className="brand-top">PARROQUIA</span><span className="brand-name">SAN PEDRO NOLASCO</span></span>
              </div>
              <p className="foot-description">Una comunidad de fe al servicio de las familias de nuestro barrio.</p>
              <div className="foot-social">
                {REDES.map(red => (
                  <a key={red.nombre} href={red.url} target="_blank" rel="noopener noreferrer" aria-label={red.nombre} title={red.nombre}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={red.path} /></svg>
                  </a>
                ))}
              </div>
            </div>
            <nav className="foot-links" aria-label="Navegación del pie de página">
              <h2>NAVEGACIÓN</h2>
              {PUBLIC_NAV_LINKS.map((link, index) => <a key={link.id} href={sectionHref(link.id)} onClick={() => selectSection(index)}>{link.label}</a>)}
              <Link to="/agenda">Agenda parroquial</Link>
              <Link to="/login">Iniciar Sesión</Link>
            </nav>
            <div>
              <h2>OFICINA PARROQUIAL</h2>
              <p>Lunes a viernes<br />9:00 – 13:00 · 15:00 – 19:00<br />Sábados 9:00 – 13:00</p>
            </div>
          </div>
          <div className="foot-bar">
            <span>© {new Date().getFullYear()} Parroquia San Pedro Nolasco</span>
            <span>GUATEMALA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
