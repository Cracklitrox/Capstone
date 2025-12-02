import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSocketNotifications } from "../../hooks/useSocketNotifications.js";
import { Button } from "../ui/Button";
import {
  Home,
  LayoutGrid,
  ClipboardList,
  PlusCircle,
  CheckCircle2,
  DoorOpen,
  Hotel,
  Users,
  Clock,
  Bell,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Menú reorganizado con mejor estructura y jerarquía
const navLinks = [
  // MAIN SECTION
  {
    href: "/",
    label: "Inicio",
    icon: Home,
    roles: ["administrator", "receptionist"],
  },
  {
    href: "/planning",
    label: "Planning",
    icon: Calendar,
    roles: ["administrator", "receptionist"],
  },

  // RESERVATIONS SECTION
  {
    section: "RESERVAS",
    roles: ["administrator", "receptionist"],
  },
  {
    label: "Gestión de Reservas",
    icon: ClipboardList,
    roles: ["administrator", "receptionist"],
    submenu: [
      {
        href: "/reservations/manage",
        label: "Todas las Reservas",
        icon: ClipboardList,
        roles: ["administrator", "receptionist"],
      },
      {
        href: "/reservations/new",
        label: "Nueva Reserva",
        icon: PlusCircle,
        roles: ["administrator", "receptionist"],
      },
      {
        href: "/reservations/checkins-today",
        label: "Check-ins Hoy",
        icon: CheckCircle2,
        roles: ["administrator", "receptionist"],
      },
      {
        href: "/reservations/checkouts-today",
        label: "Check-outs Hoy",
        icon: DoorOpen,
        roles: ["administrator", "receptionist"],
        showBadge: true,
      },
      {
        href: "/reservations/in-progress",
        label: "En Progreso",
        icon: Hotel,
        roles: ["administrator", "receptionist"],
      },
    ],
  },
  {
    href: "/history",
    label: "Historial de Reservas",
    icon: Clock,
    roles: ["administrator", "receptionist"],
  },

  // ACCOMMODATION SECTION
  {
    section: "GESTIÓN",
    roles: ["administrator", "receptionist"],
  },
  {
    href: "/guests",
    label: "Huéspedes",
    icon: Users,
    roles: ["administrator", "receptionist"],
  },
  {
    label: "Gestionar Habitaciones",
    icon: LayoutGrid,
    roles: ["administrator", "receptionist"],
    submenu: [
      {
        href: "/rooms/pending",
        label: "Habitaciones Pendientes",
        icon: Clock,
        roles: ["administrator", "receptionist"],
      },
      {
        href: "/admin/rooms-crud",
        label: "Habitaciones",
        icon: LayoutGrid,
        roles: ["administrator"],
      },
      {
        href: "/admin/room-types-crud",
        label: "Tipos de Habitación",
        icon: LayoutGrid,
        roles: ["administrator"],
      },
    ],
  },

  // COMMUNICATION SECTION
  {
    section: "COMUNICACIÓN",
    roles: ["administrator", "receptionist"],
  },
  {
    label: "Notificaciones",
    icon: Bell,
    roles: ["administrator", "receptionist"],
    submenu: [
      {
        href: "/notifications",
        label: "Centro de Notificaciones",
        icon: Bell,
        roles: ["administrator", "receptionist"],
        showBadge: false,
      },
      {
        href: "/notifications/chatbot",
        label: "Chatbot WhatsApp",
        icon: MessageSquare,
        roles: ["receptionist"],
        showBadge: true,
      },
    ],
  },

  // ANALYTICS SECTION
  {
    section: "ANÁLISIS",
    roles: ["administrator"],
  },
  {
    label: "Reportes",
    icon: BarChart3,
    roles: ["administrator"],
    submenu: [
      {
        href: "/admin-reports",
        label: "Dashboard Administrativo",
        icon: BarChart3,
        roles: ["administrator"],
      },
      {
        href: "/reports",
        label: "Reportes Detallados",
        icon: BarChart3,
        roles: ["administrator"],
      },
    ],
  },

  // SETTINGS SECTION
  {
    section: "CONFIGURACIÓN",
    roles: ["administrator", "receptionist"],
  },
  {
    href: "/profile",
    label: "Configuración de Perfil",
    icon: Settings,
    roles: ["administrator", "receptionist"],
  },
];

const NavLink = ({
  href,
  label,
  icon: Icon,
  onClick,
  badge = null,
  isCollapsed = false,
}) => {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <Button
      asChild
      variant={isActive ? "secondary" : "ghost"}
      className={cn(
        "w-full transition-all duration-200",
        isCollapsed ? "flex-col h-auto py-3 px-1" : "justify-start h-10",
        isActive && "bg-secondary shadow-sm"
      )}
      onClick={onClick}
      title={isCollapsed ? label : ""}
    >
      <Link
        to={href}
        className={cn(
          "flex items-center min-w-0",
          isCollapsed && "flex-col gap-1"
        )}
      >
        <div className="relative flex-shrink-0">
          {Icon && (
            <Icon
              className={cn(
                "h-5 w-5 flex-shrink-0",
                !isCollapsed && "mr-3",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            />
          )}
          {isCollapsed && badge !== null && badge > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-orange-500 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {isCollapsed ? (
          <span className="text-[9px] leading-tight text-center w-full truncate max-w-[60px]">
            {label.split(" ").slice(0, 2).join(" ")}
          </span>
        ) : (
          <span
            className={cn(
              "flex-1 text-sm font-medium truncate",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {label}
          </span>
        )}
        {!isCollapsed && badge !== null && badge > 0 && (
          <span className="ml-auto flex-shrink-0 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-bold text-white bg-orange-500 rounded-full">
            {badge}
          </span>
        )}
      </Link>
    </Button>
  );
};

const SectionLabel = ({ label, isCollapsed }) => {
  if (isCollapsed) return null;

  return (
    <div className="px-3 py-2 mt-4 first:mt-0">
      <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
        {label}
      </span>
      <div className="h-px bg-border mt-2" />
    </div>
  );
};

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();
  const closeSidebar = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const [openSubmenus, setOpenSubmenus] = useState({});
  const { checkoutCount, whatsappCount, isConnected } = useSocketNotifications();

  // Cerrar todos los submenús cuando el sidebar se colapsa
  useEffect(() => {
    if (!sidebarOpen) {
      setOpenSubmenus({});
    }
  }, [sidebarOpen]);

  const toggleSubmenu = (label) => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setTimeout(() => {
        setOpenSubmenus((prev) => ({ ...prev, [label]: true }));
      }, 300);
      return;
    }
    setOpenSubmenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const getBadgeCount = (sub) => {
    if (!sub.showBadge) return null;
    if (sub.href === "/notifications/chatbot") return whatsappCount;
    if (sub.href === "/reservations/checkouts-today") return checkoutCount;
    return null;
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/60 z-20 transition-opacity lg:hidden",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeSidebar}
        data-testid="sidebar-overlay"
      />
      <aside
        data-testid="sidebar-component"
        className={cn(
          "fixed top-0 left-0 h-full z-30 transition-all duration-300",
          "bg-card text-card-foreground border-r border-border",
          sidebarOpen ? "w-64 p-4" : "w-20 lg:w-20 p-2",
          !sidebarOpen && "lg:translate-x-0",
          !sidebarOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <nav
            className="flex-grow overflow-y-auto pr-1"
          >
            <ul className="space-y-1">
              {navLinks
                .filter((link) => link.roles?.includes(user.role))
                .map((link, index) => {
                  // Section label
                  if (link.section) {
                    return (
                      <li key={`section-${link.section}`}>
                        <SectionLabel
                          label={link.section}
                          isCollapsed={!sidebarOpen}
                        />
                      </li>
                    );
                  }

                  // Submenu item
                  if (link.submenu) {
                    const isOpen = openSubmenus[link.label];
                    return (
                      <li key={link.label}>
                        <button
                          type="button"
                          className={cn(
                            "w-full rounded-md transition-all duration-200 group",
                            "hover:bg-secondary/50",
                            sidebarOpen
                              ? "flex items-center gap-2 px-3 py-2"
                              : "flex flex-col items-center py-3 px-1"
                          )}
                          onClick={() => toggleSubmenu(link.label)}
                          title={!sidebarOpen ? link.label : ""}
                        >
                          <div className="relative flex-shrink-0">
                            {link.icon && (
                              <link.icon
                                className={cn(
                                  "h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors",
                                  !sidebarOpen && "mb-1"
                                )}
                              />
                            )}
                          </div>
                          {!sidebarOpen ? (
                            <span className="text-[9px] leading-tight text-center w-full truncate max-w-[60px]">
                              {link.label.split(" ").slice(0, 2).join(" ")}
                            </span>
                          ) : (
                            <>
                              <span className="flex-1 text-sm font-medium text-left text-muted-foreground group-hover:text-foreground">
                                {link.label}
                              </span>
                              <ChevronRight
                                className={cn(
                                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                  isOpen && "rotate-90"
                                )}
                              />
                            </>
                          )}
                        </button>
                        <ul
                          className={cn(
                            "overflow-hidden transition-all duration-300",
                            sidebarOpen && isOpen
                              ? "max-h-96 opacity-100 mt-1"
                              : "max-h-0 opacity-0"
                          )}
                        >
                          {link.submenu
                            .filter((sub) => sub.roles.includes(user.role))
                            .map((sub) => {
                              const badgeCount = getBadgeCount(sub);
                              return (
                                <li key={sub.href} className="ml-6 mb-1">
                                  <NavLink
                                    href={sub.href}
                                    label={sub.label}
                                    icon={sub.icon}
                                    onClick={closeSidebar}
                                    badge={badgeCount}
                                    isCollapsed={!sidebarOpen}
                                  />
                                </li>
                              );
                            })}
                        </ul>
                      </li>
                    );
                  }

                  // Regular link
                  return (
                    <li key={link.href}>
                      <NavLink
                        href={link.href}
                        label={link.label}
                        icon={link.icon}
                        onClick={closeSidebar}
                        badge={link.showBadge ? checkoutCount : null}
                        isCollapsed={!sidebarOpen}
                      />
                    </li>
                  );
                })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="mt-auto pt-4 border-t border-border space-y-2">
            {(user.role === "receptionist" || user.role === "administrator") && (
              <div
                className={cn(
                  "px-2 py-1.5 text-xs rounded-md flex items-center gap-2",
                  !sidebarOpen && "justify-center",
                  isConnected
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}
                title={!sidebarOpen ? (isConnected ? "Conectado" : "Desconectado") : ""}
              >
                <span className="w-2 h-2 rounded-full bg-current" />
                {sidebarOpen && (
                  <span className="font-medium">
                    {isConnected ? "Conectado" : "Desconectado"}
                  </span>
                )}
              </div>
            )}
            {sidebarOpen && (
              <p className="text-xs text-muted-foreground px-2">
                © 2025 Hotel Don Teo
              </p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
