import type { ClaveImagenLanding } from '../../api/landing';
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

// Fotos que trae el sitio. Una foto subida desde Contenido público tiene prioridad sobre ellas.
export const IMAGENES_PREDETERMINADAS: Partial<Record<ClaveImagenLanding, string>> = {
  hero: fachada,
  quienes_1: comunidad,
  quienes_2: celebracion,
  quienes_3: servicio,
  entrada,
};

// Foto predeterminada de cada tarjeta de valores, en el mismo orden que las tarjetas.
export const FOTOS_VALORES: Array<string | undefined> = [feViva, voluntarios, encuentro, grupo, familia, tradicion];

// Descripción de cada espacio de foto fijo: texto alternativo en la landing y etiqueta en el panel.
export const ETIQUETAS_IMAGEN: Record<ClaveImagenLanding, string> = {
  hero: 'Vista exterior de la parroquia',
  quienes_1: 'Miembros de la comunidad parroquial',
  quienes_2: 'Celebración litúrgica',
  quienes_3: 'Ministros de la parroquia',
  historia_1: 'Imagen pendiente: historia de la Orden',
  historia_2: 'Imagen pendiente: escudo mercedario',
  historia_3: 'Imagen pendiente: nuestra historia',
  entrada: 'Entrada a la parroquia',
};

export const CLAVES_HISTORIA = ['historia_1', 'historia_2', 'historia_3'] as const;
