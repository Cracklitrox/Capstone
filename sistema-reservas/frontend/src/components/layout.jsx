import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-1">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 p-4 sm:p-6 bg-gray-100 overflow-y-auto">
          {/* AQUI SE RENDERIZARÁN TODAS LAS PÁGINAS (DASHBOARD, HABITACIONES, ETC) */}
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;