import React from "react";
import logo from "../logo.svg";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 via-indigo-500 to-slate-900">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 p-6">
        
        {/* Lado izquierdo: Branding */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-lg p-8 text-white border border-white/20">
          <img src={logo} alt="Hotel Don Teo" className="w-14 h-14 mb-4 drop-shadow-lg" />
          <h1 className="text-3xl font-bold">Sistema de Reservas</h1>
          <p className="mt-2 text-slate-100">
            Gestiona habitaciones, reservas y pagos en tiempo real.
          </p>
          <ul className="mt-6 space-y-2 list-disc list-inside text-slate-200">
            <li>Disponibilidad en vivo</li>
            <li>Alertas y notificaciones</li>
            <li>Reportes claros</li>
          </ul>
        </div>

        {/* Lado derecho: Formulario */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-slate-900">Inicia sesión</h2>
          <p className="text-slate-600 mt-1 mb-6">Ingresa tus credenciales para continuar.</p>

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Correo
              </label>
              <input
                type="email"
                id="email"
                placeholder="admin@hotel.cl"
                required
                className="mt-2 w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-slate-900"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                required
                className="mt-2 w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-slate-900"
              />
            </div>

            {/* Opciones */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="accent-indigo-600" /> Recuérdame
              </label>
              <button
                type="button"
                className="text-indigo-600 font-medium hover:underline bg-transparent border-none p-0 cursor-pointer"
                onClick={() => {
                  // TODO: Implement forgot password logic
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Botón */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-sky-500 text-white py-2.5 rounded-xl font-semibold shadow-lg hover:brightness-105 active:translate-y-px transition"
            >
              Ingresar
            </button>

            <p className="text-center text-slate-500 text-sm mt-2">
              Acceso para <span className="font-semibold">Administrador</span> y{" "}
              <span className="font-semibold">Recepción</span>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
