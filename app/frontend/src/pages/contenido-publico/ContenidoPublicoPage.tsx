import { useCallback, useEffect, useState, type FormEvent } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHead } from '../../components/ui/Card';
import Btn from '../../components/ui/Btn';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  actualizarContenidoLanding,
  obtenerContenidoLanding,
  CLAVES_IMAGENES_LANDING,
  type CambiosLanding,
  type ClaveImagenLanding,
  type ContenidoLanding,
  type HorarioMisa,
  type HorarioOficina,
} from '../../api/landing';
import SelectorImagen from './SelectorImagen';
import { ETIQUETAS_IMAGEN, FOTOS_VALORES, IMAGENES_PREDETERMINADAS } from '../landing/imagenesLanding';
import styles from './ContenidoPublicoPage.module.css';
import { getApiErrorMessage } from '../../utils/apiError';

const DEVOCION_VACIA: ContenidoLanding['devocion'] = { titulo: '', descripcion: '', oracion: { titulo: '', texto: '' }, tarjetas: [] };

// El contenido anterior a la sección de devoción no la trae: se edita desde un borrador vacío.
function clonarDevocion(devocion: ContenidoLanding['devocion'] = DEVOCION_VACIA): ContenidoLanding['devocion'] {
  return { ...devocion, oracion: { ...devocion.oracion }, tarjetas: devocion.tarjetas.map((tarjeta) => ({ ...tarjeta })) };
}

const FECHAS_VACIA: ContenidoLanding['fechas'] = { titulo: '', descripcion: '', tarjetas: [] };

function clonarFechas(fechas: ContenidoLanding['fechas'] = FECHAS_VACIA): ContenidoLanding['fechas'] {
  return { ...fechas, tarjetas: fechas.tarjetas.map((tarjeta) => ({ ...tarjeta })) };
}

const HISTORIA_VACIA: ContenidoLanding['historia'] = { titulo: '', descripcion: '', tarjetas: [] };

function clonarHistoria(historia: ContenidoLanding['historia'] = HISTORIA_VACIA): ContenidoLanding['historia'] {
  return { ...historia, tarjetas: historia.tarjetas.map((tarjeta) => ({ ...tarjeta, lema: tarjeta.lema ?? '' })) };
}

function clonarContenido(contenido: ContenidoLanding): ContenidoLanding {
  return {
    ...contenido,
    quienes_somos: { ...contenido.quienes_somos },
    valores_encabezado: { ...contenido.valores_encabezado },
    valores: contenido.valores.map((valor) => ({ ...valor })),
    horarios_misa: contenido.horarios_misa.map((horario) => ({ ...horario, horas: [...horario.horas] })),
    horarios_oficina: contenido.horarios_oficina.map((horario) => ({ ...horario })),
    contacto: { ...contenido.contacto },
    imagenes: { ...contenido.imagenes },
    devocion: clonarDevocion(contenido.devocion),
    historia: clonarHistoria(contenido.historia),
    fechas: clonarFechas(contenido.fechas),
  };
}

function cambiosDeTexto<T extends Record<string, string>>(original: T, borrador: T): Partial<T> {
  const cambios: Partial<T> = {};
  (Object.keys(original) as Array<keyof T>).forEach((campo) => {
    if (original[campo] !== borrador[campo]) cambios[campo] = borrador[campo];
  });
  return cambios;
}

// Todas las claves con '' cuando falta la foto, para comparar sin distinguir «sin dato» de «sin foto».
const completarImagenes = (imagenes: ContenidoLanding['imagenes'] = {}): Record<ClaveImagenLanding, string> =>
  Object.fromEntries(CLAVES_IMAGENES_LANDING.map((clave) => [clave, imagenes[clave] ?? ''])) as Record<ClaveImagenLanding, string>;

