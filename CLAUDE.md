# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a hotel reservation management system (Sistema de Reservas - Hotel Don Teo) built as a full-stack monorepo with a containerized architecture. The system manages room reservations, guest information, checkout alerts, and includes WhatsApp chatbot integration for booking requests.

**Key Technologies:**
- Backend: Node.js, Express, Prisma ORM
- Frontend: React 19, Vite, TailwindCSS, Radix UI
- Database: PostgreSQL 15
- Real-time: Socket.io for WebSocket connections
- Cache: Redis
- Testing: Vitest, Supertest, Playwright
- Infrastructure: Docker Compose

## Project Structure

The main application lives in `sistema-reservas/`:
- `backend/` - Express API server with Prisma ORM
- `frontend/` - React SPA with Vite
- `docker-compose.yml` - Orchestrates all services (db, redis, backend, frontend)

## Development Commands

### Initial Setup

```bash
# From repository root, navigate to sistema-reservas
cd sistema-reservas

# Copy environment files
cp backend/.env.example backend/.env

# Start all services with Docker (recommended)
docker-compose up --build

# Or start in background
docker-compose up -d --build
```

### Docker Development (Full Stack)

```bash
# From sistema-reservas/ directory
docker-compose up --build          # Build and start all services
docker-compose up -d               # Start in background
docker-compose down                # Stop and remove containers
docker-compose ps                  # Check service status
docker-compose logs backend        # View backend logs
docker-compose logs frontend       # View frontend logs
```

**Service URLs when running Docker:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Backend Health Check: http://localhost:3001/test
- Database: localhost:5433 (PostgreSQL)
- Redis: localhost:6379

### Hybrid Development (Local Backend + Docker Services)

When actively developing backend code, run backend locally with hot reload:

```bash
# Start only database and Redis in Docker
docker-compose up -d db redis

# In backend/ directory
cd backend
npm install
npm run migrate:dev -- --name init   # First time only
npm run dev                          # Start with nodemon hot reload
```

### Backend Commands

```bash
# From backend/ directory
npm run dev              # Development server with nodemon (uses .env.development)
npm start                # Production server (uses .env)
npm test                 # Run tests in watch mode (uses .env.test)
npm run coverage         # Generate test coverage report
npm run migrate:dev      # Run Prisma migrations in dev
npm run prisma:dev       # Access Prisma CLI commands
npm run seed             # Seed database with initial data

# Prisma specific commands
npx prisma studio        # Open Prisma Studio GUI
npx prisma generate      # Generate Prisma Client
npx prisma migrate dev   # Create and apply migration
npx prisma db push       # Push schema changes without migration
```

**Environment Files:**
- `.env` - Used by Docker containers and `npm start`
- `.env.development` - Used by `npm run dev` (local development)
- `.env.test` - Used by `npm test` (testing)

### Frontend Commands

```bash
# From frontend/ directory
npm run dev              # Development server (Vite)
npm run build            # Production build
npm run preview          # Preview production build
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once
npm run coverage         # Generate coverage report
npm run test:ui          # Open Vitest UI
npm run test:single      # Run tests with verbose reporter
npm run test:auth        # Run authentication tests
npm run test:components  # Run component tests
npm run test:services    # Run service tests
npm run test:pages       # Run page tests
```

## Architecture

### Backend Architecture

**Entry Point:** `backend/src/server.js`
- Creates HTTP server and initializes Socket.io
- Conditionally initializes WhatsApp bot (if `WHATSAPP_ENABLED=true`)
- Starts cron job for checkout alerts (runs every 5 minutes)

**Express App:** `backend/src/app.js`
- Configures Express middleware (helmet, cors, body parsing)
- Mounts API routes at `/api/v1`
- Health check endpoint at `/test`

**API Structure:** `backend/src/api/`
Each domain follows the pattern:
```
domain/
├── domain.controller.js  # Request/response handling
├── domain.service.js     # Business logic
├── domain.routes.js      # Route definitions
└── __tests__/            # Domain tests
```

**Domains:**
- `auth/` - Authentication (JWT-based)
- `reservations/` - Reservation CRUD operations
- `rooms/` - Room management
- `guests/` - Guest information
- `notifications/` - Alert system (checkout alerts, booking requests)
- `planning/` - Room planning/tape chart
- `reservation_history/` - Historical reservation data
- `staff/` - Staff/user management
- `system/` - System utilities
- `whatsapp/` - WhatsApp chatbot API endpoints

