import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import ImagenAmpliable from '../../components/ui/ImagenAmpliable';
import PublicPortalLayout, { PUBLIC_NAV_LINKS } from '../public-portal/PublicPortalLayout';
import ContactoForm from './ContactoForm';
import Modal from '../../components/ui/Modal';
import { obtenerContenidoLanding, type ClaveImagenLanding, type ContenidoLanding } from '../../api/landing';
import { CLAVES_HISTORIA, ETIQUETAS_IMAGEN, FOTOS_VALORES, IMAGENES_PREDETERMINADAS } from './imagenesLanding';

const VALORES = [
  { titulo: 'Fe viva', foto: 'Altar preparado para una celebración', texto: 'Celebramos los sacramentos con cuidado y reverencia, y cultivamos una oración que acompaña la vida real de cada familia.' },
  { titulo: 'Servicio', foto: 'Ministros reunidos en la parroquia', texto: '"El Hijo del hombre no vino para ser servido, sino para servir" (Mateo 20:28). Nadie sirve solo. Ministros, coordinadores y voluntarios trabajan juntos para que cada necesidad encuentre una respuesta.' },
  { titulo: 'Comunidad', foto: 'Comunidad parroquial reunida', texto: 'Aquí nadie es un extraño. Creamos espacios donde jóvenes, adultos y mayores se encuentran y se acompañan.' },
  { titulo: 'Formación', foto: 'Grupo parroquial reunido', texto: 'Catequesis para niños, preparación sacramental y círculos de estudio abiertos a quien desee profundizar su fe.' },
  { titulo: 'Caridad', foto: 'Vitral de la Sagrada Familia', texto: 'Acompañamos a las familias que atraviesan dificultades con apoyo concreto, discreto y sostenido en el tiempo.' },
  { titulo: 'Tradición', foto: 'Procesión parroquial', texto: 'Cuidamos las celebraciones y devociones que nos identifican, heredadas de quienes levantaron esta parroquia.' },
  { titulo: 'Redención', foto: 'Imagen pendiente para Redención', texto: 'Acompañando en las esclavitudes modernas.' },
  { titulo: 'Misión', foto: 'Imagen pendiente para Misión', texto: 'IGNIS REDENTOR: junto a Cristo Redentor y nuestra Madre de la Merced, trabajamos en la redención de los cautivos.' },
];

