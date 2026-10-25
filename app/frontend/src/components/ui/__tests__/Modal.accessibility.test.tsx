import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import Modal from '../Modal';

it('anuncia el diálogo, contiene el foco y lo devuelve al control de origen', async () => {
  const close = vi.fn();
  const { rerender } = render(<><button>Abrir detalle</button><Modal open={false} title="Misa" onClose={close}><button>Último control</button></Modal></>);
  const origen = screen.getByText('Abrir detalle');
  origen.focus();
  rerender(<><button>Abrir detalle</button><Modal open title="Misa" onClose={close}><button>Último control</button></Modal></>);
  expect(screen.getByRole('dialog', { name: 'Misa' })).toHaveAttribute('aria-modal', 'true');
  expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
  await userEvent.tab({ shift: true });
  expect(screen.getByText('Último control')).toHaveFocus();
  await userEvent.tab();
  expect(screen.getByLabelText('Cerrar')).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(close).toHaveBeenCalledOnce();
  rerender(<><button>Abrir detalle</button><Modal open={false} title="Misa" onClose={close}><button>Último control</button></Modal></>);
  expect(origen).toHaveFocus();
});
