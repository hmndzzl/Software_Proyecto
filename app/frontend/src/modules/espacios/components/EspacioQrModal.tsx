import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Modal from '../../../components/ui/Modal';
import Btn from '../../../components/ui/Btn';
import styles from './EspacioQrModal.module.css';

interface EspacioQrModalProps {
  open: boolean;
  espacio: { id: number; nombre: string } | null;
  onClose: () => void;
}

export default function EspacioQrModal({ open, espacio, onClose }: EspacioQrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!espacio) return null;

  const url = `${window.location.origin}/espacios/${espacio.id}`;

  const descargarPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const enlace = document.createElement('a');
    enlace.download = `qr-${espacio.nombre.toLowerCase().replace(/\s+/g, '-')}.png`;
    enlace.href = canvas.toDataURL('image/png');
    enlace.click();
  };

  return (
    <Modal open={open} title={`Código QR · ${espacio.nombre}`} onClose={onClose} width={380}>
      <div className={styles.wrap}>
        <div className={styles.canvasBox}>
          <QRCodeCanvas ref={canvasRef} value={url} size={220} level="M" marginSize={2} />
        </div>

        <p className={styles.hint}>
          Escanea este código con la cámara del celular, tablet o computadora para abrir
          la reserva de <strong>{espacio.nombre}</strong>.
        </p>
        <p className={styles.url}>{url}</p>

        <div className={styles.actions}>
          <Btn kind="ghost" size="sm" onClick={onClose}>Cerrar</Btn>
          <Btn
            kind="gold"
            size="sm"
            onClick={descargarPng}
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            }
          >
            Descargar PNG
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
