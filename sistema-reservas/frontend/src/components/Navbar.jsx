import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useSocketNotifications } from "../hooks/useSocketNotifications"; // ⭐ NUEVO
import { useNotificationsContext } from "../hooks/useNotificationsContext";
import { AlertsBell } from "./AlertsBell";
import { NotificationBell } from "./NotificationBell";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch.jsx";
import { Label } from "@/components/ui/Label.jsx";
import {
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

const Navbar = ({ toggleSidebar }) => {
  const { logout, user, isDarkMode, toggleTheme } = useAuth();
  const { checkoutCount, whatsappCount, totalCount } = useSocketNotifications(); // ⭐ NUEVO: Usar WebSocket

  // Hook de notificaciones en tiempo real desde el contexto global
  const {
    notifications,
    unreadCount,
    markAsRead: markNotificationAsRead,
    markAsArchived,
    markAllRead,
  } = useNotificationsContext();

  // Solo mostrar notificaciones en tiempo real para admin y recepcionista
  const showRealtimeNotifications = ["administrator", "receptionist"].includes(
    user?.role
  );

  const navLinks = [
    { href: "/", label: "Inicio", roles: ["administrator", "receptionist"] },
  ];

  return (
    <header className="bg-card text-card-foreground border-b border-border p-2 shadow-sm flex justify-between items-center w-full z-10 h-16 flex-shrink-0">
      <div className="flex items-center space-x-4">
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          size="icon"
          className="md:hidden"
        >
          <Bars3Icon className="h-6 w-6" />
        </Button>
        <h1 className="hidden md:block text-xl font-semibold text-primary">
          Panel
        </h1>
      </div>

      <div className="hidden md:flex items-center space-x-2">
        {navLinks
          .filter((link) => link.roles.includes(user.role))
          .map((link) => (
            <Button asChild variant="link" key={link.href}>
              <Link to={link.href}>{link.label}</Link>
            </Button>
          ))}
      </div>

      <div className="flex items-center space-x-4">
        {/* Notificaciones en Tiempo Real - Admin y Recepcionista */}
        {showRealtimeNotifications && (
          <NotificationBell
            notifications={notifications.slice(0, 10)}
            unreadCount={unreadCount}
            onMarkAsRead={markNotificationAsRead}
            onMarkAsArchived={markAsArchived}
            onMarkAllRead={markAllRead}
          />
        )}

        {/* Campanita de alertas del sistema - Solo para recepcionistas */}
        {user?.role === "receptionist" && (
          <AlertsBell
            checkoutCount={checkoutCount}
            whatsappCount={whatsappCount}
          />
        )}

        <div className="flex items-center space-x-2">
          <SunIcon className="h-5 w-5" />
          <Switch
            id="theme-switch"
            checked={isDarkMode}
            onCheckedChange={toggleTheme}
          />
          <MoonIcon className="h-5 w-5" />
          <Label htmlFor="theme-switch" className="sr-only">
            Cambiar tema
          </Label>
        </div>

        <Button onClick={logout} variant="ghost" title="Cerrar Sesión">
          <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-0 md:inline md:mr-2" />
          <span className="hidden md:inline font-medium">Cerrar Sesión</span>
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
