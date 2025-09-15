import { test, expect } from '@playwright/test';

test.describe('Página de Login', () => {

  test('el administrador puede iniciar sesión correctamente', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h2')).toContainText('Iniciar Sesión');

    await page.getByPlaceholder('Correo Electrónico').fill('usuario@ejemplo.com');
    await page.getByPlaceholder('Contraseña').fill('contraseña123');

    // 4. Hacer clic en el botón de login
    await page.getByRole('button', { name: 'Ingresar' }).click(); // Cambia 'Ingresar' por el texto de tu botón

    // 5. Verificar que la redirección fue exitosa
    // Espera a que la URL cambie y que aparezca un elemento de la página de Admin
    await expect(page).toHaveURL('/admin'); // O la ruta a la que redirige
    await expect(page.locator('h1')).toContainText('Resumen Hoy'); // Un texto que solo exista en la página de admin
  });
});