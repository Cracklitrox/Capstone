# 🧪 GUÍA COMPLETA DE TESTING - FASE 4-5
## Sistema de Gestión de Reservas Completo

**Fecha de creación**: 02 de Noviembre, 2025
**Estado**: Listo para testing manual
**Archivos corregidos**: 5 errores en RoomUpgradeModal.jsx

---

## 📋 RESUMEN EJECUTIVO

Esta guía cubre el testing completo de todos los componentes, páginas, services y endpoints creados en las **Fases 4 y 5** del sistema de reservas.

**Componentes nuevos**: 12
**Páginas nuevas**: 4
**Services backend**: 4
**Endpoints API**: 10
**Total líneas de código**: ~3,500

---

## 🎯 OBJETIVOS DEL TESTING

1. ✅ Verificar que todos los componentes frontend renderizan correctamente
2. ✅ Validar flujos de estados de reserva (8 estados)
3. ✅ Probar operaciones CRUD de cargos manuales
4. ✅ Verificar cálculos de folio (habitaciones + servicios + cargos)
5. ✅ Probar extensión de estadía con validación de disponibilidad
6. ✅ Validar upgrade de habitaciones
7. ✅ Testing de early/late checkout
8. ✅ Verificar modal con 8 tabs (ReservationDetailsModal)

---

## 🔐 CREDENCIALES DE TESTING

### Usuario Administrador
```
Email: super.admin@hotel.com
Password: Admin123
```

### Usuario Recepcionista
```
Email: carlos.recepcionista@hotel.com
Password: Recep123
```

