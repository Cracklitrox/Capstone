const express = require('express'); // Framework del servidor
const cors = require('cors'); // Un paquete crucial para permitir que el frontend (que corre en un puerto diferente) se comunique con tu backend.
const { Pool } = require('pg'); // Cliente para conectarse a la base de datos PostgreSQL
require('dotenv').config(); // Para gestionar variables de entorno (como contraseñas de la base de datos) de forma segura.

const app = express();
app.use(cors());
const port = 3001;

// Configuración de la conexión a PostgreSQL usando la variable de entorno
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Ruta de prueba para verificar la conexión a la base de datos
app.get('/api/test-db', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    res.json({ message: 'Conexión a la base de datos exitosa!', time: result.rows[0].now });
    client.release();
  } catch (err) {
    console.error('Error al conectar a la base de datos', err);
    res.status(500).json({ error: 'No se pudo conectar a la base de datos' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${port}`);
});