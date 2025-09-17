import { render, screen } from '@testing-library/react';
import RoomCard from '../../components/RoomCard';
import { describe, it, expect } from 'vitest';

describe('RoomCard', () => {
  it('muestra número, tipo y piso', () => {
    const room = { number: '101', type: 'Simple', floor: 1, status: 'disponible' };
    render(<RoomCard room={room} />);
    expect(screen.getByText(/101 - Simple/)).toBeInTheDocument();
    expect(screen.getByText(/Piso 1/)).toBeInTheDocument();
  });

  it('aplica el color correcto según el estado', () => {
    const room = { number: '102', type: 'Doble', floor: 2, status: 'ocupado' };
    const { container } = render(<RoomCard room={room} />);
    expect(container.firstChild.className).toMatch(/bg-red-100/);
  });
});
