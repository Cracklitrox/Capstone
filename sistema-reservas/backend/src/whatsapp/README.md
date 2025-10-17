# 🤖 Chatbot de WhatsApp - Hotel Don Teo

Sistema de chatbot integrado con WhatsApp para captura de datos de reservas y notificación a recepcionistas.

## 📋 Descripción

Este módulo implementa un chatbot conversacional usando **Baileys** (cliente de WhatsApp Web) que:

- ✅ Captura datos del cliente mediante conversación natural
- ✅ Valida información (RUT, email, fechas, etc.)
- ✅ Verifica disponibilidad de habitaciones
- ✅ Genera alertas para recepcionistas en tiempo real
- ✅ Integración con Socket.IO para notificaciones
- ✅ Persistencia de sesiones de chat

## 🏗️ Estructura

```
whatsapp/
├── whatsapp.client.js          # Cliente Baileys
├── whatsapp.controller.js      # Controlador de endpoints
├── whatsapp.service.js         # Lógica de negocio
├── whatsapp.routes.js          # Rutas de API REST
├── flows/
│   ├── menu.flow.js            # Menú principal
│   └── reservation.flow.js     # Flujo de reserva
├── validators/
│   ├── date.validator.js       # Validación de fechas
│   ├── guest.validator.js      # Validación de huéspedes
│   └── room.validator.js       # Validación de habitaciones
└── sessions/                    # Credenciales de WhatsApp (no versionado)
```

## 🚀 Instalación

Las dependencias ya están instaladas:

```bash
npm install @whiskeysockets/baileys pino qrcode-terminal
```

## ⚙️ Configuración

### Variables de entorno

Agregar al archivo `.env`:

```env
# WhatsApp Bot
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_PATH=./src/whatsapp/sessions
```

### Inicialización

El bot se inicializa automáticamente al arrancar el servidor si `WHATSAPP_ENABLED=true`.

**Primera vez:**
1. Al iniciar, se generará un código QR en la consola
2. Escanear el QR con WhatsApp (Configuración > Dispositivos vinculados)
3. Una vez conectado, las credenciales se guardan en `sessions/`
4. No es necesario volver a escanear el QR

## 📡 API Endpoints

### `GET /api/v1/whatsapp/status`
Obtener estado de conexión del bot.

