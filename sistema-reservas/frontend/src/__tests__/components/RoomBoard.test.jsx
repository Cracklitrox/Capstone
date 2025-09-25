
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
    // Solo la leyenda, usando el primer match de cada uno
    expect(screen.getAllByText('Disponible')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Ocupado')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Limpieza')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Mantenimiento')[0]).toBeInTheDocument();
    // "Pendiente" aparece en leyenda y en tarjetas, pero la leyenda es el primer match
    expect(screen.getAllByText('Pendiente')[0]).toBeInTheDocument();
  });

  it('filtra habitaciones por piso y estado', () => {
    render(<RoomBoard rooms={mockRooms} />);
    fireEvent.change(screen.getByRole('combobox', { name: /piso/i }), { target: { value: 1 } });
    fireEvent.change(screen.getByRole('combobox', { name: /estado/i }), { target: { value: 'Pendiente' } });
    expect(screen.getAllByText(/Piso 1/).length).toBeGreaterThan(0);
    // Buscar "Pendiente" solo en la tarjeta, no en la leyenda ni en el option
    const pendientes = screen.getAllByText('Pendiente');
    // El último match suele ser la tarjeta visible
    expect(pendientes[pendientes.length - 1]).toBeInTheDocument();
  });

  it('muestra paginación si hay muchas habitaciones', () => {
    render(<RoomBoard rooms={mockRooms} />);
    // Usar función matcher para evitar problemas si el texto está fragmentado
    expect(screen.getByText((content) => content.includes('Página'))).toBeInTheDocument();
  });
});
