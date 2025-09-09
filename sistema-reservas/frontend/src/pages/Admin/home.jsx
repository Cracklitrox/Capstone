import React from 'react';

const AdminHome = () => {
    return (
        <div style={{ padding: '2rem' }}>
            <h1>Panel de Administración</h1>
            <p>Bienvenido al panel de administración. Aquí puedes gestionar reservas, usuarios y configuraciones del sistema.</p>
            <div style={{ marginTop: '2rem' }}>
                <ul>
                    <li><a href="/admin/reservas">Gestionar Reservas</a></li>
                    <li><a href="/admin/usuarios">Gestionar Usuarios</a></li>
                    <li><a href="/admin/configuracion">Configuración del Sistema</a></li>
                </ul>
            </div>
        </div>
    );
};

export default AdminHome;