**Real-time Communication:** `backend/src/config/socket.js`
- Socket.io server with JWT authentication middleware
- Users join rooms: `user:{userId}`, `role:{userRole}`, `checkout_alerts`
- Events: `checkout:update`, `whatsapp:update`, `notification:new`, etc.
- Functions: `emitNotification()`, `emitCheckoutAlerts()`

**WhatsApp Bot:** `backend/src/whatsapp/`
Uses Baileys library for WhatsApp Web integration:
- `whatsapp.client.js` - Baileys client wrapper with QR code authentication
- `whatsapp.controller.js` - Message routing and command handling
- `whatsapp.service.js` - Business logic for booking flow
- `flows/` - Conversational flow state machines
- `validators/` - Input validation for user messages
- `sessions/` - Persistent session storage (gitignored)

**Database:** Prisma ORM with PostgreSQL
- Schema: `backend/prisma/schema.prisma`
- Client: `backend/src/db/prisma.client.js`
- Migrations: `backend/prisma/migrations/`

**Key Models:**
- `reservations` - Booking records with guest/room relationships
- `rooms` - Room inventory
- `room_types` - Room categories (single, double, suite, etc.)
- `guests` - Guest profiles
- `alerts` - Notification system (checkout alerts, booking requests)
- `alert_read_status` - User read/unread tracking
- `users` - Staff accounts (administrator, receptionist)
- `activity_logs` - Audit trail

### Frontend Architecture

**Entry Point:** `frontend/src/index.jsx` → `frontend/src/App.jsx`

**Routing:** React Router v7 with role-based protected routes
- Login page at `/login`
- Protected routes under `Layout` component
- Dynamic dashboard selector based on user role

**Context Providers:**
- `AuthContext` (via `useAuth()` hook) - JWT authentication state
- `NotificationsContext` - Real-time notifications via Socket.io

**Key Directories:**
- `pages/` - Top-level route components
  - `Admin/` - Admin dashboard, room CRUD, room types CRUD
  - `Receptionist/` - Receptionist dashboard, tape chart, reservation history, checkout alerts, guest history
  - `Reservations/` - New reservation wizard
- `components/` - Reusable components
  - `ui/` - Radix UI-based primitives (button, dialog, select, etc.)
  - `reservation-steps/` - Multi-step reservation form components
  - `AdminRooms/`, `AdminRoomTypes/` - Admin CRUD components
- `services/` - API client functions (axios-based)
- `hooks/` - Custom React hooks including `useSocketNotifications.js`
- `contexts/` - React context providers
- `config/` - Configuration files

**Real-time Features:**
- Socket.io client connects with JWT token from localStorage
- `useSocketNotifications` hook manages WebSocket events
- Checkout alerts update every 5 minutes via Socket.io
- WhatsApp booking request notifications via Socket.io

**Styling:** TailwindCSS with custom design system
- Component library: Radix UI primitives
- Utility-first CSS with Tailwind
- Custom components in `components/ui/`

### Authentication Flow

1. User logs in at `/login` → POST to `/api/v1/auth/login`
2. Backend validates credentials, returns JWT token
3. Frontend stores token in localStorage
4. Token included in Authorization header for API requests
5. Token used for Socket.io authentication handshake
6. Middleware validates JWT on protected routes

### Real-time Notification System

**Checkout Alerts:**
1. Cron job runs every 5 minutes in `server.js`
2. Queries today's checkouts via `notificationsService.getCheckoutAlertsForToday()`
3. Emits to Socket.io rooms: `role:receptionist` and `role:administrator`
4. Frontend receives `checkout:update` event
5. Updates `CheckoutNotificationPopover` badge count

**WhatsApp Booking Requests:**
1. WhatsApp bot receives message from customer
2. Bot creates alert record with `type: 'booking_request'`, `status: 'pending'`
3. Emits Socket.io event `whatsapp:update` with pending count
4. Frontend displays badge in `NotificationPanel`
5. Receptionist reviews request in chatbot page
6. Can approve (creates reservation) or reject (updates alert status)

## Testing Strategy

**Backend Tests:** Vitest + Supertest
- Located in `backend/src/api/__tests__/`
- Uses `.env.test` for test database configuration
- Integration tests for API endpoints
- Run with `npm test` or `npm run coverage`

