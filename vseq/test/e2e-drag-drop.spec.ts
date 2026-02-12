import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5174';

test.describe('Issue #1: Drag & Drop File Import', () => {
    test('app loads correctly', async ({ page }) => {
        await page.goto(BASE_URL);
        await expect(page.locator('text=VSEQ')).toBeVisible();
        // Take screenshot as evidence
        await page.screenshot({ path: 'test/evidence/01-app-loaded.png', fullPage: true });
    });

    test('drag overlay appears on file drag', async ({ page }) => {
        await page.goto(BASE_URL);

        // Simulate dragenter with Files type
        await page.evaluate(() => {
            const event = new DragEvent('dragenter', {
                bubbles: true,
                cancelable: true,
                dataTransfer: new DataTransfer(),
            });
            Object.defineProperty(event, 'dataTransfer', {
                value: { types: ['Files'], files: [] }
            });
            document.querySelector('.flex.flex-col.h-screen')?.dispatchEvent(event);
        });

        // Check overlay text
        const overlay = page.locator('text=Drop files here to import');
        await expect(overlay).toBeVisible({ timeout: 3000 });
        await page.screenshot({ path: 'test/evidence/01-drag-overlay.png', fullPage: true });
    });

    test('import .gbk file via file input (simulating drop result)', async ({ page }) => {
        await page.goto(BASE_URL);

        // Count initial files in sidebar
        const initialFileCount = await page.locator('.text-sm.truncate.select-none').count();

        // Use the file input as a proxy (drag-drop uses same import logic)
        const testFile = path.resolve(__dirname, 'addgene-plasmid-200458-sequence-394118.gbk');
        const fileInput = page.locator('input[type="file"][multiple]');
        await fileInput.setInputFiles(testFile);

        // Wait for the file to appear in sidebar
        await page.waitForTimeout(500);
        const newFileCount = await page.locator('.text-sm.truncate.select-none').count();
        expect(newFileCount).toBeGreaterThan(initialFileCount);

        await page.screenshot({ path: 'test/evidence/01-file-imported.png', fullPage: true });
    });
});