### Token JWT (Pre-generado, válido por 24h)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJzdXBlci5hZG1pbkBob3RlbC5jb20iLCJmaXJzdE5hbWUiOiJTdXBlciIsInJvbGUiOiJhZG1pbmlzdHJhdG9yIiwiaWF0IjoxNzYyMDU2NTMwLCJleHAiOjE3NjIxNDI5MzB9.iWIvGuHVWcgnTGvTRsBZnGpOWmj-BFF2TiRAU2gGnBw
```

---

## 📍 RUTAS FRONTEND PARA PROBAR

### 1. Gestión de Reservas
```
/reservations/manage           - Grid principal con modal de 8 tabs
/reservations/checkins-today   - Check-ins del día
/reservations/checkouts-today  - Check-outs del día
/reservations/in-progress      - Huéspedes hospedados
```

### 2. Otros módulos existentes
```
/receptionist/tape-chart       - TapeChart visual
/receptionist/guest-history    - Historial de huéspedes
/receptionist/reservation-history - Historial de reservas
```

---

## 🧪 PLAN DE TESTING - FRONTEND

### PARTE 1: Componentes Base

#### 1.1 StatusBadge Component
**Ubicación**: `/reservations/manage`

**Casos de prueba**:
- [ ] Verificar que muestra color azul para `pending`
- [ ] Verificar que muestra color verde para `confirmed`
- [ ] Verificar que muestra color amarillo para `ready_for_checkin`
- [ ] Verificar que muestra color púrpura para `in_progress`
- [ ] Verificar que muestra color naranja para `pending_checkout`
- [ ] Verificar que muestra color gris para `completed`
- [ ] Verificar que muestra color rojo para `canceled` y `no_show`
- [ ] Tooltip aparece al hacer hover con descripción del estado

**Cómo probar**:
1. Ir a `/reservations/manage`
2. Observar los badges en cada card de reserva
3. Hacer hover sobre cada badge para ver tooltip

---

#### 1.2 ReservationTimeline Component
**Ubicación**: Modal de detalles → Tab "Historial"

**Casos de prueba**:
- [ ] Timeline muestra eventos en orden cronológico descendente
- [ ] Cada evento tiene ícono correcto (check-in, check-out, pago, etc.)
- [ ] Formato de fecha es legible (ej: "Lunes, 2 de noviembre 2025, 10:30 AM")
- [ ] Muestra el nombre del usuario que realizó la acción
- [ ] Eventos de cambio de estado tienen color distintivo
- [ ] Scroll funciona correctamente si hay muchos eventos

**Cómo probar**:
1. Ir a `/reservations/manage`
2. Hacer clic en "Ver Detalles" de cualquier reserva
3. Navegar al tab "Historial" (última pestaña)
4. Verificar que se muestran todos los cambios históricos

---

### PARTE 2: Páginas Principales

#### 2.1 Página: Check-ins Hoy
**Ruta**: `/reservations/checkins-today`

**Casos de prueba**:
- [ ] Muestra solo reservas con `status=ready_for_checkin` y `check_in_date=HOY`
- [ ] Contador de check-ins pendientes es correcto
- [ ] Grid responsive (3 columnas en desktop, 2 en tablet, 1 en mobile)
- [ ] Progress bar de pago muestra % correcto
- [ ] Botón "Realizar Check-in" habilitado/deshabilitado según pago
- [ ] Tooltip "Pago incompleto" aparece si falta pago
- [ ] Al hacer check-in, la reserva desaparece de la lista
- [ ] Auto-refresh funciona cada 5 minutos
- [ ] Mensaje "No hay check-ins pendientes" cuando lista vacía

**Cómo probar**:
1. Navegar a `/reservations/checkins-today`
2. Verificar que solo aparecen reservas del día
3. Hacer clic en "Realizar Check-in" de una reserva
4. Confirmar en el modal
5. Verificar que la reserva desaparece

**Caso edge**:
- [ ] Probar con reserva que tiene pago incompleto
- [ ] Verificar que botón está deshabilitado y muestra tooltip

---

#### 2.2 Página: Check-outs Hoy
**Ruta**: `/reservations/checkouts-today`

**Casos de prueba**:
- [ ] Muestra solo reservas con `status=pending_checkout` y `check_out_date=HOY`
- [ ] Contador de check-outs pendientes es correcto
- [ ] Reloj de cuenta regresiva hasta 11:00 AM funciona
- [ ] Badge "Pendiente: $X" aparece si hay saldo
- [ ] Botón "Realizar Check-out" SOLO habilitado si saldo = 0
- [ ] Border roja si pasó hora límite (11 AM)
- [ ] Modal de confirmación muestra resumen de folio completo
- [ ] Advertencia crítica si saldo pendiente > 0
- [ ] Al hacer check-out exitoso, reserva desaparece

**Cómo probar**:
1. Navegar a `/reservations/checkouts-today`
2. Buscar una reserva con saldo pendiente
3. Intentar hacer check-out → debe estar bloqueado
4. Registrar pago hasta saldo = 0
5. Ahora botón debe habilitarse
6. Realizar check-out exitoso

**⚠️ VALIDACIÓN CRÍTICA**:
- [ ] **NUNCA** debe permitir check-out si `paid_amount < total_amount`

---

#### 2.3 Página: En Progreso (In Progress)
**Ruta**: `/reservations/in-progress`

**Casos de prueba**:
- [ ] Muestra solo reservas con `status=in_progress`
- [ ] Banner de ocupación muestra % correcto
- [ ] Contador de habitaciones ocupadas correcto
- [ ] Cada card muestra días restantes hasta check-out
- [ ] Folio parcial visible (Total y Pagado)
- [ ] Botón "Ver Detalles / Gestionar" abre modal
- [ ] Auto-refresh cada 10 minutos

**Cómo probar**:
1. Navegar a `/reservations/in-progress`
2. Verificar que banner de ocupación coincide con realidad
3. Abrir modal de una reserva
4. Ir al tab "Acciones" y probar agregar cargo manual

---

#### 2.4 Página: Gestión de Reservas (Manage)
**Ruta**: `/reservations/manage`

**Casos de prueba**:
- [ ] Filtro por estado funciona correctamente
- [ ] Búsqueda por código o nombre funciona
- [ ] Grid muestra todas las reservas paginadas
- [ ] StatusBadge en cada card muestra estado correcto
- [ ] Click en card abre modal completo con 8 tabs
- [ ] Auto-refresh cada 5 minutos

**Cómo probar**:
1. Ir a `/reservations/manage`
2. Probar filtro dropdown cambiando estados
3. Buscar por código "RES-" o nombre de huésped
4. Abrir modal de una reserva

---

### PARTE 3: Modal Principal con 8 Tabs

#### Tab 1: General
**Casos de prueba**:
- [ ] Muestra código de reserva
- [ ] Muestra **Tipo de Reserva** (Individual/Grupal)
- [ ] Muestra **Cantidad de Huéspedes**
- [ ] Muestra fechas de check-in y check-out
- [ ] Muestra canal de reserva (web, chatbot, recepción, etc.)
- [ ] Muestra nombre del huésped principal
- [ ] Muestra nombre del recepcionista

---

#### Tab 2: Folio
**Casos de prueba**:
- [ ] **Sección Habitaciones**: Muestra `nights × precio_por_noche = subtotal`
- [ ] Cálculo correcto: `pricePerNight = rr.rooms.base_price`
- [ ] Número de noches calculado correctamente
- [ ] **Sección Servicios**: Muestra servicios con `cantidad × precio`
- [ ] **Sección Cargos Manuales**: Muestra cargos de `additional_charges`
- [ ] Labels correctos (Minibar, Daño a habitación, etc.)
- [ ] Habitación asociada aparece ("Hab. 106")
- [ ] **NO muestra IVA** (fue eliminado)
- [ ] Total = habitaciones + servicios + cargos (sin IVA)
- [ ] Pagado muestra en verde
- [ ] Pendiente muestra en rojo si > 0
- [ ] Botones "Agregar Cargo Manual", "Registrar Pago", "Imprimir Folio"

**Cómo probar**:
1. Abrir modal de reserva ID 49 (tiene cargo manual)
2. Ir a tab "Folio"
3. Verificar cálculo:
   ```
   Habitación 106 (Matrimonial) - 10 noches
   10 × $30,000 = $300,000  ← Este cálculo debe estar correcto

   Cargo manual: Daño a habitación - Hab. 106
   1 × $5,000 = $5,000

   Total: $305,000
   ```

---

#### Tab 3: Pagos
**Casos de prueba**:
- [ ] Lista todos los pagos de la reserva
- [ ] Muestra monto, método, estado, fecha
- [ ] Badge de estado (Confirmado/Pendiente)
- [ ] Botón "Registrar Nuevo Pago"
- [ ] Suma total de pagos confirmados = `paid_amount`

---

#### Tab 4: Huéspedes
**Casos de prueba**:
- [ ] Muestra huésped principal destacado
- [ ] Muestra huéspedes adicionales de `reservation_guests`
- [ ] Muestra RUT, email, teléfono
- [ ] Botón "Agregar Huésped" (si hay espacio)

---

#### Tab 5: Habitaciones
**Casos de prueba**:
- [ ] Lista todas las habitaciones de `reservation_rooms`
- [ ] Muestra número de habitación
- [ ] Muestra tipo de habitación
- [ ] Muestra precio por noche
- [ ] Muestra subtotal
- [ ] Fechas start_date y end_date

---

#### Tab 6: Servicios
**Casos de prueba**:
- [ ] Lista todos los servicios de `reservation_services`
- [ ] Muestra cantidad, precio unitario, subtotal
- [ ] Muestra si tiene fechas específicas

---

#### Tab 7: Acciones
**Casos de prueba según estado**:

**Estado: pending**
- [ ] Botón "Confirmar Pago Transferencia"
- [ ] Botón "Cancelar por Falta de Pago"

**Estado: confirmed**
- [ ] Botón "Marcar Ready for Check-in"
- [ ] Botón "Cancelar Reserva"

**Estado: ready_for_checkin**
- [ ] QuickCheckInButton visible
- [ ] Botón "Cancelar Reserva"
- [ ] Botón "Marcar No-Show"

**Estado: in_progress**
- [ ] Botón "Marcar Pending Checkout"
- [ ] Botón "Extender Estadía"
- [ ] Botón "Upgrade Habitación"
- [ ] Botón "Agregar Cargo Manual"
- [ ] Botón "Early Checkout"

**Estado: pending_checkout**
- [ ] QuickCheckOutButton visible (solo si saldo=0)
- [ ] Botón "Autorizar Late Check-out"
- [ ] Warning amarillo si pago incompleto

**Estado: completed/canceled/no_show**
- [ ] Mensaje "No hay acciones disponibles"

---

#### Tab 8: Historial
**Casos de prueba**:
- [ ] Timeline muestra todos los cambios de estado
- [ ] Muestra pagos registrados
- [ ] Muestra cargos agregados
- [ ] Muestra modificaciones (extensión, upgrade)
- [ ] Orden cronológico descendente

---

### PARTE 4: Modales de Acción

#### 4.1 AddManualChargeModal
**Casos de prueba**:
- [ ] Dropdown de tipo de cargo (Minibar, Daño, Servicio, Penalización, Otro)
- [ ] Campo descripción (opcional)
- [ ] Campo monto (requerido, numérico)
- [ ] Campo cantidad (default=1)
- [ ] Dropdown habitación (opcional, muestra "Ninguna específica" + habitaciones)
- [ ] **NO debe permitir** SelectItem con value="" (Radix UI error)
- [ ] Al guardar, calcula `subtotal = amount × quantity`
- [ ] Al guardar exitoso, recarga folio
- [ ] Toast de éxito aparece

**Cómo probar**:
1. Abrir reserva en progreso
2. Tab "Acciones" → "Agregar Cargo Manual"
3. Tipo: Minibar
4. Descripción: "Coca-Cola"
5. Monto: 2000
6. Cantidad: 2
7. Habitación: Seleccionar 106
8. Guardar
9. Ir a tab "Folio" y verificar que aparece: "Minibar - Hab. 106: $4,000"

**⚠️ Caso edge**:
- [ ] Verificar que "Ninguna específica" tiene `value="none"` NO `value=""`

---

#### 4.2 ExtendStayModal
**Casos de prueba**:
- [ ] Muestra fecha actual de check-out destacada
- [ ] Input de nueva fecha solo permite fechas futuras
- [ ] Botón "Verificar Disponibilidad" habilitado solo si fecha válida
- [ ] Al verificar, hace request a `/check-availability-extension`
- [ ] Si disponible, muestra:
  - Noches adicionales
  - Precio por noche
  - Costo adicional total
- [ ] Si NO disponible, muestra mensaje de error
- [ ] Botón "Confirmar Extensión" solo visible si disponible=true
- [ ] Al confirmar, actualiza reserva y muestra toast

**Cómo probar**:
1. Abrir reserva en progreso (ej: ID 49, check-out 11-Nov)
2. Tab "Acciones" → "Extender Estadía"
3. Seleccionar nueva fecha: 15-Nov (4 noches adicionales)
4. Click "Verificar Disponibilidad"
5. Debe mostrar: "4 noches × $30,000 = $120,000"
6. Click "Confirmar Extensión"
7. Verificar que `check_out_date` cambió a 15-Nov

**Caso edge**:
- [ ] Intentar extender con fecha igual o anterior → debe mostrar error

---

#### 4.3 RoomUpgradeModal
**Casos de prueba**:
- [ ] Muestra habitación actual con número y tipo
- [ ] Carga lista de habitaciones superiores disponibles
- [ ] Solo muestra habitaciones con `base_price > precio_actual`
- [ ] Dropdown muestra: "Tipo #Número - $Precio/noche"
- [ ] **CORRECCIÓN APLICADA**: Usa `.room_number` NO `.number`
- [ ] Al seleccionar, muestra detalles:
  - Capacidad
  - Precio por noche
  - Diferencia de precio
  - Noches restantes
  - Costo adicional total
- [ ] Campo "Razón" opcional
- [ ] Al confirmar, actualiza habitación y total

**Cómo probar**:
1. Abrir reserva ID 49 (Habitación 106 - Matrimonial, $30k/noche)
2. Tab "Acciones" → "Upgrade Habitación"
3. Debe cargar upgrades disponibles
4. Seleccionar "Triple #209 - $35,000/noche"
5. Verificar cálculo: "10 noches × $5,000 diferencia = $50,000 adicional"
6. Razón: "Solicitud del huésped"
7. Confirmar
8. Verificar que:
   - Habitación cambió a 209
   - `total_amount` aumentó en $50,000
   - Habitación 106 pasó a estado "cleaning" o "available"
   - Habitación 209 pasó a "occupied"

**⚠️ VERIFICACIÓN POST-CORRECCIÓN**:
- [ ] Toast debe decir "Habitación cambiada a Triple #209" (NO "Triple #undefined")

---

#### 4.4 QuickCheckInButton
**Casos de prueba**:
- [ ] Si `requireFullPayment=false`: botón habilitado aunque falte pago
- [ ] Si `requireFullPayment=true`: botón deshabilitado si pago incompleto
- [ ] Tooltip aparece al hover si deshabilitado
- [ ] Modal de confirmación muestra resumen de pago
- [ ] Warning amarillo si hay saldo pendiente
- [ ] Al confirmar, cambia estado a `in_progress`
- [ ] Habitaciones pasan a `occupied`
- [ ] Toast de éxito

**Cómo probar**:
1. Ir a `/reservations/checkins-today`
2. Buscar reserva con pago parcial
3. Si botón deshabilitado, hover para ver tooltip
4. Registrar pago faltante
5. Ahora botón debe habilitarse
6. Click y confirmar
7. Verificar cambio de estado

---

#### 4.5 QuickCheckOutButton
**Casos de prueba**:
- [ ] **VALIDACIÓN CRÍTICA**: Botón SOLO habilitado si `isPaidFully=true`
- [ ] Si `paid_amount < total_amount`: botón deshabilitado + badge rojo
- [ ] Tooltip "No se puede hacer check-out. Pendiente: $X"
- [ ] Modal muestra resumen completo de folio
- [ ] Warning crítico si saldo pendiente
- [ ] Confirmación visual "saldo en $0"
- [ ] Al confirmar, cambia estado a `completed`
- [ ] Habitaciones pasan a `cleaning`

**Cómo probar**:
1. Ir a `/reservations/checkouts-today`
2. Buscar reserva con saldo pendiente
3. Botón debe estar deshabilitado
4. Registrar pago final hasta saldo = 0
5. Botón se habilita
6. Click y confirmar
7. Reserva debe desaparecer de la lista

**⚠️ CASO CRÍTICO**:
- [ ] Intentar hacer check-out con saldo > 0 debe ser **imposible**

---

## 🔌 PLAN DE TESTING - BACKEND (API)

### Configuración previa
```bash
# Variable de entorno
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Headers comunes
-H "Authorization: Bearer $TOKEN"
-H "Content-Type: application/json"
```

---

### ENDPOINT 1: Agregar Cargo Manual
```bash
POST /api/v1/reservations/:id/charges

