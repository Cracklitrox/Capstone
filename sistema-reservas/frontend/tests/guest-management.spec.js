import { test, expect } from '@playwright/test';

test.describe('Gestión de Huéspedes', () => {
  // Helper para login
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Correo Electrónico').fill('super.admin@hotel.com');
    await page.getByPlaceholder('Contraseña').fill('password123');
    await page.getByRole('button', { name: /Ingresar/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('Navegar a página de huéspedes', async ({ page }) => {
    // Click en sidebar "Huéspedes"
    await page.getByRole('link', { name: /Huéspedes/i }).click();

    // Verificar URL y contenido
    await expect(page).toHaveURL('/guests');
    await expect(page.getByRole('heading', { name: /Huéspedes/i })).toBeVisible();
  });

  test('Buscar huésped existente', async ({ page }) => {
    await page.goto('/guests');

    // Buscar por término (ej: email, nombre, RUT)
    const searchInput = page.getByPlaceholder(/Ingresa RUT, nombre, email/i);
    await searchInput.fill('super.admin@hotel.com');

    await page.getByRole('button', { name: /Buscar/i }).click();

    // Verificar que aparecen resultados
    await expect(page.getByText(/huésped/i)).toBeVisible({ timeout: 5000 });
  });

  test('Abrir modal de crear huésped', async ({ page }) => {
    await page.goto('/guests');

    // Click en botón "Nuevo Huésped"
    await page.getByRole('button', { name: /Nuevo Huésped/i }).click();

    // Verificar que el modal está abierto
    await expect(page.getByRole('heading', { name: /Nuevo Huésped/i })).toBeVisible();

    // Verificar campos obligatorios marcados con *
    await expect(page.getByText(/RUT/i)).toBeVisible();
    await expect(page.getByText(/Nombre/i)).toBeVisible();
  });

  test('Validación de RUT inválido al crear huésped', async ({ page }) => {
    await page.goto('/guests');
    await page.getByRole('button', { name: /Nuevo Huésped/i }).click();

    // Llenar con RUT inválido
    await page.getByLabel(/RUT/i).fill('12345678-0'); // DV incorrecto
    await page.getByLabel(/Nombre/i).fill('Test');
    await page.getByLabel(/Apellido Paterno/i).fill('Usuario');
    await page.getByLabel(/Email/i).fill('test@test.com');

    // Intentar enviar
    await page.getByRole('button', { name: /Crear Huésped/i }).click();

    // Verificar mensaje de error
    await expect(page.getByText(/RUT inválido/i)).toBeVisible({ timeout: 3000 });
  });

  test('Ver detalles de huésped existente', async ({ page }) => {
    await page.goto('/guests');

    // Buscar huésped
    await page.getByPlaceholder(/Ingresa RUT, nombre, email/i).fill('super.admin');
    await page.getByRole('button', { name: /Buscar/i }).click();

    // Esperar resultados y hacer click en "Ver más"
    await page.getByRole('button', { name: /Ver más/i }).first().click({ timeout: 5000 });

    // Verificar que se abre el modal de perfil
    await expect(page.getByText(/Información Personal/i)).toBeVisible({ timeout: 3000 });
  });
});
