import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from '../services/services';
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

const Navbar = ({ setSidebarOpen }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error("Error al cerrar sesión en el servidor:", error);
        } finally {
            localStorage.removeItem('token');
            navigate('/');
        }
    };

    return (
        <nav className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center w-full z-10">
            {/* --- Sección Izquierda: Botón de Menú y Título --- */}
            <div className="flex items-center space-x-4">
                <button
                    className="md:hidden text-2xl"
                    onClick={() => setSidebarOpen(true)}
                >
                    ☰
                </button>
                <h1 className="text-xl font-semibold md:hidden">Panel</h1>
                <h1 className="hidden md:block text-xl font-semibold">Hotel Don Teo</h1>
            </div>

            {/* --- Sección Central: Links de Navegación (visible en desktop) --- */}
            <div className="hidden md:flex items-center">
                <Link to="/admin" className="mx-2 hover:underline">Inicio</Link>
                <Link to="/admin/reservas" className="mx-2 hover:underline">Reservas</Link>
                <Link to="/admin/usuarios" className="mx-2 hover:underline">Usuarios</Link>
            </div>

            {/* --- Sección Derecha: Botón de Cerrar Sesión --- */}
            <div>
                <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                    title="Cerrar Sesión"
                >
                    <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                    <span className="hidden md:inline font-medium">Cerrar Sesión</span>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;