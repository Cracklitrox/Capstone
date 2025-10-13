import React, { useState } from "react";
import { useAuth } from '../services/authContext.jsx';
import { useCheckoutCount } from '../hooks/useCheckoutCount';
import CheckoutNotificationPopover from './CheckoutNotificationPopover';
import { Button } from "@/components/ui/Button.jsx";
import { Switch } from "@/components/ui/Switch.jsx";
import { Label } from "@/components/ui/Label.jsx";
import { ArrowLeftOnRectangleIcon, Bars3Icon, SunIcon, MoonIcon, BellAlertIcon } from '@heroicons/react/24/outline';
import { Link } from "react-router-dom";

const Navbar = ({ toggleSidebar, markAsRead }) => {
    const { logout, user, isDarkMode, toggleTheme } = useAuth();
    const { count, refetch } = useCheckoutCount();
    const [showPopover, setShowPopover] = useState(false);

    const navLinks = [
        { href: "/", label: "Inicio", roles: ["administrator", "receptionist"] }
    ];

    return (
        <header className="bg-card text-card-foreground border-b border-border p-2 shadow-sm flex justify-between items-center w-full z-10 h-16 flex-shrink-0">
            
            <div className="flex items-center space-x-4">
                <Button onClick={toggleSidebar} variant="ghost" size="icon" className="md:hidden">
                    <Bars3Icon className="h-6 w-6" />
                </Button>
                <h1 className="hidden md:block text-xl font-semibold text-primary">Panel</h1>
            </div>

            <div className="hidden md:flex items-center space-x-2">
                 {navLinks
                    .filter(link => link.roles.includes(user.role))
                    .map((link) => (
                        <Button asChild variant="link" key={link.href}>
                           <Link to={link.href}>{link.label}</Link>
                        </Button>
                ))}
            </div>
            
            <div className="flex items-center space-x-4">
                {/* Campanita de notificaciones - Solo para recepcionistas */}
                {user?.role === 'receptionist' && (
                    <>
                        <Button 
                            onClick={() => setShowPopover(true)} 
                            variant="ghost" 
                            size="icon"
                            className="relative"
                            title="Ver checkouts de hoy"
                        >
                            <BellAlertIcon className="h-6 w-6" />
                            {count > 0 && (
                                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                    {count > 9 ? '9+' : count}
                                </span>
                            )}
                        </Button>
                        
                        {/* Popover de notificaciones */}
                        <CheckoutNotificationPopover 
                            isOpen={showPopover}
                            onClose={() => setShowPopover(false)}
                            onMarkAsRead={markAsRead}
                            onRefetchCount={refetch}
                        />
                    </>
                )}

                <div className="flex items-center space-x-2">
                    <SunIcon className="h-5 w-5" />
                    <Switch
                        id="theme-switch"
                        // 3. El interruptor ahora es controlado por el estado del contexto.
                        checked={isDarkMode}
                        onCheckedChange={toggleTheme}
                    />
                    <MoonIcon className="h-5 w-5" />
                    <Label htmlFor="theme-switch" className="sr-only">Cambiar tema</Label>
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