function obtenerCambios(original: ContenidoLanding, borrador: ContenidoLanding): CambiosLanding {
  const cambios: CambiosLanding = {};
  const camposSimples: Array<keyof Pick<ContenidoLanding,
    'lema' | 'titulo_principal' | 'descripcion_principal' | 'cantidad_grupos' | 'cantidad_espacios'
  >> = ['lema', 'titulo_principal', 'descripcion_principal', 'cantidad_grupos', 'cantidad_espacios'];

  camposSimples.forEach((campo) => {
    if (original[campo] !== borrador[campo]) Object.assign(cambios, { [campo]: borrador[campo] });
  });

  const quienesSomos = cambiosDeTexto(original.quienes_somos, borrador.quienes_somos);
  if (Object.keys(quienesSomos).length) cambios.quienes_somos = quienesSomos;

  const encabezadoValores = cambiosDeTexto(original.valores_encabezado, borrador.valores_encabezado);
  if (Object.keys(encabezadoValores).length) cambios.valores_encabezado = encabezadoValores;

  const contacto = cambiosDeTexto(original.contacto, borrador.contacto);
  if (Object.keys(contacto).length) cambios.contacto = contacto;

  const origenDevocion = clonarDevocion(original.devocion);
  const devocion: NonNullable<CambiosLanding['devocion']> = cambiosDeTexto(
    { titulo: origenDevocion.titulo, descripcion: origenDevocion.descripcion },
    { titulo: borrador.devocion.titulo, descripcion: borrador.devocion.descripcion },
  );
  const oracion = cambiosDeTexto(origenDevocion.oracion, borrador.devocion.oracion);
  if (Object.keys(oracion).length) devocion.oracion = oracion;
  if (JSON.stringify(origenDevocion.tarjetas) !== JSON.stringify(borrador.devocion.tarjetas)) devocion.tarjetas = borrador.devocion.tarjetas;
  if (Object.keys(devocion).length) cambios.devocion = devocion;

  const origenHistoria = clonarHistoria(original.historia);
  const historia: NonNullable<CambiosLanding['historia']> = cambiosDeTexto(
    { titulo: origenHistoria.titulo, descripcion: origenHistoria.descripcion },
    { titulo: borrador.historia.titulo, descripcion: borrador.historia.descripcion },
  );
  if (JSON.stringify(origenHistoria.tarjetas) !== JSON.stringify(borrador.historia.tarjetas)) historia.tarjetas = borrador.historia.tarjetas;
  if (Object.keys(historia).length) cambios.historia = historia;

  const origenFechas = clonarFechas(original.fechas);
  const fechas: NonNullable<CambiosLanding['fechas']> = cambiosDeTexto(
    { titulo: origenFechas.titulo, descripcion: origenFechas.descripcion },
    { titulo: borrador.fechas.titulo, descripcion: borrador.fechas.descripcion },
  );
  if (JSON.stringify(origenFechas.tarjetas) !== JSON.stringify(borrador.fechas.tarjetas)) fechas.tarjetas = borrador.fechas.tarjetas;
  if (Object.keys(fechas).length) cambios.fechas = fechas;

  const imagenes = cambiosDeTexto(completarImagenes(original.imagenes), completarImagenes(borrador.imagenes));
  if (Object.keys(imagenes).length) cambios.imagenes = imagenes;

  if (JSON.stringify(original.valores) !== JSON.stringify(borrador.valores)) cambios.valores = borrador.valores;
  if (JSON.stringify(original.horarios_misa) !== JSON.stringify(borrador.horarios_misa)) cambios.horarios_misa = borrador.horarios_misa;
  if (JSON.stringify(original.horarios_oficina) !== JSON.stringify(borrador.horarios_oficina)) cambios.horarios_oficina = borrador.horarios_oficina;

  return cambios;
}

interface CampoTextoProps {
  id: string;
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  maxLength: number;
  requerido?: boolean;
  multilinea?: boolean;
  filas?: number;
  tipo?: 'email' | 'tel' | 'text';
  ayuda?: string;
}

function CampoTexto({ id, etiqueta, valor, alCambiar, maxLength, requerido = false, multilinea = false, filas = 4, tipo = 'text', ayuda }: CampoTextoProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {etiqueta}{requerido && <span aria-hidden="true"> *</span>}
      </label>
      {multilinea ? (
        <textarea id={id} className={styles.textarea} value={valor} required={requerido} maxLength={maxLength}
          onChange={(event) => alCambiar(event.target.value)} rows={filas} />
      ) : (
        <input id={id} className={styles.input} type={tipo} value={valor} required={requerido} maxLength={maxLength}
          onChange={(event) => alCambiar(event.target.value)} />
      )}
      {ayuda && <small className={styles.help}>{ayuda}</small>}
    </div>
  );
}

