import React from 'react';
import ReactDOM from 'react-dom/client';

// 1. ¡Importamos los estilos PRIMERO!
//    Esto garantiza que todas las clases de Tailwind y nuestras variables de color
//    estén disponibles para la aplicación antes de que se renderice cualquier componente.
import './index.css';

import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './services/authContext.jsx'; 
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);