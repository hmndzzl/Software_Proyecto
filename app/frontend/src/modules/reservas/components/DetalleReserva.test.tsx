import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DetalleReserva from './DetalleReserva';
import type { Reserva } from '../../../types';

vi.mock('../../../api/client', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: [] }) },
}));

const reservaCompleta: Reserva = {
  id: 1,
  fecha: '2026-10-25T10:00:00.000Z',
  hora_inicio: '10:00',
  hora_fin: '11:00',
  evento_titulo: 'Bautismo',
  evento_descripcion: 'Celebración comunitaria',
  espacio_nombre: 'Templo',
  solicitante_nombre: 'Juan Pérez',
  cantidad_personas: 50,
  estado_reserva_id: 2,
};

const reservaMinima: Reserva = {
  id: 2,
  fecha: '2026-10-25T10:00:00.000Z',
  hora_inicio: '10:00',
  hora_fin: '11:00',
  evento_titulo: null as unknown as string,
  evento_descripcion: null as unknown as string,
  espacio_nombre: null as unknown as string,
  solicitante_nombre: null as unknown as string,
  cantidad_personas: null as unknown as number,
  estado_reserva_id: 1,
};

describe('DetalleReserva', () => {
  it('muestra datos completos cuando están presentes', async () => {
    render(<DetalleReserva reserva={reservaCompleta} onClose={vi.fn()} />);
    expect(await screen.findByText('Bautismo')).toBeInTheDocument();
    expect(screen.getByText('Celebración comunitaria')).toBeInTheDocument();
    expect(screen.getByText('Templo')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('muestra textos predeterminados cuando los campos opcionales son nulos', async () => {
    render(<DetalleReserva reserva={reservaMinima} onClose={vi.fn()} />);
    expect(await screen.findByText('Sin título')).toBeInTheDocument();
    expect(screen.getByText('Sin descripción')).toBeInTheDocument();
    expect(screen.getByText('Sin espacio')).toBeInTheDocument();
    expect(screen.getByText('No disponible')).toBeInTheDocument();
    expect(screen.getByText('No registrado')).toBeInTheDocument();
  });
});
