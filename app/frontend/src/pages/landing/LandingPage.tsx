import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import PublicPortalLayout, { PUBLIC_NAV_LINKS } from '../public-portal/PublicPortalLayout';
import ContactoForm from './ContactoForm';

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

export default function LandingPage() {
  const [active, setActive] = useState(0);
  const pendingSection = useRef<number | null>(null);
  const settleTimer = useRef<number | undefined>(undefined);

  const seleccionarSeccion = (indice: number) => {
    pendingSection.current = indice;
    setActive(indice);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => { pendingSection.current = null; }, 700);
  };

  useEffect(() => {
    const syncActive = () => {
      const alturaNav = document.querySelector<HTMLElement>('.landing .nav')?.getBoundingClientRect().height || 76;
      const y = window.scrollY + alturaNav + 16;
      let cur = 0;
      PUBLIC_NAV_LINKS.forEach((l, i) => {
        const el = document.getElementById(l.id);
        if (el && el.offsetTop <= y) cur = i;
      });
      if (document.documentElement.scrollHeight > window.innerHeight &&
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
        cur = PUBLIC_NAV_LINKS.length - 1;
      }
      setActive(cur);
    };
    const onScroll = () => {
      if (pendingSection.current !== null) {
        window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(() => {
          pendingSection.current = null;
          syncActive();
        }, 180);
        return;
      }
      syncActive();
    };
    const hashIndex = PUBLIC_NAV_LINKS.findIndex(link => `#${link.id}` === window.location.hash);
    let frame: number | undefined;
    if (hashIndex >= 0) {
      pendingSection.current = hashIndex;
      setActive(hashIndex);
      settleTimer.current = window.setTimeout(() => { pendingSection.current = null; }, 700);
      frame = window.requestAnimationFrame(() => document.getElementById(PUBLIC_NAV_LINKS[hashIndex].id)?.scrollIntoView?.());
    } else {
      syncActive();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(settleTimer.current);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <PublicPortalLayout page="landing" activeSection={active} onSectionClick={seleccionarSeccion}>
      <main>
      <section id="home" className="hero">
        <div className="wrap hero-in">
          <div>
            <div className="kicker">Casa de oración · Guatemala</div>
            <h1>Una comunidad que camina unida en la fe</h1>
            <div className="rule" />
            <p>Somos una parroquia viva al servicio de las familias de nuestro barrio. Celebramos, acompañamos y servimos — con las puertas siempre abiertas para quien busca consuelo, formación o un lugar donde pertenecer.</p>
            <div className="hero-cta">
              <Link to="/agenda" className="btn btn-agenda">AGENDA PARROQUIAL</Link>
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
                  <div><h3>DIRECCIÓN</h3><p>3a Avenida 12-40, Zona 1<br />Ciudad de Guatemala</p></div>
                </div>
                <div className="crow">
                  <span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg></span>
                  <div><h3>HORARIOS DE MISA</h3><p>Domingo 8:00 · 11:00 · 18:00<br />Lunes a viernes 18:30</p></div>
                </div>
                <div className="crow">
                  <span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></span>
                  <div><h3>CORREO Y TELÉFONO</h3><p>contacto@sanpedronolasco.gt<br />+502 2230 4488</p></div>
                </div>
              </div>
              <div className="cmap"><Slot label="Mapa o foto de la entrada" /></div>
            </div>

            <ContactoForm />
          </div>
        </div>
      </section>
      </main>
    </PublicPortalLayout>
  );
}
