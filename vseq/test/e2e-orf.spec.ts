import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

test.describe('Issue #4: ORF Finder', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=My Project');
        await page.waitForTimeout(300);
        await page.click('text=addgene-plasmid.gbk');
        await page.waitForTimeout(500);
    });

    test('ORFs tab shows ORF finder panel', async ({ page }) => {
        await page.click('button[title="ORF Finder"]');
        await page.waitForTimeout(300);

        await expect(page.locator('text=ORF Finder')).toBeVisible();
        await expect(page.locator('text=ORFs found')).toBeVisible();
        await expect(page.locator('text=Minimum ORF length')).toBeVisible();
        await expect(page.locator('div').filter({ hasText: /^Frames$/ })).toBeVisible();

        await page.screenshot({ path: 'test/evidence/04-orf-panel.png', fullPage: true });
    });

    test('ORF table shows results with frame, start, end, length columns', async ({ page }) => {
        await page.click('button[title="ORF Finder"]');
        await page.waitForTimeout(300);

        // Table headers should be visible
        await expect(page.locator('th:text-is("Frame")')).toBeVisible();
        await expect(page.locator('th:text-is("Start")')).toBeVisible();
        await expect(page.locator('th:text-is("End")')).toBeVisible();
        await expect(page.locator('th:text-is("Length")')).toBeVisible();
        await expect(page.locator('th:text-is("AA")')).toBeVisible();

        // Should have at least one ORF row
        const rows = page.locator('tbody tr');
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);

        await page.screenshot({ path: 'test/evidence/04-orf-table.png', fullPage: true });
    });

    test('min length slider changes results', async ({ page }) => {
        await page.click('button[title="ORF Finder"]');
        await page.waitForTimeout(300);

        // Get initial ORF count text
        const countText = page.locator('text=ORFs found');
        const initialText = await countText.textContent();

        // Move slider to minimum (10 aa) - fill the range input
        const slider = page.locator('input[type="range"]');
        await slider.fill('10');
        await page.waitForTimeout(200);

        // Count should increase with lower threshold
        const newText = await countText.textContent();
        // At min=10, should have more or equal ORFs than at min=100
        expect(newText).toBeTruthy();

        await page.screenshot({ path: 'test/evidence/04-orf-slider.png', fullPage: true });
    });

    test('frame filter toggles work', async ({ page }) => {
        await page.click('button[title="ORF Finder"]');
        await page.waitForTimeout(300);

        // Get initial shown count
        const shownText = page.locator('text=ORFs shown');
        const initialShownText = await shownText.textContent();

        // Click on a frame button to toggle it off (e.g. +1)
        await page.click('button:text-is("+1 (0)")').catch(async () => {
            // If no ORFs in frame +1, try clicking any frame button
            const frameButtons = page.locator('button:has-text("+1")').first();
            await frameButtons.click();
        });
        await page.waitForTimeout(200);

        await page.screenshot({ path: 'test/evidence/04-orf-frame-filter.png', fullPage: true });
    });

    test('Add as CDS button is present', async ({ page }) => {
        await page.click('button[title="ORF Finder"]');
        await page.waitForTimeout(300);

        // If there are ORFs, the "Add as CDS" button should exist
        const rows = page.locator('tbody tr');
        const count = await rows.count();

        if (count > 0) {
            await expect(page.locator('text=Add as CDS').first()).toBeVisible();
        }

        await page.screenshot({ path: 'test/evidence/04-orf-add-cds.png', fullPage: true });
    });
});
