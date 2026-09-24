import apiClient from './client';

export interface AusenciaInput {
  ministro_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  titulo: string;
  justificacion: string;
}

export async function notificarAusencia(ausencia: AusenciaInput) {
  await apiClient.post('/api/ausencias', ausencia);
}
