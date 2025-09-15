# Sistema de Reservas - Hotel Don Teo ![Coverage](https://codecov.io/github/Cracklitrox/Capstone/coverage.svg?token=JNX1J56MH0)

Este es el repositorio oficial del sistema de gestión de reservas. El proyecto está contenerizado con Docker para garantizar un entorno de desarrollo consistente.

## Tecnologías Utilizadas 🛠️
* Backend: Node.js, Express, Prisma
* Frontend: React
* Base de Datos: PostgreSQL
* Contenerización: Docker, Docker Compose
* Testing: Vitest, Playwright, Supertest


## Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:
* [Node.js (LTS)](https://nodejs.org/) - Usar el instalador `.msi` en Windows.
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* [Git](https://git-scm.com/)

## ⚙️ Puesta en Marcha del Entorno

Sigue estos pasos para levantar el proyecto en tu máquina local.

### 1. Clonar el Repositorio
Abre tu terminal y clona el proyecto desde GitHub.
```bash
git clone https://github.com/Cracklitrox/Capstone.git
cd sistema-reservas
```

### 2. Configurar Variables de Entorno
El proyecto utiliza archivos `.env` para gestionar las credenciales.

### Para Docker
Copia el archivo de ejemplo para el entorno de Docker.

Los valores por defecto están listos para usar.
```bash
cp backend/.env.example backend/.env
```

### Para Desarrollo Local (Opcional)
Si vas a desarrollar activamente en el backend, crea también una copia para tu entorno local.
```bash
cp backend/.env.example backend/.env.development
```

**Nota:** Los valores en este archivo son estándar para todo el equipo de desarrollo. No es necesario modificarlos.

### 3. Levantar los Contenedores
Este comando construirá y ejecutará todos los servicios (frontend, backend, base de datos) en segundo plano `(-d)`.
```bash
docker compose up -d --build
```
La primera vez que ejecutes este comando, Docker descargará las imágenes necesarias y construirá los contenedores, lo cual puede tardar varios minutos. Las siguientes veces será mucho más rápido.


## 🚀 Ejecutar el Proyecto
Tienes dos opciones para levantar el proyecto, elige la que mejor se adapte a tus necesidades.

## Opción 1: Ejecutar Todo con Docker (Recomendado para empezar)
Este método levanta todo el sistema (Frontend, Backend, Base de Datos, Redis) en contenedores.
Es la forma más rápida y sencilla de ver la aplicación funcionando.
### Levantar los Contenedores:
Ejecuta este comando desde la raiz del proyecto `./sistema-reservas`. Este comando construirá las imágenes, iniciará todos los servicios y aplicará las migraciones de la base de datos automáticamente.
```bash
docker-compose up --build
```
**Nota:** Puedes añadir `-d` para ejecutarlo en segundo plano.

### ✅ Verificación

Una vez que los contenedores estén corriendo, puedes verificar que todo funciona correctamente:

* **Aplicación Frontend:** Abre tu navegador y ve a `http://localhost:5173`
* **API Backend**: Abre otra pestaña y ve a http://localhost:3001/test. Deberías ver el mensaje Hello Test!.


## Opción 2: Desarrollo Local del Backend (Entorno Híbrido)
Este método es ideal si estás trabajando activamente en el código del backend.
Correrás el servidor de Node.js en tu máquina local y los servicios de apoyo (PostgreSQL, Redis) en Docker.
### Levantar Dependencias en Docker:
Ejecuta este comando desde la raiz del proyecto `./sistema-reservas`. Inicia solo la base de datos y Redis.
```bash
docker-compose up -d db redis
```

### Preparar el Backend:
Abre una nueva terminal y navega a la carpeta del `./backend`.
```bash
cd backend
npm install
```

### Ejecutar la Migración de la Base de Datos:
Crea las tablas en la base de datos por primera vez.
```bash
npm run migrate:dev -- --name init
```

### Iniciar el Servidor de Desarrollo:
Esto iniciará tu servidor con `nodemon`, que se reiniciará automáticamente con cada cambio que hagas en el código.
```bash
npm run dev
```

### ✅ Verificación
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

### 3. Ejecuta los tests con Vitest
```bash
# Para correr los tests en modo interactivo (watch)
npm test

# Para generar el reporte de cobertura de código
npm run coverage
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

### 3. Ejecuta los tests con Vitest
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