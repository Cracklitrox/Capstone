import React from 'react';

const Footer = () => {
  return (
    // Usamos 'bg-card' para que tenga el mismo color de fondo que el Sidebar,
    // creando una apariencia unificada. El borde superior lo separa del contenido.
    // El texto usa 'text-muted-foreground' para ser sutil.
    <footer className="bg-card text-muted-foreground border-t border-border p-4 text-center text-sm">
      © {new Date().getFullYear()} Hotel Don Teo - Todos los derechos reservados
    </footer>
  );
};

export default Footer;