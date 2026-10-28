import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import NuevaCuentaModal from '../NuevaCuentaModal';
import { ToastProvider } from '../../../context/ToastContext';

it('asocia etiquetas y ayudas con IDs únicos entre instancias de nueva cuenta', () => {
  const props = { open: true, roles: [{ id: 4, label: 'Ministro' }], onClose: vi.fn(), onCreada: vi.fn() };
  const { container } = render(<ToastProvider><NuevaCuentaModal {...props} /><NuevaCuentaModal {...props} /></ToastProvider>);
  const labels = Array.from(container.querySelectorAll('label'));
  expect(labels).toHaveLength(10);
  for (const label of labels) {
    expect(label.control).not.toBeNull();
    expect(label.control!.id).toBe(label.htmlFor);
  }
  const ids = Array.from(container.querySelectorAll('[id]'), element => element.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const input of screen.getAllByLabelText('Contraseña inicial')) {
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('Mínimo 8 caracteres. Compártela con la persona de forma segura.');
  }
  for (const input of screen.getAllByLabelText('Teléfono (opcional)')) {
    expect(input).toHaveAccessibleDescription('Acepta 8 dígitos locales o un número internacional con + y código de país.');
  }
});
