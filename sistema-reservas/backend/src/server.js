require('dotenv').config();

const app = require('./app');
const port = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${port}`);
  });
}