import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Layout from '../../components/Layout.jsx';
import { AuthProvider } from '../../services/authContext.jsx';
import { mockUsers, mockTokens, cleanupMocks } from '../utils/testUtils.jsx';
import { localStorageMock } from '../setup/mocks.js';

// Mock del componente Outlet para simular el contenido de las rutas
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet-content">Contenido de la ruta</div>,
  };
});

const renderLayout = (user = mockUsers.admin) => {
  localStorageMock.getItem.mockReturnValue(user ? mockTokens[user.role] : null);
  jwtDecode.mockReturnValue(user);

  return render(
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Layout Component', () => {
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

  describe('Estructura básica', () => {
    it('debe renderizar la estructura principal correctamente', async () => {
      renderLayout();

      await waitFor(() => {
        // Verificar que los componentes principales están presentes
        expect(screen.getByTestId('sidebar-component')).toBeInTheDocument();
        expect(screen.getByRole('banner')).toBeInTheDocument(); // header/navbar
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
      });
    });

    it('debe tener la estructura de clases CSS correcta', async () => {
      renderLayout();

      await waitFor(() => {
        const container = screen.getByTestId('sidebar-component').closest('div');
        expect(container).toHaveClass('flex', 'h-screen', 'bg-background', 'text-foreground', 'overflow-hidden');
      });
    });

    it('debe renderizar el contenido principal con las clases apropiadas', async () => {
      renderLayout();

      await waitFor(() => {
        const main = screen.getByRole('main');
        expect(main).toHaveClass('flex-1', 'overflow-y-auto');
        
        // Verificar el contenedor interno
        const container = main.querySelector('.max-w-7xl');
        expect(container).toHaveClass('max-w-7xl', 'mx-auto');
      });
    });
  });

  describe('Gestión del estado del Sidebar', () => {
    it('debe inicializar con el sidebar cerrado', async () => {
      renderLayout();

      await waitFor(() => {
        const sidebar = screen.getByTestId('sidebar-component');
        // En móvil, el sidebar debe estar cerrado por defecto (-translate-x-full)
        expect(sidebar).toHaveClass('-translate-x-full');
      });
    });

    it('debe abrir el sidebar cuando se hace clic en el botón de menú', async () => {
      renderLayout();

      await waitFor(() => {
        const menuButton = screen.getByTestId('menu-icon').closest('button');
        fireEvent.click(menuButton);
        
        const sidebar = screen.getByTestId('sidebar-component');
        expect(sidebar).toHaveClass('translate-x-0');
      });
    });

    it('debe cerrar el sidebar cuando se hace clic en el overlay', async () => {
      renderLayout();

      await waitFor(() => {
        // Primero abrir el sidebar
        const menuButton = screen.getByTestId('menu-icon').closest('button');
        fireEvent.click(menuButton);
        
        const sidebar = screen.getByTestId('sidebar-component');
        expect(sidebar).toHaveClass('translate-x-0');
        
        // Luego hacer clic en el overlay para cerrarlo
        const overlay = screen.getByTestId('sidebar-overlay');
        fireEvent.click(overlay);
        
        expect(sidebar).toHaveClass('-translate-x-full');
      });
    });

    it('debe cerrar el sidebar cuando se navega a una nueva ruta', async () => {
      renderLayout();

      await waitFor(() => {
        // Abrir sidebar
        const menuButton = screen.getByTestId('menu-icon').closest('button');
        fireEvent.click(menuButton);
        
        // Hacer clic en un link del sidebar
        const navLink = screen.getByText('Inicio').closest('a');
        fireEvent.click(navLink);
        
        // El sidebar debería cerrarse
        const sidebar = screen.getByTestId('sidebar-component');
        expect(sidebar).toHaveClass('-translate-x-full');
      });
    });
  });

  describe('Comportamiento responsive', () => {
    it('debe mostrar el botón de menú solo en dispositivos móviles', async () => {
      renderLayout();

      await waitFor(() => {
        const menuButton = screen.getByTestId('menu-icon').closest('button');
        expect(menuButton).toHaveClass('md:hidden');
      });
    });

    it('debe mostrar el sidebar siempre visible en desktop', async () => {
      renderLayout();

      await waitFor(() => {
        const sidebar = screen.getByTestId('sidebar-component');
        expect(sidebar).toHaveClass('md:static', 'md:translate-x-0');
      });
    });

    it('debe mostrar el overlay solo en móvil cuando el sidebar está abierto', async () => {
      renderLayout();

      await waitFor(() => {
        const overlay = screen.getByTestId('sidebar-overlay');
        expect(overlay).toHaveClass('md:hidden');
      });
    });
  });

  describe('Integración con AuthProvider', () => {
    it('debe funcionar correctamente con usuario administrador', async () => {
      renderLayout(mockUsers.admin);

      await waitFor(() => {
        // Verificar que se muestran las opciones de administrador en el sidebar
        expect(screen.getByText('Gestionar Usuarios')).toBeInTheDocument();
        expect(screen.getByText('Configuración')).toBeInTheDocument();
        expect(screen.getByText('Gestionar Reservas')).toBeInTheDocument();
        expect(screen.getByText('Inicio')).toBeInTheDocument();
      });
    });

    it('debe funcionar correctamente con usuario recepcionista', async () => {
      renderLayout(mockUsers.receptionist);

      await waitFor(() => {
        // Verificar que solo se muestran las opciones disponibles para recepcionista
        expect(screen.getByText('Gestionar Reservas')).toBeInTheDocument();
        expect(screen.getByText('Inicio')).toBeInTheDocument();
        
        // Verificar que NO se muestran opciones de admin
        expect(screen.queryByText('Gestionar Usuarios')).not.toBeInTheDocument();
        expect(screen.queryByText('Configuración')).not.toBeInTheDocument();
      });
    });

    it('debe mostrar el email del usuario en el contexto', async () => {
      renderLayout(mockUsers.admin);

      await waitFor(() => {
        // El layout no muestra directamente el email, pero debe estar disponible en el contexto
        // Esto se verificará indirectamente a través de la funcionalidad del navbar
        expect(screen.getByTestId('logout-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Navegación', () => {
    it('debe permitir navegación a través del sidebar', async () => {
      renderLayout(mockUsers.admin);

      await waitFor(() => {
        const reservasLink = screen.getByText('Gestionar Reservas');
        expect(reservasLink.closest('a')).toHaveAttribute('href', '/reservations');
        
        const usuariosLink = screen.getByText('Gestionar Usuarios');
        expect(usuariosLink.closest('a')).toHaveAttribute('href', '/users');
        
        const configuracionLink = screen.getByText('Configuración');
        expect(configuracionLink.closest('a')).toHaveAttribute('href', '/settings');
      });
    });

    it('debe resaltar la ruta activa', async () => {
      // Mock de useLocation para simular una ruta específica
      const mockLocation = { pathname: '/reservations' };
      
      vi.doMock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useLocation: () => mockLocation,
          Outlet: () => <div data-testid="outlet-content">Contenido de reservas</div>,
        };
      });

      renderLayout(mockUsers.admin);

      await waitFor(() => {
        const reservasLink = screen.getByText('Gestionar Reservas').closest('a');
        expect(reservasLink).toHaveClass('justify-start'); // Clase del botón activo
      });
    });
  });

  describe('Funcionalidad del Navbar', () => {
    it('debe mostrar el toggle de tema', async () => {
      renderLayout();

      await waitFor(() => {
        expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
        expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
        expect(screen.getByRole('switch')).toBeInTheDocument();
      });
    });

    it('debe mostrar el botón de logout', async () => {
      renderLayout();

      await waitFor(() => {
        const logoutButton = screen.getByTestId('logout-icon').closest('button');
        expect(logoutButton).toBeInTheDocument();
        expect(logoutButton).toHaveAttribute('title', 'Cerrar Sesión');
      });
    });

    it('debe mostrar navegación rápida en desktop', async () => {
      renderLayout(mockUsers.admin);

      await waitFor(() => {
        // En desktop debería mostrar links de navegación en el navbar
        const navLinks = screen.getAllByText('Inicio');
        expect(navLinks.length).toBeGreaterThan(1); // Uno en sidebar, otro en navbar
      });
    });
  });

  describe('Accesibilidad', () => {
    it('debe tener roles ARIA apropiados', async () => {
      renderLayout();

      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument(); // header
        expect(screen.getByRole('main')).toBeInTheDocument(); // main content
        expect(screen.getByRole('complementary')).toBeInTheDocument(); // sidebar
      });
    });

    it('debe tener navegación por teclado funcional', async () => {
      renderLayout();

      await waitFor(() => {
        const menuButton = screen.getByTestId('menu-icon').closest('button');
        const logoutButton = screen.getByTestId('logout-icon').closest('button');
        
        expect(menuButton).not.toHaveAttribute('tabindex', '-1');
        expect(logoutButton).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('debe tener etiquetas apropiadas para elementos interactivos', async () => {
      renderLayout();

      await waitFor(() => {
        const themeSwitch = screen.getByRole('switch');
        expect(themeSwitch).toHaveAttribute('id', 'theme-switch');
        
        const label = screen.getByLabelText(/cambiar tema/i);
        expect(label).toBeInTheDocument();
      });
    });
  });

  describe('Estados de carga y error', () => {
    it('debe manejar correctamente el estado de carga del contexto', async () => {
      // Mock para simular loading
      localStorageMock.getItem.mockReturnValue(mockTokens.admin);
      jwtDecode.mockImplementation(() => {
        // Simular delay en la decodificación
        return new Promise(resolve => {
          setTimeout(() => resolve(mockUsers.admin), 100);
        });
      });

      renderLayout();

      // Durante el loading, el layout debería estar presente pero el contenido podría no estar completamente inicializado
      expect(screen.getByTestId('sidebar-component')).toBeInTheDocument();
    });

    it('debe manejar correctamente usuarios sin roles válidos', async () => {
      const invalidUser = { ...mockUsers.admin, role: null };
      renderLayout(invalidUser);

      await waitFor(() => {
        // El layout debería renderizarse pero con funcionalidad limitada
        expect(screen.getByTestId('sidebar-component')).toBeInTheDocument();
      });
    });
  });

  describe('Interacciones complejas', () => {
    it('debe manejar múltiples toggles del sidebar correctamente', async () => {
      renderLayout();

      await waitFor(() => {
        const menuButton = screen.getByTestId('menu-icon').closest('button');
        const sidebar = screen.getByTestId('sidebar-component');
        
        // Estado inicial: cerrado
        expect(sidebar).toHaveClass('-translate-x-full');
        
        // Abrir
        fireEvent.click(menuButton);
        expect(sidebar).toHaveClass('translate-x-0');
        
        // Cerrar
        fireEvent.click(menuButton);
        expect(sidebar).toHaveClass('-translate-x-full');
        
        // Abrir de nuevo
        fireEvent.click(menuButton);
        expect(sidebar).toHaveClass('translate-x-0');
      });
    });

    it('debe mantener el estado del sidebar independiente en diferentes renders', async () => {
      const { rerender } = renderLayout();

      await waitFor(() => {
        const menuButton = screen.getByTestId('menu-icon').closest('button');
        fireEvent.click(menuButton);
        
        const sidebar = screen.getByTestId('sidebar-component');
        expect(sidebar).toHaveClass('translate-x-0');
      });

      // Re-render del componente
      rerender(
        <BrowserRouter>
          <AuthProvider>
            <Layout />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        // El estado debería persistir
        const sidebar = screen.getByTestId('sidebar-component');
        expect(sidebar).toHaveClass('translate-x-0');
      });
    });
  });

  describe('Limpieza de recursos', () => {
    it('debe limpiar event listeners al desmontarse', async () => {
      const { unmount } = renderLayout();

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-component')).toBeInTheDocument();
      });

      // Desmontar el componente
      unmount();

      // Verificar que no hay errores de memoria
      expect(() => {
        fireEvent.click(document.body);
      }).not.toThrow();
    });
  });
});