import { useState } from 'react';

export interface Espacio {
  id: number;
  nombre: string;
  capacidad: number | null;
  // imagen_url?: string;  — disponible en futuras implementaciones
}

interface EspacioCardProps {
  espacio: Espacio;
  onClick: (id: number) => void;
}

export default function EspacioCard({ espacio, onClick }: EspacioCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onClick(espacio.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: hovered
          ? '0 8px 24px rgba(0,0,0,0.12)'
          : '0 2px 8px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* Área de imagen — preparada para sprint futuro */}
      <div
        style={{
          height: '120px',
          background: 'linear-gradient(135deg, #FFD900 0%, #FFC200 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: '48px', userSelect: 'none' }}>🏛️</span>
      </div>

      {/* Contenido de la tarjeta */}
      <div style={{ padding: '20px' }}>
        <h3 style={{
          fontSize: '15px',
          fontWeight: 700,
          color: '#222',
          margin: '0 0 10px 0',
          lineHeight: 1.3,
        }}>
          {espacio.nombre}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>👥</span>
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 600 }}>
            {espacio.capacidad != null
              ? `${espacio.capacidad} personas`
              : 'Capacidad no definida'}
          </span>
        </div>

        <div style={{
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <span style={{ fontSize: '12px', color: '#FFB800', fontWeight: 700, letterSpacing: '0.3px' }}>
            Ver detalle →
          </span>
        </div>
      </div>
    </div>
  );
}
