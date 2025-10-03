# 🔔 API de Notificaciones de Check-out

## Descripción
Sistema de notificaciones para alertar a los recepcionistas sobre los check-outs programados para el día actual en zona horaria de Chile (UTC-3).

---

## 📍 Endpoints Disponibles

### 1. Obtener Alertas de Check-out Completas
**Endpoint:** `GET /api/v1/notifications/checkout-alerts`

**Descripción:** Retorna información detallada de todas las habitaciones con check-out programado para hoy.

**Autenticación:** Requerida (JWT Token)

**Roles permitidos:** `receptionist`, `administrator`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "count": 5,
  "currentTime": {
    "date": "2025-10-02",
    "time": "14:30:00",
    "fullDateTime": "2025-10-02T14:30:00.000Z"
  },
  "data": [
    {
      "reservationId": 123,
      "reservationCode": "CHECKOUT-TODAY-001",
      "checkOutDate": "2025-10-02T14:00:00.000Z",
      "checkOutTime": "11:00 AM",
      "guestInfo": {
        "id": 45,
        "fullName": "Juan Pérez González",
        "email": "juan.perez@email.com",
        "phone": "+56912345678"
      },
      "roomInfo": {
        "id": 10,
        "number": "101",
        "floor": 1,
        "type": "Doble",
        "status": "occupied"
      },
      "status": "in_progress",
      "guestCount": 2
    }
  ],
  "message": "Se encontraron 5 habitación(es) con check-out programado para hoy."
}
```

---

### 2. Obtener Conteo de Alertas (Para Badge)
**Endpoint:** `GET /api/v1/notifications/checkout-count`

**Descripción:** Retorna solo el número de check-outs pendientes para hoy. Ideal para mostrar en badges del sidebar.

**Autenticación:** Requerida (JWT Token)

**Roles permitidos:** `receptionist`, `administrator`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "count": 5,
  "currentTime": {
    "date": "2025-10-02",
    "time": "14:30:00",
    "fullDateTime": "2025-10-02T14:30:00.000Z"
  },
  "message": "5 check-out(s) pendiente(s) para hoy."
}
```

---

## 🕐 Zona Horaria

Todos los endpoints utilizan la **zona horaria de Chile (UTC-3)** para determinar:
- El día actual
- Las fechas de check-out

**Ejemplo:**
- Si en UTC son las 03:00 AM del día 3 de octubre
- En Chile serían las 00:00 AM del día 3 de octubre
- El sistema considerará correctamente que es el día 3

---

## 🧪 Pruebas con Thunder Client / Postman

### Configuración
1. **Base URL:** `http://localhost:3001/api/v1`
2. **Headers requeridos:**
   ```
   Authorization: Bearer <tu_token_jwt>
   Content-Type: application/json
   ```

### Paso 1: Login
```http
POST http://localhost:3001/api/v1/auth/login
Content-Type: application/json

{
  "email": "carlos.recepcionista@hotel.com",
  "password": "password123"
}
```

**Copiar el token de la respuesta**

### Paso 2: Probar Alertas Completas
```http
GET http://localhost:3001/api/v1/notifications/checkout-alerts
Authorization: Bearer <token_copiado>
```

### Paso 3: Probar Conteo (Badge)
```http
GET http://localhost:3001/api/v1/notifications/checkout-count
Authorization: Bearer <token_copiado>
```

---

## 📊 Lógica de Negocio

### Criterios para mostrar alertas:
- ✅ Check-out programado para **HOY** (zona horaria Chile)
- ✅ Estado de reserva: `in_progress` o `confirmed`
- ✅ Ordenadas por hora de check-out (ascendente)

### Estados de reserva considerados:
- `in_progress`: Reserva activa (huésped ya hizo check-in)
- `confirmed`: Reserva confirmada (check-in pendiente pero check-out hoy)

### Estados NO considerados:
- `pending`: Reserva sin confirmar
- `completed`: Ya se realizó el check-out
- `canceled`: Reserva cancelada

---

## 🔧 Datos de Prueba

El seed crea **5 reservas** con check-out HOY:
- Código: `CHECKOUT-TODAY-001` a `CHECKOUT-TODAY-005`
- Estado: `in_progress`
- Check-out: HOY a las 11:00 AM
- Habitaciones: Ocupadas (del 1 al 7)

---

## 🚀 Próximos Pasos (Frontend)

1. Crear componente de badge en el Sidebar
2. Implementar auto-refresh cada 10 minutos
3. Crear página de notificaciones con lista detallada
4. Agregar sonido o animación cuando hay nuevas alertas

---

## ⚠️ Notas Importantes

- Los endpoints requieren autenticación JWT
- Solo usuarios con rol `receptionist` o `administrator` pueden acceder
- La zona horaria se calcula automáticamente en el backend
- No es necesario enviar la zona horaria desde el frontend
