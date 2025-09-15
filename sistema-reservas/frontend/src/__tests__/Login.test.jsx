import { vi, describe, test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Login from "../pages/login.jsx";
import { authService } from '../services/services.jsx';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/services.jsx', () => ({
  authService: {
    login: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});


describe("Login Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test("renderiza inputs y botón", () => {
    render( <MemoryRouter> <Login /> </MemoryRouter> );
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
  });

  test("muestra error si las credenciales son incorrectas", async () => {
    authService.login.mockRejectedValueOnce({ 
        response: { data: { message: 'Credenciales incorrectas ❌' } }
    });
    render( <MemoryRouter> <Login /> </MemoryRouter> );
    
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: 'input' }), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText(/credenciales incorrectas ❌/i)).toBeInTheDocument();
  });

  test("redirige a /admin si el rol es administrator", async () => {
    authService.login.mockResolvedValue({ 
        user: { user_roles: [{ roles: { name: 'administrator' } }] },
        token: 'fake-token' 
    });
    render( <MemoryRouter> <Login /> </MemoryRouter> );
    
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: "admin@gmail.com" } });
    fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: 'input' }), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText("Login exitoso ✅")).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  test("redirige a /receptionist si el rol es receptionist", async () => {
    authService.login.mockResolvedValue({ 
        user: { user_roles: [{ roles: { name: 'receptionist' } }] },
        token: 'fake-token' 
    });
    render( <MemoryRouter> <Login /> </MemoryRouter> );
    
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: "recep@gmail.com" } });
    fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: 'input' }), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText("Login exitoso ✅")).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/receptionist');
    });
  });

  test("muestra error si el rol del usuario no es reconocido", async () => {
    authService.login.mockResolvedValue({
      user: { user_roles: [{ roles: { name: 'guest' } }] },
      token: 'guest-token'
    });
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    render( <MemoryRouter> <Login /> </MemoryRouter> );

    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: "guest@test.com" } });
    fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: 'input' }), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText("Rol de usuario no reconocido.")).toBeInTheDocument();
    expect(removeItemSpy).toHaveBeenCalledWith('token');
  });

  test("el botón ojo alterna visibilidad de la contraseña", () => {
    render( <MemoryRouter> <Login /> </MemoryRouter> );
    const passwordInput = screen.getByLabelText(/contraseña/i, { selector: 'input' });
    const toggle = screen.getByRole("button", { name: /mostrar u ocultar contraseña/i });

    expect(passwordInput).toHaveAttribute("type", "password");
    fireEvent.click(toggle);
    expect(passwordInput).toHaveAttribute("type", "text");
    fireEvent.click(toggle);
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});

