import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import ResumenMinistros from './ResumenMinistros';

it.each([1, 2, 100])('mantiene dos nombres como máximo y el total exacto para %s ministros', async cantidad => {
  const asignados = Array.from({ length: cantidad }, (_, i) => ({ persona_id: i + 1, nombre: `Ministro ${i + 1}` }));
  const onVer = vi.fn();
  render(<ResumenMinistros asignados={asignados} tarea="Lectura" onVer={onVer} />);
  expect(screen.getByText(cantidad === 1 ? 'Ministro 1' : 'Ministro 1, Ministro 2')).toBeInTheDocument();
  if (cantidad > 2) expect(screen.queryByText('Ministro 3')).not.toBeInTheDocument();
  const contador = screen.getByRole('button', { name: `${cantidad === 1 ? 'Ver el ministro' : `Ver los ${cantidad} ministros`} de Lectura` });
  expect(contador).toHaveTextContent(`${cantidad} ${cantidad === 1 ? 'ministro' : 'ministros'}`);
  await userEvent.click(contador);
  expect(onVer).toHaveBeenCalledOnce();
});

it('muestra el estado sin responsables sin crear un contador engañoso', () => {
  render(<ResumenMinistros asignados={[]} tarea="Lectura" onVer={vi.fn()} />);
  expect(screen.getByText('Sin ministro asignado')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
