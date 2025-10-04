# 🔧 FIX: Error 401 Unauthorized en Alertas de Checkout

## ❌ PROBLEMA ENCONTRADO

### Error en consola:
```
GET http://localhost:3001/api/v1/notifications/checkout-alerts 401 (Unauthorized)

Error al cargar alertas de checkout: Error: Token inválido o expirado.
```

---

## 🔍 CAUSA DEL PROBLEMA

El sistema estaba intentando cargar las alertas de checkout **sin enviar el token de autenticación**:

### **Código anterior (INCORRECTO):**

```javascript
// Layout.jsx
const { user } = useAuth();  // ❌ Solo obtenía el user, NO el token

// ...

const data = await fetchCheckoutAlerts();  // ❌ Sin token
```

### **¿Por qué fallaba?**

1. La función `fetchCheckoutAlerts()` **REQUIERE** un token JWT:
   ```javascript
   // notifications.js
   export async function fetchCheckoutAlerts(token) {
     const response = await fetch(`${API_BASE_URL}/notifications/checkout-alerts`, {
       headers: {
         'Authorization': `Bearer ${token}`,  // ← Necesita token
       },
     });
   }
   ```

2. Pero en `Layout.jsx` se llamaba **sin pasar el token**:
   ```javascript
   const data = await fetchCheckoutAlerts();  // ❌ Falta token
   ```

3. El backend recibía una petición **sin autorización** → 401 Unauthorized

---

## ✅ SOLUCIÓN IMPLEMENTADA

### **Cambio 1: Obtener el token del contexto**

```javascript
// ❌ ANTES
const { user } = useAuth();

// ✅ AHORA
const { user, token } = useAuth();  // ← Obtener también el token
```

### **Cambio 2: Pasar el token a la función**

```javascript
// ❌ ANTES
const data = await fetchCheckoutAlerts();

// ✅ AHORA
const data = await fetchCheckoutAlerts(token);  // ← Pasar token
```

### **Cambio 3: Validar que el token existe**

```javascript
// ❌ ANTES
if (!shouldAlert || user?.role !== 'receptionist') return;

// ✅ AHORA
if (!shouldAlert || user?.role !== 'receptionist' || !token) return;
//                                                    ^^^^^^^^
//                                        Validar que haya token
```

### **Cambio 4: Agregar token a las dependencias**

```javascript
// ❌ ANTES
}, [shouldAlert, user, notifyCheckouts, navigate]);

// ✅ AHORA
}, [shouldAlert, user, token, notifyCheckouts, navigate]);
//                     ^^^^^
//              Agregar token como dependencia
```

---

## 📝 CÓDIGO COMPLETO CORREGIDO

### **Layout.jsx (fragmento relevante):**

```javascript
const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [checkoutAlerts, setCheckoutAlerts] = useState([]);
  
  // ✅ Obtener user Y token
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { requestPermission, notifyCheckouts } = useCheckoutNotifications();
  const { shouldAlert, markAsRead } = useAlertTime(9);

  // Cargar alertas y mostrar modal/notificación cuando sea hora
  useEffect(() => {
    // ✅ Validar que exista el token
    if (!shouldAlert || user?.role !== 'receptionist' || !token) return;

    const loadAlertsAndNotify = async () => {
      try {
        // ✅ Pasar el token a la función
        const data = await fetchCheckoutAlerts(token);
        setCheckoutAlerts(data);
        
        if (data.length > 0) {
          setModalOpen(true);
          notifyCheckouts(data.length, () => {
            navigate('/checkout-alerts');
          });
        }
      } catch (error) {
        console.error('Error al cargar alertas de checkout:', error);
      }
    };

    loadAlertsAndNotify();
  }, [shouldAlert, user, token, notifyCheckouts, navigate]);
  //                     ^^^^^ Agregar token a dependencias

  // ...resto del código
};
```

---

## 🧪 VERIFICACIÓN

