# Tests E2E - Sistema de Reservas Hotel Don Teo

## Descripción General

Suite completa de tests end-to-end usando Playwright para validar los flujos críticos del sistema de gestión de reservas.

**Total de Tests**: 29 tests distribuidos en 4 módulos principales

---

## Estructura de Tests

### 1. **auth.spec.js** (4 tests)
Tests de autenticación y gestión de sesiones.

- ✅ Login exitoso como Administrador
- ✅ Login exitoso como Recepcionista
- ✅ Validación de credenciales incorrectas
- ✅ Logout y redirección

**Credenciales de prueba**:
- Admin: `super.admin@hotel.com` / `password123`
- Recepcionista: `carlos.recepcionista@hotel.com` / `password123`

---

### 2. **guest-management.spec.js** (6 tests)
Tests de gestión de huéspedes (Fase 6).

- ✅ Navegación a página de huéspedes
- ✅ Búsqueda de huésped existente
- ✅ Abrir modal "Nuevo Huésped"
- ✅ Validación de RUT inválido
- ✅ Ver detalles de huésped
- ✅ Modal de perfil completo

**Funcionalidades cubiertas**:
- CreateGuestForm modal
- Búsqueda y filtros
- Validación de RUT chileno
- Visualización de perfil

---

### 3. **reservations-management.spec.js** (10 tests)
Tests de gestión de reservas (Fases 1-5).

- ✅ Navegación a "Todas las Reservas"
- ✅ Navegación a "Check-ins Hoy"
- ✅ Navegación a "Check-outs Hoy"
- ✅ Navegación a "En Progreso"
- ✅ Filtrado por estado
- ✅ Búsqueda por código de reserva
- ✅ Abrir modal de detalles
- ✅ Navegación entre tabs del modal (8 tabs)
- ✅ Estadísticas de ocupación

**Funcionalidades cubiertas**:
- ManageReservations con filtros
- CheckinsToday y CheckoutsToday
- InProgress con estadísticas
- ReservationDetailsModal (8 tabs)
- Búsqueda y filtros dinámicos

---

### 4. **room-management.spec.js** (9 tests)
Tests de gestión de habitaciones (Fase 7).

- ✅ Navegación a Tablero de Estados
- ✅ Verificación de 6 columnas de estados
- ✅ Filtrado por piso
- ✅ Filtrado por tipo de habitación
- ✅ Abrir selector de cambio de estado
- ✅ Actualización manual del tablero
- ✅ Contadores de habitaciones
- ✅ Navegación a CRUD de habitaciones
- ✅ Navegación a CRUD de tipos

**Funcionalidades cubiertas**:
- RoomStatusBoard tipo Kanban
- 6 estados de habitaciones
- Cambio de estado inline
- Filtros dinámicos
- RoomsCrud (existente)

---

## Ejecución de Tests

### Requisitos Previos

1. **Backend debe estar corriendo**:
   ```bash
   cd sistema-reservas
   docker compose up -d
   ```

2. **Base de datos con seed**:
   ```bash
   cd sistema-reservas/backend
   npm run seed
   ```

### Comandos de Ejecución

```bash
# Navegar al directorio frontend
cd sistema-reservas/frontend

# Ejecutar todos los tests (modo headless)
npx playwright test

# Ejecutar con UI visible (modo headed)
npx playwright test --headed

# Ejecutar un archivo específico
npx playwright test auth.spec.js

# Ejecutar con reporte HTML
npx playwright test --reporter=html

# Ver reporte HTML generado
npx playwright show-report

# Modo debug (paso a paso)
npx playwright test --debug

# Ejecutar solo tests que fallaron
npx playwright test --last-failed
```

### Opciones Útiles

```bash
# Ejecutar en navegador específico
npx playwright test --project=chromium

# Ejecutar con video grabado
npx playwright test --video=on

# Ejecutar con screenshots en fallos
npx playwright test --screenshot=only-on-failure

# Ejecutar en modo paralelo (más rápido)
npx playwright test --workers=4
```

---

## Configuración

**Archivo**: `playwright.config.js`

- **BaseURL**: `http://127.0.0.1:5173` (Vite dev server)
- **TestDir**: `./tests`
- **Reporter**: HTML
- **WebServer**: Auto-inicia Vite con `npm run dev`
- **Browser**: Chromium (Desktop Chrome)

---

## Cobertura de Funcionalidades

### ✅ Módulos Cubiertos:

1. **Autenticación**
   - Login administrador/recepcionista
   - Validación de credenciales
   - Logout

2. **Gestión de Reservas**
   - 4 páginas principales
   - Filtros y búsqueda
   - Modal con 8 tabs
   - Estadísticas

3. **Gestión de Huéspedes**
   - Crear huésped
   - Buscar huésped
   - Ver perfil completo
   - Validaciones (RUT)

4. **Gestión de Habitaciones**
   - Tablero Kanban
   - 6 estados
   - Cambio de estado
   - Filtros

---

## Notas Importantes

### Pre-condiciones

- ✅ Backend debe estar corriendo (`docker compose up -d`)
- ✅ Base de datos debe tener seed ejecutado
- ✅ Frontend debe estar disponible en puerto 5173

### Selectores Usados

Los tests usan selectores semánticos para mayor robustez:
- `getByRole()` - Accesibilidad
- `getByPlaceholder()` - Inputs
- `getByText()` - Contenido visible
- `getByLabel()` - Labels de formularios

### Timeouts

- Default: 30 segundos
- Custom en operaciones lentas: `{ timeout: 5000 }`
- Esperas explícitas: `page.waitForTimeout()`

---

## Próximos Pasos

### Tests Adicionales Sugeridos:

1. **Tests de Integración**:
   - Flujo completo de reserva (crear → check-in → check-out)
   - Agregar cargo manual → verificar en folio
   - Extender estadía → verificar fechas actualizadas

2. **Tests de Validación**:
   - Campos obligatorios en formularios
   - Validaciones de email, teléfono, RUT
   - Límites de capacidad

3. **Tests de Roles**:
   - Recepcionista sin acceso a funciones de admin
   - Verificación de permisos

4. **Tests de Performance**:
   - Tiempo de carga de páginas
   - Auto-refresh no causa lags

---

## Troubleshooting

### Test falla con "Element not found"
- Verificar que el backend está corriendo
- Verificar que hay datos en la BD (seed)
- Aumentar timeout si la operación es lenta

### Test falla en login
- Verificar credenciales del seed
- Verificar que JWT_SECRET es correcto
- Limpiar localStorage antes del test

### Test falla intermitentemente
- Agregar `waitForTimeout()` antes de interacciones
- Usar `toBeVisible()` en lugar de `toHaveText()`
- Verificar race conditions

---

## Recursos

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)

---

**Última actualización**: 2 de Noviembre, 2025
