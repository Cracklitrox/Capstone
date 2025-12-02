import { beforeEach, test, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from '@/components/profile/Profile';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// Mock localStorage manualmente
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

// Mock Axios
const mock = new MockAdapter(axios);

// Datos falsos de perfil
const mockProfileData = {
  first_name: 'Juan',
  paternal_last_name: 'Pérez',
  maternal_last_name: 'González',
  email: 'juan@example.com',
  phone_number: '123456789',
  gender: 'male',
  rut: '12345678',
  rut_dv: '9',
  country: 'Chile',
  region: 'Región Metropolitana',
  city: 'Santiago',
};

// Helper para renderizar con router
const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

// Reset antes de cada test
beforeEach(() => {
  localStorage.getItem.mockReturnValue('fake-jwt-token');
  localStorage.setItem.mockClear();
  localStorage.removeItem.mockClear();
  mock.reset();
});

// Tests

test('muestra "Cargando perfil..." mientras carga', async () => {
  mock.onGet('/api/v1/auth/profile').reply(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([200, mockProfileData]);
      }, 300);
    });
  });

  renderWithRouter(<Profile />);
  expect(screen.getByText('Cargando perfil...')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByTestId('full-name')).toBeInTheDocument();
  });
});

test('renderiza los datos del perfil correctamente', async () => {
  mock.onGet('/api/v1/auth/profile').reply(200, mockProfileData);

  renderWithRouter(<Profile />);

  await waitFor(() => {
    expect(screen.getByTestId('full-name')).toHaveTextContent('Juan Pérez González');
    expect(screen.getByText('juan@example.com')).toBeInTheDocument();
    expect(screen.getByText('12345678-9')).toBeInTheDocument();
    expect(screen.getByText('123456789')).toBeInTheDocument();
    expect(screen.getByText('Hombre')).toBeInTheDocument();
    expect(screen.getByText('Chile')).toBeInTheDocument();
    expect(screen.getByText('Región Metropolitana')).toBeInTheDocument();
    expect(screen.getByText('Santiago')).toBeInTheDocument();
  });
});

test('muestra mensaje de error si no hay token', async () => {
  localStorage.getItem.mockReturnValue(null);

  renderWithRouter(<Profile />);

  await waitFor(() => {
    expect(screen.getByText(/no se encontró token/i)).toBeInTheDocument();
  });
});

test('muestra el modal al hacer clic en "Modificar datos"', async () => {
  mock.onGet('/api/v1/auth/profile').reply(200, mockProfileData);

  renderWithRouter(<Profile />);

  await waitFor(() => {
    expect(screen.getByText('Modificar datos')).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText('Modificar datos'));

  await waitFor(() => {
    expect(screen.getByTestId('profile-form')).toBeInTheDocument();
  });
});

test('envía el formulario correctamente y muestra mensaje de éxito', async () => {
  mock.onGet('/api/v1/auth/profile').reply(200, mockProfileData);
  mock.onPut('/api/v1/auth/profile').reply(200, mockProfileData);

  renderWithRouter(<Profile />);

  await waitFor(() => {
    expect(screen.getByText('Modificar datos')).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText('Modificar datos'));

  await waitFor(() => {
    expect(screen.getByTestId('profile-form')).toBeInTheDocument();
  });

  const input = screen.getByLabelText(/nombre/i);
  fireEvent.change(input, { target: { value: 'Juan' } });

  fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

  await waitFor(() => {
    expect(screen.getByText(/datos actualizados correctamente/i)).toBeInTheDocument();
  });
});
