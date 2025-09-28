import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../services/authContext.jsx";
import { Button } from "@/components/ui/Button.jsx";
import {
  HomeIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ViewColumnsIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

const navLinks = [
  {
    href: "/",
    label: "Inicio",
    icon: HomeIcon,
    roles: ["administrator", "receptionist"],
  },
  {
    href: "/planning",
    label: "Planning",
    icon: ViewColumnsIcon,
    roles: ["administrator", "receptionist"],
  },
  {
    href: "/reservations",
    label: "Gestionar Reservas",
    icon: CalendarDaysIcon,
    roles: ["administrator", "receptionist"],
  },
  {
    href: "/users",
    label: "Gestionar Usuarios",
    icon: UserGroupIcon,
    roles: ["administrator"],
  },
  {
    href: "/settings",
    label: "Configuración",
    icon: Cog6ToothIcon,
    roles: ["administrator"],
  },
  {
    href: "/profile",
    label: "Mi Perfil",
    icon: null,
    roles: ["administrator", "receptionist"],
  },
];

const NavLink = ({ href, label, icon: Icon, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <Button
      asChild
      variant={isActive ? "secondary" : "ghost"}
      className="w-full justify-start text-md"
      onClick={onClick}
    >
      <Link to={href} className="flex items-center">
        {Icon && <Icon className="h-5 w-5 mr-3" />}
        <span>{label}</span>
      </Link>
    </Button>
  );
};

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/60 z-20 transition-opacity md:hidden",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeSidebar}
        data-testid="sidebar-overlay"
      />
      <aside
        data-testid="sidebar-component"
        className={cn(
          "fixed top-0 left-0 h-full w-64 p-4 z-30 transition-transform duration-300",
          "bg-card text-card-foreground border-r border-border",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "md:static md:translate-x-0 md:h-auto"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-primary">Hotel Don Teo</h2>
          </div>
          <nav className="flex-grow">
            <ul className="space-y-2">
              {navLinks
                .filter((link) => link.roles.includes(user.role))
                .map((link) => (
                  <li key={link.label}>
                    <NavLink
                      href={link.href}
                      label={link.label}
                      icon={link.icon}
                      onClick={closeSidebar}
                    />
                  </li>
                ))}
            </ul>
          </nav>
          <div className="mt-auto">
            <p className="text-xs text-muted-foreground">
              © 2025 Hotel Don Teo
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
