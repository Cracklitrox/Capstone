const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const apiRoutes = require('./api/routes');

const app = express();

// Middlewares de seguridad y configuración
app.use(helmet()); // Ayuda a proteger la app de vulnerabilidades web conocidas
app.use(cors());   // Permite solicitudes de otros orígenes (frontend)
app.use(express.json()); // Permite a la app entender JSON en el cuerpo de las peticiones
app.use(express.urlencoded({ extended: true })); // Permite entender datos de formularios

app.get('/test', (req, res) => {
  res.status(200).send('¡El servidor del Hotel Don Teo está funcionando correctamente! 🏨');
});

app.use('/api/v1', apiRoutes);

module.exports = app;