import { vi } from 'vitest';
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom"; // Importa BrowserRouter
import Sidebar from "../components/Sidebar";

describe("Sidebar", () => {
  test("muestra el menú lateral en dispositivos móviles cuando sidebarOpen es true", () => {
    render(
      <BrowserRouter> {/* Envolver en Router */}
        <Sidebar sidebarOpen={true} setSidebarOpen={() => {}} />
      </BrowserRouter>
    );
    expect(screen.getByText(/Gestionar Reservas/i)).toBeInTheDocument(); // Cambiar según lo que tu sidebar tenga
  });

  test("oculta el menú lateral cuando sidebarOpen es false", () => {
    render(
      <BrowserRouter>
        <Sidebar sidebarOpen={false} setSidebarOpen={() => {}} />
      </BrowserRouter>
    );

    const sidebar = screen.getByTestId("sidebar-component");
    expect(sidebar).toHaveClass('-translate-x-full');
    expect(sidebar).not.toHaveClass('translate-x-0');
  });

  test("cierra el sidebar al hacer clic en el fondo", () => {
    const setSidebarOpen = vi.fn();
    render(
      <BrowserRouter> {/* Envolver en Router */}
        <Sidebar sidebarOpen={true} setSidebarOpen={setSidebarOpen} />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByTestId("sidebar-overlay"));
    expect(setSidebarOpen).toHaveBeenCalledWith(false);
  });
});
