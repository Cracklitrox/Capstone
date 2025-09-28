import { vi } from 'vitest';

// Mock de react-router-dom
export const mockNavigate = vi.fn();
export const mockLocation = { pathname: '/' };

// Mock simple sin vi.mock para evitar problemas de hoisting
globalThis.mockNavigate = mockNavigate;

// Mock de localStorage
export const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock de matchMedia (para theme detection)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});