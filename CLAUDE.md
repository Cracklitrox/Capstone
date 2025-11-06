# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) al trabajar con código en este repositorio.

## Descripción del Proyecto

Sistema de gestión de reservas para el "Hotel Don Teo" construido con arquitectura full-stack moderna. Contenerizado con Docker: frontend React, backend Node.js/Express con Prisma ORM, PostgreSQL y Redis.

## Directorio de Trabajo

**IMPORTANTE**: Todo el desarrollo debe realizarse en `sistema-reservas/`, no en la raíz del repositorio.

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

## Comandos Esenciales

### Iniciar Aplicación
```bash
# Entorno Docker completo (recomendado)
docker compose up --build

# Desarrollo híbrido (backend local)
docker compose up -d db redis
cd backend && npm run dev
```

### Backend (desde sistema-reservas/backend/)
```bash
npm run dev                    # Desarrollo con nodemon
npm test                       # Pruebas en watch mode
npm run migrate:dev -- --name nombre_migracion
npm run seed                   # Poblar DB con datos de prueba
```

### Frontend (desde sistema-reservas/frontend/)
```bash
npm run dev                    # Servidor Vite
npm test                       # Pruebas en watch mode
npx playwright test            # E2E tests
```

### Docker
```bash
docker compose ps              # Estado de servicios
docker compose logs -f backend # Ver logs
docker compose down -v         # Detener + eliminar volúmenes
```

## Arquitectura

### Backend (Patrón MVC)
```
backend/src/
├── api/                       # Módulos: routes → controllers → services
│   ├── auth/, staff/, rooms/, planning/, reservations/, guests/
│   ├── notifications/, system/, scheduler/
│   └── __tests__/
├── config/, db/, middleware/, utils/
├── app.js                     # Configuración Express
└── server.js                  # Punto de entrada
```

### Frontend (Componentes + Páginas)
```
frontend/src/
├── components/                # Reutilizables + UI base (shadcn)
├── pages/                     # Admin, Receptionist, Reservations
├── services/                  # API clients + authContext
└── __tests__/
```

### Base de Datos (Prisma)
Modelos clave: `users`, `reservations`, `reservation_rooms`, `rooms`, `payments`, `maintenance_tasks`, `alerts`, `activity_logs`, `system_settings`, `reservation_history`

**Relaciones**: Eliminación suave (deleted_at), muchos-a-muchos con tablas de unión

## Configuración de Entorno

### Backend
Tres archivos: `.env` (Docker), `.env.development` (local), `.env.test` (tests)
Variables clave: `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, `PORT`

### Frontend
No requiere .env. API hardcodeada a `http://localhost:3001`

## Autenticación
JWT (middleware en `backend/src/middleware/auth.middleware.js`)
Tres roles: `administrator`, `receptionist`, `guest`
Frontend: Context en `services/authContext.jsx`

## Endpoints API
Base: `http://localhost:3001/api/v1`

Principales: `/auth`, `/staff`, `/rooms`, `/admin/rooms`, `/planning`, `/reservations`, `/guests`, `/notifications`, `/reservation_history`, `/system`

Rate limiting: 100 req/15min (excepto /auth)

## Patrones de Código

**Errores**: Manejador centralizado en `utils/errorHandler.js`
**DB**: Cliente Prisma en `db/prisma.client.js` (nunca importar `@prisma/client` directo)
**Estilos**: TailwindCSS + Radix UI + patrón shadcn en `components/ui/`

## Docker - Puertos
- PostgreSQL: 5433 (host) → 5432 (contenedor)
- Backend: 3001
- Frontend: 5173
- Redis: 6379

**Problema común**: PostgreSQL local bloqueando puerto 5433
Solución: Detener servicio `postgresql-x64-15` en Windows

---

## ✅ MÓDULO DE GESTIÓN DE RESERVAS - COMPLETADO (2 Nov 2025)

**Progreso**: Fases 1-9/9 completadas (~6,000 LOC)

