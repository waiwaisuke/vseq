import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

test.describe('Issue #7: Feature Search & Filtering', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=My Project');
        await page.waitForTimeout(300);
        await page.click('text=addgene-plasmid.gbk');
        await page.waitForTimeout(500);
        // Switch to List view
        await page.click('button[title="Feature List"]');
        await page.waitForTimeout(300);
    });

    test('search bar filters features by name', async ({ page }) => {
        // Search for "AmpR"
        await page.fill('input[placeholder="Search features..."]', 'AmpR');
        await page.waitForTimeout(200);

        // Should show AmpR related features
        const rows = page.locator('tbody tr');
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThan(25); // Filtered down from all features

        await page.screenshot({ path: 'test/evidence/07-search-filter.png', fullPage: true });
    });

    test('filter panel shows feature types', async ({ page }) => {
        // Open filter panel
        await page.click('text=Filter');
        await page.waitForTimeout(200);

        // Should show Feature Type section
        await expect(page.locator('text=Feature Type')).toBeVisible();
        await expect(page.locator('div').filter({ hasText: /^Strand$/ })).toBeVisible();

        // Should show CDS type button
        await expect(page.locator('button:text-is("CDS")')).toBeVisible();

        await page.screenshot({ path: 'test/evidence/07-filter-panel.png', fullPage: true });
    });

    test('type filter narrows results', async ({ page }) => {
        await page.click('text=Filter');
        await page.waitForTimeout(200);

        // Click CDS type to filter
        await page.click('button:text-is("CDS")');
        await page.waitForTimeout(200);

        // All visible rows should be CDS type
        const rows = page.locator('tbody tr');
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);

        // Check that first row is CDS
        const firstType = await rows.first().locator('td').first().textContent();
        expect(firstType).toBe('CDS');

        await page.screenshot({ path: 'test/evidence/07-type-filter.png', fullPage: true });
    });

    test('sorting works on columns', async ({ page }) => {
        // Click "Length" column header to sort
        await page.click('text=Length');
        await page.waitForTimeout(200);

        // Click again for desc
        await page.click('text=Length');
        await page.waitForTimeout(200);

        await page.screenshot({ path: 'test/evidence/07-sorted.png', fullPage: true });
    });

    test('strand filter works', async ({ page }) => {
        await page.click('text=Filter');
        await page.waitForTimeout(200);

        // Click "reverse" strand filter
        await page.click('button:text-is("reverse")');
        await page.waitForTimeout(200);

        // All visible rows should show Reverse
        const strandCells = page.locator('tbody tr td:nth-child(5)');
        const count = await strandCells.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
            const text = await strandCells.nth(i).textContent();
            expect(text).toBe('Reverse');
        }

        await page.screenshot({ path: 'test/evidence/07-strand-filter.png', fullPage: true });
    });
});