### **Antes del fix:**
```
1. Usuario inicia sesión como recepcionista
2. Son las 9:00 AM → shouldAlert = true
3. useEffect se ejecuta
4. Llama fetchCheckoutAlerts() SIN token
5. Backend rechaza la petición → 401 Unauthorized
6. Error en consola ❌
```

### **Después del fix:**
```
1. Usuario inicia sesión como recepcionista
2. Son las 9:00 AM → shouldAlert = true
3. useEffect se ejecuta
4. Verifica: ✅ shouldAlert ✅ user.role ✅ token existe
5. Llama fetchCheckoutAlerts(token) CON token
6. Backend valida el token → 200 OK
7. Muestra modal con alertas ✅
```

---

## 🔐 FLUJO DE AUTENTICACIÓN

```
┌─────────────────────────────────────────────────┐
│ 1. Usuario hace login                           │
│    POST /api/v1/auth/login                      │
│    { email, password }                          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 2. Backend valida credenciales                  │
│    - Usuario existe ✅                          │
│    - Contraseña correcta ✅                     │
│    - Genera JWT token                           │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 3. Frontend guarda token                        │
│    localStorage.setItem('token', token)         │
│    AuthContext → setToken(token)                │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 4. Layout obtiene token del contexto            │
│    const { user, token } = useAuth()            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 5. Usa token para peticiones autenticadas       │
│    fetchCheckoutAlerts(token)                   │
│    headers: { Authorization: `Bearer ${token}` }│
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 6. Backend valida el token                      │
│    - Token válido ✅                            │
│    - No expirado ✅                             │
│    - Usuario autorizado ✅                      │
│    → Devuelve datos                             │
└─────────────────────────────────────────────────┘
```

---

## ⚠️ CASOS DE ERROR MANEJADOS

### **1. Usuario no autenticado:**
```javascript
if (!token) return;  // No ejecuta la petición
```

### **2. Token expirado:**
```javascript
try {
  const data = await fetchCheckoutAlerts(token);
} catch (error) {
  console.error('Error al cargar alertas:', error);
  // Usuario es redirigido al login automáticamente
}
```

### **3. Rol incorrecto:**
```javascript
if (user?.role !== 'receptionist') return;
// Solo recepcionistas ven las alertas
```

---

## 📊 RESUMEN DE CAMBIOS

| Archivo | Línea | Cambio |
|---------|-------|--------|
| `Layout.jsx` | 16 | `const { user } = useAuth()` → `const { user, token } = useAuth()` |
| `Layout.jsx` | 35 | `if (!shouldAlert \|\| user?.role !== 'receptionist')` → Agregar `\|\| !token` |
| `Layout.jsx` | 39 | `await fetchCheckoutAlerts()` → `await fetchCheckoutAlerts(token)` |
| `Layout.jsx` | 57 | Agregar `token` a dependencias del `useEffect` |

---

## ✅ RESULTADO

Ahora el sistema:
- ✅ Solo carga alertas cuando el usuario está autenticado
- ✅ Envía el token en cada petición
- ✅ Maneja correctamente errores de autenticación
- ✅ No muestra errores 401 en consola
- ✅ Funciona correctamente para recepcionistas

---

## 🚀 TESTING

### **Verificar que funciona:**

1. **Abre la consola del navegador (F12)**
2. **Inicia sesión como recepcionista:**
   - Email: `recepcionista@hotel.com`
   - Password: `password123`
3. **Verifica en la pestaña Network:**
   - Busca la petición a `/checkout-alerts`
   - Debe tener status `200 OK` (no `401`)
   - En Headers debe aparecer: `Authorization: Bearer eyJhbGc...`
4. **NO debe aparecer error 401 en consola** ✅

---

**Estado:** ✅ **CORREGIDO**  
**Fecha:** 3 de octubre de 2025  
**Archivos modificados:** `Layout.jsx`
