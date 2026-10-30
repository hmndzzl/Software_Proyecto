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

it('cambia el foco al pasar de una tarjeta a su confirmación dentro del mismo modal', () => {
  const close = vi.fn();
  const { rerender } = render(<><button>Abrir reserva</button><Modal open={false} title="Reserva" onClose={close}><input aria-label="Título" /></Modal></>);
  const origen = screen.getByText('Abrir reserva');
  origen.focus();
  rerender(<><button>Abrir reserva</button><Modal open title="Reserva" onClose={close}><input aria-label="Título" /></Modal></>);
  rerender(<><button>Abrir reserva</button><Modal open title="Cancelar reserva" onClose={close} initialFocusSelector="[data-confirm-cancel]">
    <button data-confirm-cancel>Cancelar</button><button>Cancelar reserva</button>
  </Modal></>);
  expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  rerender(<><button>Abrir reserva</button><Modal open={false} title="Reserva" onClose={close}><input aria-label="Título" /></Modal></>);
  expect(origen).toHaveFocus();
});

it('ofrece regreso explícito y respeta el bloqueo durante una operación', async () => {
  const close = vi.fn();
  const back = vi.fn();
  const { rerender } = render(<Modal open title="Detalle" onClose={close} returnLabel="Volver al listado"><p>Contenido</p></Modal>);
  await userEvent.click(screen.getByRole('button', { name: 'Volver al listado' }));
  expect(close).toHaveBeenCalledOnce();
  rerender(<Modal open title="Detalle" onClose={close} onReturn={back} returnLabel="Volver al evento" closeDisabled><p>Contenido</p></Modal>);
  expect(screen.getByRole('button', { name: 'Volver al evento' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Volver al evento' }));
  expect(back).not.toHaveBeenCalled();
  rerender(<Modal open title="Detalle" onClose={close} onReturn={back} returnLabel="Volver al evento"><p>Contenido</p></Modal>);
  await userEvent.click(screen.getByRole('button', { name: 'Volver al evento' }));
  expect(back).toHaveBeenCalledOnce();
  expect(close).toHaveBeenCalledOnce();
});

it('muestra un solo regreso y conserva el destino anterior al usar el botón con texto', async () => {
  const close = vi.fn();
  const back = vi.fn();
  const { rerender } = render(<Modal open title="Tarea" onClose={close} onBack={back} returnLabel="Volver al evento"><p>Detalle</p></Modal>);
  expect(screen.queryByRole('button', { name: 'Volver a la tarjeta anterior' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Volver al evento' }));
  expect(back).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled();
  rerender(<Modal open title="Editar grupo" onClose={close} onBack={back}><p>Formulario</p></Modal>);
  expect(screen.getByRole('button', { name: 'Volver a la tarjeta anterior' })).toBeInTheDocument();
});
