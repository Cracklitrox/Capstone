# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) al trabajar con código en este repositorio.

## Descripción del Proyecto

Este es un sistema de gestión de reservas para el "Hotel Don Teo" construido con una arquitectura full-stack moderna. El proyecto está contenerizado usando Docker y consiste en un frontend React, backend Node.js/Express con Prisma ORM, base de datos PostgreSQL y Redis para caché.

## Directorio de Trabajo

**IMPORTANTE**: Todo el trabajo de desarrollo debe realizarse en el directorio `sistema-reservas`, no en la raíz del repositorio. La raíz contiene documentación del proyecto y entregables de fases (Fase 1, Fase 2).

```bash
cd sistema-reservas
```

## Stack Tecnológico

- **Backend**: Node.js 18+, Express.js, Prisma ORM
- **Frontend**: React 19, Vite, TailwindCSS, Radix UI, React Router
- **Base de Datos**: PostgreSQL 15
- **Caché**: Redis
- **Testing**: Vitest (unit), Playwright (E2E), Supertest (API)
- **Contenedores**: Docker, Docker Compose

## Comandos de Desarrollo

### Iniciar la Aplicación

**Opción 1: Entorno Docker Completo (Recomendado)**
```bash
# Desde sistema-reservas/
docker compose up --build
# Agregar flag -d para ejecutar en segundo plano
```

**Opción 2: Desarrollo Híbrido (Backend local, DB en Docker)**
```bash
# Iniciar solo base de datos y Redis
docker compose up -d db redis

# En directorio backend
cd backend
npm install
npm run migrate:dev -- --name init  # Solo la primera vez
npm run dev
```

### Comandos Backend

Todos los comandos se ejecutan desde `sistema-reservas/backend/`:

```bash
# Desarrollo
npm run dev                    # Iniciar con nodemon + .env.development
npm start                      # Inicio en producción

# Pruebas
npm test                       # Ejecutar pruebas en modo watch
npm run coverage              # Generar reporte de cobertura

# Base de Datos
npm run migrate:dev           # Crear y aplicar migración
npm run prisma:dev            # Acceder a Prisma CLI con entorno dev
npm run seed                  # Poblar base de datos con datos de prueba

# Ejemplo: Crear una nueva migración
npm run migrate:dev -- --name add_new_table
```

### Comandos Frontend

Todos los comandos se ejecutan desde `sistema-reservas/frontend/`:

```bash
# Desarrollo
npm run dev                    # Iniciar servidor dev de Vite
npm run build                  # Build de producción
npm run preview                # Vista previa del build de producción

# Pruebas
npm test                       # Ejecutar pruebas en modo watch
npm run test:run              # Ejecutar pruebas una vez
npm run coverage              # Generar reporte de cobertura
npm run test:components       # Probar carpeta específica
npm run test:auth             # Probar archivo específico
npm run test:ui               # Abrir interfaz de Vitest

# Pruebas E2E (Playwright)
npx playwright test
npx playwright test --ui
```

### Gestión de Docker

```bash
# Desde sistema-reservas/
docker compose ps              # Verificar estado de servicios
docker compose logs -f         # Seguir todos los logs
docker compose logs backend    # Logs de servicio específico
docker compose down            # Detener y eliminar contenedores
docker compose down -v         # También eliminar volúmenes (borra DB)
```

## Arquitectura

### Estructura Backend

```
backend/src/
├── api/                       # Módulos de funcionalidad (routes, controllers, services)
│   ├── auth/                 # Autenticación (login, JWT)
│   ├── staff/                # Gestión de personal
│   ├── rooms/                # Operaciones de habitaciones
│   ├── planning/             # Planificación/disponibilidad de habitaciones
│   ├── reservations/         # CRUD de reservas
│   ├── guests/               # Gestión de huéspedes
│   ├── notifications/        # Sistema de notificaciones
│   ├── system/               # Utilidades del sistema
│   └── __tests__/            # Pruebas de integración de API
├── config/                    # Configuración (variables de entorno)
├── db/                        # Clientes de base de datos (Prisma, Redis)
├── middleware/                # Middleware de Express (auth, manejo de errores)
├── utils/                     # Utilidades (errorHandler)
├── app.js                     # Configuración de aplicación Express
└── server.js                  # Punto de entrada del servidor
```

**Patrón**: Cada módulo de funcionalidad sigue el patrón controller → service → database:
- Las rutas definen endpoints HTTP
- Los controladores manejan request/response
- Los servicios contienen lógica de negocio
- El cliente Prisma maneja operaciones de base de datos

### Estructura Frontend

```
frontend/src/
├── components/                # Componentes reutilizables
│   ├── ui/                   # Componentes UI base (estilo shadcn)
│   ├── Layout.jsx            # Wrapper de layout principal
│   ├── Navbar.jsx            # Barra de navegación
│   ├── Sidebar.jsx           # Navegación lateral
│   └── ProtectedRoute.jsx    # Wrapper de ruta autenticada
├── pages/                     # Componentes de página
│   ├── Admin/                # Páginas solo para administrador
│   ├── Receptionist/         # Páginas solo para recepcionista
│   ├── Reservations/         # Flujos de reserva
│   └── Login.jsx             # Página de login
├── services/                  # Clientes API y contexto
│   ├── authContext.jsx       # Gestión de estado de autenticación
│   └── [feature].js          # Capas de servicio API
├── lib/                       # Utilidades
└── __tests__/                # Pruebas de componentes/integración
```