const CONTENIDO_INICIAL: ContenidoLanding = {
  nombre_parroquia: 'Parroquia San Pedro Nolasco',
  lema: 'Casa de oración · Guatemala',
  titulo_principal: 'Una comunidad que camina unida en la fe',
  descripcion_principal: 'Somos una parroquia viva al servicio de las familias de nuestro barrio. Celebramos, acompañamos y servimos — con las puertas siempre abiertas para quien busca consuelo, formación o un lugar donde pertenecer.',
  quienes_somos: {
    titulo: 'Más de setenta años sirviendo a nuestra comunidad',
    descripcion: 'La Parroquia San Pedro Nolasco nació del deseo de un pequeño grupo de familias por tener un lugar de encuentro con Dios. Hoy somos una comunidad numerosa que conserva ese mismo espíritu: cercanía, sencillez y servicio.',
    mision: 'Anunciar el Evangelio y acompañar a las familias a ejemplo de San Pedro Nolasco e intercesión de la Santísima Virgen María de la Merced.',
    comunidad: 'Doce grupos pastorales — coro, catequesis, pastoral familiar, juventud y más — donde cada quien encuentra su manera de servir.',
    servicio: 'Vivencia de los Sacramentos, visitas a enfermos, apoyo a familias en necesidad y formación permanente en las comunidades.',
  },
  historia: {
    titulo: 'Nuestra historia',
    descripcion: 'Conoce el origen de la Orden de la Merced y el significado de su escudo.',
    tarjetas: [
      { titulo: 'Historia de la Orden Mercedaria', lema: 'Libres para liberar', resumen: 'Fundada en Barcelona en 1218 por san Pedro Nolasco, la Orden de la Merced nació para rescatar a los cristianos cautivos. Su lema es «Libres para liberar».', detalle: 'La Orden de la Bienaventurada Virgen María de la Merced de la Redención de los Cautivos fue fundada el 10 de agosto de 1218 en Barcelona por san Pedro Nolasco, con el apoyo de san Raimundo de Peñafort y del rey Jaime I de Aragón.\n\nNació como respuesta a una realidad dolorosa: muchos cristianos eran hechos cautivos y corrían el riesgo de perder su libertad y su fe. Según la tradición, la Virgen María se apareció a san Pedro Nolasco y le inspiró fundar una comunidad dedicada a rescatarlos.\n\nAdemás de los votos de obediencia, pobreza y castidad, los mercedarios profesan un cuarto voto: quedar en rehenes, si fuera necesario, en lugar de quienes están en peligro de perder su fe. De ahí nace su lema: «Libres para liberar».\n\nCon los siglos, la Orden extendió su misión a otras tierras, entre ellas América, y hoy acompaña a quienes viven nuevas formas de esclavitud, para que recuperen su libertad física, moral y espiritual.' },
      { titulo: 'Significado del escudo mercedario', lema: '', resumen: 'El escudo une la cruz de la Catedral de Barcelona y las barras de Aragón, bajo una corona real: la Iglesia y la Corona al servicio de la liberación.', detalle: 'El escudo de la Orden de la Merced reúne dos emblemas, coronados por una corona real.\n\nLa cruz blanca sobre fondo rojo es la cruz de la Catedral de Barcelona, ciudad donde nació la Orden. Representa a la Iglesia y a Cristo, que entrega su vida para liberar al ser humano.\n\nLas cuatro barras rojas sobre fondo dorado son las armas de la Corona de Aragón y recuerdan al rey Jaime I, protector y cofundador de la Orden.\n\nLa corona que corona el escudo expresa ese patrocinio real. Así, el escudo muestra la unión de la Iglesia y la Corona en una misma obra: la redención de los cautivos.' },
    ],
  },
  cantidad_grupos: 12,
  cantidad_espacios: 7,
  valores_encabezado: {
    titulo: 'Lo que sostiene nuestra vida parroquial',
    descripcion: 'Estos principios guían todo lo que hacemos: desde la celebración dominical hasta el acompañamiento silencioso de una familia en duelo.',
  },
  valores: VALORES.map(({ titulo, texto }) => ({ titulo, descripcion: texto })),
  horarios_misa: [{ dias: 'Domingo', horas: ['08:00', '10:00', '12:00', '18:00'] }, { dias: 'Lunes a viernes', horas: ['07:00', '18:00'] }],
  horarios_oficina: [{ dias: 'Lunes a viernes', horario: '09:00 a 12:00' }, { dias: 'Sábados y Domingos', horario: 'Cerrado' }],
  contacto: { titulo: 'Estamos aquí para acompañarte', direccion: '9a Calle A 9-34, Ciudad San Cristóbal, Mixco', correo: 'contacto@sanpedronolasco.gt', telefono: '+502 2443 3174' },
  devocion: {
    titulo: 'Devoción a Nuestra Santísima Madre de la Merced',
    descripcion: 'Cómo honramos a la Madre de Dios y a los santos de la Orden.',
    oracion: { titulo: '¡Quédate con nosotros, Señor!', texto: 'Padre nuestro, te damos gracias por la casa en que vivimos. Te invocamos con ánimo agradecido para que derrames tu abundante bendición sobre nuestra familia. Necesitamos ese regalo generoso y te lo pedimos con fe sincera y la confianza de hijos. Te damos gracias de todo corazón por tu bondad paternal.\n\nAsístenos en todo momento, para que sintamos tu presencia protectora, no como huésped, sino como Padre amoroso que cuida de sus hijos. Ahuyenta todo mal de nuestros corazones y de esta casa.\n\nQue la sagrada Familia de Nazaret sea nuestro modelo de fe sencilla y de disponibilidad total a cumplir tu Voluntad.\n\nQue practiquemos las virtudes que nos infundiste en el Bautismo y seamos ejemplo de vida cristiana para cuantos se relacionen con nosotros.\n\nAyúdanos a sobrellevar con paciencia las pruebas en la enfermedad, en la vejez y en todas las contrariedades que se nos presenten.\n\nImploramos tu ayuda para realizar todo en el nombre del Padre, del Hijo y del Espíritu Santo.\n\nAmén.' },
    tarjetas: [
      { titulo: 'Conocer e imitar a María', descripcion: 'Para conocerla mejor e imitarla, los mercedarios estudiamos con particular interés la figura de María; con sencillez y competencia debemos exponer su misión y privilegios, y con nuestra vida y ejemplo hemos de ser promotores de auténtico culto mariano.' },
      { titulo: 'Cómo honramos a la Madre de Dios', descripcion: 'Honramos a la Madre de Dios en especial con los siguientes actos:\n1° Rezo diario de una parte del rosario;\n2° Los sábados, según las leyes litúrgicas, misa de nuestra santísima Madre, y liturgia de las horas de Santa María; y a la hora oportuna canto de la Salve;\n3° En el último sábado de mes, plegarias especiales por los cristianos oprimidos;\n4° Celebración solemne de su festividad, el 24 de septiembre;\n5° Dedicación de las provincias, iglesias y oratorios;\n6° Presencia de su imagen en los coros y habitaciones.' },
      { titulo: 'Honramos a nuestro Padre', descripcion: 'Honramos a nuestro Padre celebrando en cada comunidad solemnemente su fiesta, exponiendo sus virtudes y ejemplos a los fieles, instruyendo a los terciarios, cofrades y otros asociados a nuestra Orden en el conocimiento de su vida y obra; y con el canto de alguna alabanza en su honor después del canto de la Salve sabatina.' },
      { titulo: 'Los santos de la Orden', descripcion: 'Honramos también a los santos de la Orden imitando sus virtudes, dedicándoles, donde sea conveniente, provincias, casas e iglesias y extendiendo su devoción entre los fieles.' },
    ],
  },
  fechas: {
    titulo: 'Fechas importantes',
    descripcion: 'Celebraciones y recuerdos que marcan el camino de la familia mercedaria.',
    tarjetas: [
      { fecha: '7 de enero', titulo: 'San Raimundo de Peñafort', descripcion: 'Recordamos a san Raimundo de Peñafort, quien colaboró con san Pedro Nolasco en la fundación de la Orden de la Merced.' },
      { fecha: '28 de enero', titulo: 'San Pedro Nolasco', descripcion: 'Fiesta de nuestro Padre y fundador, titular de nuestra parroquia. Se celebra solemnemente, dando a conocer sus virtudes y ejemplos a los fieles.' },
      { fecha: '1 de agosto', titulo: 'Aparición de la Virgen de la Merced', descripcion: 'Según la tradición, en 1218 la Virgen María se apareció a san Pedro Nolasco y le inspiró fundar una Orden para rescatar a los cautivos.' },
      { fecha: '10 de agosto', titulo: 'Fundación de la Orden', descripcion: 'En 1218, en Barcelona, san Pedro Nolasco fundó la Orden de la Bienaventurada Virgen María de la Merced de la Redención de los Cautivos.' },
      { fecha: '31 de agosto', titulo: 'San Ramón Nonato', descripcion: 'Religioso mercedario que se entregó por la libertad de los cautivos. Es invocado como patrono de las mujeres embarazadas, las parteras y los recién nacidos.' },
      { fecha: '24 de septiembre', titulo: 'Nuestra Señora de la Merced', descripcion: 'Celebración solemne de la festividad de nuestra santísima Madre de la Merced.' },
    ],
  },
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

// `ajustada` muestra la foto completa, sin recortarla, sobre una copia difuminada de sí misma.
function Slot({ label, src, eager = false, ajustada = false }: { label: string; src?: string; eager?: boolean; ajustada?: boolean }) {
  const [urlFallida, setUrlFallida] = useState<string | null>(null);
  if (src && urlFallida !== src) {
    const fondo = ajustada ? { '--foto-fondo': `url(${JSON.stringify(src)})` } as CSSProperties : undefined;
    return <div className={ajustada ? 'slot slot-ajustada' : 'slot'} style={fondo}>
      <ImagenAmpliable src={src} alt={label} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setUrlFallida(src)} />
    </div>;
  }
  return <div className="slot" role="img" aria-label={label}>{label}</div>;
}

