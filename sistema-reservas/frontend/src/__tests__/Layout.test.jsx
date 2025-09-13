// src/__tests__/Layout.test.jsx
import { render, screen } from "@testing-library/react";
import Layout from "../components/Layout";

describe("Layout", () => {
  test("muestra el título del encabezado", () => {
    render(<Layout><div>Test</div></Layout>);
    const elements = screen.getAllByText(/Sistema de Reservas/i); // Cambié a getAllByText
    expect(elements[0]).toBeInTheDocument(); // Verifica el primer elemento
  });
});