**Enrutamiento**: Enrutamiento basado en roles definido en `App.jsx`. El componente `DashboardSelector` renderiza diferentes dashboards según el rol del usuario (administrator/receptionist).

### Esquema de Base de Datos

Modelos clave (ver `backend/prisma/schema.prisma` para esquema completo):

- **users**: Personal y huéspedes con acceso basado en roles (via user_roles → roles)
- **reservations**: Entidad central de reservas con seguimiento de estado
- **reservation_rooms**: Vincula reservas con habitaciones con rangos de fechas
- **rooms**: Habitaciones físicas con tipos, estados, precios
- **payments**: Seguimiento de pagos con múltiples métodos
- **maintenance_tasks**: Programación de mantenimiento de habitaciones
- **alerts/notifications**: Sistema de comunicación del personal
- **activity_logs**: Registro de auditoría de acciones de usuario

**Relaciones importantes**:
- Las reservas tienen un main_guest y un receptionist opcional
- Eliminación suave usada extensivamente (columnas deleted_at)
- Relaciones muchos-a-muchos usan tablas de unión (reservation_guests, reservation_rooms, etc.)

## Configuración de Entorno

### Backend

Tres archivos de entorno en `backend/`:
- `.env` - Entorno Docker (auto-cargado por docker-compose)
- `.env.development` - Desarrollo local
- `.env.test` - Entorno de pruebas (usado automáticamente por tests)

Copiar de `.env.example` para configuración inicial.

**Variables clave**:
- `DATABASE_URL`: String de conexión PostgreSQL
- `JWT_SECRET`: Clave de firma JWT
- `REDIS_URL`: Conexión Redis
- `PORT`: Puerto del servidor (default 3001)

### Frontend

No se requiere .env para configuración básica. La URL de la API backend está hardcodeada a `http://localhost:3001` en desarrollo.

## Estrategia de Pruebas

### Pruebas Backend
- Ubicadas en `backend/src/api/__tests__/`
- Usan Vitest + Supertest para pruebas de endpoints API
- Helpers de prueba en `test-helpers.js` proporcionan utilidades para operaciones comunes
- Las pruebas se ejecutan contra una base de datos de prueba (configurada via `.env.test`)

### Pruebas Frontend
- Ubicadas en `frontend/src/__tests__/`
- Usan Vitest + React Testing Library
- Configuración de mocks en `__tests__/setup/`
- Pruebas E2E en `frontend/tests/` usando Playwright

## Autenticación y Autorización

- Autenticación basada en JWT (tokens emitidos en login)
- Middleware: `backend/src/middleware/auth.middleware.js`
- Frontend: Contexto de autenticación en `services/authContext.jsx`
- Tres roles: administrator, receptionist, guest (definidos como enum en Prisma)
- Las rutas protegidas verifican tanto autenticación como permisos de rol

## Limitación de Tasa (Rate Limiting)

Las rutas API usan express-rate-limit:
- Limitador común: 100 peticiones por 15 minutos
- Aplicado a todas las rutas autenticadas excepto endpoints de auth
- Configurado en `backend/src/api/routes.js`

## Migraciones de Base de Datos

Las migraciones de Prisma están en `backend/prisma/migrations/`. Al hacer cambios en el esquema:

1. Modificar `schema.prisma`
2. Ejecutar `npm run migrate:dev -- --name nombre_descriptivo`
3. SQL de migración auto-generado en nueva carpeta
4. Actualizar archivo seed si es necesario (`prisma/seed.js`)

## Endpoints de Servicio

Base API: `http://localhost:3001/api/v1`

Rutas principales (todas requieren autenticación excepto /auth):
- `/auth` - Login, logout, refresh de token
- `/staff` - Gestión de usuarios del personal
- `/rooms` - Consultas de habitaciones y actualizaciones de estado
- `/admin/rooms` - Operaciones CRUD de habitaciones
- `/planning` - Disponibilidad/planificación de habitaciones
- `/reservations` - CRUD de reservas
- `/guests` - Gestión de huéspedes
- `/notifications` - Sistema de notificaciones
- `/reservation_history` - Datos históricos de reservas
- `/system` - Utilidades del sistema

## Calidad de Código

- Backend usa CommonJS (require/module.exports)
- Frontend usa ES Modules (import/export)
- Linting: ESLint configurado para frontend
- Git hooks: Husky + lint-staged para verificaciones pre-commit (frontend)
- Cobertura de pruebas rastreada via Codecov

## Patrones Conocidos

**Manejo de Errores**:
- Backend usa manejador de errores centralizado en `utils/errorHandler.js`
- Los errores lanzados en servicios son capturados por middleware de error de Express

**Acceso a Base de Datos**:
- Siempre usar cliente Prisma de `db/prisma.client.js`
- Nunca importar `@prisma/client` directamente
- Cliente Redis en `db/redis.client.js` para caché

**Estilos de Componentes**:
- TailwindCSS para clases de utilidad
- Primitivos de Radix UI para componentes accesibles
- Componentes UI en `components/ui/` siguen patrón shadcn

## Notas de Docker

- PostgreSQL se ejecuta en puerto 5433 (host) → 5432 (contenedor)
- Backend en puerto 3001
- Frontend en puerto 5173
- Redis en puerto 6379
- Persistencia de volúmenes para base de datos (`pgdata`) y Redis (`redisdata`)
- Health checks aseguran que DB esté lista antes de iniciar backend
