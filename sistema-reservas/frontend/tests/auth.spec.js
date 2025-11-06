import { test, expect } from '@playwright/test';

test.describe('Autenticación', () => {
  test('Administrador puede iniciar sesión correctamente', async ({ page }) => {
    // Navegar a la página de login
    await page.goto('/login');

    // Verificar que estamos en la página de login
    await expect(page.locator('h2')).toContainText('Iniciar Sesión');

    // Llenar credenciales (del seed.js)
    await page.getByPlaceholder('Correo Electrónico').fill('super.admin@hotel.com');
    await page.getByPlaceholder('Contraseña').fill('password123');

    // Click en botón de login
    await page.getByRole('button', { name: /Ingresar/i }).click();

    // Verificar redirección al dashboard
    await expect(page).toHaveURL('/');

    // Verificar que el sidebar está visible con el nombre del hotel
    await expect(page.getByText('Hotel Don Teo')).toBeVisible();
  });

  test('Recepcionista puede iniciar sesión correctamente', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Correo Electrónico').fill('carlos.recepcionista@hotel.com');
    await page.getByPlaceholder('Contraseña').fill('password123');

    await page.getByRole('button', { name: /Ingresar/i }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByText('Hotel Don Teo')).toBeVisible();
  });

  test('Credenciales incorrectas muestran error', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Correo Electrónico').fill('usuario@invalido.com');
    await page.getByPlaceholder('Contraseña').fill('wrongpassword');

    await page.getByRole('button', { name: /Ingresar/i }).click();

    // Verificar que sigue en login (no redirige)
    await expect(page).toHaveURL('/login');

    // Verificar mensaje de error (toast o alert)
    await expect(page.getByText(/Credenciales inválidas/i)).toBeVisible({ timeout: 3000 });
  });

  test('Usuario puede cerrar sesión', async ({ page }) => {
    // Login primero
    await page.goto('/login');
    await page.getByPlaceholder('Correo Electrónico').fill('super.admin@hotel.com');
    await page.getByPlaceholder('Contraseña').fill('password123');
    await page.getByRole('button', { name: /Ingresar/i }).click();

    await expect(page).toHaveURL('/');

    // Buscar y hacer click en el botón de logout (puede estar en un menú desplegable)
    // Ajustar selector según implementación real
    await page.getByRole('button', { name: /Cerrar Sesión/i }).click();

    // Verificar redirección a login
    await expect(page).toHaveURL('/login');
  });
});