# Caso de prueba
curl -X POST "http://localhost:3001/api/v1/reservations/49/charges" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chargeType": "minibar",
    "description": "2 Coca-Colas",
    "amount": 2000,
    "quantity": 2,
    "roomId": 6
  }'

# Respuesta esperada
{
  "message": "Cargo manual agregado exitosamente",
  "charge": {
    "id": 3,
    "subtotal": 4000,
    "charge_type": "minibar",
    "rooms": {
      "room_number": "106"
    }
  }
}
```

**Validaciones**:
- [ ] `chargeType` es requerido
- [ ] `amount` es requerido
- [ ] `subtotal = amount × quantity`
- [ ] Se registra en `activity_logs`
- [ ] `total_amount` de reserva se incrementa

---

### ENDPOINT 2: Obtener Cargos Manuales
```bash
GET /api/v1/reservations/:id/charges

curl -X GET "http://localhost:3001/api/v1/reservations/49/charges" \
  -H "Authorization: Bearer $TOKEN"

# Respuesta esperada
{
  "charges": [
    {
      "id": 2,
      "charge_type": "room_damage",
      "description": "Se cargo la puerta",
      "subtotal": 5000,
      "deleted_at": null
    },
    {
      "id": 3,
      "charge_type": "minibar",
      "description": "2 Coca-Colas",
      "subtotal": 4000
    }
  ]
}
```

**Validaciones**:
- [ ] Solo retorna cargos con `deleted_at = null`
- [ ] Incluye relación con `rooms` (número de habitación)

---

### ENDPOINT 3: Eliminar Cargo Manual
```bash
DELETE /api/v1/reservations/:id/charges/:chargeId

