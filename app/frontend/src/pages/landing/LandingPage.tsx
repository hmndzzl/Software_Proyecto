import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import PublicPortalLayout, { PUBLIC_NAV_LINKS } from '../public-portal/PublicPortalLayout';
import ContactoForm from './ContactoForm';
import { obtenerContenidoLanding, type ContenidoLanding } from '../../api/landing';
import fachada from '../../assets/landing/fachada-v1.webp';
import comunidad from '../../assets/landing/comunidad-v1.webp';
import celebracion from '../../assets/landing/celebracion-v1.webp';
import servicio from '../../assets/landing/servicio-v1.webp';
import feViva from '../../assets/landing/fe-viva-v1.webp';
import voluntarios from '../../assets/landing/voluntarios-v1.webp';
import encuentro from '../../assets/landing/encuentro-v1.webp';
import grupo from '../../assets/landing/grupo-v1.webp';
import familia from '../../assets/landing/familia-v1.webp';
import tradicion from '../../assets/landing/tradicion-v1.webp';
import entrada from '../../assets/landing/entrada-v1.webp';

const VALORES = [
  { titulo: 'Fe viva', foto: 'Altar preparado para una celebración', src: feViva, texto: 'Celebramos los sacramentos con cuidado y reverencia, y cultivamos una oración que acompaña la vida real de cada familia.' },
  { titulo: 'Servicio', foto: 'Ministros reunidos en la parroquia', src: voluntarios, texto: 'Nadie sirve solo. Ministros, coordinadores y voluntarios trabajan juntos para que cada necesidad encuentre una respuesta.' },
  { titulo: 'Comunidad', foto: 'Comunidad parroquial reunida', src: encuentro, texto: 'Aquí nadie es un extraño. Creamos espacios donde jóvenes, adultos y mayores se encuentran y se acompañan.' },
  { titulo: 'Formación', foto: 'Grupo parroquial reunido', src: grupo, texto: 'Catequesis para niños, preparación sacramental y círculos de estudio abiertos a quien desee profundizar su fe.' },
  { titulo: 'Caridad', foto: 'Vitral de la Sagrada Familia', src: familia, texto: 'Acompañamos a las familias que atraviesan dificultades con apoyo concreto, discreto y sostenido en el tiempo.' },
  { titulo: 'Tradición', foto: 'Procesión parroquial', src: tradicion, texto: 'Cuidamos las celebraciones y devociones que nos identifican, heredadas de quienes levantaron esta parroquia.' },
];

const CONTENIDO_INICIAL: ContenidoLanding = {
  nombre_parroquia: 'Parroquia San Pedro Nolasco',
  lema: 'Casa de oración · Guatemala',
  titulo_principal: 'Una comunidad que camina unida en la fe',
  descripcion_principal: 'Somos una parroquia viva al servicio de las familias de nuestro barrio. Celebramos, acompañamos y servimos — con las puertas siempre abiertas para quien busca consuelo, formación o un lugar donde pertenecer.',
  quienes_somos: {
    titulo: 'Más de setenta años sirviendo a nuestra comunidad',
    descripcion: 'La Parroquia San Pedro Nolasco nació del deseo de un pequeño grupo de familias por tener un lugar de encuentro con Dios. Hoy somos una comunidad numerosa que conserva ese mismo espíritu: cercanía, sencillez y servicio.',
    mision: 'Anunciar el Evangelio y acompañar a cada persona en su camino de fe, sin importar de dónde venga ni cuánto haya caminado.',
    comunidad: 'Doce grupos pastorales — coro, catequesis, pastoral familiar, juventud y más — donde cada quien encuentra su manera de servir.',
    servicio: 'Visitas a enfermos, apoyo a familias en necesidad y formación abierta para todas las edades, durante todo el año.',
  },
  cantidad_grupos: 12,
  cantidad_espacios: 7,
  valores_encabezado: {
    titulo: 'Lo que sostiene nuestra vida parroquial',
    descripcion: 'Cuatro principios guían todo lo que hacemos: desde la celebración dominical hasta el acompañamiento silencioso de una familia en duelo.',
  },
  valores: VALORES.map(({ titulo, texto }) => ({ titulo, descripcion: texto })),
  horarios_misa: [{ dias: 'Domingo', horas: ['08:00', '11:00', '18:00'] }, { dias: 'Lunes a viernes', horas: ['18:30'] }],
  horarios_oficina: [{ dias: 'Lunes a viernes', horario: '09:00 – 13:00 · 15:00 – 19:00' }, { dias: 'Sábados', horario: '09:00 – 13:00' }],
  contacto: { titulo: 'Estamos aquí para acompañarte', direccion: '3a Avenida 12-40, Zona 1\nCiudad de Guatemala', correo: 'contacto@sanpedronolasco.gt', telefono: '+502 2230 4488' },
  texto_pie: 'Una comunidad de fe al servicio de las familias de nuestro barrio.',
};

