# Sistema de Reservas - Hotel Don Teo

Este es el repositorio oficial del sistema de gestión de reservas. El proyecto está contenerizado con Docker para garantizar un entorno de desarrollo consistente.

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
Este comando construirá y ejecutará todos los servicios (frontend, backend, base de datos) definidos en `docker-compose.yml`.
```bash
docker-compose up --build
```
La primera vez que ejecutes este comando, Docker descargará las imágenes necesarias y construirá los contenedores, lo cual puede tardar varios minutos. Las siguientes veces será mucho más rápido.

## ✅ Verificación

Una vez que los contenedores estén corriendo, puedes verificar que todo funciona correctamente:

* **Aplicación Frontend:** Abre tu navegador y ve a `http://localhost:3000`
* **API Backend:** Abre otra pestaña y ve a `http://localhost:3001/api/test-db` para confirmar la conexión con la base de datos. Deberías ver un mensaje JSON de éxito.

## Detener el Entorno
Para detener todos los contenedores, presiona `Ctrl + C` en una nueva terminal, en la ruta donde se encuentra ubicado la carpeta `sistema-reservas`. Para eliminarlos y liberar recursos, puedes ejecutar:
```bash
docker-compose down
```
Haz esto cada vez que termines de trabajar para evitar seguir consumiendo recursos.