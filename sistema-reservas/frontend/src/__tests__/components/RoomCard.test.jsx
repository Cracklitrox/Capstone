
import React from "react";
import { render, screen, fireEvent } from '@testing-library/react';
import RoomCard from '../../components/RoomCard';
import { describe, it, expect, vi } from 'vitest';

describe('RoomCard', () => {
  it('muestra número, tipo y piso y estado disponible', () => {
    const room = { number: '101', type: 'Simple', floor: 1, status: 'available' };
    render(<RoomCard room={room} />);
    expect(screen.getByText(/101 - Simple/)).toBeInTheDocument();
    expect(screen.getByText(/Piso 1/)).toBeInTheDocument();
    expect(screen.getByText(/Disponible ahora/)).toBeInTheDocument();
  });

  it('aplica el color correcto según el estado ocupado', () => {
    const room = { number: '102', type: 'Doble', floor: 2, status: 'occupied' };
    const { container } = render(<RoomCard room={room} />);
    expect(container.firstChild.className).toMatch(/bg-red-50/);
    expect(screen.getByText(/Ocupada/)).toBeInTheDocument();
  });

  it('muestra datos de reserva si corresponde', () => {
    const room = {
      number: '103',
      type: 'Suite',
      floor: 3,
      status: 'pending',
      reservation: {
        guest: { first_name: 'Juan', paternal_last_name: 'Pérez' },
        check_in_date: '2025-09-24',
        check_out_date: '2025-09-25'
      }
    };
  render(<RoomCard room={room} />);
  expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument();
  expect(screen.getByText(/23-24 Sept/)).toBeInTheDocument();
  expect(screen.getByText(/Pendiente/)).toBeInTheDocument();
  });

  it('aplica el color correcto según el estado limpieza', () => {
    const room = { number: '104', type: 'Suite', floor: 2, status: 'cleaning' };
    const { container } = render(<RoomCard room={room} />);
    expect(container.firstChild.className).toMatch(/bg-blue-50/);
    expect(screen.getByText(/En limpieza/)).toBeInTheDocument();
  });

  it('aplica el color correcto según el estado mantenimiento', () => {
    const room = { number: '105', type: 'Suite', floor: 2, status: 'maintenance' };
    const { container } = render(<RoomCard room={room} />);
    expect(container.firstChild.className).toMatch(/bg-gray-300/);
    expect(screen.getByText(/En mantenimiento/)).toBeInTheDocument();
  });

  it('aplica el color correcto según el estado pendiente', () => {
    const room = { number: '106', type: 'Suite', floor: 2, status: 'pending' };
    const { container } = render(<RoomCard room={room} />);
    expect(container.firstChild.className).toMatch(/bg-orange-50/);
    expect(screen.getByText(/Pendiente/)).toBeInTheDocument();
  });

  it('es accesible por teclado', () => {
    const room = { number: '107', type: 'Doble', floor: 2, status: 'available' };
    const onDetails = vi.fn();
    render(<RoomCard room={room} onDetails={onDetails} />);
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onDetails).toHaveBeenCalled();
  });
});
