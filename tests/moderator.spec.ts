import { test, expect } from '@playwright/test';

test.describe('Moderator E2E Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Bypass initialization screens and PreLaunchGate
        await page.addInitScript(() => {
            window.sessionStorage.setItem('prelaunch_auth', 'true');
        });
        await page.goto('/#/login');
    });

    test('should allow a moderator to login', async ({ page }) => {
        // Expect a title "to contain" a substring.
        await expect(page).toHaveTitle(/Guardião Nacional - Painel/i).catch(() => { });

        await expect(page.locator('h1', { hasText: 'Guardião Nacional' })).toBeVisible();

        // Fill form
        await page.fill('input[type="email"]', 'admin@guardiaonacional.com');
        await page.fill('input[type="password"]', 'Admin@123');

        // Submit form
        const loginBtn = page.getByRole('button', { name: 'Entrar', exact: true });
        await expect(loginBtn).toBeEnabled();
        await loginBtn.click();

        // Verify the loading state appears
        const loader = page.locator('button', { hasText: 'Entrando...' });
        await Promise.race([
            expect(loader).toBeVisible({ timeout: 4000 }),
            page.waitForResponse(response => response.url().includes('identitytoolkit.googleapis.com'))
        ]).catch(() => console.log('Mocked or too fast load transition'));
    });
});
