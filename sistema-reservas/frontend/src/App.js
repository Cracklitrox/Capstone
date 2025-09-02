import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testBackendConnection = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      // Hacemos la llamada a nuestra API en el backend
      const response = await fetch('http://localhost:3001/api/test-db');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMessage(`Éxito desde la BD: ${data.time}`);
    } catch (e) {
      console.error("Error al conectar con el backend:", e);
      setError('Falló la conexión con el backend. Revisa la consola del navegador (F12).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1>Proyecto Sistema de Reservas</h1>
        
        <p>Haz clic en el botón para probar la conexión con el backend.</p>

        <button onClick={testBackendConnection} disabled={loading}>
          {loading ? 'Probando...' : 'Testear Conexión Backend'}
        </button>

        {message && <p style={{ color: '#61dafb' }}>{message}</p>}
        {error && <p style={{ color: '#ff6666' }}>{error}</p>}

      </header>
    </div>
  );
}

export default App;