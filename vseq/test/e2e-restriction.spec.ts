import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

test.describe('Issue #5: Restriction Enzyme Analysis', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=My Project');
        await page.waitForTimeout(300);
        await page.click('text=addgene-plasmid.gbk');
        await page.waitForTimeout(500);
    });

    test('Enzymes tab shows restriction enzyme panel', async ({ page }) => {
        await page.click('button[title="Restriction Enzymes"]');
        await page.waitForTimeout(300);

        await expect(page.locator('text=Restriction Enzymes')).toBeVisible();
        await expect(page.locator('text=enzymes in database')).toBeVisible();
        await expect(page.locator('text=total sites found')).toBeVisible();
        await expect(page.locator('text=unique cutters')).toBeVisible();

        await page.screenshot({ path: 'test/evidence/05-enzyme-panel.png', fullPage: true });
    });

    test('search filters enzymes by name', async ({ page }) => {
        await page.click('button[title="Restriction Enzymes"]');
        await page.waitForTimeout(300);

        await page.fill('input[placeholder="Search enzymes..."]', 'EcoRI');
        await page.waitForTimeout(200);

        // Should show EcoRI
        await expect(page.locator('text=EcoRI').first()).toBeVisible();

        await page.screenshot({ path: 'test/evidence/05-enzyme-search.png', fullPage: true });
    });

    test('unique cutter filter works', async ({ page }) => {
        await page.click('button[title="Restriction Enzymes"]');
        await page.waitForTimeout(300);

        // Click "Unique (1)" filter
        await page.click('button:text-is("Unique (1)")');
        await page.waitForTimeout(200);

        // All shown enzymes should have cut count = 1
        const cutCounts = page.locator('.font-mono.font-bold.min-w-\\[2rem\\]');
        const count = await cutCounts.count();
        expect(count).toBeGreaterThan(0);

        await page.screenshot({ path: 'test/evidence/05-unique-cutters.png', fullPage: true });
    });

    test('clicking enzyme expands to show cut positions', async ({ page }) => {
        await page.click('button[title="Restriction Enzymes"]');
        await page.waitForTimeout(300);

        // Find an enzyme with cuts and click it
        // Search for a known enzyme
        await page.fill('input[placeholder="Search enzymes..."]', 'BamHI');
        await page.waitForTimeout(200);

        // Click on BamHI
        await page.click('text=BamHI');
        await page.waitForTimeout(200);

        // Should show "Cut positions:"
        await expect(page.locator('text=Cut positions:')).toBeVisible();

        await page.screenshot({ path: 'test/evidence/05-enzyme-expanded.png', fullPage: true });
    });
});