**Frontend Tests:** Vitest + React Testing Library
- Located in `frontend/src/__tests__/`
- Unit tests for components, services, contexts
- Run with `npm test` or `npm run coverage`

**E2E Tests:** Playwright (if present in `frontend/`)
- Run with `npx playwright test`

## WhatsApp Bot

**Enable/Disable:** Set `WHATSAPP_ENABLED=true` in `backend/.env`

**First-time Setup:**
1. Start backend with WhatsApp enabled
2. QR code prints to console
3. Scan QR with WhatsApp mobile app
4. Session persists in `backend/src/whatsapp/sessions/`

**Flow:**
1. Customer sends message to business WhatsApp
2. Bot responds with greeting and menu
3. Customer follows guided flow to provide booking details
4. Bot validates input at each step
5. Bot creates alert in database with all details
6. Receptionist sees notification in frontend
7. Receptionist can approve/reject from chatbot panel

## Database Migrations

Always create migrations when changing schema:

```bash
cd backend
npm run migrate:dev -- --name descriptive_migration_name
```

This generates SQL migration files in `backend/prisma/migrations/`.

**IMPORTANT:** In Docker, migrations run automatically on container startup. For local development, run manually.

## Environment Variables

**Backend (critical variables):**
- `DATABASE_URL` - PostgreSQL connection string (different for Docker vs local)
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for signing JWT tokens
- `JWT_EXPIRES_IN` - Token expiration (e.g., "1d")
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - CORS allowed origin (default: http://localhost:5173)
- `WHATSAPP_ENABLED` - Enable WhatsApp bot ("true" or "false")

**Frontend:**
- Configured in `frontend/src/config/` files
- API base URL typically points to http://localhost:3001

## Common Workflows

### Adding a New API Endpoint

1. Create or update controller in `backend/src/api/{domain}/{domain}.controller.js`
2. Create or update service in `backend/src/api/{domain}/{domain}.service.js`
3. Add route in `backend/src/api/{domain}/{domain}.routes.js`
4. Import and mount routes in `backend/src/api/routes.js`
5. Add tests in `backend/src/api/{domain}/__tests__/`
6. Run `npm test` to verify

### Adding a New Frontend Page

1. Create page component in `frontend/src/pages/`
2. Add route in `frontend/src/App.jsx` under `<Routes>`
3. Update sidebar/navigation in `frontend/src/components/Sidebar.jsx` or `Navbar.jsx`
4. Create tests in `frontend/src/__tests__/pages/`

### Emitting Real-time Notifications

```javascript
// In backend service or controller
const { emitNotification } = require('../config/socket');

// Emit to specific user
emitNotification(userId, null, {
  id: notification.id,
  type: 'booking_request',
  message: 'New booking request',
  data: { ... }
});

// Emit to all users with a role
emitNotification(null, 'receptionist', {
  id: notification.id,
  type: 'checkout_alert',
  message: 'Checkout today',
  data: { ... }
});
```

## Code Conventions

- Backend uses CommonJS modules (`require`/`module.exports`)
- Frontend uses ES modules (`import`/`export`)
- Use Prisma Client for all database operations
- JWT authentication required for all protected routes
- Socket.io events follow pattern: `domain:action` (e.g., `checkout:update`)
- API routes versioned: `/api/v1/...`
- Error handling: Use try-catch in services, return appropriate HTTP status codes

## Troubleshooting

**Docker containers won't start:**
```bash
docker-compose down
docker-compose up --build
```

**Database connection errors in local dev:**
- Ensure Docker db service is running: `docker-compose ps`
- Check port 5433 is not in use: `netstat -an | findstr 5433` (Windows)
- Verify `DATABASE_URL` in `.env.development` uses `localhost:5433`

**WhatsApp bot not connecting:**
- Delete `backend/src/whatsapp/sessions/` folder
- Restart backend to generate new QR code
- Ensure phone has stable internet connection

**Frontend can't connect to Socket.io:**
- Verify backend is running on port 3001
- Check browser console for CORS errors
- Ensure JWT token is valid and not expired
- Check `FRONTEND_URL` in backend `.env` includes frontend origin

**Tests failing:**
- Ensure test database is running (Docker db service)
- Check `.env.test` has correct `DATABASE_URL` with port 5433
- Clear test database: `npx prisma migrate reset` (use with caution)
