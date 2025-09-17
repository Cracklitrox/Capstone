import { render, screen, fireEvent } from '@testing-library/react';
import RoomBoard from '../../components/RoomBoard';
import { describe, it, expect } from 'vitest';

describe('RoomBoard', () => {
  it('muestra la leyenda de colores', () => {
    render(<RoomBoard />);
    expect(screen.getByText(/Leyenda/)).toBeInTheDocument();
    expect(screen.getByText(/Disponible/)).toBeInTheDocument();
    expect(screen.getByText(/Ocupado/)).toBeInTheDocument();
    expect(screen.getByText(/Limpieza/)).toBeInTheDocument();
    expect(screen.getByText(/Mantenimiento/)).toBeInTheDocument();
    expect(screen.getByText(/Reservado Pendiente/)).toBeInTheDocument();
  });

  it('filtra habitaciones por piso', () => {
    render(<RoomBoard />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 1 } });
    expect(screen.getAllByText(/Piso 1/).length).toBeGreaterThan(0);
  });
});
