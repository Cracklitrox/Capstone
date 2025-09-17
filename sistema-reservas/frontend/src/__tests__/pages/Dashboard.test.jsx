import { render, screen } from '@testing-library/react';
import Dashboard from '../../pages/Dashboard';
import { describe, it, expect } from 'vitest';

describe('Dashboard', () => {
  it('renderiza el tablero de habitaciones', () => {
    render(<Dashboard />);
    expect(screen.getByText(/Estado Habitaciones/)).toBeInTheDocument();
    expect(screen.getByText(/Leyenda/)).toBeInTheDocument();
  });
});