export default function ContenidoPublicoPage() {
  const [original, setOriginal] = useState<ContenidoLanding | null>(null);
  const [borrador, setBorrador] = useState<ContenidoLanding | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [confirmacionBorrador, setConfirmacionBorrador] = useState<{ descripcion: string; etiqueta: string; ejecutar: () => void | Promise<void> } | null>(null);

  const pedirConfirmacion = (descripcion: string, etiqueta: string, ejecutar: () => void | Promise<void>) => {
    setConfirmacionBorrador({ descripcion, etiqueta, ejecutar });
  };

  const cargarContenido = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const contenido = await obtenerContenidoLanding();
      setOriginal(clonarContenido(contenido));
      setBorrador(clonarContenido(contenido));
    } catch (errorCarga) {
      setError(getApiErrorMessage(errorCarga, 'No se pudo cargar el contenido público. Intenta nuevamente.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarContenido();
  }, [cargarContenido]);

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!original || !borrador || guardando) return;

    const cambios = obtenerCambios(original, borrador);
    if (!Object.keys(cambios).length) {
      setMensaje('No hay cambios pendientes por publicar.');
      setError('');
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      await actualizarContenidoLanding(cambios);
      try {
        const contenidoActualizado = await obtenerContenidoLanding();
        setOriginal(clonarContenido(contenidoActualizado));
        setBorrador(clonarContenido(contenidoActualizado));
      } catch {
        // El PATCH ya confirmó la publicación; se conserva el borrador hasta la próxima recarga.
        setOriginal(clonarContenido(borrador));
      }
      setMensaje('Los cambios se publicaron y ya están disponibles en el portal.');
    } catch (errorGuardado) {
      setError(getApiErrorMessage(errorGuardado, 'No se pudieron publicar los cambios. Tus datos permanecen en el formulario.'));
    } finally {
      setGuardando(false);
    }
  };

  const actualizar = (cambio: (contenido: ContenidoLanding) => ContenidoLanding) => {
    setBorrador((contenido) => contenido ? cambio(contenido) : contenido);
    setMensaje('');
  };

  const eliminarValor = (indice: number, titulo: string) => pedirConfirmacion(
    `¿Eliminar el valor «${titulo || `Valor ${indice + 1}`}» del borrador?`, 'Eliminar valor',
    () => actualizar((contenido) => ({
      ...contenido, valores: contenido.valores.filter((_, posicion) => posicion !== indice),
    })),
  );

  const cambiarImagen = (clave: ClaveImagenLanding) => (url: string) => actualizar((contenido) => ({
    ...contenido, imagenes: { ...contenido.imagenes, [clave]: url },
  }));

  const eliminarFecha = (indice: number, titulo: string) => pedirConfirmacion(
    `¿Eliminar la fecha «${titulo || `Fecha ${indice + 1}`}» de las fechas importantes del borrador?`, 'Eliminar fecha',
    () => actualizar((contenido) => ({
      ...contenido, fechas: { ...contenido.fechas, tarjetas: contenido.fechas.tarjetas.filter((_, posicion) => posicion !== indice) },
    })),
  );

  const eliminarTarjetaHistoria = (indice: number, titulo: string) => pedirConfirmacion(
    `¿Eliminar la tarjeta «${titulo || `Tarjeta ${indice + 1}`}» de Nuestra historia del borrador?`, 'Eliminar tarjeta',
    () => actualizar((contenido) => ({
      ...contenido, historia: { ...contenido.historia, tarjetas: contenido.historia.tarjetas.filter((_, posicion) => posicion !== indice) },
    })),
  );

  const eliminarTarjeta = (indice: number, titulo: string) => pedirConfirmacion(
    `¿Eliminar la tarjeta «${titulo || `Tarjeta ${indice + 1}`}» de la devoción del borrador?`, 'Eliminar tarjeta',
    () => actualizar((contenido) => ({
      ...contenido, devocion: { ...contenido.devocion, tarjetas: contenido.devocion.tarjetas.filter((_, posicion) => posicion !== indice) },
    })),
  );

  if (cargando && !borrador) {
    return (
      <div className={styles.page} aria-busy="true">
        <PageHeader kicker="Portal público" title="Contenido público" subtitle="Cargando la información editorial del portal." />
        <p className={styles.loading} role="status">Cargando contenido…</p>
      </div>
    );
  }

  if (!borrador) {
    return (
      <div className={styles.page}>
        <PageHeader kicker="Portal público" title="Contenido público" subtitle="Administra la información mostrada en la landing." />
        <div className={styles.error} role="alert">{error}</div>
        <Btn kind="primary" onClick={() => void cargarContenido()}>Reintentar</Btn>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Portal público"
        title="Contenido público"
        subtitle="Edita los textos, cifras, historia, valores, devoción mariana, fechas importantes, horarios y datos de contacto que se publican en la landing."
        actions={<Btn kind="ghost" onClick={() => pedirConfirmacion('¿Descartar todos los cambios que todavía no has publicado?', 'Descartar cambios', cargarContenido)} disabled={guardando}>Descartar cambios</Btn>}
      />

      <div className={styles.notice}>
        <strong>Publicación inmediata.</strong> Al guardar, los cambios se verán en el portal público. El nombre de la parroquia y el texto del pie se administran desde la base de contenido y no se editan aquí.
      </div>

      {mensaje && <p className={styles.success} role="status">{mensaje}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      <form className={styles.form} onSubmit={guardar} aria-busy={guardando}>
        <fieldset className={styles.fieldset} disabled={guardando}>
          <Card>
            <CardHead title="Presentación principal" />
            <CardBody className={styles.cardBody}>
              <div className={styles.grid}>
                <CampoTexto id="lema" etiqueta="Lema" valor={borrador.lema} requerido maxLength={255}
                  alCambiar={(lema) => actualizar((contenido) => ({ ...contenido, lema }))} />
                <CampoTexto id="titulo-principal" etiqueta="Título principal" valor={borrador.titulo_principal} requerido maxLength={255}
                  alCambiar={(titulo_principal) => actualizar((contenido) => ({ ...contenido, titulo_principal }))} />
              </div>
              <CampoTexto id="descripcion-principal" etiqueta="Descripción principal" valor={borrador.descripcion_principal} requerido multilinea maxLength={5000}
                alCambiar={(descripcion_principal) => actualizar((contenido) => ({ ...contenido, descripcion_principal }))} />
              <SelectorImagen etiqueta="Foto principal de la portada" valor={borrador.imagenes?.hero} predeterminada={IMAGENES_PREDETERMINADAS.hero}
                alCambiar={cambiarImagen('hero')} />
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Quiénes somos" />
            <CardBody className={styles.cardBody}>
              <CampoTexto id="quienes-titulo" etiqueta="Título" valor={borrador.quienes_somos.titulo} requerido maxLength={255}
                alCambiar={(titulo) => actualizar((contenido) => ({ ...contenido, quienes_somos: { ...contenido.quienes_somos, titulo } }))} />
              <CampoTexto id="quienes-descripcion" etiqueta="Descripción" valor={borrador.quienes_somos.descripcion} requerido multilinea maxLength={5000}
                alCambiar={(descripcion) => actualizar((contenido) => ({ ...contenido, quienes_somos: { ...contenido.quienes_somos, descripcion } }))} />
              <div className={styles.grid}>
                <CampoTexto id="quienes-mision" etiqueta="Nuestra misión" valor={borrador.quienes_somos.mision} requerido multilinea maxLength={5000}
                  alCambiar={(mision) => actualizar((contenido) => ({ ...contenido, quienes_somos: { ...contenido.quienes_somos, mision } }))} />
                <CampoTexto id="quienes-comunidad" etiqueta="Nuestra comunidad" valor={borrador.quienes_somos.comunidad} requerido multilinea maxLength={5000}
                  alCambiar={(comunidad) => actualizar((contenido) => ({ ...contenido, quienes_somos: { ...contenido.quienes_somos, comunidad } }))} />
              </div>
              <CampoTexto id="quienes-servicio" etiqueta="Nuestro servicio" valor={borrador.quienes_somos.servicio} requerido multilinea maxLength={5000}
                alCambiar={(servicio) => actualizar((contenido) => ({ ...contenido, quienes_somos: { ...contenido.quienes_somos, servicio } }))} />
              <h2 className={styles.subheading}>Fotografías</h2>
              <div className={styles.dynamicList}>
                {(['quienes_1', 'quienes_2', 'quienes_3'] as const).map((clave) => (
                  <SelectorImagen key={clave} etiqueta={ETIQUETAS_IMAGEN[clave]} valor={borrador.imagenes?.[clave]}
                    predeterminada={IMAGENES_PREDETERMINADAS[clave]} alCambiar={cambiarImagen(clave)} />
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Nuestra historia" />
            <CardBody className={styles.cardBody}>
              <div className={styles.grid}>
                <CampoTexto id="historia-titulo" etiqueta="Título de la sección" valor={borrador.historia.titulo} requerido maxLength={255}
                  alCambiar={(titulo) => actualizar((contenido) => ({ ...contenido, historia: { ...contenido.historia, titulo } }))} />
                <CampoTexto id="historia-descripcion" etiqueta="Descripción de la sección" valor={borrador.historia.descripcion} requerido multilinea maxLength={5000}
                  alCambiar={(descripcion) => actualizar((contenido) => ({ ...contenido, historia: { ...contenido.historia, descripcion } }))} />
              </div>
              <h2 className={styles.subheading}>Fotografías</h2>
              <div className={styles.dynamicList}>
                {(['historia_1', 'historia_2', 'historia_3'] as const).map((clave, indice) => (
                  <SelectorImagen key={clave} etiqueta={`Foto ${indice + 1} de nuestra historia`} valor={borrador.imagenes?.[clave]}
                    alCambiar={cambiarImagen(clave)} />
                ))}
              </div>
              <div className={styles.dynamicHeader}>
                <div>
                  <h2 className={styles.subheading}>Tarjetas informativas</h2>
                  <p className={styles.help}>Al hacer clic, cada tarjeta se abre al centro con el detalle. Deja una línea en blanco entre párrafos. Hasta 6 tarjetas.</p>
                </div>
                <Btn type="button" kind="ghost" size="sm" disabled={borrador.historia.tarjetas.length >= 6}
                  onClick={() => actualizar((contenido) => ({ ...contenido, historia: { ...contenido.historia, tarjetas: [...contenido.historia.tarjetas, { titulo: '', lema: '', resumen: '', detalle: '' }] } }))}>
                  Agregar tarjeta informativa
                </Btn>
              </div>
              <div className={styles.dynamicList}>
                {borrador.historia.tarjetas.map((tarjeta, indice) => {
                  const editar = (campo: 'titulo' | 'lema' | 'resumen' | 'detalle') => (valor: string) => actualizar((contenido) => ({
                    ...contenido,
                    historia: { ...contenido.historia, tarjetas: contenido.historia.tarjetas.map((item, posicion) => posicion === indice ? { ...item, [campo]: valor } : item) },
                  }));
                  return (
                    <article className={styles.dynamicItem} key={`historia-tarjeta-${indice}`}>
                      <div className={styles.itemHeader}>
                        <h3>Tarjeta informativa {String(indice + 1).padStart(2, '0')}</h3>
                        <Btn type="button" kind="bad" size="sm" onClick={() => eliminarTarjetaHistoria(indice, tarjeta.titulo)}>Eliminar</Btn>
                      </div>
                      <CampoTexto id={`historia-tarjeta-titulo-${indice}`} etiqueta="Título" valor={tarjeta.titulo} requerido maxLength={255} alCambiar={editar('titulo')} />
                      <CampoTexto id={`historia-tarjeta-lema-${indice}`} etiqueta="Lema (opcional)" valor={tarjeta.lema} maxLength={255} ayuda="Se muestra entre comillas debajo del título." alCambiar={editar('lema')} />
                      <CampoTexto id={`historia-tarjeta-resumen-${indice}`} etiqueta="Resumen de la tarjeta" valor={tarjeta.resumen} requerido multilinea maxLength={1000} alCambiar={editar('resumen')} />
                      <CampoTexto id={`historia-tarjeta-detalle-${indice}`} etiqueta="Detalle al abrir" valor={tarjeta.detalle} requerido multilinea filas={10} maxLength={10000} alCambiar={editar('detalle')} />
                    </article>
                  );
                })}
                {!borrador.historia.tarjetas.length && <p className={styles.empty}>No hay tarjetas informativas publicadas.</p>}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Cifras de la comunidad" />
            <CardBody className={styles.cardBody}>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="cantidad-grupos">Grupos pastorales <span aria-hidden="true">*</span></label>
                  <input id="cantidad-grupos" className={styles.input} type="number" min="0" max="1000000" required value={borrador.cantidad_grupos}
                    onChange={(event) => actualizar((contenido) => ({ ...contenido, cantidad_grupos: Number(event.target.value) }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="cantidad-espacios">Espacios parroquiales <span aria-hidden="true">*</span></label>
                  <input id="cantidad-espacios" className={styles.input} type="number" min="0" max="1000000" required value={borrador.cantidad_espacios}
                    onChange={(event) => actualizar((contenido) => ({ ...contenido, cantidad_espacios: Number(event.target.value) }))} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Nuestros valores" />
            <CardBody className={styles.cardBody}>
              <div className={styles.grid}>
                <CampoTexto id="valores-titulo" etiqueta="Título de la sección" valor={borrador.valores_encabezado.titulo} requerido maxLength={255}
                  alCambiar={(titulo) => actualizar((contenido) => ({ ...contenido, valores_encabezado: { ...contenido.valores_encabezado, titulo } }))} />
                <CampoTexto id="valores-descripcion" etiqueta="Descripción de la sección" valor={borrador.valores_encabezado.descripcion} requerido multilinea maxLength={5000}
                  alCambiar={(descripcion) => actualizar((contenido) => ({ ...contenido, valores_encabezado: { ...contenido.valores_encabezado, descripcion } }))} />
              </div>
              <div className={styles.dynamicHeader}>
                <div>
                  <h2 className={styles.subheading}>Tarjetas de valores</h2>
                  <p className={styles.help}>Puedes publicar hasta 20 valores o dejar la lista vacía.</p>
                </div>
                <Btn type="button" kind="ghost" size="sm" disabled={borrador.valores.length >= 20}
                  onClick={() => actualizar((contenido) => ({ ...contenido, valores: [...contenido.valores, { titulo: '', descripcion: '' }] }))}>
                  Agregar valor
                </Btn>
              </div>
              <div className={styles.dynamicList}>
                {borrador.valores.map((valor, indice) => (
                  <article className={styles.dynamicItem} key={`valor-${indice}`}>
                    <div className={styles.itemHeader}>
                      <h3>Valor {String(indice + 1).padStart(2, '0')}</h3>
                      <Btn type="button" kind="bad" size="sm" onClick={() => eliminarValor(indice, valor.titulo)}>Eliminar</Btn>
                    </div>
                    <div className={styles.grid}>
                      <CampoTexto id={`valor-titulo-${indice}`} etiqueta="Título" valor={valor.titulo} requerido maxLength={255}
                        alCambiar={(titulo) => actualizar((contenido) => ({ ...contenido, valores: contenido.valores.map((item, posicion) => posicion === indice ? { ...item, titulo } : item) }))} />
                      <CampoTexto id={`valor-descripcion-${indice}`} etiqueta="Descripción" valor={valor.descripcion} requerido multilinea maxLength={2000}
                        alCambiar={(descripcion) => actualizar((contenido) => ({ ...contenido, valores: contenido.valores.map((item, posicion) => posicion === indice ? { ...item, descripcion } : item) }))} />
                    </div>
                    <SelectorImagen etiqueta={`Foto de «${valor.titulo || `valor ${indice + 1}`}»`} valor={valor.imagen} predeterminada={FOTOS_VALORES[indice]}
                      alCambiar={(imagen) => actualizar((contenido) => ({ ...contenido, valores: contenido.valores.map((item, posicion) => posicion === indice ? { ...item, imagen } : item) }))} />
                  </article>
                ))}
                {!borrador.valores.length && <p className={styles.empty}>No hay valores publicados.</p>}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Devoción a la Santísima Madre de la Merced" />
            <CardBody className={styles.cardBody}>
              <div className={styles.grid}>
                <CampoTexto id="devocion-titulo" etiqueta="Título de la sección" valor={borrador.devocion.titulo} requerido maxLength={255}
                  alCambiar={(titulo) => actualizar((contenido) => ({ ...contenido, devocion: { ...contenido.devocion, titulo } }))} />
                <CampoTexto id="devocion-descripcion" etiqueta="Descripción de la sección" valor={borrador.devocion.descripcion} requerido multilinea maxLength={5000}
                  alCambiar={(descripcion) => actualizar((contenido) => ({ ...contenido, devocion: { ...contenido.devocion, descripcion } }))} />
              </div>
              <h2 className={styles.subheading}>Oración</h2>
              <CampoTexto id="oracion-titulo" etiqueta="Título de la oración" valor={borrador.devocion.oracion.titulo} requerido maxLength={255}
                alCambiar={(titulo) => actualizar((contenido) => ({ ...contenido, devocion: { ...contenido.devocion, oracion: { ...contenido.devocion.oracion, titulo } } }))} />
              <CampoTexto id="oracion-texto" etiqueta="Texto de la oración" valor={borrador.devocion.oracion.texto} requerido multilinea filas={12} maxLength={10000}
                ayuda="Deja una línea en blanco entre párrafos."
                alCambiar={(texto) => actualizar((contenido) => ({ ...contenido, devocion: { ...contenido.devocion, oracion: { ...contenido.devocion.oracion, texto } } }))} />
              <div className={styles.dynamicHeader}>
                <div>
                  <h2 className={styles.subheading}>Tarjetas de devoción</h2>
                  <p className={styles.help}>Se muestran después de la oración. Puedes publicar hasta 20 tarjetas o dejar la lista vacía.</p>
                </div>
                <Btn type="button" kind="ghost" size="sm" disabled={borrador.devocion.tarjetas.length >= 20}
                  onClick={() => actualizar((contenido) => ({ ...contenido, devocion: { ...contenido.devocion, tarjetas: [...contenido.devocion.tarjetas, { titulo: '', descripcion: '' }] } }))}>
                  Agregar tarjeta
                </Btn>
              </div>
              <div className={styles.dynamicList}>
                {borrador.devocion.tarjetas.map((tarjeta, indice) => (
                  <article className={styles.dynamicItem} key={`tarjeta-${indice}`}>
                    <div className={styles.itemHeader}>
                      <h3>Tarjeta {String(indice + 1).padStart(2, '0')}</h3>
                      <Btn type="button" kind="bad" size="sm" onClick={() => eliminarTarjeta(indice, tarjeta.titulo)}>Eliminar</Btn>
                    </div>
                    <div className={styles.grid}>
                      <CampoTexto id={`tarjeta-titulo-${indice}`} etiqueta="Título" valor={tarjeta.titulo} requerido maxLength={255}
                        alCambiar={(titulo) => actualizar((contenido) => ({ ...contenido, devocion: { ...contenido.devocion, tarjetas: contenido.devocion.tarjetas.map((item, posicion) => posicion === indice ? { ...item, titulo } : item) } }))} />
                      <CampoTexto id={`tarjeta-descripcion-${indice}`} etiqueta="Descripción" valor={tarjeta.descripcion} requerido multilinea filas={6} maxLength={2000}
                        alCambiar={(descripcion) => actualizar((contenido) => ({ ...contenido, devocion: { ...contenido.devocion, tarjetas: contenido.devocion.tarjetas.map((item, posicion) => posicion === indice ? { ...item, descripcion } : item) } }))} />
                    </div>
                    <SelectorImagen etiqueta={`Foto de «${tarjeta.titulo || `tarjeta ${indice + 1}`}»`} valor={tarjeta.imagen}
                      alCambiar={(imagen) => actualizar((contenido) => ({ ...contenido, devocion: { ...contenido.devocion, tarjetas: contenido.devocion.tarjetas.map((item, posicion) => posicion === indice ? { ...item, imagen } : item) } }))} />
                  </article>
                ))}
                {!borrador.devocion.tarjetas.length && <p className={styles.empty}>No hay tarjetas de devoción publicadas.</p>}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Fechas importantes" />
            <CardBody className={styles.cardBody}>
              <div className={styles.grid}>
                <CampoTexto id="fechas-titulo" etiqueta="Título de la sección" valor={borrador.fechas.titulo} requerido maxLength={255}
                  alCambiar={(titulo) => actualizar((contenido) => ({ ...contenido, fechas: { ...contenido.fechas, titulo } }))} />
                <CampoTexto id="fechas-descripcion" etiqueta="Descripción de la sección" valor={borrador.fechas.descripcion} requerido multilinea maxLength={5000}
                  alCambiar={(descripcion) => actualizar((contenido) => ({ ...contenido, fechas: { ...contenido.fechas, descripcion } }))} />
              </div>
              <div className={styles.dynamicHeader}>
                <div>
                  <h2 className={styles.subheading}>Fechas</h2>
                  <p className={styles.help}>Cada fecha se muestra como una tarjeta con espacio para foto. Puedes publicar hasta 12 o dejar la lista vacía.</p>
                </div>
                <Btn type="button" kind="ghost" size="sm" disabled={borrador.fechas.tarjetas.length >= 12}
                  onClick={() => actualizar((contenido) => ({ ...contenido, fechas: { ...contenido.fechas, tarjetas: [...contenido.fechas.tarjetas, { fecha: '', titulo: '', descripcion: '' }] } }))}>
                  Agregar fecha
                </Btn>
              </div>
              <div className={styles.dynamicList}>
                {borrador.fechas.tarjetas.map((tarjeta, indice) => {
                  const editar = (campo: 'fecha' | 'titulo' | 'descripcion' | 'imagen') => (valor: string) => actualizar((contenido) => ({
                    ...contenido,
                    fechas: { ...contenido.fechas, tarjetas: contenido.fechas.tarjetas.map((item, posicion) => posicion === indice ? { ...item, [campo]: valor } : item) },
                  }));
                  return (
                    <article className={styles.dynamicItem} key={`fecha-${indice}`}>
                      <div className={styles.itemHeader}>
                        <h3>Fecha {String(indice + 1).padStart(2, '0')}</h3>
                        <Btn type="button" kind="bad" size="sm" onClick={() => eliminarFecha(indice, tarjeta.titulo)}>Eliminar</Btn>
                      </div>
                      <div className={styles.grid}>
                        <CampoTexto id={`fecha-tarjeta-fecha-${indice}`} etiqueta="Fecha" valor={tarjeta.fecha} requerido maxLength={255} ayuda="Por ejemplo: 24 de septiembre." alCambiar={editar('fecha')} />
                        <CampoTexto id={`fecha-tarjeta-titulo-${indice}`} etiqueta="Título" valor={tarjeta.titulo} requerido maxLength={255} alCambiar={editar('titulo')} />
                      </div>
                      <CampoTexto id={`fecha-tarjeta-descripcion-${indice}`} etiqueta="Descripción" valor={tarjeta.descripcion} requerido multilinea maxLength={2000} alCambiar={editar('descripcion')} />
                      <SelectorImagen etiqueta={`Foto de «${tarjeta.titulo || `fecha ${indice + 1}`}»`} valor={tarjeta.imagen} alCambiar={editar('imagen')} />
                    </article>
                  );
                })}
                {!borrador.fechas.tarjetas.length && <p className={styles.empty}>No hay fechas importantes publicadas.</p>}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Horarios" />
            <CardBody className={styles.cardBody}>
              <div className={styles.scheduleColumns}>
                <section aria-labelledby="horarios-misa-titulo">
                  <div className={styles.dynamicHeader}>
                    <div>
                      <h2 id="horarios-misa-titulo" className={styles.subheading}>Misas</h2>
                      <p className={styles.help}>Cada día de misa necesita al menos una hora.</p>
                    </div>
                    <Btn type="button" kind="ghost" size="sm" disabled={borrador.horarios_misa.length >= 30}
                      onClick={() => actualizar((contenido) => ({ ...contenido, horarios_misa: [...contenido.horarios_misa, { dias: '', horas: [''] }] }))}>
                      Agregar horario
                    </Btn>
                  </div>
                  <div className={styles.dynamicList}>
                    {borrador.horarios_misa.map((horario, indice) => (
                      <HorarioMisaEditor key={`misa-${indice}`} horario={horario} indice={indice}
                        pedirConfirmacion={pedirConfirmacion}
                        alCambiar={(nuevoHorario) => actualizar((contenido) => ({ ...contenido, horarios_misa: contenido.horarios_misa.map((item, posicion) => posicion === indice ? nuevoHorario : item) }))}
                        alEliminar={() => pedirConfirmacion(`¿Eliminar el horario de misa ${indice + 1} del borrador?`, 'Eliminar horario', () => actualizar((contenido) => ({ ...contenido, horarios_misa: contenido.horarios_misa.filter((_, posicion) => posicion !== indice) })))} />
                    ))}
                    {!borrador.horarios_misa.length && <p className={styles.empty}>No hay horarios de misa publicados.</p>}
                  </div>
                </section>

                <section aria-labelledby="horarios-oficina-titulo">
                  <div className={styles.dynamicHeader}>
                    <div>
                      <h2 id="horarios-oficina-titulo" className={styles.subheading}>Oficina parroquial</h2>
                      <p className={styles.help}>El horario acepta texto para representar rangos.</p>
                    </div>
                    <Btn type="button" kind="ghost" size="sm" disabled={borrador.horarios_oficina.length >= 30}
                      onClick={() => actualizar((contenido) => ({ ...contenido, horarios_oficina: [...contenido.horarios_oficina, { dias: '', horario: '' }] }))}>
                      Agregar horario
                    </Btn>
                  </div>
                  <div className={styles.dynamicList}>
                    {borrador.horarios_oficina.map((horario, indice) => (
                      <HorarioOficinaEditor key={`oficina-${indice}`} horario={horario} indice={indice}
                        alCambiar={(nuevoHorario) => actualizar((contenido) => ({ ...contenido, horarios_oficina: contenido.horarios_oficina.map((item, posicion) => posicion === indice ? nuevoHorario : item) }))}
                        alEliminar={() => pedirConfirmacion(`¿Eliminar el horario de oficina ${indice + 1} del borrador?`, 'Eliminar horario', () => actualizar((contenido) => ({ ...contenido, horarios_oficina: contenido.horarios_oficina.filter((_, posicion) => posicion !== indice) })))} />
                    ))}
                    {!borrador.horarios_oficina.length && <p className={styles.empty}>No hay horarios de oficina publicados.</p>}
                  </div>
                </section>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Contacto" />
            <CardBody className={styles.cardBody}>
              <div className={styles.grid}>
                <CampoTexto id="contacto-titulo" etiqueta="Título" valor={borrador.contacto.titulo} requerido maxLength={255}
                  alCambiar={(titulo) => actualizar((contenido) => ({ ...contenido, contacto: { ...contenido.contacto, titulo } }))} />
                <CampoTexto id="contacto-correo" etiqueta="Correo electrónico" valor={borrador.contacto.correo} tipo="email" maxLength={255}
                  alCambiar={(correo) => actualizar((contenido) => ({ ...contenido, contacto: { ...contenido.contacto, correo } }))} />
                <CampoTexto id="contacto-direccion" etiqueta="Dirección" valor={borrador.contacto.direccion} multilinea maxLength={1000}
                  alCambiar={(direccion) => actualizar((contenido) => ({ ...contenido, contacto: { ...contenido.contacto, direccion } }))} />
                <CampoTexto id="contacto-telefono" etiqueta="Teléfono" valor={borrador.contacto.telefono} tipo="tel" maxLength={50}
                  ayuda="Puedes usar dígitos, espacios, guiones, paréntesis y el prefijo +."
                  alCambiar={(telefono) => actualizar((contenido) => ({ ...contenido, contacto: { ...contenido.contacto, telefono } }))} />
              </div>
              <SelectorImagen etiqueta="Foto de la entrada a la parroquia" valor={borrador.imagenes?.entrada} predeterminada={IMAGENES_PREDETERMINADAS.entrada}
                alCambiar={cambiarImagen('entrada')} />
            </CardBody>
          </Card>
        </fieldset>

        <div className={styles.actions}>
          <Btn type="submit" kind="primary" disabled={guardando}>{guardando ? 'Publicando…' : 'Guardar y publicar cambios'}</Btn>
        </div>
      </form>
      <ConfirmDialog open={confirmacionBorrador !== null} title={confirmacionBorrador?.etiqueta ?? 'Confirmar acción'}
        confirmLabel={confirmacionBorrador?.etiqueta ?? 'Confirmar'} description={confirmacionBorrador?.descripcion ?? ''}
        onCancel={() => setConfirmacionBorrador(null)} onConfirm={async () => {
          if (!confirmacionBorrador) return;
          await confirmacionBorrador.ejecutar();
          setConfirmacionBorrador(null);
        }} />
    </div>
  );
}

interface HorarioMisaEditorProps {
  horario: HorarioMisa;
  indice: number;
  pedirConfirmacion: (descripcion: string, etiqueta: string, ejecutar: () => void | Promise<void>) => void;
  alCambiar: (horario: HorarioMisa) => void;
  alEliminar: () => void;
}

function HorarioMisaEditor({ horario, indice, pedirConfirmacion, alCambiar, alEliminar }: HorarioMisaEditorProps) {
  const actualizarHora = (posicion: number, hora: string) => alCambiar({
    ...horario,
    horas: horario.horas.map((actual, indiceHora) => indiceHora === posicion ? hora : actual),
  });

  return (
    <article className={styles.dynamicItem}>
      <div className={styles.itemHeader}>
        <h3>Horario de misa {indice + 1}</h3>
        <Btn type="button" kind="bad" size="sm" onClick={alEliminar}>Eliminar</Btn>
      </div>
      <CampoTexto id={`misa-dias-${indice}`} etiqueta="Días" valor={horario.dias} requerido maxLength={255}
        alCambiar={(dias) => alCambiar({ ...horario, dias })} />
      <div className={styles.field}>
        <span className={styles.label}>Horas <span aria-hidden="true">*</span></span>
        <div className={styles.timeList}>
          {horario.horas.map((hora, indiceHora) => (
            <div className={styles.timeRow} key={`misa-${indice}-hora-${indiceHora}`}>
              <input className={styles.timeInput} type="time" required value={hora}
                aria-label={`Hora ${indiceHora + 1} del horario de misa ${indice + 1}`}
                onChange={(event) => actualizarHora(indiceHora, event.target.value)} />
              <button type="button" className={styles.removeText} disabled={horario.horas.length === 1}
                aria-label={`Eliminar hora ${indiceHora + 1} del horario de misa ${indice + 1}`}
                onClick={() => pedirConfirmacion(`¿Quitar la hora ${hora || indiceHora + 1} del horario de misa ${indice + 1}?`, 'Quitar hora', () => alCambiar({ ...horario, horas: horario.horas.filter((_, posicion) => posicion !== indiceHora) }))}>Quitar</button>
            </div>
          ))}
          <button type="button" className={styles.addText} disabled={horario.horas.length >= 24}
            onClick={() => alCambiar({ ...horario, horas: [...horario.horas, ''] })}>+ Agregar hora</button>
        </div>
      </div>
    </article>
  );
}

interface HorarioOficinaEditorProps {
  horario: HorarioOficina;
  indice: number;
  alCambiar: (horario: HorarioOficina) => void;
  alEliminar: () => void;
}

function HorarioOficinaEditor({ horario, indice, alCambiar, alEliminar }: HorarioOficinaEditorProps) {
  return (
    <article className={styles.dynamicItem}>
      <div className={styles.itemHeader}>
        <h3>Horario de oficina {indice + 1}</h3>
        <Btn type="button" kind="bad" size="sm" onClick={alEliminar}>Eliminar</Btn>
      </div>
      <CampoTexto id={`oficina-dias-${indice}`} etiqueta="Días" valor={horario.dias} requerido maxLength={255}
        alCambiar={(dias) => alCambiar({ ...horario, dias })} />
      <CampoTexto id={`oficina-horario-${indice}`} etiqueta="Horario" valor={horario.horario} requerido maxLength={500}
        alCambiar={(nuevoHorario) => alCambiar({ ...horario, horario: nuevoHorario })} />
    </article>
  );
}
