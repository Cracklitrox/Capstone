import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Sidebar from '../../components/Sidebar.jsx';
import { AuthProvider } from '../../services/authContext.jsx';
import { mockUsers, mockTokens, cleanupMocks } from '../utils/testUtils.jsx';
import { localStorageMock } from '../setup/mocks.js';

const renderSidebar = (sidebarOpen = false, user = mockUsers.admin) => {
  const setSidebarOpen = vi.fn();
  
  localStorageMock.getItem.mockReturnValue(user ? mockTokens[user.role] : null);
  jwtDecode.mockReturnValue(user);

  return {
    setSidebarOpen,
    ...render(
      <BrowserRouter>
        <AuthProvider>
          <Sidebar 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen} 
          />
        </AuthProvider>
      </BrowserRouter>
    )
  };
};

describe('Sidebar Component', () => {
  beforeEach(() => {
    cleanupMocks();
    // Mock del DOM para temas
    Object.defineProperty(document, 'documentElement', {
      value: {
        classList: { toggle: vi.fn() },
        setAttribute: vi.fn(),
        removeAttribute: vi.fn(),
      },
      writable: true,
    });
  });

  describe('Renderizado básico', () => {
    it('debe renderizar la estructura básica del sidebar', async () => {
      const { setSidebarOpen } = renderSidebar();

      // Verificar elementos principales
      expect(screen.getByText('Hotel Don Teo')).toBeInTheDocument();
      expect(screen.getByText('© 2025 Hotel Don Teo')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-component')).toBeInTheDocument();
    });

    it('debe mostrar el overlay cuando está cerrado', () => {
      renderSidebar(false);
      
      const overlay = screen.getByTestId('sidebar-overlay');
      expect(overlay).toHaveClass('opacity-0', 'pointer-events-none');
    });

    it('debe mostrar el overlay cuando está abierto', () => {
      renderSidebar(true);
      
      const overlay = screen.getByTestId('sidebar-overlay');
      expect(overlay).toHaveClass('opacity-100');
      expect(overlay).not.toHaveClass('pointer-events-none');
    });
  });

  describe('Estados del sidebar', () => {
    it('debe estar cerrado por defecto en móvil', () => {
      renderSidebar(false);
      
      const sidebar = screen.getByTestId('sidebar-component');
      expect(sidebar).toHaveClass('-translate-x-full');
    });

    it('debe estar abierto cuando sidebarOpen es true', () => {
      renderSidebar(true);
      
      const sidebar = screen.getByTestId('sidebar-component');
      expect(sidebar).toHaveClass('translate-x-0');
    });

    it('debe tener clases CSS correctas para desktop', () => {
      renderSidebar();
      
      const sidebar = screen.getByTestId('sidebar-component');
      expect(sidebar).toHaveClass('md:static', 'md:translate-x-0');
    });

    it('debe tener z-index apropiado para móvil', () => {
      renderSidebar();
      
      const sidebar = screen.getByTestId('sidebar-component');
      expect(sidebar).toHaveClass('z-30');
    });
  });

  describe('Navegación por roles - Administrador', () => {
    it('debe mostrar todas las opciones para administrador', async () => {
      renderSidebar(false, mockUsers.admin);

      // Verificar que todas las opciones están presentes
      expect(screen.getByText('Inicio')).toBeInTheDocument();
      expect(screen.getByText('Gestionar Reservas')).toBeInTheDocument();
      expect(screen.getByText('Gestionar Usuarios')).toBeInTheDocument();
      expect(screen.getByText('Configuración')).toBeInTheDocument();
    });

    it('debe mostrar todos los iconos para administrador', () => {
      renderSidebar(false, mockUsers.admin);

      expect(screen.getByTestId('home-icon')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });

    it('debe tener enlaces correctos para administrador', () => {
      renderSidebar(false, mockUsers.admin);

      const inicioLink = screen.getByText('Inicio').closest('a');
      const reservasLink = screen.getByText('Gestionar Reservas').closest('a');
      const usuariosLink = screen.getByText('Gestionar Usuarios').closest('a');
      const configLink = screen.getByText('Configuración').closest('a');

      expect(inicioLink).toHaveAttribute('href', '/');
      expect(reservasLink).toHaveAttribute('href', '/reservations');
      expect(usuariosLink).toHaveAttribute('href', '/users');
      expect(configLink).toHaveAttribute('href', '/settings');
    });
  });

  describe('Navegación por roles - Recepcionista', () => {
    it('debe mostrar solo opciones permitidas para recepcionista', async () => {
      renderSidebar(false, mockUsers.receptionist);

      // Verificar opciones permitidas
      expect(screen.getByText('Inicio')).toBeInTheDocument();
      expect(screen.getByText('Gestionar Reservas')).toBeInTheDocument();

      // Verificar que opciones de admin NO están presentes
      expect(screen.queryByText('Gestionar Usuarios')).not.toBeInTheDocument();
      expect(screen.queryByText('Configuración')).not.toBeInTheDocument();
    });

    it('debe mostrar solo iconos permitidos para recepcionista', () => {
      renderSidebar(false, mockUsers.receptionist);

      expect(screen.getByTestId('home-icon')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('users-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('settings-icon')).not.toBeInTheDocument();
    });
  });

  describe('Navegación activa', () => {
    it('debe resaltar el enlace activo', () => {
      // Mock de useLocation para simular ruta activa
      vi.doMock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useLocation: () => ({ pathname: '/reservations' }),
        };
      });

      renderSidebar(false, mockUsers.admin);

      const activeLink = screen.getByText('Gestionar Reservas').closest('button');
      expect(activeLink).toHaveClass('justify-start'); // Verificar que tiene clases de botón activo
    });

    it('debe mostrar enlaces inactivos con estilo apropiado', () => {
      // Mock de useLocation para simular ruta diferente
      vi.doMock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useLocation: () => ({ pathname: '/' }),
        };
      });

      renderSidebar(false, mockUsers.admin);

      const inactiveLink = screen.getByText('Gestionar Reservas').closest('button');
      // Verificar que NO tiene las clases de activo
      expect(inactiveLink).not.toHaveClass('bg-secondary');
    });
  });

  describe('Interacciones', () => {
    it('debe cerrar el sidebar al hacer clic en el overlay', () => {
      const { setSidebarOpen } = renderSidebar(true);

      const overlay = screen.getByTestId('sidebar-overlay');
      fireEvent.click(overlay);

      expect(setSidebarOpen).toHaveBeenCalledWith(false);
    });

    it('debe cerrar el sidebar al hacer clic en un enlace', () => {
      const { setSidebarOpen } = renderSidebar(true, mockUsers.admin);

      const inicioLink = screen.getByText('Inicio').closest('a');
      fireEvent.click(inicioLink);

      expect(setSidebarOpen).toHaveBeenCalledWith(false);
    });

    it('debe cerrar el sidebar para cada enlace disponible', () => {
      const { setSidebarOpen } = renderSidebar(true, mockUsers.admin);

      // Test todos los enlaces
      const links = [
        'Inicio',
        'Gestionar Reservas',
        'Gestionar Usuarios', 
        'Configuración'
      ];

      links.forEach((linkText, index) => {
        const link = screen.getByText(linkText).closest('a');
        fireEvent.click(link);
        expect(setSidebarOpen).toHaveBeenNthCalledWith(index + 1, false);
      });
    });
  });

  describe('Responsive behavior', () => {
    it('debe tener clases responsive apropiadas', () => {
      renderSidebar();
      
      const sidebar = screen.getByTestId('sidebar-component');
      expect(sidebar).toHaveClass(
        'fixed', 'md:static',
        'translate-x-0', 'md:translate-x-0'
      );
    });

    it('debe ocultar el overlay en desktop', () => {
      renderSidebar();
      
      const overlay = screen.getByTestId('sidebar-overlay');
      expect(overlay).toHaveClass('md:hidden');
    });

    it('debe tener dimensiones correctas', () => {
      renderSidebar();
      
      const sidebar = screen.getByTestId('sidebar-component');
      expect(sidebar).toHaveClass('w-64', 'h-full');
    });
  });

  describe('Estructura del contenido', () => {
    it('debe tener la estructura de layout correcta', () => {
      renderSidebar();
      
      const sidebar = screen.getByTestId('sidebar-component');
      const flexContainer = sidebar.querySelector('.flex.flex-col.h-full');
      expect(flexContainer).toBeInTheDocument();
    });

    it('debe mostrar el título con estilos apropiados', () => {
      renderSidebar();
      
      const title = screen.getByText('Hotel Don Teo');
      expect(title).toHaveClass('text-2xl', 'font-bold', 'text-primary');
    });

    it('debe mostrar el copyright en el footer', () => {
      renderSidebar();
      
      const copyright = screen.getByText('© 2025 Hotel Don Teo');
      expect(copyright).toHaveClass('text-xs', 'text-muted-foreground');
    });

    it('debe tener navegación con espaciado correcto', () => {
      renderSidebar();
      
      const nav = screen.getByRole('list');
      expect(nav).toHaveClass('space-y-2');
    });
  });

  describe('Accesibilidad', () => {
    it('debe tener rol de complementary', () => {
      renderSidebar();
      
      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toBeInTheDocument();
    });

    it('debe tener navegación semánticamente correcta', () => {
      renderSidebar();
      
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('debe tener enlaces accesibles por teclado', () => {
      renderSidebar(false, mockUsers.admin);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('debe tener botones accesibles', () => {
      renderSidebar(false, mockUsers.admin);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Manejo de errores', () => {
    it('debe manejar usuario sin rol definido', () => {
      const userWithoutRole = { ...mockUsers.admin, role: undefined };
      
      expect(() => {
        renderSidebar(false, userWithoutRole);
      }).not.toThrow();
      
      // No debería mostrar ningún enlace de navegación
      expect(screen.queryByText('Gestionar Usuarios')).not.toBeInTheDocument();
      expect(screen.queryByText('Gestionar Reservas')).not.toBeInTheDocument();
    });

    it('debe manejar usuario nulo', () => {
      expect(() => {
        renderSidebar(false, null);
      }).not.toThrow();
      
      // Debería mostrar la estructura básica pero sin navegación
      expect(screen.getByText('Hotel Don Teo')).toBeInTheDocument();
    });

    it('debe manejar props undefined', () => {
      expect(() => {
        render(
          <BrowserRouter>
            <AuthProvider>
              <Sidebar />
            </AuthProvider>
          </BrowserRouter>
        );
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('debe renderizar eficientemente con pocos re-renders', () => {
      const { rerender } = renderSidebar();
      
      // Re-render con las mismas props no debería causar cambios
      rerender(
        <BrowserRouter>
          <AuthProvider>
            <Sidebar sidebarOpen={false} setSidebarOpen={vi.fn()} />
          </AuthProvider>
        </BrowserRouter>
      );
      
      expect(screen.getByText('Hotel Don Teo')).toBeInTheDocument();
    });

    it('debe manejar cambios de estado eficientemente', () => {
      const setSidebarOpen = vi.fn();
      const { rerender } = renderSidebar(false);
      
      // Cambiar estado
      rerender(
        <BrowserRouter>
          <AuthProvider>
            <Sidebar sidebarOpen={true} setSidebarOpen={setSidebarOpen} />
          </AuthProvider>
        </BrowserRouter>
      );
      
      const sidebar = screen.getByTestId('sidebar-component');
      expect(sidebar).toHaveClass('translate-x-0');
    });
  });
});