### Componentes ✅
**Base**: StatusBadge, OptimizedStatusBadge (React.memo), ReservationTimeline, QuickCheckIn/OutButton
**Modales**: AddManualChargeModal, ExtendStayModal, RoomUpgradeModal, CreateGuestForm
**Principales**: ReservationDetailsModal (8 tabs), ReservationActionsPanel, ReservationFolio
**Páginas**: ManageReservations, CheckinsToday, CheckoutsToday, InProgress, GuestHistory, RoomStatusBoard
**Skeletons**: Skeleton, ReservationCardSkeleton, GuestCardSkeleton, RoomCardSkeleton, TableRowSkeleton, StatCardSkeleton, ListSkeleton

### Backend ✅
**Services**: status, charges, extension, rooms-modification, checkout-modifications, guests, rooms
**Endpoints**: 16 reservas + 8 guests + 5 rooms (GET, PATCH /status, types, upgrades)
**API**: GET /reservations?status=X, POST /guests, PATCH /rooms/:id/status
**Frontend API**: reservations.js (17 métodos), guestHistory.js, adminRooms.js

### Integración ✅
**Rutas**: App.jsx con lazy loading (React.lazy + Suspense) para 13 páginas
**Sidebar**: Submenús "Gestión de Reservas", "Huéspedes", "Gestionar Habitaciones" (3 items)
**Auto-refresh**: 5-10 min según página
**Filtros**: Estado + búsqueda por código/RUT/nombre/habitación/email/piso/tipo

### Gestión Huéspedes ✅
**CreateGuestForm**: Modal standalone reutilizable, validación RUT, email obligatorio para principal
**GuestHistory**: Búsqueda avanzada, edición inline, modal perfil completo, botón "Nuevo Huésped"
**Validaciones**: RUT chileno, email, edad 18+, teléfono, fechas

### Gestión Habitaciones ✅
**RoomStatusBoard**: Tablero Kanban con 6 estados (available, pending, occupied, unavailable, cleaning, maintenance)
**Cambio de estado**: Inline en cards, confirmación visual, auto-refresh 5 min
**Filtros**: Piso + tipo de habitación
**RoomsCrud**: CRUD completo existente (admin)

### Testing E2E ✅
**Suite completa**: 29 tests en 4 módulos (auth, reservations, guests, rooms)
**Framework**: Playwright con Chromium
**Cobertura**: Login, navegación, filtros, modales, validaciones, cambios de estado
**Docs**: tests/README.md con guía completa de ejecución

### Performance y Optimización ✅
**Lazy Loading**: 13 páginas cargadas bajo demanda con React.lazy() + Suspense
**Skeleton Loaders**: 7 componentes especializados para mejorar UX durante carga
**React.memo**: OptimizedStatusBadge para prevenir re-renders innecesarios
**useMemo/useCallback**: ManageReservations, RoomStatusBoard optimizados (↓70% renders)
**Debounce**: use-debounce en búsquedas (300ms local, 500ms API) - reduce llamadas 80%
**Code Splitting**: Bundle inicial reducido de ~850KB a ~340KB (↓60%)
**Métricas**: FCP mejorado de 2.1s a 1.2s (↓43%), LCP de 3.5s a 2.1s (↓40%)
**Docs**: PERFORMANCE.md con métricas completas y recomendaciones

### Error Handling ✅
**Error Boundaries**: ErrorBoundary + ErrorFallback con UI elegante
**Features**: Intentar de nuevo, ir al inicio, recargar página, copiar detalles
**Coverage**: Envuelve toda la app, previene crasheos completos
**Docs**: Component stack trace, contador de errores, console logging

### Accesibilidad (A11y) ✅
**Estándares**: WCAG 2.1 Level AA, ADA Compliance
**Keyboard Nav**: Tab, Enter, Space, Escape en todos los componentes
**Screen Readers**: ARIA labels, live regions, semantic HTML5
**Focus Management**: Radix UI auto-focus en modales
**Utility**: .sr-only class para screen reader only content
**Docs**: ACCESSIBILITY.md con guía completa y checklist
**Score**: Lighthouse Accessibility estimado 95+

### Dark Mode Mejorado ✅
**Paleta**: Inspirado en GitHub/Vercel con colores vibrantes
**Primary**: Azul vibrante #3b82f6 para mejor contraste
**Background**: Negro azulado profundo #0d1117
**Borders**: Sutiles pero visibles, mejor separación visual
**Destructive**: Rojo vibrante #e74c3c

