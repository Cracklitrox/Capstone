import React from 'react';

const ReceptionistHome = () => {
    return (
        <div style={{ padding: '2rem' }}>
            <h1>Bienvenido, Recepcionista</h1>
            <p>Utilice el menú para gestionar reservas y clientes.</p>
            <ul>
                <li>Ver reservas</li>
                <li>Registrar nueva reserva</li>
                <li>Consultar clientes</li>
            </ul>
        </div>
    );
};

export default ReceptionistHome;