curl -X DELETE "http://localhost:3001/api/v1/reservations/49/charges/3" \
  -H "Authorization: Bearer $TOKEN"

# Respuesta esperada
{
  "message": "Cargo manual eliminado exitosamente"
}
```

**Validaciones**:
- [ ] Soft delete (actualiza `deleted_at`)
- [ ] `total_amount` de reserva se decrementa
- [ ] Se registra en `activity_logs`

---

### ENDPOINT 4: Verificar Disponibilidad para Extensión
```bash
POST /api/v1/reservations/:id/check-availability-extension

curl -X POST "http://localhost:3001/api/v1/reservations/49/check-availability-extension" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newCheckOutDate": "2025-11-15T11:00:00.000Z"
  }'

# Respuesta esperada
{
  "available": true,
  "additionalNights": 4,
  "roomCount": 1,
  "pricePerNight": 30000,
  "additionalCost": 120000
}
```

**Validaciones**:
- [ ] Verifica conflictos de reserva en fechas
- [ ] Calcula noches adicionales correctamente
- [ ] Calcula costo total

---

### ENDPOINT 5: Extender Estadía
```bash
POST /api/v1/reservations/:id/extend

curl -X POST "http://localhost:3001/api/v1/reservations/49/extend" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newCheckOutDate": "2025-11-15T11:00:00.000Z"
  }'

