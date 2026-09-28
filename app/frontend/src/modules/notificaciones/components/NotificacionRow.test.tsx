import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import NotificacionRow from './NotificacionRow';
import type { Notificacion } from '../../../types';

const base: Notificacion = {
  id: 1,
  mensaje: 'Nombre: Prueba\nMotivo: Información general\nMensaje: Hola',
  fecha: '2026-10-01',
  tipo: 'individual',
  remitente_id: null,
  remitente_nombre: null,
  grupo_id: null,
  leida: false,
  evento_id: null,
  evento_descripcion: null,
  requiere_confirmacion: false,
  asistencia_confirmada: false,
  motivo_excusa: null,
};

function mostrar(notificacion: Notificacion, props: {
  onMarcarLeida?: (id: number) => void;
  onMarcarNoLeida?: (id: number) => void;
  onEliminar?: (id: number) => void;
} = {}) {
  const onMarcarLeida = props.onMarcarLeida ?? vi.fn();
  const onMarcarNoLeida = props.onMarcarNoLeida ?? vi.fn();
  const onEliminar = props.onEliminar ?? vi.fn();
  render(
    <table>
      <tbody>
        <NotificacionRow
          notificacion={notificacion}
          onMarcarLeida={onMarcarLeida}
          onMarcarNoLeida={onMarcarNoLeida}
          onConfirmarAsistencia={vi.fn()}
          onExcusarAsistencia={vi.fn()}
          onEliminar={onEliminar}
        />
      </tbody>
    </table>
  );
  return { onMarcarLeida, onMarcarNoLeida, onEliminar };
}

describe('NotificacionRow', () => {
  it('muestra "Marcar leída" cuando no está leída y llama a onMarcarLeida al hacer clic', () => {
    const { onMarcarLeida, onMarcarNoLeida } = mostrar({ ...base, leida: false });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar leída' }));
    expect(onMarcarLeida).toHaveBeenCalledWith(1);
    expect(onMarcarNoLeida).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Marcar no leída' })).not.toBeInTheDocument();
  });

  it('muestra "Marcar no leída" cuando ya está leída y llama a onMarcarNoLeida al hacer clic', () => {
    const { onMarcarLeida, onMarcarNoLeida } = mostrar({ ...base, leida: true });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar no leída' }));
    expect(onMarcarNoLeida).toHaveBeenCalledWith(1);
    expect(onMarcarLeida).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Marcar leída' })).not.toBeInTheDocument();
  });

  it('renderiza el mensaje con sus saltos de línea', () => {
    mostrar(base);
    expect(screen.getByText(/Nombre: Prueba/)).toBeInTheDocument();
  });

  it('llama a onEliminar al hacer clic en Eliminar', () => {
    const { onEliminar } = mostrar(base);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onEliminar).toHaveBeenCalledWith(1);
  });
});
