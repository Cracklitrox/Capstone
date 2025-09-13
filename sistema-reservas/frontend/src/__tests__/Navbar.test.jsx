// src/__tests__/Navbar.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom"; // Importa BrowserRouter
import Navbar from "../components/Navbar";

describe("Navbar", () => {
  test("renderiza el título de la marca correctamente", () => {
    render(
      <BrowserRouter> {/* Envolver en Router */}
        <Navbar setSidebarOpen={() => {}} />
      </BrowserRouter>
    );
    expect(screen.getByText(/Hotel Don Teo/i)).toBeInTheDocument(); // Título correcto
  });

  test("el botón de menú abre el sidebar en dispositivos móviles", () => {
    const setSidebarOpen = jest.fn(); // Mock para simular la función de abrir el sidebar
    render(
      <BrowserRouter> {/* Envolver en Router */}
        <Navbar setSidebarOpen={setSidebarOpen} />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByRole("button")); // Simula el clic en el botón de menú
    expect(setSidebarOpen).toHaveBeenCalledWith(true); // Verifica que la función se haya llamado con `true`
  });
});