export default function LandingPage() {
  const [active, setActive] = useState(0);
  const [contenido, setContenido] = useState<ContenidoLanding>(CONTENIDO_INICIAL);
  const [tarjetaAbierta, setTarjetaAbierta] = useState<number | null>(null);
  const [oracionAbierta, setOracionAbierta] = useState(false);
  // Una foto subida desde Contenido público tiene prioridad sobre la que trae el sitio.
  const foto = (clave: ClaveImagenLanding) => contenido.imagenes?.[clave] || IMAGENES_PREDETERMINADAS[clave];
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
      if (activo && esContenidoLanding(respuesta)) setContenido({ ...CONTENIDO_INICIAL, ...respuesta });
    }).catch(() => {
      // La landing conserva el contenido inicial si el servicio público no está disponible.
    });
    return () => { activo = false; };
  }, []);

  const parrafosOracion = contenido.devocion.oracion.texto.split(/\n{2,}/).filter(Boolean);
  const tarjetaActual = tarjetaAbierta === null ? undefined : contenido.historia.tarjetas[tarjetaAbierta];

  return (
    <PublicPortalLayout page="landing" activeSection={active} onSectionClick={seleccionarSeccion} nombreParroquia={contenido.nombre_parroquia}
      textoPie={contenido.texto_pie} horariosOficina={contenido.horarios_oficina}>
      <main id="contenido-principal" tabIndex={-1}>
      <section id="home" className="hero" aria-labelledby="titulo-inicio">
        <div className="wrap hero-in">
          <div>
            <div className="kicker">{contenido.lema}</div>
            <h1 id="titulo-inicio">{contenido.titulo_principal}</h1>
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
          <div className="hero-photo"><Slot label={ETIQUETAS_IMAGEN.hero} src={foto('hero')} eager /></div>
        </div>
      </section>

      <section id="quienes-somos" className="sec sec-alt" aria-labelledby="titulo-quienes-somos">
        <div className="wrap">
          <div className="about">
            <div className="about-media">
              <div className="ph ph-tall"><Slot label={ETIQUETAS_IMAGEN.quienes_1} src={foto('quienes_1')} ajustada /></div>
              <div className="ph"><Slot label={ETIQUETAS_IMAGEN.quienes_2} src={foto('quienes_2')} ajustada /></div>
              <div className="ph"><Slot label={ETIQUETAS_IMAGEN.quienes_3} src={foto('quienes_3')} ajustada /></div>
            </div>
            <div>
              <div className="kicker">Quiénes somos</div>
              <h2 id="titulo-quienes-somos" className="h2-lg">{contenido.quienes_somos.titulo}</h2>
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

      <section id="historia" className="sec sec-historia" aria-labelledby="titulo-historia">
        <div className="wrap">
          <div className="sec-head center">
            <div className="kicker">Orden de la Merced</div>
            <h2 id="titulo-historia">{contenido.historia.titulo}</h2>
            <div className="rule" />
            <p className="lede">{contenido.historia.descripcion}</p>
          </div>
          <div className="about historia">
            <div className="about-media historia-media">
              {CLAVES_HISTORIA.map((clave, i) => <div key={clave} className={i === 0 ? 'ph ph-tall' : 'ph'}><Slot label={ETIQUETAS_IMAGEN[clave]} src={foto(clave)} ajustada /></div>)}
            </div>
            {contenido.historia.tarjetas.length > 0 && <div className="qcards">
              {contenido.historia.tarjetas.map((tarjeta, i) => (
                <button type="button" key={`${tarjeta.titulo}-${i}`} className="qcard" aria-haspopup="dialog" onClick={() => setTarjetaAbierta(i)}>
                  <span className="vnum">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{tarjeta.titulo}</h3>
                  {tarjeta.lema && <p className="qcard-lema">“{tarjeta.lema}”</p>}
                  <p>{tarjeta.resumen}</p>
                  <span className="qcard-more" aria-hidden="true">Leer más →</span>
                </button>
              ))}
            </div>}
          </div>
          <Modal open={tarjetaActual !== undefined} title={tarjetaActual?.titulo ?? ''} width={680} onClose={() => setTarjetaAbierta(null)}>
            <div className="qmodal">
              {tarjetaActual?.lema && <p className="qmodal-lema">“{tarjetaActual.lema}”</p>}
              {tarjetaActual?.detalle.split(/\n{2,}/).filter(Boolean).map((parrafo, indice) => <p key={indice}>{parrafo}</p>)}
            </div>
          </Modal>
        </div>
      </section>

      <section id="valores" className="sec" aria-labelledby="titulo-valores">
        <div className="wrap">
          <div className="sec-head center">
            <div className="kicker">Nuestros valores</div>
            <h2 id="titulo-valores">{contenido.valores_encabezado.titulo}</h2>
            <div className="rule" />
            <p className="lede">{contenido.valores_encabezado.descripcion}</p>
          </div>
          <div className="values">
            {contenido.valores.map((v, i) => (
              <article key={v.titulo} className="vcard">
                <div className="vcard-ph"><Slot label={VALORES[i]?.foto ?? `Imagen pendiente para ${v.titulo}`} src={v.imagen || FOTOS_VALORES[i]} ajustada /></div>
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

      <section id="devocion" className="sec sec-devocion" aria-labelledby="titulo-devocion">
        <div className="wrap">
          <div className="sec-head center">
            <div className="kicker">Devoción mariana</div>
            <h2 id="titulo-devocion">{contenido.devocion.titulo}</h2>
            <div className="rule" />
            <p className="lede">{contenido.devocion.descripcion}</p>
          </div>
          <button type="button" className="oracion" aria-haspopup="dialog" onClick={() => setOracionAbierta(true)}>
            <span className="kicker">Oración</span>
            <h3>{contenido.devocion.oracion.titulo}</h3>
            <p>{parrafosOracion[0]}</p>
            <span className="oracion-more" aria-hidden="true">Leer oración completa →</span>
          </button>
          <Modal open={oracionAbierta} title={contenido.devocion.oracion.titulo} width={680} onClose={() => setOracionAbierta(false)}>
            <div className="qmodal qmodal-oracion">
              {parrafosOracion.map((parrafo, indice) => <p key={indice}>{parrafo}</p>)}
            </div>
          </Modal>
          <div className="dcards">
            {contenido.devocion.tarjetas.map((tarjeta, i) => (
              <article key={`${tarjeta.titulo}-${i}`} className="vcard">
                <div className="vcard-ph"><Slot label={`Imagen pendiente para ${tarjeta.titulo}`} src={tarjeta.imagen || undefined} ajustada /></div>
                <div className="vcard-body">
                  <div className="vnum">{String(i + 1).padStart(2, '0')}</div>
                  <h3>{tarjeta.titulo}</h3>
                  <p>{tarjeta.descripcion}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="fechas" className="sec" aria-labelledby="titulo-fechas">
        <div className="wrap">
          <div className="sec-head center">
            <div className="kicker">Orden de la Merced</div>
            <h2 id="titulo-fechas">{contenido.fechas.titulo}</h2>
            <div className="rule" />
            <p className="lede">{contenido.fechas.descripcion}</p>
          </div>
          <div className="values">
            {contenido.fechas.tarjetas.map((fecha, i) => (
              <article key={`${fecha.fecha}-${fecha.titulo}-${i}`} className="vcard">
                <div className="vcard-ph"><Slot label={`Imagen pendiente para ${fecha.titulo}`} src={fecha.imagen || undefined} ajustada /></div>
                <div className="vcard-body">
                  <div className="vnum">{fecha.fecha}</div>
                  <h3>{fecha.titulo}</h3>
                  <p>{fecha.descripcion}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="sec sec-alt" aria-labelledby="titulo-contacto">
        <div className="wrap">
          <div className="contact">
            <div>
              <div className="kicker">Contáctanos</div>
              <h2 id="titulo-contacto" className="h2-lg">{contenido.contacto.titulo}</h2>
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
              <div className="cmap"><Slot label={ETIQUETAS_IMAGEN.entrada} src={foto('entrada')} /></div>
            </div>

            <ContactoForm />
          </div>
        </div>
      </section>
      </main>
    </PublicPortalLayout>
  );
}