# Respuesta esperada
{
  "message": "Estadía extendida exitosamente",
  "reservation": {
    "id": 49,
    "check_out_date": "2025-11-15T11:00:00.000Z",
    "total_amount": 425000
  }
}
```

**Validaciones**:
- [ ] Actualiza `check_out_date` de reserva
- [ ] Actualiza `end_date` de `reservation_rooms`
- [ ] Incrementa `total_amount`
- [ ] Registra en `activity_logs`

---

### ENDPOINT 6: Habitaciones Disponibles para Upgrade
```bash
GET /api/v1/rooms/available-upgrades?reservationId=X

curl -X GET "http://localhost:3001/api/v1/rooms/available-upgrades?reservationId=49" \
  -H "Authorization: Bearer $TOKEN"

# Respuesta esperada
[
  {
    "id": 18,
    "room_number": "209",
    "floor": 2,
    "room_type": {
      "id": 5,
      "name": "Triple",
      "capacity": 3,
      "price_per_night": 35000
    },
    "priceDifference": 5000,
    "remainingNights": 10,
    "totalAdditionalCost": 50000
  }
]
```

**Validaciones**:
- [ ] Solo habitaciones con `base_price > precio_actual`
- [ ] Solo habitaciones con `status = available`
- [ ] Sin conflictos de reserva en fechas
- [ ] Ordenadas por precio ascendente

---

### ENDPOINT 7: Realizar Upgrade de Habitación
```bash
POST /api/v1/reservations/:id/upgrade-room

