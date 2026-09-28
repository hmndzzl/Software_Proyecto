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
  onConfirmarAsistencia?: (id: number) => void;
  onCancelarAsistencia?: (id: number) => void;
  onCancelarInasistencia?: (id: number) => void;
  onEliminar?: (id: number) => void;
} = {}) {
  const onMarcarLeida = props.onMarcarLeida ?? vi.fn();
  const onMarcarNoLeida = props.onMarcarNoLeida ?? vi.fn();
  const onConfirmarAsistencia = props.onConfirmarAsistencia ?? vi.fn();
  const onCancelarAsistencia = props.onCancelarAsistencia ?? vi.fn();
  const onCancelarInasistencia = props.onCancelarInasistencia ?? vi.fn();
  const onEliminar = props.onEliminar ?? vi.fn();
  render(
    <table>
      <tbody>
        <NotificacionRow
          notificacion={notificacion}
          onMarcarLeida={onMarcarLeida}
          onMarcarNoLeida={onMarcarNoLeida}
          onConfirmarAsistencia={onConfirmarAsistencia}
          onCancelarAsistencia={onCancelarAsistencia}
          onCancelarInasistencia={onCancelarInasistencia}
          onExcusarAsistencia={vi.fn()}
          onEliminar={onEliminar}
        />
      </tbody>
    </table>
  );
  return { onMarcarLeida, onMarcarNoLeida, onConfirmarAsistencia, onCancelarAsistencia, onCancelarInasistencia, onEliminar };
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

<<<<<<< HEAD
  it('llama a onConfirmarAsistencia y onExcusarAsistencia cuando requiere confirmacion', () => {
    const onConfirmar = vi.fn();
    const onExcusar = vi.fn();
=======
  it('permite cancelar una asistencia que ya había sido confirmada', () => {
    const { onCancelarAsistencia, onConfirmarAsistencia } = mostrar({
      ...base,
      requiere_confirmacion: true,
      asistencia_confirmada: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar asistencia' }));

    expect(onCancelarAsistencia).toHaveBeenCalledWith(1);
    expect(onConfirmarAsistencia).not.toHaveBeenCalled();
  });

  it('permite quitar el estado de no asistencia para decidir de nuevo', () => {
    const { onCancelarInasistencia } = mostrar({
      ...base,
      requiere_confirmacion: true,
      motivo_excusa: 'Tengo un compromiso',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Quitar no asistencia' }));

    expect(onCancelarInasistencia).toHaveBeenCalledWith(1);
  });

  it('permite confirmar asistencia cuando requiere confirmación', () => {
    const { onConfirmarAsistencia } = mostrar({
      ...base,
      requiere_confirmacion: true,
      asistencia_confirmada: false,
      motivo_excusa: null,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onConfirmarAsistencia).toHaveBeenCalledWith(1);
  });

  it('permite accionar No podré asistir cuando requiere confirmación', () => {
    const onExcusarAsistencia = vi.fn();
    const notif: Notificacion = {
      ...base,
      requiere_confirmacion: true,
      asistencia_confirmada: false,
      motivo_excusa: null,
    };

>>>>>>> b7a385a (fix: cancelacion de asistencia y no asistencia)
    render(
      <table>
        <tbody>
          <NotificacionRow
<<<<<<< HEAD
            notificacion={{ ...base, requiere_confirmacion: true }}
            onMarcarLeida={vi.fn()}
            onMarcarNoLeida={vi.fn()}
            onConfirmarAsistencia={onConfirmar}
            onExcusarAsistencia={onExcusar}
=======
            notificacion={notif}
            onMarcarLeida={vi.fn()}
            onMarcarNoLeida={vi.fn()}
            onConfirmarAsistencia={vi.fn()}
            onCancelarAsistencia={vi.fn()}
            onCancelarInasistencia={vi.fn()}
            onExcusarAsistencia={onExcusarAsistencia}
>>>>>>> b7a385a (fix: cancelacion de asistencia y no asistencia)
            onEliminar={vi.fn()}
          />
        </tbody>
      </table>
    );

<<<<<<< HEAD
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirmar).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: 'No podré asistir' }));
    expect(onExcusar).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
=======
    fireEvent.click(screen.getByRole('button', { name: 'No podré asistir' }));

    expect(onExcusarAsistencia).toHaveBeenCalledWith(notif);
>>>>>>> b7a385a (fix: cancelacion de asistencia y no asistencia)
  });
});
