import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

test.describe('Issue #6: Sequence Statistics Panel', () => {
    test('stats panel shows sequence info', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=My Project');
        await page.waitForTimeout(300);
        await page.click('text=addgene-plasmid.gbk');
        await page.waitForTimeout(500);

        // Click Stats tab
        await page.click('button[title="Sequence Statistics"]');
        await page.waitForTimeout(300);

        // Verify stats content
        await expect(page.locator('div').filter({ hasText: /^5,188 bp$/ })).toBeVisible();
        await expect(page.locator('text=GC Content')).toBeVisible();
        await expect(page.locator('text=Base Composition')).toBeVisible();
        await expect(page.locator('text=Molecular Weight')).toBeVisible();
        await expect(page.locator('text=Features')).toBeVisible();
        await expect(page.locator('text=ssDNA')).toBeVisible();
        await expect(page.locator('text=dsDNA')).toBeVisible();

        // Check feature types are listed
        await expect(page.locator('text=primer_bind')).toBeVisible();
        await expect(page.locator('text=CDS')).toBeVisible();

        await page.screenshot({ path: 'test/evidence/06-stats-panel.png', fullPage: true });
    });
});