curl -X POST "http://localhost:3001/api/v1/reservations/49/upgrade-room" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newRoomId": 18,
    "reason": "Solicitud del huésped"
  }'

# Respuesta esperada
{
  "message": "Upgrade de habitación realizado exitosamente",
  "reservation": {
    "id": 49,
    "total_amount": 475000,
    "reservation_rooms": [
      {
        "room_id": 18,
        "subtotal": 350000
      }
    ]
  }
}
```

**Validaciones**:
- [ ] `newRoomId` debe tener precio > habitación actual
- [ ] Actualiza `room_id` en `reservation_rooms`
- [ ] Incrementa `subtotal` de habitación
- [ ] Incrementa `total_amount` de reserva
- [ ] Habitación antigua → `cleaning` o `available`
- [ ] Habitación nueva → `occupied` (si in_progress)
- [ ] Registra en `activity_logs`

---

### ENDPOINT 8: Cambiar Habitación (Misma Categoría)
```bash
POST /api/v1/reservations/:id/change-room

curl -X POST "http://localhost:3001/api/v1/reservations/49/change-room" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldRoomId": 6,
    "newRoomId": 7,
    "reason": "Problema con aire acondicionado"
  }'
```

**Validaciones**:
- [ ] `oldRoomId` debe pertenecer a la reserva
- [ ] `newRoomId` debe estar disponible
- [ ] Permite precio igual, mayor o menor
- [ ] Ajusta `total_amount` según diferencia de precio

---

### ENDPOINT 9: Early Checkout
```bash
POST /api/v1/reservations/:id/early-checkout

