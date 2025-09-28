import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock user data para tests
export const mockUsers = {
  admin: {
    id: 1,
    email: 'admin@hotel.com',
    role: 'administrator',
    name: 'Admin User',
    exp: Math.floor(Date.now() / 1000) + 3600 // válido por 1 hora
  },
  receptionist: {
    id: 2,
    email: 'recepcion@hotel.com', 
    role: 'receptionist',
    name: 'Receptionist User',
    exp: Math.floor(Date.now() / 1000) + 3600
  },
  expired: {
    id: 3,
    email: 'expired@hotel.com',
    role: 'administrator', 
    exp: Math.floor(Date.now() / 1000) - 3600 // expirado
  }
};

// Mock tokens
export const mockTokens = {
  admin: 'mock.admin.token',
  receptionist: 'mock.receptionist.token',
  expired: 'mock.expired.token',
  invalid: 'invalid.token'
};

// Mock de axios responses
export const mockAxiosResponses = {
  loginSuccess: {
    data: { token: mockTokens.admin }
  },
  loginError: {
    response: { 
      data: { message: 'Credenciales incorrectas' },
      status: 401 
    }
  },
  reservationsSuccess: {
    data: [
      { id: 1, guestName: 'Juan Pérez', roomNumber: '101' },
      { id: 2, guestName: 'Ana García', roomNumber: '102' }
    ]
  }
};

// Helper para limpiar mocks después de cada test
export const cleanupMocks = () => {
  if (typeof vi !== 'undefined') {
    vi.clearAllMocks();
  }
  if (typeof localStorage !== 'undefined' && localStorage.clear) {
    localStorage.clear();
  }
  if (typeof sessionStorage !== 'undefined' && sessionStorage.clear) {
    sessionStorage.clear();
  }
};

// Custom render function que incluye providers necesarios
export const renderWithRouter = (ui, options = {}) => {
  const RouterWrapper = ({ children }) => (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );

  return render(ui, { wrapper: RouterWrapper, ...options });
};