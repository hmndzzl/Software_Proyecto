import { useState } from 'react';

interface Props { nombre: string; fotoUrl?: string | null; className: string }

export default function Avatar({ nombre, fotoUrl, className }: Props) {
  const [fallida, setFallida] = useState<string | null>(null);
  const valida = fotoUrl && /^\/uploads\/perfiles\/subidas\/[a-f0-9-]{36}\.webp$/.test(fotoUrl) ? fotoUrl : null;
  const iniciales = nombre.split(' ').filter(Boolean).slice(0, 2).map(palabra => palabra[0].toUpperCase()).join('') || '—';
  return <div className={className}>
    {valida && fallida !== valida
      ? <img src={valida} alt={`Foto de ${nombre}`} onError={() => setFallida(valida)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', display: 'block' }} />
      : <span aria-label={`Iniciales de ${nombre}`}>{iniciales}</span>}
  </div>;
}
