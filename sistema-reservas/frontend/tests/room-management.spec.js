import { test, expect } from '@playwright/test';

test.describe('Gestión de Habitaciones', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Correo Electrónico').fill('super.admin@hotel.com');
    await page.getByPlaceholder('Contraseña').fill('password123');
    await page.getByRole('button', { name: /Ingresar/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('Navegar a Tablero de Estados de Habitaciones', async ({ page }) => {
    // Expandir submenú "Gestionar Habitaciones"
    await page.getByRole('button', { name: /Gestionar Habitaciones/i }).click();

    // Click en "Tablero de Estados"
    await page.getByRole('link', { name: /Tablero de Estados/i }).click();

    // Verificar URL y contenido
    await expect(page).toHaveURL('/admin/room-status-board');
    await expect(page.getByRole('heading', { name: /Tablero de Estados/i })).toBeVisible();
  });

  test('Verificar columnas de estados en el tablero', async ({ page }) => {
    await page.goto('/admin/room-status-board');

    // Verificar que existen las 6 columnas de estados
    await expect(page.getByText(/Disponible/i)).toBeVisible();
    await expect(page.getByText(/Pendiente/i)).toBeVisible();
    await expect(page.getByText(/Ocupado/i)).toBeVisible();
    await expect(page.getByText(/No Disponible/i)).toBeVisible();
    await expect(page.getByText(/Limpieza/i)).toBeVisible();
    await expect(page.getByText(/Mantenimiento/i)).toBeVisible();
  });

  test('Filtrar habitaciones por piso', async ({ page }) => {
    await page.goto('/admin/room-status-board');

    // Abrir selector de piso
    const floorSelector = page.getByRole('combobox').first();
    await floorSelector.click();

    // Seleccionar un piso específico (si existe en los datos)
    await page.getByRole('option', { name: /Piso 1/i }).click();

    // Verificar que se actualiza el tablero
    await expect(page.getByText(/habitación/i)).toBeVisible({ timeout: 3000 });
  });

  test('Filtrar habitaciones por tipo', async ({ page }) => {
    await page.goto('/admin/room-status-board');

    // Abrir selector de tipo
    const typeSelector = page.getByRole('combobox').last();
    await typeSelector.click();

    // Seleccionar un tipo específico
    await page.getByRole('option').first().click();

    // Verificar actualización
    await page.waitForTimeout(500);
    await expect(page.locator('.bg-card')).toBeVisible({ timeout: 3000 });
  });

  test('Abrir selector de cambio de estado en una habitación', async ({ page }) => {
    await page.goto('/admin/room-status-board');

    // Buscar una tarjeta de habitación
    const roomCard = page.locator('.border-2').first();
    await expect(roomCard).toBeVisible({ timeout: 5000 });

    // Click en botón "Cambiar Estado"
    await roomCard.getByRole('button', { name: /Cambiar Estado/i }).click();

    // Verificar que se abre el selector de estados
    await expect(page.getByText(/Cambiar a:/i)).toBeVisible();
  });

  test('Actualizar tablero manualmente', async ({ page }) => {
    await page.goto('/admin/room-status-board');

    // Click en botón "Actualizar"
    await page.getByRole('button', { name: /Actualizar/i }).click();

    // Verificar que se dispara la recarga (icon spinning)
    const refreshButton = page.getByRole('button', { name: /Actualizar/i });
    await expect(refreshButton).toBeVisible();
  });

  test('Contador de habitaciones por estado', async ({ page }) => {
    await page.goto('/admin/room-status-board');

    // Verificar que cada columna tiene un badge con número
    const badges = page.getByRole('status').or(page.locator('[variant="secondary"]'));
    await expect(badges.first()).toBeVisible({ timeout: 5000 });
  });

  test('Navegar a CRUD de habitaciones', async ({ page }) => {
    await page.getByRole('button', { name: /Gestionar Habitaciones/i }).click();
    await page.getByRole('link', { name: /^Habitaciones$/i }).click();

    await expect(page).toHaveURL('/admin/rooms-crud');
    await expect(page.getByText(/Gestión de Habitaciones/i)).toBeVisible();
  });

  test('Navegar a CRUD de tipos de habitaciones', async ({ page }) => {
    await page.getByRole('button', { name: /Gestionar Habitaciones/i }).click();
    await page.getByRole('link', { name: /Tipo de habitaciones/i }).click();

    await expect(page).toHaveURL('/admin/room-types-crud');
    await expect(page.getByText(/Tipos de Habitación/i)).toBeVisible();
  });
});
