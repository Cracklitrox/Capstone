import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { cleanupMocks } from '../utils/testUtils.jsx';

// Componente simple para probar
const TestComponent = () => <div data-testid="test">Test funcionando</div>;

describe('Setup Test', () => {
  beforeEach(() => {
    cleanupMocks();
  });

  it('debe renderizar correctamente', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('test')).toBeInTheDocument();
    expect(screen.getByText('Test funcionando')).toBeInTheDocument();
  });

  it('debe tener localStorage mock funcionando', () => {
    expect(typeof localStorage.setItem).toBe('function');
    expect(typeof localStorage.getItem).toBe('function');
    
    localStorage.setItem('test', 'value');
    expect(localStorage.setItem).toHaveBeenCalledWith('test', 'value');
  });

  it('debe limpiar mocks correctamente', () => {
    localStorage.setItem('test', 'value');
    cleanupMocks();
    // El mock debe mantenerse pero los calls deben limpiarse
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });
});