curl -X POST "http://localhost:3001/api/v1/reservations/49/early-checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Emergencia familiar"
  }'
```

**Validaciones**:
- [ ] Solo permite si estado = `in_progress`
- [ ] Cambia a `completed`
- [ ] Habitaciones → `cleaning`
- [ ] Registra en `activity_logs`

---

### ENDPOINT 10: Late Checkout
```bash
POST /api/v1/reservations/:id/late-checkout

curl -X POST "http://localhost:3001/api/v1/reservations/49/late-checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Vuelo retrasado",
    "chargeAmount": 15000
  }'
```

**Validaciones**:
- [ ] Solo permite si estado = `in_progress` o `pending_checkout`
- [ ] Si `chargeAmount > 0`, crea cargo manual
- [ ] Incrementa `total_amount`
- [ ] Registra en `activity_logs`

---

## 🎯 FLUJOS COMPLETOS E2E

### FLUJO 1: Check-in Completo
1. [ ] Ir a `/reservations/checkins-today`
2. [ ] Verificar que aparece reserva con estado `ready_for_checkin`
3. [ ] Click en "Realizar Check-in"
4. [ ] Verificar modal de confirmación con resumen de pago
5. [ ] Confirmar
6. [ ] Verificar toast de éxito
7. [ ] Reserva desaparece de la lista
8. [ ] Ir a `/reservations/in-progress`
9. [ ] Verificar que aparece la misma reserva
10. [ ] Verificar en DB: `status = in_progress`, habitaciones `occupied`

---

### FLUJO 2: Agregar Cargo Manual → Check-out
1. [ ] Ir a `/reservations/in-progress`
2. [ ] Abrir modal de reserva con saldo = 0
3. [ ] Tab "Acciones" → "Agregar Cargo Manual"
4. [ ] Tipo: Minibar, Monto: 5000, Cantidad: 2
5. [ ] Guardar → Total aumenta a +$10,000
6. [ ] Tab "Folio" → Verificar que aparece el cargo
7. [ ] Cambiar estado a `pending_checkout`
8. [ ] Ir a `/reservations/checkouts-today`
9. [ ] Verificar que botón check-out está **deshabilitado** (saldo pendiente)
10. [ ] Tab "Acciones" → "Registrar Pago" por $10,000
11. [ ] Ahora botón se habilita
12. [ ] Realizar check-out
13. [ ] Verificar en DB: `status = completed`, habitaciones `cleaning`

---

### FLUJO 3: Upgrade de Habitación
1. [ ] Ir a `/reservations/in-progress`
2. [ ] Abrir reserva en Habitación 106 (Matrimonial, $30k)
3. [ ] Tab "Acciones" → "Upgrade Habitación"
4. [ ] Seleccionar "Triple #209 - $35,000"
5. [ ] Verificar cálculo de costo adicional
6. [ ] Confirmar upgrade
7. [ ] Tab "Habitaciones" → Verificar que cambió a 209
8. [ ] Tab "Folio" → Verificar que total aumentó
9. [ ] Verificar en DB:
    - `reservation_rooms.room_id = 209`
    - Habitación 106: `status = cleaning`
    - Habitación 209: `status = occupied`
10. [ ] Tab "Historial" → Verificar evento de upgrade

---

### FLUJO 4: Extensión de Estadía
1. [ ] Abrir reserva con check-out 11-Nov
2. [ ] Tab "Acciones" → "Extender Estadía"
3. [ ] Nueva fecha: 15-Nov (4 noches más)
4. [ ] Click "Verificar Disponibilidad"
5. [ ] Debe mostrar disponible con costo
6. [ ] Confirmar extensión
7. [ ] Tab "General" → Verificar nueva fecha check-out
8. [ ] Tab "Folio" → Verificar que total aumentó
9. [ ] Verificar en DB: `check_out_date` actualizado

---

## 📊 CASOS EDGE Y VALIDACIONES

### Validaciones de Negocio
- [ ] **No permitir** check-out si saldo > 0
- [ ] **No permitir** upgrade a habitación de precio igual/inferior
- [ ] **No permitir** extensión si habitaciones no disponibles
- [ ] **No permitir** agregar cargo con monto = 0
- [ ] **No permitir** early checkout si ya está en completed
- [ ] **Validar** que total_amount siempre = sum(habitaciones + servicios + cargos)

### Casos Edge UI
- [ ] Scroll en timeline si > 20 eventos
- [ ] Grid responsive en diferentes tamaños de pantalla
- [ ] Loading states en todos los modales
- [ ] Error handling si API falla
- [ ] Toast notifications visibles pero no invasivos
- [ ] Modales se cierran al presionar ESC
- [ ] Auto-refresh no interrumpe interacción del usuario

### Casos Edge Backend
- [ ] Token expirado → 401 Unauthorized
- [ ] Reserva no existe → 404 Not Found
- [ ] Habitación ya ocupada → 400 Bad Request
- [ ] Datos inválidos → 400 con mensaje descriptivo
- [ ] Error de DB → 500 con log de error

---

## 🐛 REPORTE DE BUGS

**Formato para reportar**:
```markdown
### BUG: [Título descriptivo]