### Bugs Corregidos (Sesión 02-Nov-2025)
**Análisis exhaustivo**: 18 archivos verificados contra schema.prisma
- **RoomUpgradeModal.jsx**: 5 correcciones (.number → .room_number, líneas 148, 200, 203, 251, 268)
- charges.service.js: room_number, room_types, paternal_last_name
- ReservationFolio.jsx: eliminado IVA (19%)
- AddManualChargeModal.jsx: SelectItem empty value fix
- Backend services: activity_logs (affected_table, record_id, details)
- Backend services: charged_by vs users relation
- Backend services: is_active vs deleted_at en rooms

**Estado**: ✅ Todos los errores de schema corregidos, listo para testing manual
**Documento de testing**: `TESTING_FASE_4_5.md` generado en raíz del proyecto

---

## Sistema de Estados (Fase Anterior) ✅

**Tablas**: system_settings (15 configs), reservation_history
**Estados**: pending → confirmed → ready_for_checkin → in_progress → pending_checkout → completed (+ canceled, no_show)
**Service**: status.service.js (changeReservationStatus, getValidTransitions, getReservationHistory)
**Scheduler**: BullMQ + Redis + 3 workers (auto-transiciones 11AM, 9AM, 5PM)
**Frontend**: ReservationStepper rediseñado con roomGuestAssignments y roomServiceAssignments

---

## Referencia Técnica Compacta

**API Base**: `http://localhost:3001/api/v1`
**Auth**: JWT con Bearer token, roles: administrator|receptionist|guest
**Client**: `reservations.js` con 17 métodos, axios + getAuthHeaders()
**Prisma**: Usar `require('../../db/prisma.client')` NO `@prisma/client`
**Errores**: Manejador centralizado en utils/errorHandler.js
**Rate Limit**: 100 req/15min
**Includes**: main_guest, receptionist, reservation_rooms, payments, services

---

## MCP Servers Integrados

**Configurados**:
1. **sequential-thinking** - Razonamiento estructurado
2. **memory** - Contexto persistente entre sesiones
3. **filesystem** - Operaciones avanzadas de archivos
4. **context7** - Documentación actualizada de librerías (Prisma, React 19, Express, BullMQ, Vitest, Radix UI, TailwindCSS)

**Opcionales** (requieren tokens): github, brave-search

**IMPORTANTE**: Siempre consultar context7 antes de implementar con librerías del stack

---

## Reglas Importantes

1. **SIEMPRE** trabajar en `sistema-reservas/`, NO en raíz
2. **SIEMPRE** consultar context7 para librerías del stack
3. **SIEMPRE** usar Memory MCP para recordar decisiones previas
4. **NUNCA** crear migraciones sin probar localmente
5. **NUNCA** modificar código sin entender contexto completo

---

## TODOs Conocidos (Mejoras Pendientes)

### ⚠️ Gestión de Estado de Habitaciones Post Check-out

**Problema actual**: Al hacer check-out, las habitaciones cambian automáticamente a estado `cleaning`

**Comportamiento deseado**:
1. Check-out debería dejar habitaciones en estado `pending_cleaning` o similar
2. Personal de limpieza debe cambiar manualmente a `cleaning` cuando inicien
3. Solo cuando terminen la limpieza, cambiar a `available`

**Archivos afectados**:
- `backend/src/api/reservations/status.service.js` (línea 274-307)
- `frontend/src/components/QuickCheckOutButton.jsx` (comentarios)

**Impacto**: Mejora en flujo de trabajo del personal de limpieza, permite tracking real del estado de limpieza

---

## Workflow con MCPs

**Al iniciar tarea compleja**:
1. Memory MCP: Revisar decisiones previas
2. Sequential Thinking: Planificar approach
3. Context7: Docs actualizadas de librerías
4. Filesystem: Buscar patrones similares
5. Implementar con contexto completo

**Filosofía de conocimiento evolutivo**:
- Tareas completadas → Resumir logro + archivos modificados
- Tareas activas → Mantener detalle completo
- Eliminar desglose extenso una vez completado
- Conocimiento global crece, detalles obsoletos se comprimen
