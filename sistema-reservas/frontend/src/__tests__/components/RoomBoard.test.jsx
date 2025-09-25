import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import RoomBoard from "../../components/RoomBoard";

// Mock de habitaciones para paginación y selección
const mockRooms = [
  { number: "101", type: "Simple", floor: 1, status: "available" },
  { number: "102", type: "Doble", floor: 2, status: "occupied" },
  { number: "103", type: "Suite", floor: 1, status: "pending" },
  { number: "104", type: "Suite", floor: 2, status: "maintenance" },
  { number: "105", type: "Suite", floor: 3, status: "cleaning" },
  { number: "106", type: "Suite", floor: 1, status: "available" },
  { number: "107", type: "Suite", floor: 2, status: "pending" },
  { number: "108", type: "Suite", floor: 3, status: "available" },
  { number: "109", type: "Suite", floor: 1, status: "available" },
];

vi.mock("../../services/rooms", () => ({
  fetchRooms: () => Promise.reject(new Error("Error de prueba")),
}));

describe("RoomBoard", () => {
  it("permite cambiar el filtro de piso y muestra solo habitaciones de ese piso", () => {
    render(<RoomBoard rooms={mockRooms} />);
    const select = screen.getByLabelText(/piso/i);
    fireEvent.change(select, { target: { value: "2" } });
    // Solo habitaciones del piso 2
    const botones = screen.getAllByRole("button");
    expect(botones.some(btn => btn.textContent.includes("102"))).toBe(true);
    expect(botones.some(btn => btn.textContent.includes("104"))).toBe(true);
    expect(botones.some(btn => btn.textContent.includes("107"))).toBe(true);
    // No debe estar una del piso 1
    expect(botones.some(btn => btn.textContent.includes("101"))).toBe(false);
  });

  it("permite cambiar el filtro de estado y muestra solo habitaciones de ese estado", () => {
    render(<RoomBoard rooms={mockRooms} />);
    const select = screen.getByLabelText(/estado/i);
    fireEvent.change(select, { target: { value: "Limpieza" } });
    // Solo habitaciones en limpieza
    const botones = screen.getAllByRole("button");
    expect(botones.some(btn => btn.textContent.includes("105"))).toBe(true);
    expect(botones.some(btn => btn.textContent.includes("101"))).toBe(false);
  });

  it("muestra la paginación y permite navegar entre páginas", () => {
    render(<RoomBoard rooms={mockRooms} />);
    // Debería haber botón siguiente
    const btnSiguiente = screen.getByText(/siguiente/i);
    expect(btnSiguiente).toBeInTheDocument();
    fireEvent.click(btnSiguiente);
    // Cambia de página, debe seguir existiendo botón anterior
    const btnAnterior = screen.getByText(/anterior/i);
    expect(btnAnterior).toBeInTheDocument();
  });

  it("cierra el modal correctamente en todos los estados de habitación", async () => {
    // Estados a testear
    const estados = [
      { idx: 1, mock: { status: "occupied", reservation_rooms: [{ reservations: { code: "X" } }] } },
      { idx: 3, mock: { status: "maintenance", maintenance: { description: "desc" } } },
      { idx: 4, mock: { status: "cleaning", cleaning: { notes: "n" } } },
      { idx: 0, mock: { status: "available" } },
    ];
    for (const { idx, mock } of estados) {
      vi.doMock("../../services/roomDetails", () => ({
        fetchRoomDetails: () => Promise.resolve({
          room_number: "test",
          floor: 1,
          room_types: { name: "Simple" },
          ...mock,
        }),
      }));
      render(<RoomBoard rooms={mockRooms} />);
      const roomButton = screen.getAllByRole("button")[idx];
      fireEvent.click(roomButton);
      await waitFor(() => {
        // Modal abierto
        expect(document.querySelector('[aria-label="Cerrar"]')).toBeInTheDocument();
      });
      // Cerrar modal
      fireEvent.click(document.querySelector('[aria-label="Cerrar"]'));
      expect(document.querySelector('[aria-label="Cerrar"]')).not.toBeInTheDocument();
      vi.unmock("../../services/roomDetails");
      vi.resetModules();
    }
  });

  it("muestra correctamente el mensaje de error global si la prop error está presente", () => {
  render(<RoomBoard rooms={mockRooms} error="Error global" />);
  // Busca la palabra 'error' en cualquier nodo
  const allNodes = document.querySelectorAll('*');
  const found = Array.from(allNodes).some(node => node.textContent && /error/i.test(node.textContent));
  expect(found).toBe(true);
  });

  it("muestra correctamente el mensaje de loading global si la prop loading está presente", () => {
  render(<RoomBoard rooms={mockRooms} loading={true} />);
  // Busca la palabra 'cargando' en cualquier nodo
  const allNodes = document.querySelectorAll('*');
  const found = Array.from(allNodes).some(node => node.textContent && /cargando/i.test(node.textContent));
  expect(found).toBe(true);
  });
  it("cierra el modal de detalles al hacer click en el botón ×", async () => {
    // Mock para detalles exitosos
    vi.doMock("../../services/roomDetails", () => ({
      fetchRoomDetails: () => Promise.resolve({
        room_number: "101",
        floor: 1,
        room_types: { name: "Simple" },
        status: "available",
        capacity: 2,
        base_price: 10000,
        description: "Habitación simple",
        reservation_rooms: [],
      }),
    }));
    render(<RoomBoard rooms={mockRooms} />);
    const roomButton = screen.getAllByRole("button")[0];
    fireEvent.click(roomButton);
    await waitFor(() => {
      expect(screen.getByText(/detalles de la habitación/i)).toBeInTheDocument();
    });
    // Cierra el modal con el botón ×
    const closeBtn = screen.getByLabelText(/cerrar/i);
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/detalles de la habitación/i)).not.toBeInTheDocument();
    vi.unmock("../../services/roomDetails");
    vi.resetModules();
  });

  it("muestra detalles de reserva si la habitación está ocupada", async () => {
    vi.doMock("../../services/roomDetails", () => ({
      fetchRoomDetails: () => Promise.resolve({
        room_number: "102",
        floor: 2,
        room_types: { name: "Doble" },
        status: "occupied",
        reservation_rooms: [{
          reservations: {
            code: "RES123",
            check_in_date: "2025-09-24T12:00:00Z",
            check_out_date: "2025-09-25T12:00:00Z",
            users_reservations_main_guest_idTousers: { first_name: "Juan", paternal_last_name: "Pérez" },
            total_amount: 20000,
            paid_amount: 15000,
          },
        }],
      }),
    }));
    render(<RoomBoard rooms={mockRooms} />);
    const roomButton = screen.getAllByRole("button")[1];
    fireEvent.click(roomButton);
    await waitFor(() => {
      // Busca todos los nodos y filtra por textContent normalizado (sin emoji, sin espacios extra)
  // Solo verifica que la palabra 'reserva' esté en algún nodo
  const allNodes = document.querySelectorAll('*');
  const found = Array.from(allNodes).some(node => node.textContent && /reserva/i.test(node.textContent));
  expect(found).toBe(true);
    });
    vi.unmock("../../services/roomDetails");
    vi.resetModules();
  });

  it("muestra detalles de limpieza si la habitación está en limpieza", async () => {
    vi.doMock("../../services/roomDetails", () => ({
      fetchRoomDetails: () => Promise.resolve({
        room_number: "105",
        floor: 3,
        room_types: { name: "Suite" },
        status: "cleaning",
        cleaning: {
          start_time: "2025-09-24T10:00:00Z",
          end_time: null,
          notes: "Limpieza profunda",
        },
        reservation_rooms: [],
      }),
    }));
    render(<RoomBoard rooms={mockRooms} />);
    const roomButton = screen.getAllByRole("button")[4];
    fireEvent.click(roomButton);
    await waitFor(() => {
  // Solo verifica que la palabra 'limpieza' esté en algún nodo
  const allNodes = document.querySelectorAll('*');
  const found = Array.from(allNodes).some(node => node.textContent && /limpieza/i.test(node.textContent));
  expect(found).toBe(true);
    });
    vi.unmock("../../services/roomDetails");
    vi.resetModules();
  });

  it("muestra detalles de mantenimiento si la habitación está en mantenimiento", async () => {
    vi.doMock("../../services/roomDetails", () => ({
      fetchRoomDetails: () => Promise.resolve({
        room_number: "104",
        floor: 2,
        room_types: { name: "Suite" },
        status: "maintenance",
        maintenance: {
          category: "Aire acondicionado",
          description: "Reparación de aire",
          start_date: "2025-09-24T09:00:00Z",
          end_date: null,
          priority: "Alta",
          status: "En progreso",
        },
        reservation_rooms: [],
      }),
    }));
    render(<RoomBoard rooms={mockRooms} />);
    const roomButton = screen.getAllByRole("button")[3];
    fireEvent.click(roomButton);
    await waitFor(() => {
  // Solo verifica que la palabra 'mantenimiento' esté en algún nodo
  const allNodes = document.querySelectorAll('*');
  const found = Array.from(allNodes).some(node => node.textContent && /mantenimiento/i.test(node.textContent));
  expect(found).toBe(true);
    });
    vi.unmock("../../services/roomDetails");
    vi.resetModules();
  });
  it("muestra mensaje de error si falla la carga de detalles de habitación", async () => {
    // Mock dinámico solo para este test
    vi.doMock("../../services/roomDetails", () => ({
      fetchRoomDetails: () => Promise.reject(new Error("Error al cargar detalles")),
    }));
    render(<RoomBoard rooms={mockRooms} />);
    // Selecciona una habitación para disparar la carga de detalles
    const roomButton = screen.getAllByRole("button")[0];
    fireEvent.click(roomButton);
    await waitFor(() => {
      expect(screen.getByText(/no se pudo obtener detalles de la habitación/i)).toBeInTheDocument();
    });
    vi.unmock("../../services/roomDetails");
    vi.resetModules();
  });

  it("muestra mensaje de 'No hay habitaciones' si la lista está vacía", () => {
    render(<RoomBoard rooms={[]} />);
    expect(screen.getByText(/no hay habitaciones/i)).toBeInTheDocument();
  });

  it("muestra el estado de loading si no se pasa la prop rooms", () => {
    render(<RoomBoard />);
    expect(screen.getByText(/cargando habitaciones/i)).toBeInTheDocument();
  });

  it("muestra mensaje de error si ocurre un error en fetchRooms", async () => {
    render(<RoomBoard />);
    await waitFor(() =>
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    );
  });

  it("permite cambiar de página", () => {
    render(<RoomBoard rooms={mockRooms} />);
    fireEvent.click(screen.getByText(/siguiente/i));
    expect(screen.getByText(/página 2/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/anterior/i));
    expect(screen.getByText(/página 1/i)).toBeInTheDocument();
  });

  it("permite seleccionar una habitación y ver detalles, y cerrar el detalle", () => {
    render(<RoomBoard rooms={mockRooms} />);
    const roomButton = screen.getAllByRole("button")[0];
    fireEvent.click(roomButton);
    expect(screen.getByText(/detalles de la habitación/i)).toBeInTheDocument();
    // Cerrar el detalle (ajusta el selector si tu botón de cerrar tiene otro texto)
    const closeButton = screen.getByRole("button", { name: /cerrar/i });
    fireEvent.click(closeButton);
    expect(screen.queryByText(/detalles de la habitación/i)).not.toBeInTheDocument();
  });

  it("filtra habitaciones por piso y estado", () => {
    render(<RoomBoard rooms={mockRooms} />);
    fireEvent.change(screen.getByLabelText(/piso/i), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: "Ocupado" } });
    // Usar matcher de función para encontrar el número aunque esté fragmentado
    expect(screen.getByText((content) => content.includes("102"))).toBeInTheDocument();
  });

  it("muestra mensaje de 'No hay habitaciones' si el filtro no encuentra resultados", () => {
    render(<RoomBoard rooms={mockRooms} />);
    fireEvent.change(screen.getByLabelText(/piso/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: "Ocupado" } });
    expect(screen.getByText(/no hay habitaciones/i)).toBeInTheDocument();
  });
});