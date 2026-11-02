import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it } from 'vitest';
import Avatar from './Avatar';

it('muestra iniciales y rechaza URLs ajenas al almacenamiento de perfiles', () => {
  const vista = render(<Avatar className="avatar" nombre="Ana López" fotoUrl="https://otro.test/foto.png" />);
  expect(screen.getByText('AL')).toBeInTheDocument();
  vista.rerender(<Avatar className="avatar" nombre=" " />);
  expect(screen.getByText('—')).toBeInTheDocument();
});
it('muestra la foto, vuelve a iniciales si falla y permite cargar un reemplazo', () => {
  const url = '/uploads/perfiles/subidas/00000000-0000-0000-0000-000000000001.webp';
  const vista = render(<Avatar className="avatar" nombre="Ana" fotoUrl={url} />);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByText('A')).toBeInTheDocument();
  vista.rerender(<Avatar className="avatar" nombre="Ana" fotoUrl={url.replace('001.webp', '002.webp')} />);
  expect(screen.getByRole('img', { name: 'Foto de Ana' })).toBeInTheDocument();
});