**Auth:** Administrator

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "qrCode": null,
    "reconnectAttempts": 0
  }
}
```

---

### `GET /api/v1/whatsapp/qr`
Obtener código QR para autenticación.

**Auth:** Administrator

**Response:**
```json
{
  "success": true,
  "qrCode": "1@ABC123..."
}
```

---

### `POST /api/v1/whatsapp/disconnect`
Desconectar el bot.

**Auth:** Administrator

---

### `POST /api/v1/whatsapp/send`
Enviar mensaje manual.

**Auth:** Receptionist, Administrator

**Body:**
```json
{
  "phoneNumber": "+56912345678",
  "message": "Hola, tu reserva está confirmada"
}
```

---

### `GET /api/v1/whatsapp/stats`
Obtener estadísticas del bot.

**Auth:** Receptionist, Administrator

**Response:**
```json
{
  "success": true,
  "data": {
    "totalConversations": 45,
    "completedReservations": 38,
    "abandonedConversations": 7,
    "messagesProcessed": 342,
    "activeSessions": 2,
    "uptime": 86400
  }
}
```

## 💬 Flujo de Conversación

### Estados del flujo

1. **INITIAL** - Menú principal
2. **AWAITING_NAME** - Solicitar nombre
3. **AWAITING_RUT** - Solicitar RUT
4. **AWAITING_EMAIL** - Solicitar email
5. **AWAITING_PHONE** - Solicitar teléfono
6. **AWAITING_CHECK_IN** - Solicitar fecha entrada
7. **AWAITING_CHECK_OUT** - Solicitar fecha salida
8. **AWAITING_ROOM_TYPE** - Solicitar tipo habitación
9. **AWAITING_ADULTS** - Solicitar cantidad adultos
10. **AWAITING_CHILDREN** - Solicitar cantidad niños
11. **AWAITING_SPECIAL_REQUESTS** - Solicitar peticiones especiales
12. **AWAITING_CONFIRMATION** - Confirmar datos

### Comandos globales

- `MENU` - Volver al menú principal
- `CANCELAR` - Cancelar proceso actual
- `RESERVA` - Iniciar nueva reserva
- `INFO` - Información del hotel
- `AYUDA` - Obtener ayuda

## ✅ Validaciones Implementadas

### Fechas
- Formato DD/MM/YYYY
- No en el pasado
- Check-out después de check-in
- Máximo 1 año anticipación
- Estadía entre 1 y 30 noches

### RUT
- Formato chileno válido
- Cálculo de dígito verificador
- Formato: 12.345.678-9

### Email
- Formato estándar RFC 5322
- Máximo 100 caracteres

### Teléfono
- Formato chileno (+56 o sin prefijo)
- 9 dígitos después del código país

### Habitaciones
- Tipos: Standard, Doble, Suite
- Verificación de disponibilidad en BD
- Validación de capacidad vs huéspedes

### Huéspedes
- Adultos: 1-4
- Niños: 0-3
- Validación total según tipo de habitación

## 🔔 Sistema de Notificaciones

Cuando un cliente completa la reserva:

1. Se crea una alerta en la tabla `alerts` con tipo `booking_request`
2. Se emite evento Socket.IO a todos los recepcionistas conectados:

```javascript
io.to('role:receptionist').emit('alert:new', {
  id: 123,
  type: 'booking_request',
  message: '📱 Nueva solicitud desde WhatsApp',
  data: { ... }
});
```

3. El recepcionista recibe notificación en tiempo real
4. Puede ver los datos y crear la reserva en el sistema

## 🧪 Testing

```bash
# Unit tests
npm test

# Coverage
npm run coverage
```

## 🐳 Docker

La carpeta `sessions/` debe persistirse en Docker para mantener la autenticación:

```yaml
backend:
  volumes:
    - ./backend/src/whatsapp/sessions:/app/src/whatsapp/sessions
```

## 🔒 Seguridad

- ✅ Rate limiting por número de teléfono
- ✅ Timeout de sesión (30 minutos inactividad)
- ✅ Validación y sanitización de inputs
- ✅ Logs de todas las conversaciones
- ✅ Autenticación JWT para endpoints

## 📊 Monitoreo

El servicio incluye estadísticas en tiempo real:

- Total de conversaciones
- Conversaciones completadas
- Conversaciones abandonadas
- Mensajes procesados
- Sesiones activas
- Tiempo de actividad (uptime)

## 🐛 Troubleshooting

### El bot no se conecta
1. Verificar que `WHATSAPP_ENABLED=true`
2. Eliminar carpeta `sessions/` y reiniciar
3. Escanear nuevo QR

### No aparece el QR
- El QR se genera solo si no hay sesión guardada
- Si ya está autenticado, no aparece QR

### Sesiones se pierden al reiniciar
- Verificar que la carpeta `sessions/` persista en Docker
- Verificar permisos de escritura

### Mensajes no se procesan
- Verificar que `messageHandler` esté configurado
- Revisar logs del servidor
- Verificar conexión a BD

## 📝 Próximas mejoras

- [ ] Migrar sesiones de Map a Redis
- [ ] IA para respuestas más naturales (GPT/Claude)
- [ ] Multi-idioma (inglés, portugués)
- [ ] Envío de confirmación con PDF
- [ ] Integración con pagos
- [ ] Recordatorios automáticos
- [ ] Bot voice (mensajes de voz)
- [ ] Blacklist de números spam

## 👥 Autor

Equipo de desarrollo Hotel Don Teo

## 📄 Licencia

ISC
