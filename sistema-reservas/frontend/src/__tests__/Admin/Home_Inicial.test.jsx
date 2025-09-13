// src/__tests__/Admin/Home_Inicial.test.jsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ReceptionistHome from "../../pages/Admin/home";

// Mock de componentes secundarios para evitar dependencias externas
jest.mock("../../components/Footer", () => () => <div data-testid="footer" />);
jest.mock("../../components/Navbar", () => {
  return function NavbarMock({ setSidebarOpen }) {
    return (
      <button onClick={() => setSidebarOpen(true)}>
        abrir sidebar
      </button>
    );
  };
});
jest.mock("../../components/Sidebar", () => {
  return function SidebarMock({ sidebarOpen, setSidebarOpen }) {
    return (
      <aside data-testid="sidebar">
        {sidebarOpen ? "abierto" : "cerrado"}
        <button onClick={() => setSidebarOpen(false)}>cerrar sidebar</button>
      </aside>
    );
  };
});

describe("home.jsx (solo Home, hijos mockeados)", () => {
  it("renderiza el título principal y los KPIs del resumen", () => {
    render(<ReceptionistHome />);

    // título principal
    expect(screen.getByRole("heading", { name: /resumen hoy/i })).toBeInTheDocument();

    // tarjetas KPI
    expect(screen.getByText("Ocupación")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("Pendientes")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Check In")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("Check Out")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("abre y cierra el sidebar (estado en Home)", () => {
    render(<ReceptionistHome />);

    // inicial: sidebar cerrado
    expect(screen.getByTestId("sidebar")).toHaveTextContent("cerrado");

    // abrir desde Navbar (mock)
    fireEvent.click(screen.getByRole("button", { name: /abrir sidebar/i }));
    expect(screen.getByTestId("sidebar")).toHaveTextContent("abierto");

    // cerrar desde Sidebar (mock)
    fireEvent.click(screen.getByRole("button", { name: /cerrar sidebar/i }));
    expect(screen.getByTestId("sidebar")).toHaveTextContent("cerrado");
  });

  it("muestra las tarjetas destacadas y la leyenda completa", () => {
    render(<ReceptionistHome />);

    // tarjetas destacadas
    expect(screen.getByRole("heading", { name: /habitación 101/i })).toBeInTheDocument();
    expect(screen.getByText(/disponible ahora/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /habitación 102/i })).toBeInTheDocument();
    expect(screen.getByText(/reservada:\s*carlos pérez/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /habitación 301/i })).toBeInTheDocument();
    expect(screen.getByText(/ocupada por j\. perez/i)).toBeInTheDocument();

    // leyenda (validamos cada estado)
    expect(screen.getByRole("heading", { name: /leyenda/i })).toBeInTheDocument();
    expect(screen.getByText("Disponible", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Ocupado", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Pendiente", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Limpieza", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Mantenimiento", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("No habitado", { exact: true })).toBeInTheDocument();
  });

  it("renderiza el mapa de habitaciones y aplica clases según estado", () => {
    render(<ReceptionistHome />);

    // helper: selecciona directamente el div que contiene "Hab. XX"
    const byLabel = (n) =>
      screen.getByText(new RegExp(`^\\s*hab\\.?\\s*${n}\\s*$`, "i"));

    // comprobamos clases de Tailwind en cada estado
    expect(byLabel("01")).toHaveClass("border-green-500", "text-green-700", "bg-green-50"); // disponible
    expect(byLabel("02")).toHaveClass("border-red-500", "text-red-700", "bg-red-50");       // ocupado
    expect(byLabel("03")).toHaveClass("border-gray-800", "text-gray-800", "bg-gray-100");  // mantenimiento
    expect(byLabel("04")).toHaveClass("border-purple-500", "text-purple-700", "bg-purple-50"); // limpieza
    expect(byLabel("05")).toHaveClass("border-yellow-500", "text-yellow-700", "bg-yellow-50"); // pendiente
    expect(byLabel("06")).toHaveClass("border-red-500", "text-red-700", "bg-red-50");      // ocupado
    expect(byLabel("07")).toHaveClass("border-green-500", "text-green-700", "bg-green-50"); // disponible
    expect(byLabel("09")).toHaveClass("border-orange-500", "text-orange-700", "bg-orange-50"); // no habitado
  });
});
