import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Spinner from './Spinner';
import { Field } from './Field';
import Modal from './Modal';
import { ROLES, ROLE_HIERARCHY, rolTieneAcceso } from '../../utils/roles';
import { MemoryRouter } from 'react-router-dom';

describe('Spinner', () => {
  it('renderiza fullPage', () => {
    render(<Spinner fullPage label="Cargando test" />);
    expect(screen.getByText('Cargando test')).toBeInTheDocument();
  });
});

describe('Field', () => {
  it('renderiza sin label', () => {
    render(<Field><input data-testid="input" /></Field>);
    expect(screen.getByTestId('input')).toBeInTheDocument();
  });
});

describe('Modal', () => {
  it('renderiza null si open es false', () => {
    const { container } = render(<Modal open={false} onClose={() => {}} title="Test"><div/></Modal>);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('roles', () => {
  it('rolTieneAcceso retorna false si el rol es inválido o no existe', () => {
    expect(rolTieneAcceso('invalido', [ROLES.ADMIN])).toBe(false);
    expect(rolTieneAcceso(undefined, [ROLES.ADMIN])).toBe(false);
  });
});

import { InputUI } from './Field';
import EnviadaRow from '../../modules/notificaciones/components/EnviadaRow';
import NotificacionRow from '../../modules/notificaciones/components/NotificacionRow';

describe('InputUI', () => {
  it('renderiza con y sin suffix', () => {
    const { rerender } = render(<InputUI icon={<span>I</span>} data-testid="i1" />);
    expect(screen.getByTestId('i1')).toBeInTheDocument();
    
    rerender(<InputUI icon={<span>I</span>} suffix={<span>S</span>} data-testid="i2" />);
    expect(screen.getByTestId('i2')).toBeInTheDocument();
  });
});

describe('Modal - Escape', () => {
  it('cierra con Escape', () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose} title="M"><div/></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('EnviadaRow / NotificacionRow', () => {
  it('EnviadaRow coverage', () => {
    render(
      <table>
        <tbody>
          <EnviadaRow notificacion={{ id: 1, mensaje: 'M', tipo: 'global', destinatarios_nombres: 'A, B', total_destinatarios: 2, total_leidas: 2, fecha: '2026-10-01' } as any} />
          <EnviadaRow notificacion={{ id: 2, mensaje: 'M', tipo: 'global', destinatarios_nombres: null, total_destinatarios: 0, total_leidas: 0, fecha: '2026-10-01' } as any} />
        </tbody>
      </table>
    );
    expect(screen.getByText('2/2 leídas')).toBeInTheDocument();
  });
  
  it('NotificacionRow asistencia_confirmada true', () => {
    render(
      <table>
        <tbody>
          <NotificacionRow
            notificacion={{ id: 1, mensaje: 'M', requiere_confirmacion: true, asistencia_confirmada: true, leida: false } as any}
            onMarcarLeida={vi.fn()} onMarcarNoLeida={vi.fn()} onConfirmarAsistencia={vi.fn()} onExcusarAsistencia={vi.fn()} onEliminar={vi.fn()}
            onCancelarAsistencia={vi.fn()} onCancelarInasistencia={vi.fn()}
          />
        </tbody>
      </table>
    );
    expect(screen.getByText('Asistencia confirmada')).toBeInTheDocument();
  });
});

