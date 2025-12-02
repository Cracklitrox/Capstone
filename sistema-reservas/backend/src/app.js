import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import apiRoutes from './api/routes.js';
import errorHandler from './middleware/errorHandler.js';

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

// Manejo de rutas no encontradas (404)
app.use((req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Middleware de manejo de errores global
app.use(errorHandler);

export default app;
