// src/__tests__/Footer.test.jsx
import { render, screen } from "@testing-library/react";
import Footer from "../components/Footer";

describe("Footer", () => {
  test("muestra el texto correcto en el pie de página", () => {
    render(<Footer />);
    expect(screen.getByText(/Hotel Don Teo - Todos los derechos reservados/i)).toBeInTheDocument();
  });
});
