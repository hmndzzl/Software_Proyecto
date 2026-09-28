import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import EnviadaRow from './EnviadaRow';
import type { NotificacionEnviada } from '../../../types';

const base: NotificacionEnviada = {
  id: 1,
  mensaje: 'Reunión de coordinadores',
  fecha: '2026-05-21',
  tipo: 'global',
  grupo_id: null,
  evento_id: null,
  requiere_confirmacion: false,
  total_destinatarios: 13,
  total_leidas: 1,
  destinatarios_nombres: 'Ana Xitumul, Carlos Ramirez, Coord Grupos Test, Coord Ministros Sur, Coord Ministros Test, Diego Calderon, Hugo Mendez, Javier Alvarado, Lucia Fernandez, Miguel Rosas, Ministro Test, Padre Test, Pedro Caso',
};

function mostrar(notificacion: NotificacionEnviada) {
  render(
    <table>
      <tbody>
        <EnviadaRow notificacion={notificacion} />
      </tbody>
    </table>
  );
}

describe('EnviadaRow — destinatarios con muchos nombres', () => {
  it('muestra un resumen truncado con botón "y N más" en vez de la lista completa', () => {
    mostrar(base);
    expect(screen.getByText('Ana Xitumul, Carlos Ramirez, Coord Grupos Test', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'y 10 más' })).toBeInTheDocument();
    expect(screen.queryByText('Pedro Caso', { exact: false })).not.toBeInTheDocument();
  });

  it('expande a la lista completa al hacer clic y puede volver a colapsar', () => {
    mostrar(base);
    fireEvent.click(screen.getByRole('button', { name: 'y 10 más' }));
    expect(screen.getByText(/Pedro Caso/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver menos' }));
    expect(screen.queryByText('Pedro Caso', { exact: false })).not.toBeInTheDocument();
  });

  it('no muestra el botón de expandir si hay pocos destinatarios', () => {
    mostrar({ ...base, total_destinatarios: 2, destinatarios_nombres: 'Ana Xitumul, Pedro Caso' });
    expect(screen.getByText('Ana Xitumul, Pedro Caso')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('muestra el aviso cuando no quedan destinatarios', () => {
    mostrar({ ...base, total_destinatarios: 0, destinatarios_nombres: null });
    expect(screen.getByText('Sin destinatarios (eliminada por todos)')).toBeInTheDocument();
  });
});
