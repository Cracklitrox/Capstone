import React from "react";
import { Link } from "react-router-dom";

const Navbar = ({ setSidebarOpen }) => {
    return (
        <nav className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center w-full z-10">
            <button
                className="md:hidden text-2xl"
                onClick={() => setSidebarOpen(true)}
            >
                ☰
            </button>
            
            <h1 className="text-xl font-semibold md:hidden">Panel</h1>
            <h1 className="hidden md:block text-xl font-semibold">Hotel Don Teo</h1>

            <div className="hidden md:flex items-center">
                <Link to="/admin" className="mx-2 hover:underline">Inicio</Link>
                <Link to="/admin" className="mx-2 hover:underline">Reservas</Link>
                <Link to="/admin" className="mx-2 hover:underline">Usuarios</Link>
            </div>
        </nav>
    );
};

export default Navbar;