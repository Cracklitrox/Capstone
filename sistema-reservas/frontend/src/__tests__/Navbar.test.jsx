import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; 
import Navbar from '../components/Navbar.jsx';


const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../services/services.jsx', () => ({
  authService: {
    logout: vi.fn(),
  },
}));

import { authService } from '../services/services.jsx';


describe("Navbar", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test("renderiza el título de la marca correctamente", () => {
    render(
      <MemoryRouter>
        <Navbar setSidebarOpen={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Hotel Don Teo/i)).toBeInTheDocument();
  });

  test("el botón de menú abre el sidebar en dispositivos móviles", () => {
    const setSidebarOpen = vi.fn();
    render(
      <MemoryRouter>
        <Navbar setSidebarOpen={setSidebarOpen} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: /abrir menú/i }));
    expect(setSidebarOpen).toHaveBeenCalledWith(true);
  });

  test('cierra la sesión y redirige al login al hacer clic en logout', async () => {
    localStorage.setItem('token', 'fake-token-123');
    authService.logout.mockResolvedValue({ success: true });
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    
    render(
      <MemoryRouter>
        <Navbar setSidebarOpen={() => {}} />
      </MemoryRouter>
    );

    const logoutButton = screen.getByRole('button', { name: /cerrar sesión/i });
    fireEvent.click(logoutButton);

    await vi.waitFor(() => {
        expect(authService.logout).toHaveBeenCalledTimes(1);
        expect(removeItemSpy).toHaveBeenCalledWith('token');
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('cierra la sesión localmente aunque la API falle', async () => {
    localStorage.setItem('token', 'fake-token-123');
    authService.logout.mockRejectedValue(new Error('Error de red'));
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <Navbar setSidebarOpen={() => {}} />
      </MemoryRouter>
    );

    const logoutButton = screen.getByRole('button', { name: /cerrar sesión/i });
    fireEvent.click(logoutButton);

    await vi.waitFor(() => {
        expect(removeItemSpy).toHaveBeenCalledWith('token');
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    consoleErrorSpy.mockRestore();
  });
});
