import { vi } from 'vitest';
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";

describe("Sidebar", () => {

  test("muestra el menú lateral en dispositivos móviles cuando sidebarOpen es true", () => {
    render(
      <MemoryRouter>
        <Sidebar sidebarOpen={true} setSidebarOpen={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Gestionar Reservas/i)).toBeVisible();
  });

  test("oculta el menú lateral cuando sidebarOpen es false", () => {
    render(
      <MemoryRouter>
        <Sidebar sidebarOpen={false} setSidebarOpen={() => {}} />
      </MemoryRouter>
    );
    const sidebar = screen.getByTestId("sidebar-component");
    expect(sidebar).toHaveClass('-translate-x-full');
  });

  test("cierra el sidebar al hacer clic en el fondo (overlay)", () => {
    const setSidebarOpen = vi.fn();
    render(
      <MemoryRouter>
        <Sidebar sidebarOpen={true} setSidebarOpen={setSidebarOpen} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByTestId("sidebar-overlay"));
    expect(setSidebarOpen).toHaveBeenCalledWith(false);
  });

  test("cierra el sidebar al hacer clic en un enlace de navegación", () => {
    const setSidebarOpen = vi.fn();
    render(
      <MemoryRouter>
        <Sidebar sidebarOpen={true} setSidebarOpen={setSidebarOpen} />
      </MemoryRouter>
    );
    
    const inicioLink = screen.getByRole('link', { name: /inicio/i });
    fireEvent.click(inicioLink);
    
    expect(setSidebarOpen).toHaveBeenCalledWith(false);
  });
});
