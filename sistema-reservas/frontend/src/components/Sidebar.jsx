import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSocketNotifications } from "../hooks/useSocketNotifications.js";
import { Button } from "@/components/ui/Button.jsx";
import {
  HomeIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ViewColumnsIcon,
  ClockIcon,
  BellAlertIcon,
  BellIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
  PlusCircle,
  ClipboardList,
  CheckCircle2,
  DoorOpen,
  Hotel,
  LayoutGrid,
  MessageSquare
} from "lucide-react";

// Menú principal con submenú para habitaciones
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
    href: "/guests",
    label: "Huéspedes",
    icon: UserGroupIcon,
    roles: ["administrator", "receptionist"],
  },
  {
    label: "Notificaciones",
    icon: BellIcon,
    roles: ["administrator", "receptionist"],
    submenu: [
      {
        href: "/notifications",
        label: "Centro de Notificaciones",
        icon: BellIcon,
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
  {
    label: "Gestionar Habitaciones",
    icon: ViewColumnsIcon,
    roles: ["administrator", "receptionist"],
    submenu: [
      {
        href: "/rooms/pending",
        label: "Habitaciones Pendientes",
        icon: ClockIcon,
        roles: ["administrator", "receptionist"],
      },
      {
        href: "/admin/room-status-board",
        label: "Tablero de Estados",
        icon: LayoutGrid,
        roles: ["administrator"],
      },
      {
        href: "/admin/rooms-crud",
        label: "Habitaciones",
        icon: ViewColumnsIcon,
        roles: ["administrator"],
      },
      {
        href: "/admin/room-types-crud",
        label: "Tipo de habitaciones",
        icon: ViewColumnsIcon,
        roles: ["administrator"],
      },
    ],
  },
  {
    href: "/history",
    label: "Historial de Reservas",
    icon: ClockIcon,
    roles: ["administrator", "receptionist"],
  },
  {
    label: "Reportes",
    icon: ChartBarIcon,
    roles: ["administrator"],
    submenu: [
      {
        href: "/admin-reports",
        label: "Dashboard Administrativo",
        icon: ChartBarIcon,
        roles: ["administrator"],
      },
      {
        href: "/reports",
        label: "Reportes Detallados",
        icon: ChartBarIcon,
        roles: ["administrator"],
      },
    ],
  },
  {
    href: "/profile",
    label: "Configuración de Perfil",
    icon: Cog6ToothIcon,
    roles: ["administrator", "receptionist"],
  },
];

const NavLink = ({
  href,
  label,
  icon: Icon,
  onClick,
  className = "",
  style = {},
  badge = null,
}) => {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <Button
      asChild
      variant={isActive ? "secondary" : "ghost"}
      className="w-full justify-start text-md"
      onClick={onClick}
    >
      <Link to={href} className="flex items-center min-w-0">
        {Icon && <Icon className="h-5 w-5 mr-3 flex-shrink-0" />}
        <span
          className={cn(
            "flex-1 text-left break-words whitespace-normal",
            className
          )}
          style={{ wordBreak: "break-word", whiteSpace: "normal", ...style }}
        >
          {label}
        </span>
        {badge !== null && badge > 0 && (
          <span className="ml-2 flex-shrink-0 inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-xs font-bold text-white bg-orange-500 rounded-full">
            {badge}
          </span>
        )}
      </Link>
    </Button>
  );
};

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();
  const closeSidebar = () => setSidebarOpen(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [reservationsOpen, setReservationsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  // ⭐ Usar WebSocket en lugar de polling
  const { checkoutCount, whatsappCount, isConnected } = useSocketNotifications();

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
          <nav className="flex-grow overflow-y-auto pr-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <ul className="space-y-2">
              {navLinks
                .filter((link) => link.roles.includes(user.role))
                .map((link) =>
                  link.submenu ? (
                    <li key={link.label} className="group">
                      <button
                        type="button"
                        className="flex items-center gap-2 font-semibold text-[var(--secondary)] mb-1 w-full focus:outline-none px-2"
                        onClick={() => {
                          if (link.label === "Gestionar Habitaciones") {
                            setRoomsOpen((open) => !open);
                          } else if (link.label === "Gestión de Reservas") {
                            setReservationsOpen((open) => !open);
                          } else if (link.label === "Notificaciones") {
                            setNotificationsOpen((open) => !open);
                          } else if (link.label === "Reportes") {
                            setReportsOpen((open) => !open);
                          }
                        }}
                        aria-expanded={
                          link.label === "Gestionar Habitaciones" ? roomsOpen
                          : link.label === "Gestión de Reservas" ? reservationsOpen
                          : link.label === "Notificaciones" ? notificationsOpen
                          : link.label === "Reportes" ? reportsOpen
                          : false
                        }
                        aria-controls={
                          link.label === "Gestionar Habitaciones" ? "submenu-habitaciones"
                          : link.label === "Gestión de Reservas" ? "submenu-reservas"
                          : link.label === "Notificaciones" ? "submenu-notificaciones"
                          : link.label === "Reportes" ? "submenu-reportes"
                          : ""
                        }
                        style={{ minHeight: "40px" }}
                      >
                        {link.icon && (
                          <link.icon className="h-5 w-5 mr-2 flex-shrink-0" />
                        )}
                        <span className="flex-1 text-left">{link.label}</span>
                        <svg
                          className={`h-4 w-4 ml-2 flex-shrink-0 transition-transform ${
                            (link.label === "Gestionar Habitaciones" && roomsOpen) ||
                            (link.label === "Gestión de Reservas" && reservationsOpen) ||
                            (link.label === "Notificaciones" && notificationsOpen) ||
                            (link.label === "Reportes" && reportsOpen)
                              ? "rotate-90"
                              : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                      <ul
                        id={
                          link.label === "Gestionar Habitaciones" ? "submenu-habitaciones"
                          : link.label === "Gestión de Reservas" ? "submenu-reservas"
                          : link.label === "Notificaciones" ? "submenu-notificaciones"
                          : link.label === "Reportes" ? "submenu-reportes"
                          : ""
                        }
                        className={`ml-6 space-y-1 overflow-hidden transition-all duration-300 ${
                          (link.label === "Gestionar Habitaciones" && roomsOpen) ||
                          (link.label === "Gestión de Reservas" && reservationsOpen) ||
                          (link.label === "Notificaciones" && notificationsOpen) ||
                          (link.label === "Reportes" && reportsOpen)
                            ? "max-h-96 opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                        style={{
                          maxHeight:
                            (link.label === "Gestionar Habitaciones" && roomsOpen) ||
                            (link.label === "Gestión de Reservas" && reservationsOpen) ||
                            (link.label === "Notificaciones" && notificationsOpen) ||
                            (link.label === "Reportes" && reportsOpen)
                              ? "400px"
                              : "0px",
                        }}
                      >
                        {link.submenu
                          .filter((sub) => sub.roles.includes(user.role))
                          .map((sub) => {
                            // Determinar el badge basado en la ruta
                            let badgeCount = null;
                            if (sub.showBadge) {
                              if (sub.href === "/notifications/chatbot") {
                                badgeCount = whatsappCount;
                              } else if (sub.href === "/reservations/checkouts-today") {
                                badgeCount = checkoutCount;
                              }
                            }

                            return (
                              <li key={sub.label} className="w-full">
                                <NavLink
                                  href={sub.href}
                                  label={sub.label}
                                  icon={sub.icon}
                                  onClick={closeSidebar}
                                  badge={badgeCount}
                                  className="px-2 py-2 rounded-md hover:bg-[var(--card)] transition text-sm min-w-0 flex-1 text-left break-words whitespace-normal sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg 2xl:max-w-xl"
                                  style={{
                                    wordBreak: "break-word",
                                    whiteSpace: "normal",
                                    maxWidth: "100%",
                                    overflowWrap: "break-word",
                                    hyphens: "auto",
                                  }}
                                />
                              </li>
                            );
                          })}
                      </ul>
                    </li>
                  ) : (
                    <li key={link.href}>
                      <NavLink
                        href={link.href}
                        label={link.label}
                        icon={link.icon}
                        onClick={closeSidebar}
                        badge={link.showBadge ? checkoutCount : null}
                      />
                    </li>
                  )
                )}
            </ul>
          </nav>
          <div className="mt-auto space-y-2">
            {(user.role === 'receptionist' || user.role === 'administrator') && (
              <div className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-2">
                <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
                  {isConnected ? '🟢' : '🔴'}
                </span>
                <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
              </div>
            )}
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
