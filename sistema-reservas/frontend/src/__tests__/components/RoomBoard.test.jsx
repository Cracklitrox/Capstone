
import { render, screen, fireEvent } from '@testing-library/react';
import RoomBoard from '../../components/RoomBoard';
import React from "react";
import { describe, it, expect } from 'vitest';

describe('RoomBoard', () => {
  // Mock de habitaciones para evitar 'Cargando habitaciones...'

  const mockRooms = [
    { number: '101', type: 'Simple', floor: 1, status: 'available' },
    { number: '102', type: 'Doble', floor: 2, status: 'occupied' },
    { number: '103', type: 'Suite', floor: 1, status: 'pending' },
    { number: '104', type: 'Suite', floor: 2, status: 'maintenance' },
    { number: '105', type: 'Suite', floor: 3, status: 'cleaning' },
    { number: '106', type: 'Suite', floor: 1, status: 'available' },
    { number: '107', type: 'Suite', floor: 2, status: 'pending' },
    { number: '108', type: 'Suite', floor: 3, status: 'available' },
    { number: '109', type: 'Suite', floor: 1, status: 'available' },
  ];

  it('muestra la leyenda de colores y estados', () => {
  render(<RoomBoard rooms={mockRooms} />);
    expect(screen.getByText(/Leyenda/)).toBeInTheDocument();
    expect(screen.getByText(/Disponible/)).toBeInTheDocument();
    expect(screen.getByText(/Ocupado/)).toBeInTheDocument();
    expect(screen.getByText(/Limpieza/)).toBeInTheDocument();
    expect(screen.getByText(/Mantenimiento/)).toBeInTheDocument();
    expect(screen.getByText(/Pendiente/)).toBeInTheDocument();
  });

  it('filtra habitaciones por piso y estado', () => {
  render(<RoomBoard rooms={mockRooms} />);
    fireEvent.change(screen.getByRole('combobox', { name: /piso/i }), { target: { value: 1 } });
    fireEvent.change(screen.getByRole('combobox', { name: /estado/i }), { target: { value: 'Pendiente' } });
    expect(screen.getAllByText(/Piso 1/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pendiente/)).toBeInTheDocument();
  });

  it('muestra paginación si hay muchas habitaciones', () => {
    render(<RoomBoard />);
    expect(screen.getByText(/Página/)).toBeInTheDocument();
  });
});
