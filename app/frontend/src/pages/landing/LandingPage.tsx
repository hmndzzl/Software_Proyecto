import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import logoImg from '../../assets/logo-parroquia.jpeg';
import ContactoForm from './ContactoForm';

const NAV_LINKS = [
  { id: 'quienes-somos', label: 'Quiénes Somos' },
  { id: 'valores', label: 'Nuestros Valores' },
  { id: 'contacto', label: 'Contáctanos' },
];

const VALORES = [
  { titulo: 'Fe viva', foto: 'Momento de oración', texto: 'Celebramos los sacramentos con cuidado y reverencia, y cultivamos una oración que acompaña la vida real de cada familia.' },
  { titulo: 'Servicio', foto: 'Voluntarios sirviendo', texto: 'Nadie sirve solo. Ministros, coordinadores y voluntarios trabajan juntos para que cada necesidad encuentre una respuesta.' },
  { titulo: 'Comunidad', foto: 'Familias en el atrio', texto: 'Aquí nadie es un extraño. Creamos espacios donde jóvenes, adultos y mayores se encuentran y se acompañan.' },
  { titulo: 'Formación', foto: 'Catequesis o formación', texto: 'Catequesis para niños, preparación sacramental y círculos de estudio abiertos a quien desee profundizar su fe.' },
  { titulo: 'Caridad', foto: 'Apoyo a familias', texto: 'Acompañamos a las familias que atraviesan dificultades con apoyo concreto, discreto y sostenido en el tiempo.' },
  { titulo: 'Tradición', foto: 'Fiesta patronal', texto: 'Cuidamos las celebraciones y devociones que nos identifican, heredadas de quienes levantaron esta parroquia.' },
];

const svgProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function Slot({ label }: { label: string }) {
  return <div className="slot" role="img" aria-label={label}>{label}</div>;
}

// TODO: reemplazar '#' por las URLs reales de las redes de la parroquia
const REDES = [
  {
    nombre: 'Facebook',
    url: '#',
    path: 'M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.2c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.5v3.3h2.8V22h3.4v-10.2h2.8l.4-3.3H14z',
  },
  {
    nombre: 'Instagram',
    url: '#',
    path: 'M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.8s0-3.6.1-4.8C2.4 4 3.9 2.4 7.2 2.3c1.2-.1 1.6-.1 4.8-.1zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z',
  },
  {
    nombre: 'TikTok',
    url: '#',
    path: 'M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2V2h-3.4v13.7a2.9 2.9 0 0 1-5.2 1.7 2.9 2.9 0 0 1 3.2-4.5V9.4a6.3 6.3 0 0 0-5.4 10.7 6.3 6.3 0 0 0 10.8-4.4V8.7a8.2 8.2 0 0 0 4.8 1.5V6.8c-.3 0-.7 0-1-.1z',
  },
];

function LoginIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M14 16l4-4-4-4M18 12H9" />
    </svg>
  );
}

