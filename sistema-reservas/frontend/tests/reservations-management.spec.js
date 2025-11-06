import { test, expect } from '@playwright/test';

test.describe('Gestión de Reservas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Correo Electrónico').fill('super.admin@hotel.com');
    await page.getByPlaceholder('Contraseña').fill('password123');
    await page.getByRole('button', { name: /Ingresar/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('Navegar a "Todas las Reservas"', async ({ page }) => {
    // Expandir submenú "Gestión de Reservas"
    await page.getByRole('button', { name: /Gestión de Reservas/i }).click();

    // Click en "Todas las Reservas"
    await page.getByRole('link', { name: /Todas las Reservas/i }).click();

    // Verificar URL y contenido
    await expect(page).toHaveURL('/reservations/manage');
    await expect(page.getByRole('heading', { name: /Todas las Reservas/i })).toBeVisible();
  });

  test('Navegar a "Check-ins Hoy"', async ({ page }) => {
    await page.getByRole('button', { name: /Gestión de Reservas/i }).click();
    await page.getByRole('link', { name: /Check-ins Hoy/i }).click();

    await expect(page).toHaveURL('/reservations/checkins-today');
    await expect(page.getByRole('heading', { name: /Check-ins Hoy/i })).toBeVisible();
  });

  test('Navegar a "Check-outs Hoy"', async ({ page }) => {
    await page.getByRole('button', { name: /Gestión de Reservas/i }).click();
    await page.getByRole('link', { name: /Check-outs Hoy/i }).click();

    await expect(page).toHaveURL('/reservations/checkouts-today');
    await expect(page.getByRole('heading', { name: /Check-outs Hoy/i })).toBeVisible();
  });

  test('Navegar a "En Progreso"', async ({ page }) => {
    await page.getByRole('button', { name: /Gestión de Reservas/i }).click();
    await page.getByRole('link', { name: /En Progreso/i }).click();

    await expect(page).toHaveURL('/reservations/in-progress');
    await expect(page.getByRole('heading', { name: /Reservas en Progreso/i })).toBeVisible();
  });

  test('Filtrar reservas por estado', async ({ page }) => {
    await page.goto('/reservations/manage');

    // Abrir selector de filtro de estado
    await page.getByRole('combobox', { name: /Filtrar por estado/i }).click();

    // Seleccionar "Confirmado"
    await page.getByRole('option', { name: /Confirmado/i }).click();

    // Verificar que se actualizan los resultados
    // (Depende de si hay reservas confirmadas en la BD)
    await expect(page.getByText(/reserva/i)).toBeVisible({ timeout: 5000 });
  });

  test('Buscar reserva por código', async ({ page }) => {
    await page.goto('/reservations/manage');

    // Buscar por código de reserva (ej: RES-001)
    const searchInput = page.getByPlaceholder(/Buscar por código/i);
    await searchInput.fill('RES');

    // Esperar resultados filtrados
    await page.waitForTimeout(1000); // Debounce

    // Verificar que aparecen cards de reservas
    await expect(page.locator('.bg-card').first()).toBeVisible({ timeout: 5000 });
  });

  test('Abrir modal de detalles de reserva', async ({ page }) => {
    await page.goto('/reservations/manage');

    // Click en la primera reserva disponible
    await page.locator('.bg-card').first().click({ timeout: 10000 });

    // Verificar que se abre el modal con tabs
    await expect(page.getByRole('tab', { name: /General/i })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('tab', { name: /Folio/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Pagos/i })).toBeVisible();
  });

  test('Navegar entre tabs del modal de reserva', async ({ page }) => {
    await page.goto('/reservations/manage');
    await page.locator('.bg-card').first().click({ timeout: 10000 });

    // Verificar tab General activo por defecto
    await expect(page.getByRole('tab', { name: /General/i })).toHaveAttribute('data-state', 'active');

    // Cambiar a tab Folio
    await page.getByRole('tab', { name: /Folio/i }).click();
    await expect(page.getByText(/Folio de Reserva/i)).toBeVisible({ timeout: 2000 });

    // Cambiar a tab Pagos
    await page.getByRole('tab', { name: /Pagos/i }).click();
    await expect(page.getByText(/Historial de Pagos/i)).toBeVisible({ timeout: 2000 });

    // Cambiar a tab Huéspedes
    await page.getByRole('tab', { name: /Huéspedes/i }).click();
    await expect(page.getByText(/Huéspedes Asignados/i)).toBeVisible({ timeout: 2000 });

    // Cambiar a tab Acciones
    await page.getByRole('tab', { name: /Acciones/i }).click();
    await expect(page.getByText(/Acciones disponibles/i)).toBeVisible({ timeout: 2000 });
  });

  test('Estadísticas de ocupación en "En Progreso"', async ({ page }) => {
    await page.goto('/reservations/in-progress');

    // Verificar que se muestra el banner de ocupación
    await expect(page.getByText(/Ocupación Actual/i)).toBeVisible();
    await expect(page.getByText(/habitaciones/i)).toBeVisible();
  });
});
