import React, { useState } from "react";

function App() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const testBackendConnection = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("http://localhost:3001/api/prisma-time");
      if (!res.ok) throw new Error(`Error: ${res.status}`);

      const data = await res.json();
      setMessage(`Éxito desde la BD: ${data.time}`);
    } catch (err) {
      setError("Falló la conexión con el backend. Revisa la consola del navegador (F12).");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Proyecto Sistema de Reservas</h1>
        <p>Haz clic en el botón para probar la conexión con el backend.</p>
        <button onClick={testBackendConnection}>Testear Conexión Backend</button>

        {loading && <p>Cargando...</p>}
        {message && <p>{message}</p>}
        {error && <p>{error}</p>}
      </header>
    </div>
  );
}

export default App;
