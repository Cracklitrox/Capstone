import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/services.js";

// --- 1. Importamos los nuevos componentes de Shadcn/ui ---
import { Button } from "../components/ui/Button.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Label } from "../components/ui/Label.jsx";

// --- 2. Importamos iconos para mejorar la estética ---
import { EyeIcon, EyeSlashIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { token } = await authService.login({ email, password });
      login(token);
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Credenciales incorrectas ❌";
      setError(errorMessage);
    }
  };

  return (
    // 3. El contenedor principal ahora usa los colores de nuestro tema
    <div className="flex min-h-screen items-center justify-center bg-background p-4">

      {/* 4. Reemplazamos el div genérico por el componente <Card> */}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <BuildingOffice2Icon className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Hotel Don Teo</CardTitle>
          <CardDescription>Por favor, inicia sesión para continuar</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              {/* 5. Usamos los componentes <Label> e <Input> */}
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  // Añadimos padding a la derecha para que no se solape con el botón
                  className="pr-10"
                />
                {/* 6. El botón de mostrar/ocultar ahora es un <Button> de Shadcn */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword(p => !p)}
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  <span className="sr-only">Mostrar/Ocultar contraseña</span>
                </Button>
              </div>
            </div>

            {/* 7. El mensaje de error ahora usa el color 'destructive' del tema */}
            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* 8. El botón de submit ahora es un <Button> de Shadcn.
                Usará el color 'primary' por defecto. */}
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;