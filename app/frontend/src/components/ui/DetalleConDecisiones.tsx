import type { ReactNode } from 'react';
import Modal from './Modal';
import DecisionesPanel, { fechaDecision, type Decision } from './DecisionesPanel';

export { fechaDecision };
export type { Decision };

interface Props {
  titulo: string;
  endpoint: string;
  campos: Array<{ etiqueta: string; valor: ReactNode }>;
  onClose: () => void;
  returnLabel?: string;
  acciones?: ReactNode;
}

export default function DetalleConDecisiones({ titulo, endpoint, campos, onClose, returnLabel = 'Volver al listado', acciones }: Props) {
  return <Modal open title={titulo} onClose={onClose} returnLabel={returnLabel} width={640}>
    <DecisionesPanel endpoint={endpoint} campos={campos} acciones={acciones} />
  </Modal>;
}
