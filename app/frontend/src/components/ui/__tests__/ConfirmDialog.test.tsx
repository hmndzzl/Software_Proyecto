import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import ConfirmDialog from '../ConfirmDialog';

function Mostrar({ onConfirm = vi.fn() }: { onConfirm?: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>Abrir</button><ConfirmDialog open={open} title="Eliminar grupo"
    description="El grupo será eliminado." confirmLabel="Eliminar grupo" onCancel={() => setOpen(false)}
    onConfirm={async () => { await onConfirm(); setOpen(false); }} /></>;
}

it('asocia la explicación, enfoca Cancelar y devuelve el foco sin ejecutar la acción', async () => {
  const onConfirm = vi.fn();
  render(<Mostrar onConfirm={onConfirm} />);
  await userEvent.click(screen.getByText('Abrir'));
  expect(screen.getByRole('dialog', { name: 'Eliminar grupo' })).toHaveAccessibleDescription('El grupo será eliminado.');
  expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Abrir')).toHaveFocus();
  expect(onConfirm).not.toHaveBeenCalled();
});

it('bloquea clics duplicados y todos los cierres mientras procesa', async () => {
  let resolver!: () => void;
  const onConfirm = vi.fn(() => new Promise<void>(resolve => { resolver = resolve; }));
  render(<Mostrar onConfirm={onConfirm} />);
  await userEvent.click(screen.getByText('Abrir'));
  const confirmar = screen.getByRole('button', { name: 'Eliminar grupo' });
  fireEvent.click(confirmar); fireEvent.click(confirmar);
  expect(onConfirm).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cerrar' })).toBeDisabled();
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.keyDown(document, { key: 'Tab' });
  fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await act(async () => { resolver(); });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('conserva el diálogo ante errores y permite reintentar', async () => {
  const onConfirm = vi.fn().mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce(undefined);
  render(<Mostrar onConfirm={onConfirm} />);
  await userEvent.click(screen.getByText('Abrir'));
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar grupo' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar la acción');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar grupo' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(onConfirm).toHaveBeenCalledTimes(2);
});

it('contiene Tab y Shift+Tab dentro de los controles habilitados', async () => {
  render(<Mostrar />);
  await userEvent.click(screen.getByText('Abrir'));
  await userEvent.tab();
  expect(screen.getByRole('button', { name: 'Eliminar grupo' })).toHaveFocus();
  await userEvent.tab();
  expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
  await userEvent.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Eliminar grupo' })).toHaveFocus();
});
