import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../App";

global.fetch = jest.fn();

describe("App integration tests", () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it("renders header correctly", () => {
    render(<App />);
    expect(
      screen.getByText(/Proyecto Sistema de Reservas/i)
    ).toBeInTheDocument();
  });

  it("handles successful backend connection", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { time: "2025-09-07T12:00:00Z" } }),
    });

    render(<App />);
    fireEvent.click(screen.getByText(/Testear Conexión Backend/i));

    await waitFor(() =>
      expect(screen.getByText(/Éxito desde la BD:/i)).toBeInTheDocument()
    );
  });

  it("handles backend error", async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    render(<App />);
    fireEvent.click(screen.getByText(/Testear Conexión Backend/i));

    await waitFor(() =>
      expect(
        screen.getByText(/Falló la conexión con el backend/i)
      ).toBeInTheDocument()
    );
  });
});
