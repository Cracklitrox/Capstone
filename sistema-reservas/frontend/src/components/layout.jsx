import React from 'react';

const Layout = ({ children }) => {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{ background: '#1976d2', color: '#fff', padding: '1rem' }}>
                <h1>Sistema de Reservas</h1>
            </header>
            <main style={{ flex: 1, padding: '2rem' }}>
                {children}
            </main>
            <footer style={{ background: '#eee', padding: '1rem', textAlign: 'center' }}>
                © {new Date().getFullYear()} Sistema de Reservas
            </footer>
        </div>
    );
};

export default Layout;