import { test, expect } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'http://localhost:5174';

test.describe('Issue #2: File Export', () => {
    test('export menu appears when clicking download button', async ({ page }) => {
        await page.goto(BASE_URL);

        // Click on My Project folder to expand, then click a file
        await page.click('text=My Project');
        await page.waitForTimeout(300);

        // Click addgene-plasmid.gbk to open it
        await page.click('text=addgene-plasmid.gbk');
        await page.waitForTimeout(500);

        // Now look for the download button in the toolbar
        const downloadBtn = page.locator('button[title="Export Sequence"]');
        await expect(downloadBtn).toBeVisible();

        // Click it to open the menu
        await downloadBtn.click();

        // Check menu items
        await expect(page.locator('text=Export as GenBank (.gb)')).toBeVisible();
        await expect(page.locator('text=Export as FASTA (.fasta)')).toBeVisible();

        await page.screenshot({ path: 'test/evidence/02-export-menu.png', fullPage: true });
    });

    test('export GenBank triggers download', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=My Project');
        await page.waitForTimeout(300);
        await page.click('text=addgene-plasmid.gbk');
        await page.waitForTimeout(500);

        const downloadBtn = page.locator('button[title="Export Sequence"]');
        await downloadBtn.click();

        // Listen for download
        const downloadPromise = page.waitForEvent('download');
        await page.click('text=Export as GenBank (.gb)');
        const download = await downloadPromise;

        // Verify filename
        expect(download.suggestedFilename()).toMatch(/\.gb$/);

        // Read content and verify it's valid GenBank
        const content = await download.path().then(p => fs.readFileSync(p!, 'utf-8'));
        expect(content).toContain('LOCUS');
        expect(content).toContain('ORIGIN');
        expect(content).toContain('//');

        await page.screenshot({ path: 'test/evidence/02-export-genbank.png', fullPage: true });
    });

    test('export FASTA triggers download', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=My Project');
        await page.waitForTimeout(300);
        await page.click('text=addgene-plasmid.gbk');
        await page.waitForTimeout(500);

        const downloadBtn = page.locator('button[title="Export Sequence"]');
        await downloadBtn.click();

        const downloadPromise = page.waitForEvent('download');
        await page.click('text=Export as FASTA (.fasta)');
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toMatch(/\.fasta$/);

        const content = await download.path().then(p => fs.readFileSync(p!, 'utf-8'));
        expect(content).toMatch(/^>/);
        expect(content.split('\n').length).toBeGreaterThan(1);

        await page.screenshot({ path: 'test/evidence/02-export-fasta.png', fullPage: true });
    });
});
