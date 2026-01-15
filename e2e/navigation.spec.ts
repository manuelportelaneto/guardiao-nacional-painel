import { test, expect } from '@playwright/test';

/**
 * E2E Test: Navigation Flow
 * 
 * Tests the main navigation and page structure
 */

test.describe('Navigation', () => {
    test('should have proper page title', async ({ page }) => {
        await page.goto('/');

        // Check page title
        await expect(page).toHaveTitle(/Painel|Guardião|Admin/);
    });

    test('should show login page for unauthenticated users', async ({ page }) => {
        // Try to access protected route
        await page.goto('/admin');

        // Should redirect to login
        await expect(page).toHaveURL('/');
    });

    test('should have accessible login form elements', async ({ page }) => {
        await page.goto('/');

        // Check form elements are accessible
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        const submitButton = page.locator('button[type="submit"]');

        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(submitButton).toBeVisible();
    });
});
