// src/__tests__/Sidebar.test.jsx
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
      <BrowserRouter> {/* Envolver en Router */}
        <Sidebar sidebarOpen={false} setSidebarOpen={() => {}} />
      </BrowserRouter>
    );
    expect(screen.queryByText(/Gestionar Reservas/i)).not.toBeInTheDocument();
  });

  test("cierra el sidebar al hacer clic en el fondo", () => {
    const setSidebarOpen = jest.fn();
    render(
      <BrowserRouter> {/* Envolver en Router */}
        <Sidebar sidebarOpen={true} setSidebarOpen={setSidebarOpen} />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByRole("button")); // Aquí se hace clic en el fondo (si está configurado así)
    expect(setSidebarOpen).toHaveBeenCalledWith(false);
  });
});
