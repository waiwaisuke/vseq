import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

test.describe('Issue #3: 6-Frame Translation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=My Project');
        await page.waitForTimeout(300);
        await page.click('text=addgene-plasmid.gbk');
        await page.waitForTimeout(500);
    });

    test('AA Frames button appears in toolbar', async ({ page }) => {
        await expect(page.locator('text=Frames')).toBeVisible();
        await page.screenshot({ path: 'test/evidence/03-frames-button.png', fullPage: true });
    });

    test('frame selection menu opens', async ({ page }) => {
        await page.click('text=Frames');
        await page.waitForTimeout(200);

        // Should show Forward and Reverse sections
        await expect(page.locator('text=Forward').first()).toBeVisible();
        await expect(page.locator('text=Reverse').first()).toBeVisible();

        // Should show frame options
        await expect(page.locator('text=Frame +1')).toBeVisible();
        await expect(page.locator('text=Frame +2')).toBeVisible();
        await expect(page.locator('text=Frame +3')).toBeVisible();
        await expect(page.locator('text=Frame -1')).toBeVisible();

        await page.screenshot({ path: 'test/evidence/03-frame-menu.png', fullPage: true });
    });

    test('enabling frame shows translation track', async ({ page }) => {
        // Open frame menu and enable Frame +1
        await page.click('text=Frames');
        await page.waitForTimeout(200);
        await page.click('text=Frame +1');
        await page.waitForTimeout(300);

        // Close menu by clicking outside
        await page.click('.font-mono.text-sm', { position: { x: 10, y: 10 } });
        await page.waitForTimeout(200);

        // Frame label should be visible
        await expect(page.locator('text=+1').first()).toBeVisible();

        await page.screenshot({ path: 'test/evidence/03-frame-enabled.png', fullPage: true });
    });

    test('enabling multiple frames shows multiple tracks', async ({ page }) => {
        // Open frame menu and enable two frames
        await page.click('text=Frames');
        await page.waitForTimeout(200);
        await page.click('text=Frame +1');
        await page.waitForTimeout(200);
        await page.click('text=Frame +2');
        await page.waitForTimeout(300);

        // Close menu by clicking the Frames button again
        await page.click('text=Frames');
        await page.waitForTimeout(500);

        // The badge should show "2"
        const button = page.locator('button').filter({ hasText: 'Frames' });
        const buttonText = await button.textContent();
        expect(buttonText).toContain('2');

        await page.screenshot({ path: 'test/evidence/03-two-frames.png', fullPage: true });
    });
});