**Severidad**: Critical / High / Medium / Low

**Pasos para reproducir**:
1. Ir a ...
2. Click en ...
3. ...

**Resultado esperado**:
...

**Resultado actual**:
...

**Captura de pantalla**:
[Adjuntar imagen]

**Consola del navegador**:
[Error logs]

**Request/Response de red**:
[Adjuntar de DevTools]
```

---

## ✅ CHECKLIST FINAL

### Antes de dar por completo
- [ ] Todos los componentes renderizan sin errores
- [ ] Todos los 8 tabs del modal funcionan
- [ ] Cálculos de folio son correctos (sin IVA)
- [ ] Validación crítica: No check-out si saldo > 0
- [ ] Todos los endpoints responden correctamente
- [ ] Transiciones de estados funcionan
- [ ] Activity_logs se registran en todas las acciones
- [ ] No hay errores en consola del navegador
- [ ] No hay errores en logs del backend
- [ ] Responsive design funciona en mobile/tablet/desktop

---

## 📝 NOTAS FINALES

**Archivos corregidos hoy (02-Nov)**:
- `RoomUpgradeModal.jsx`: 5 correcciones (`.number` → `.room_number`)
- Todos los demás archivos ya estaban correctos

**Próximo paso**: Testing manual completo en navegador

**Recomendación**: Probar en orden:
1. Componentes base (StatusBadge, Timeline)
2. Páginas principales (Check-ins, Check-outs, In Progress)
3. Modal con 8 tabs
4. Modales de acción (Cargos, Upgrade, Extensión)
5. Flujos E2E completos
6. Endpoints API con curl
7. Casos edge

**Tiempo estimado de testing**: 4-6 horas

---

**¡Buena suerte con el testing! 🚀**
