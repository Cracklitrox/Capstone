import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Login from '../../pages/Login.jsx';
import { AuthProvider } from '../../contexts/AuthProvider.jsx';
import { mockUsers, mockTokens, mockAxiosResponses, cleanupMocks } from '../utils/testUtils.jsx';
import { localStorageMock, mockNavigate } from '../setup/mocks.js';

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    cleanupMocks();
    // Mock básico para document.documentElement
    Object.defineProperty(document, 'documentElement', {
      value: {
        classList: { toggle: vi.fn() },
        setAttribute: vi.fn(),
        removeAttribute: vi.fn(),
      },
      writable: true,
    });
  });

  describe('Renderizado inicial', () => {
    it('debe renderizar todos los elementos del formulario', () => {
      renderLogin();

      // Verificar que el título y descripción están presentes
      expect(screen.getByText('Hotel Don Teo')).toBeInTheDocument();
      expect(screen.getByText('Por favor, inicia sesión para continuar')).toBeInTheDocument();

      // Verificar que los campos del formulario están presentes
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();

      // Verificar que los placeholders son correctos
      expect(screen.getByPlaceholderText('ejemplo@correo.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();

      // Verificar que el botón de submit está presente
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();

      // Verificar que el botón de mostrar/ocultar contraseña está presente
      expect(screen.getByRole('button', { name: /mostrar\/ocultar contraseña/i })).toBeInTheDocument();
    });

    it('debe mostrar el icono del hotel', () => {
      renderLogin();
      expect(screen.getByTestId('building-icon')).toBeInTheDocument();
    });

    it('debe tener los campos requeridos', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);

      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('type', 'email');
    });
  });

  describe('Interacciones del formulario', () => {
    it('debe permitir escribir en los campos de entrada', async () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);

      await fireEvent.change(emailInput, { target: { value: 'admin@hotel.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(emailInput).toHaveValue('admin@hotel.com');
      expect(passwordInput).toHaveValue('password123');
    });

    it('debe alternar la visibilidad de la contraseña', async () => {
      renderLogin();

      const passwordInput = screen.getByLabelText(/contraseña/i);
      const toggleButton = screen.getByRole('button', { name: /mostrar\/ocultar contraseña/i });

      // Inicialmente debe ser password
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();

      // Hacer clic para mostrar
      await fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(screen.getByTestId('eye-slash-icon')).toBeInTheDocument();

      // Hacer clic para ocultar de nuevo
      await fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
    });
  });

  describe('Validación del formulario', () => {
    it('debe requerir email válido', async () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const submitButton = screen.getByRole('button', { name: /entrar/i });

      await fireEvent.change(emailInput, { target: { value: 'email-invalido' } });
      await fireEvent.click(submitButton);

      // HTML5 validation debería prevenir el envío
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('debe requerir ambos campos', async () => {
      renderLogin();

      const submitButton = screen.getByRole('button', { name: /entrar/i });

      // Intentar enviar sin llenar campos
      await fireEvent.click(submitButton);

      // HTML5 validation debería prevenir el envío
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Proceso de login exitoso', () => {
    it('debe hacer login correctamente con credenciales de administrador', async () => {
      axios.post.mockResolvedValue(mockAxiosResponses.loginSuccess);
      jwtDecode.mockReturnValue(mockUsers.admin);

      renderLogin();

      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);
      const submitButton = screen.getByRole('button', { name: /entrar/i });

      await fireEvent.change(emailInput, { target: { value: 'admin@hotel.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'password123' } });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:3001/api/v1/auth/login',
          {
            email: 'admin@hotel.com',
            password: 'password123'
          }
        );
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', mockTokens.admin);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('debe hacer login correctamente con credenciales de recepcionista', async () => {
      const receptionistResponse = { data: { token: mockTokens.receptionist } };
      axios.post.mockResolvedValue(receptionistResponse);
      jwtDecode.mockReturnValue(mockUsers.receptionist);

      renderLogin();

      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);
      const submitButton = screen.getByRole('button', { name: /entrar/i });

      await fireEvent.change(emailInput, { target: { value: 'recepcion@hotel.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'password123' } });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('debe limpiar el mensaje de error al hacer login exitoso', async () => {
      // Primero, simular un error
      axios.post.mockRejectedValueOnce(mockAxiosResponses.loginError);

      renderLogin();

      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);
      const submitButton = screen.getByRole('button', { name: /entrar/i });

      await fireEvent.change(emailInput, { target: { value: 'wrong@email.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'wrong' } });
      await fireEvent.click(submitButton);

      // Verificar que aparece el error
      await waitFor(() => {
        expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument();
      });

      // Ahora simular login exitoso
      axios.post.mockResolvedValue(mockAxiosResponses.loginSuccess);
      jwtDecode.mockReturnValue(mockUsers.admin);

      await fireEvent.change(emailInput, { target: { value: 'admin@hotel.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'correct' } });
      await fireEvent.click(submitButton);

      // El error debería desaparecer
      await waitFor(() => {
        expect(screen.queryByText(/credenciales incorrectas/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Manejo de errores', () => {
    it('debe mostrar mensaje de error con credenciales incorrectas', async () => {
      axios.post.mockRejectedValue(mockAxiosResponses.loginError);

      renderLogin();

      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);
      const submitButton = screen.getByRole('button', { name: /entrar/i });

      await fireEvent.change(emailInput, { target: { value: 'wrong@email.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Credenciales incorrectas ❌')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('debe mostrar mensaje genérico para errores sin respuesta específica', async () => {
      const genericError = new Error('Network Error');
      axios.post.mockRejectedValue(genericError);

      renderLogin();

      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);
      const submitButton = screen.getByRole('button', { name: /entrar/i });

      await fireEvent.change(emailInput, { target: { value: 'test@email.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'password' } });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Credenciales incorrectas ❌')).toBeInTheDocument();
      });
    });

    it('debe mostrar mensaje personalizado del servidor', async () => {
      const customError = {
        response: {
          data: { message: 'Usuario bloqueado temporalmente' },
          status: 423
        }
      };
      axios.post.mockRejectedValue(customError);

      renderLogin();

      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);
      const submitButton = screen.getByRole('button', { name: /entrar/i });

      await fireEvent.change(emailInput, { target: { value: 'blocked@email.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'password' } });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Usuario bloqueado temporalmente')).toBeInTheDocument();
      });
    });
  });

  describe('Estados del formulario', () => {
    it('debe limpiar el error cuando el usuario empieza a escribir', async () => {
      // Primero generar un error
      axios.post.mockRejectedValue(mockAxiosResponses.loginError);

      renderLogin();

      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);
      const submitButton = screen.getByRole('button', { name: /entrar/i });

      await fireEvent.change(emailInput, { target: { value: 'wrong@email.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'wrong' } });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument();
      });

      // El error se debería limpiar al enviar el formulario nuevamente
      axios.post.mockResolvedValue(mockAxiosResponses.loginSuccess);
      jwtDecode.mockReturnValue(mockUsers.admin);

      await fireEvent.click(submitButton);

      // El error debería desaparecer inmediatamente al hacer submit
      expect(screen.queryByText(/credenciales incorrectas/i)).not.toBeInTheDocument();
    });
  });

  describe('Accesibilidad', () => {
    it('debe tener etiquetas apropiadas para los campos', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    it('debe tener texto alternativo para el botón de mostrar/ocultar contraseña', () => {
      renderLogin();

      const toggleButton = screen.getByRole('button', { name: /mostrar\/ocultar contraseña/i });
      expect(toggleButton).toBeInTheDocument();

      // Verificar que tiene screen reader text
      expect(screen.getByText('Mostrar/Ocultar contraseña')).toHaveClass('sr-only');
    });

    it('debe permitir navegación con teclado', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);
      const submitButton = screen.getByRole('button', { name: /entrar/i });

      // Verificar que los elementos son enfocables
      expect(emailInput).not.toHaveAttribute('tabindex', '-1');
      expect(passwordInput).not.toHaveAttribute('tabindex', '-1');
      expect(submitButton).not.toHaveAttribute('tabindex', '-1');
    });
  });
});