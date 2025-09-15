import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute.jsx';

const ProtectedPage = () => <div>Página Protegida</div>;
const LoginPage = () => <div>Página de Login</div>;

describe('ProtectedRoute', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  test('debería redirigir a la página de login si no hay token', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route 
            path="/protected" 
            element={
              <ProtectedRoute>
                <ProtectedPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Página Protegida')).not.toBeInTheDocument();
    expect(screen.getByText('Página de Login')).toBeInTheDocument();
  });

  test('debería renderizar el componente hijo si hay un token', () => {
    localStorage.setItem('token', 'un-token-de-prueba');

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route 
            path="/protected" 
            element={
              <ProtectedRoute>
                <ProtectedPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Página Protegida')).toBeInTheDocument();
    expect(screen.queryByText('Página de Login')).not.toBeInTheDocument();
  });
});

