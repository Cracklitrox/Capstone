# Sistema de Reservas - Hotel Don Teo ![Coverage](https://codecov.io/github/Cracklitrox/Capstone/coverage.svg?token=JNX1J56MH0)

Este es el repositorio oficial del sistema de gestión de reservas. El proyecto está contenerizado con Docker para garantizar un entorno de desarrollo consistente.

## Tecnologías Utilizadas 🛠️
* Backend: Node.js, Express, Prisma
* Frontend: React
* Base de Datos: PostgreSQL
* Contenerización: Docker, Docker Compose
* Testing: Jest, Supertest


## Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:
* [Node.js (LTS)](https://nodejs.org/) - Usar el instalador `.msi` en Windows.
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* [Git](https://git-scm.com/)

## ⚙️ Puesta en Marcha del Entorno de Desarrollo

Sigue estos pasos para levantar el proyecto en tu máquina local.

### 1. Clonar el Repositorio
Abre tu terminal y clona el proyecto desde GitHub.
```bash
git clone https://github.com/Cracklitrox/Capstone.git
cd sistema-reservas
```

### 2. Crear el Archivo de Configuración del Backend
El backend necesita un archivo `.env` para obtener las credenciales de la base de datos. Puedes crearlo copiando el archivo de ejemplo.
```bash
cp backend/.env.example backend/.env
```
**Nota:** Los valores en este archivo son estándar para todo el equipo de desarrollo. No es necesario modificarlos.

### 3. Levantar los Contenedores
Este comando construirá y ejecutará todos los servicios (frontend, backend, base de datos) en segundo plano `(-d)`.
```bash
docker compose up -d --build
```
La primera vez que ejecutes este comando, Docker descargará las imágenes necesarias y construirá los contenedores, lo cual puede tardar varios minutos. Las siguientes veces será mucho más rápido.

## ✅ Verificación

Una vez que los contenedores estén corriendo, puedes verificar que todo funciona correctamente:

* **Aplicación Frontend:** Abre tu navegador y ve a `http://localhost:3000`
* **API Backend**: Abre otra pestaña y ve a http://localhost:3001/test. Deberías ver el mensaje Hello Test!.

## 🧪 Ejecutar las Pruebas
Para asegurar la calidad y el correcto funcionamiento del backend, puedes ejecutar la suite de pruebas automatizadas.

### Backend

### 1. Asegúrate de que los contenedores estén corriendo
```bash
docker compose ps
```
(Deberías ver los tres servicios: frontend_client, backend_api y db_postgres con el estado Up).

### 2. Navega a la carpeta del backend e instala las dependencias (solo si es la primera vez).
```bash
cd backend
npm install
```

### 3. Ejecuta los tests con Jest
```bash
npm test
```
Deberías ver un resultado indicando que todas las pruebas pasaron exitosamente.


## Frontend

### 1. Asegúrate de que los contenedores estén corriendo
```bash
docker compose ps
```
(Deberías ver los tres servicios: frontend_client, backend_api y db_postgres con el estado Up).

### 2. Navega a la carpeta del frontend e instala las dependencias (solo si es la primera vez).
```bash
cd frontend
npm install
```

### 3. Ejecuta los tests con Jest
```bash
npm test
```
Deberías ver un resultado indicando que todas las pruebas pasaron exitosamente.

## 🛑 Detener el Entorno
Para detener todos los contenedores, presiona `Ctrl + C` en una nueva terminal, en la ruta donde se encuentra ubicado la carpeta `sistema-reservas`. Para eliminarlos y liberar recursos, puedes ejecutar:
```bash
docker-compose down
```
Haz esto cada vez que termines de trabajar para evitar seguir consumiendo recursos.

## 📊 Cobertura de Código

Este proyecto utiliza Codecov para medir la cobertura de pruebas.

Puedes ver el reporte completo en: [Codecov Dashboard](https://app.codecov.io/gh/Cracklitrox/Capstone)                                  
