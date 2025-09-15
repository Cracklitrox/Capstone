const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const apiRoutes = require('./api/routes');

const app = express();

// --- INICIO DE LA CONFIGURACIÓN DE CORS RECOMENDADA ---

const allowedOrigins = ['http://localhost:5173'];

// 2. Crea las opciones de CORS.
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'La política de CORS para este sitio no permite el acceso desde el origen especificado.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
};

app.use(cors(corsOptions));


app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/test', (req, res) => {
  res.status(200).send('¡El servidor del Hotel Don Teo está funcionando correctamente! 🏨');
});

app.use('/api/v1', apiRoutes);

module.exports = app;
