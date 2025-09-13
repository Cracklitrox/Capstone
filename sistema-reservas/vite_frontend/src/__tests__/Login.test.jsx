import { vi } from 'vitest';
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Login from "../pages/login";

beforeEach(() => {
  window.alert = vi.fn();
});

describe("Login Component", () => {
  test("renderiza inputs y botón", () => {
    render(<Login />);
    expect(screen.getByLabelText(/correo/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
  });

  test("muestra error si las credenciales son incorrectas", () => {
    render(<Login />);
    fireEvent.change(screen.getByLabelText(/correo/i, { selector: 'input' }), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: 'input' }), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument();
  });

  test("muestra alerta si las credenciales son correctas", () => {
    render(<Login />);
    fireEvent.change(screen.getByLabelText(/correo/i, { selector: 'input' }), {
      target: { value: "admin@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: 'input' }), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(window.alert).toHaveBeenCalledWith("Login exitoso ✅");
  });

  test("el botón ojo alterna visibilidad de la contraseña", () => {
    render(<Login />);
    const passwordInput = screen.getByLabelText(/contraseña/i, { selector: 'input' });
    const toggle = screen.getByRole("button", { name: /mostrar u ocultar contraseña/i });

    // estado inicial
    expect(passwordInput).toHaveAttribute("type", "password");

    // click → visible
    fireEvent.click(toggle);
    expect(passwordInput).toHaveAttribute("type", "text");

    // click → oculto
    fireEvent.click(toggle);
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