export default function LandingPage() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + 120;
      let cur = 0;
      NAV_LINKS.forEach((l, i) => {
        const el = document.getElementById(l.id);
        if (el && el.offsetTop <= y) cur = i;
      });
      setActive(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing">
      <nav className={`nav${open ? ' open' : ''}`}>
        <div className="wrap nav-in">
          <a href="#home" className="brand">
            <img src={logoImg} alt="Parroquia San Pedro Nolasco" className="brand-logo" />
            <span className="brand-txt">
              <span className="brand-top">PARROQUIA</span>
              <span className="brand-name">SAN PEDRO NOLASCO</span>
            </span>
          </a>
          <div className="nav-links">
            {NAV_LINKS.map((l, i) => (
              <a key={l.id} href={`#${l.id}`} className={i === active ? 'active' : undefined} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
            <Link to="/login" className="btn-login"><LoginIcon />INICIAR SESIÓN</Link>
          </div>
          <Link to="/login" className="btn-login"><LoginIcon />INICIAR SESIÓN</Link>
          <button type="button" className="burger" aria-label="Menú" aria-expanded={open} onClick={() => setOpen(o => !o)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </nav>

      <section id="home" className="hero">
        <div className="wrap hero-in">
          <div>
            <div className="kicker">Casa de oración · Guatemala</div>
            <h1>Una comunidad que camina unida en la fe</h1>
            <div className="rule" />
            <p>Somos una parroquia viva al servicio de las familias de nuestro barrio. Celebramos, acompañamos y servimos — con las puertas siempre abiertas para quien busca consuelo, formación o un lugar donde pertenecer.</p>
            <div className="hero-cta">
              <a href="#contacto" className="btn btn-gold">CONÓCENOS</a>
              <a href="#valores" className="btn btn-outline">NUESTROS VALORES</a>
            </div>
            <div className="hero-stats">
              <div><div className="stat-n">12</div><div className="stat-l">Grupos pastorales</div></div>
              <div><div className="stat-n">7</div><div className="stat-l">Espacios parroquiales</div></div>
            </div>
          </div>
          <div className="hero-photo"><Slot label="Fachada o interior del templo — foto horizontal" /></div>
        </div>
      </section>

      <section id="quienes-somos" className="sec sec-alt">
        <div className="wrap">
          <div className="about">
            <div className="about-media">
              <div className="ph ph-tall"><Slot label="Comunidad reunida (vertical)" /></div>
              <div className="ph"><Slot label="Celebración" /></div>
              <div className="ph"><Slot label="Servicio social" /></div>
            </div>
            <div>
              <div className="kicker">Quiénes somos</div>
              <h2 className="h2-lg">Más de setenta años sirviendo a nuestra comunidad</h2>
              <div className="rule" style={{ marginTop: 18 }} />
              <p className="lede" style={{ marginTop: 22 }}>La Parroquia San Pedro Nolasco nació del deseo de un pequeño grupo de familias por tener un lugar de encuentro con Dios. Hoy somos una comunidad numerosa que conserva ese mismo espíritu: cercanía, sencillez y servicio.</p>
              <div className="about-list">
                <div className="about-item">
                  <span className="ico">
                    <svg width="22" height="22" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><path d="M4 21V8l8-4 8 4v13" /><path d="M4 21h16M9 21v-5h6v5M10 11h4M10 14h4" /></svg>
                  </span>
                  <div><h3>Nuestra misión</h3><p className="muted">Anunciar el Evangelio y acompañar a cada persona en su camino de fe, sin importar de dónde venga ni cuánto haya caminado.</p></div>
                </div>
                <div className="about-item">
                  <span className="ico">
                    <svg width="22" height="22" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><circle cx="12" cy="9" r="3" /><circle cx="5.5" cy="11" r="2.2" /><circle cx="18.5" cy="11" r="2.2" /><path d="M3 19c.5-2.4 2.6-3.7 5-3.7M21 19c-.5-2.4-2.6-3.7-5-3.7M7.5 20c.7-2.5 2.6-3.8 4.5-3.8s3.8 1.3 4.5 3.8" /></svg>
                  </span>
                  <div><h3>Nuestra comunidad</h3><p className="muted">Doce grupos pastorales — coro, catequesis, pastoral familiar, juventud y más — donde cada quien encuentra su manera de servir.</p></div>
                </div>
                <div className="about-item">
                  <span className="ico">
                    <svg width="22" height="22" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><path d="M12 20.5s-7-4.6-7-9.6a4 4 0 0 1 7-2.6 4 4 0 0 1 7 2.6c0 5-7 9.6-7 9.6z" /></svg>
                  </span>
                  <div><h3>Nuestro servicio</h3><p className="muted">Visitas a enfermos, apoyo a familias en necesidad y formación abierta para todas las edades, durante todo el año.</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="valores" className="sec">
        <div className="wrap">
          <div className="sec-head center">
            <div className="kicker">Nuestros valores</div>
            <h2>Lo que sostiene nuestra vida parroquial</h2>
            <div className="rule" />
            <p className="lede">Cuatro principios guían todo lo que hacemos: desde la celebración dominical hasta el acompañamiento silencioso de una familia en duelo.</p>
          </div>
          <div className="values">
            {VALORES.map((v, i) => (
              <article key={v.titulo} className="vcard">
                <div className="vcard-ph"><Slot label={v.foto} /></div>
                <div className="vcard-body">
                  <div className="vnum">{String(i + 1).padStart(2, '0')}</div>
                  <h3>{v.titulo}</h3>
                  <p>{v.texto}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="sec sec-alt">
        <div className="wrap">
          <div className="contact">
            <div>
              <div className="kicker">Contáctanos</div>
              <h2 className="h2-lg">Estamos aquí para acompañarte</h2>
              <div className="rule" style={{ marginTop: 18 }} />
              <p className="lede" style={{ marginTop: 20 }}>Escríbenos para solicitar un sacramento, reservar un salón, sumarte a un grupo o simplemente conversar. Respondemos dentro de las siguientes 48 horas.</p>
              <div className="cinfo">
                <div className="crow">
                  <span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><path d="M12 22s7-7.4 7-13a7 7 0 1 0-14 0c0 5.6 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></svg></span>
                  <div><h4>DIRECCIÓN</h4><p>3a Avenida 12-40, Zona 1<br />Ciudad de Guatemala</p></div>
                </div>
                <div className="crow">
                  <span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg></span>
                  <div><h4>HORARIOS DE MISA</h4><p>Domingo 8:00 · 11:00 · 18:00<br />Lunes a viernes 18:30</p></div>
                </div>
                <div className="crow">
                  <span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></span>
                  <div><h4>CORREO Y TELÉFONO</h4><p>contacto@sanpedronolasco.gt<br />+502 2230 4488</p></div>
                </div>
              </div>
              <div className="cmap"><Slot label="Mapa o foto de la entrada" /></div>
            </div>

            <ContactoForm />
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">
          <div className="foot-in">
            <div>
              <div className="brand" style={{ marginBottom: 16 }}>
                <img src={logoImg} alt="Parroquia San Pedro Nolasco" className="brand-logo" />
                <span className="brand-txt"><span className="brand-top">PARROQUIA</span><span className="brand-name">SAN PEDRO NOLASCO</span></span>
              </div>
              <p style={{ maxWidth: '38ch' }}>Una comunidad de fe al servicio de las familias de nuestro</p>
              <div className="foot-social">
                {REDES.map(r => (
                  <a key={r.nombre} href={r.url} target="_blank" rel="noopener noreferrer" aria-label={r.nombre} title={r.nombre}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={r.path} /></svg>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4>NAVEGACIÓN</h4>
              {NAV_LINKS.map(l => <a key={l.id} href={`#${l.id}`}>{l.label}</a>)}
              <Link to="/login">Iniciar Sesión</Link>
            </div>
            <div>
              <h4>OFICINA PARROQUIAL</h4>
              <p>Lunes a viernes<br />9:00 – 13:00 · 15:00 – 19:00<br />Sábados 9:00 – 13:00</p>
            </div>
          </div>
          <div className="foot-bar">
            <span>© 2026 Parroquia San Pedro Nolasco</span>
            <span style={{ letterSpacing: '.18em' }}>GUATEMALA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