function esContenidoLanding(valor: unknown): valor is ContenidoLanding {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
  const contenido = valor as Partial<ContenidoLanding>;
  return typeof contenido.lema === 'string'
    && typeof contenido.titulo_principal === 'string'
    && typeof contenido.descripcion_principal === 'string'
    && Array.isArray(contenido.valores)
    && Array.isArray(contenido.horarios_misa)
    && Array.isArray(contenido.horarios_oficina)
    && typeof contenido.quienes_somos === 'object'
    && contenido.quienes_somos !== null
    && typeof contenido.contacto === 'object'
    && contenido.contacto !== null;
}

function mostrarLineas(texto: string) {
  const lineas = texto.split('\n');
  return lineas.map((linea, indice) => <span key={`${linea}-${indice}`}>{linea}{indice < lineas.length - 1 && <br />}</span>);
}

const svgProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function Slot({ label, src, eager = false }: { label: string; src?: string; eager?: boolean }) {
  const [urlFallida, setUrlFallida] = useState<string | null>(null);
  if (src && urlFallida !== src) {
    return <div className="slot">
      <img src={src} alt={label} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setUrlFallida(src)} />
    </div>;
  }
  return <div className="slot" role="img" aria-label={label}>{label}</div>;
}

export default function LandingPage() {
  const [active, setActive] = useState(0);
  const [contenido, setContenido] = useState<ContenidoLanding>(CONTENIDO_INICIAL);
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

  useEffect(() => {
    let activo = true;
    void obtenerContenidoLanding(true).then((respuesta) => {
      if (activo && esContenidoLanding(respuesta)) setContenido(respuesta);
    }).catch(() => {
      // La landing conserva el contenido inicial si el servicio público no está disponible.
    });
    return () => { activo = false; };
  }, []);

  return (
    <PublicPortalLayout page="landing" activeSection={active} onSectionClick={seleccionarSeccion} nombreParroquia={contenido.nombre_parroquia}
      textoPie={contenido.texto_pie} horariosOficina={contenido.horarios_oficina}>
      <main>
      <section id="home" className="hero">
        <div className="wrap hero-in">
          <div>
            <div className="kicker">{contenido.lema}</div>
            <h1>{contenido.titulo_principal}</h1>
            <div className="rule" />
            <p>{contenido.descripcion_principal}</p>
            <div className="hero-cta">
              <Link to="/agenda" className="btn btn-agenda">AGENDA PARROQUIAL</Link>
            </div>
            <div className="hero-stats">
              <div><div className="stat-n">{contenido.cantidad_grupos}</div><div className="stat-l">Grupos pastorales</div></div>
              <div><div className="stat-n">{contenido.cantidad_espacios}</div><div className="stat-l">Espacios parroquiales</div></div>
            </div>
          </div>
          <div className="hero-photo"><Slot label="Vista exterior de la parroquia" src={fachada} eager /></div>
        </div>
      </section>

      <section id="quienes-somos" className="sec sec-alt">
        <div className="wrap">
          <div className="about">
            <div className="about-media">
              <div className="ph ph-tall"><Slot label="Miembros de la comunidad parroquial" src={comunidad} /></div>
              <div className="ph"><Slot label="Celebración litúrgica" src={celebracion} /></div>
              <div className="ph"><Slot label="Ministros de la parroquia" src={servicio} /></div>
            </div>
            <div>
              <div className="kicker">Quiénes somos</div>
              <h2 className="h2-lg">{contenido.quienes_somos.titulo}</h2>
              <div className="rule" style={{ marginTop: 18 }} />
              <p className="lede" style={{ marginTop: 22 }}>{contenido.quienes_somos.descripcion}</p>
              <div className="about-list">
                <div className="about-item">
                  <span className="ico">
                    <svg width="22" height="22" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><path d="M4 21V8l8-4 8 4v13" /><path d="M4 21h16M9 21v-5h6v5M10 11h4M10 14h4" /></svg>
                  </span>
                  <div><h3>Nuestra misión</h3><p className="muted">{contenido.quienes_somos.mision}</p></div>
                </div>
                <div className="about-item">
                  <span className="ico">
                    <svg width="22" height="22" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><circle cx="12" cy="9" r="3" /><circle cx="5.5" cy="11" r="2.2" /><circle cx="18.5" cy="11" r="2.2" /><path d="M3 19c.5-2.4 2.6-3.7 5-3.7M21 19c-.5-2.4-2.6-3.7-5-3.7M7.5 20c.7-2.5 2.6-3.8 4.5-3.8s3.8 1.3 4.5 3.8" /></svg>
                  </span>
                  <div><h3>Nuestra comunidad</h3><p className="muted">{contenido.quienes_somos.comunidad}</p></div>
                </div>
                <div className="about-item">
                  <span className="ico">
                    <svg width="22" height="22" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><path d="M12 20.5s-7-4.6-7-9.6a4 4 0 0 1 7-2.6 4 4 0 0 1 7 2.6c0 5-7 9.6-7 9.6z" /></svg>
                  </span>
                  <div><h3>Nuestro servicio</h3><p className="muted">{contenido.quienes_somos.servicio}</p></div>
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
            <h2>{contenido.valores_encabezado.titulo}</h2>
            <div className="rule" />
            <p className="lede">{contenido.valores_encabezado.descripcion}</p>
          </div>
          <div className="values">
            {contenido.valores.map((v, i) => (
              <article key={v.titulo} className="vcard">
                <div className="vcard-ph"><Slot label={VALORES[i]?.foto ?? `Imagen pendiente para ${v.titulo}`} src={VALORES[i]?.src} /></div>
                <div className="vcard-body">
                  <div className="vnum">{String(i + 1).padStart(2, '0')}</div>
                  <h3>{v.titulo}</h3>
                  <p>{v.descripcion}</p>
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
              <h2 className="h2-lg">{contenido.contacto.titulo}</h2>
              <div className="rule" style={{ marginTop: 18 }} />
              <p className="lede" style={{ marginTop: 20 }}>Escríbenos para solicitar un sacramento, reservar un salón, sumarte a un grupo o simplemente conversar. Respondemos dentro de las siguientes 48 horas.</p>
              <div className="cinfo">
                {contenido.contacto.direccion && <div className="crow">
                  <span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><path d="M12 22s7-7.4 7-13a7 7 0 1 0-14 0c0 5.6 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></svg></span>
                  <div><h3>DIRECCIÓN</h3><p>{mostrarLineas(contenido.contacto.direccion)}</p></div>
                </div>}
                {contenido.horarios_misa.length > 0 && <div className="crow">
                  <span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg></span>
                  <div><h3>HORARIOS DE MISA</h3><p>{contenido.horarios_misa.map((horario, indice) => <span key={`${horario.dias}-${indice}`}>{horario.dias} {horario.horas.join(' · ')}{indice < contenido.horarios_misa.length - 1 && <br />}</span>)}</p></div>
                </div>}
                {contenido.horarios_oficina.length > 0 && <div className="crow">
                  <span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 2v4M16 2v4M4 10h16" /></svg></span>
                  <div><h3>OFICINA PARROQUIAL</h3><p>{contenido.horarios_oficina.map((horario, indice) => <span key={`${horario.dias}-${indice}`}>{horario.dias} {horario.horario}{indice < contenido.horarios_oficina.length - 1 && <br />}</span>)}</p></div>
                </div>}
                {(contenido.contacto.correo || contenido.contacto.telefono) && <div className="crow">
                  <span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" {...svgProps} aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></span>
                  <div><h3>CORREO Y TELÉFONO</h3><p>{contenido.contacto.correo}{contenido.contacto.correo && contenido.contacto.telefono && <br />}{contenido.contacto.telefono}</p></div>
                </div>}
              </div>
              <div className="cmap"><Slot label="Entrada a la parroquia" src={entrada} /></div>
            </div>

            <ContactoForm />
          </div>
        </div>
      </section>
      </main>
    </PublicPortalLayout>
  );
}
