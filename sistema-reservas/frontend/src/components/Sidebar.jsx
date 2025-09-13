import React from "react";
import { Link } from "react-router-dom";

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
    return (
        <>
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity md:hidden ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                onClick={() => setSidebarOpen(false)}
            ></div>

            <aside
                className={`
          // --- Base y comportamiento móvil (superposición) ---
          fixed top-0 left-0 h-screen w-64 bg-gray-800 text-white p-4 z-30
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}

          // --- Comportamiento en Desktop (estático y en el flujo) ---
          md:static md:translate-x-0 md:h-auto md:flex-shrink-0
        `}
            >
                <h2 className="text-2xl font-bold mb-6">Hotel Don Teo</h2>
                <nav>
                    <ul>
                        <li className="py-2">
                            <Link to="/admin" className="hover:text-blue-400" onClick={() => setSidebarOpen(false)}>
                                Inicio
                            </Link>
                        </li>
                        <li className="py-2">
                            <Link to="/admin" className="hover:text-blue-400" onClick={() => setSidebarOpen(false)}>
                                Gestionar Reservas
                            </Link>
                        </li>
                        <li className="py-2">
                            <Link to="/admin" className="hover:text-blue-400" onClick={() => setSidebarOpen(false)}>
                                Gestionar Usuarios
                            </Link>
                        </li>
                        <li className="py-2">
                            <Link to="/admin" className="hover:text-blue-400" onClick={() => setSidebarOpen(false)}>
                                Configuración
                            </Link>
                        </li>
                    </ul>
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;