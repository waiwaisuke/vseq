import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

test.describe('P2/P3 Features', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=My Project');
        await page.waitForTimeout(300);
        await page.click('text=addgene-plasmid.gbk');
        await page.waitForTimeout(500);
    });

    // #20 - Jump to Position
    test('Ctrl+G opens jump to position dialog', async ({ page }) => {
        await page.keyboard.press('Control+g');
        await page.waitForTimeout(300);
        await expect(page.locator('text=Jump to Position')).toBeVisible();
        await expect(page.locator('input[placeholder*="Position"]')).toBeVisible();
        await page.screenshot({ path: 'test/evidence/20-jump-dialog.png', fullPage: true });
    });

    // #13 - Sequence Operations
    test('Transform menu visible in edit mode', async ({ page }) => {
        // Enter edit mode
        await page.click('button[title="Enter Edit Mode"]');
        await page.waitForTimeout(200);
        await expect(page.locator('button[title="Sequence Operations"]')).toBeVisible();
        await page.click('button[title="Sequence Operations"]');
        await page.waitForTimeout(200);
        await expect(page.getByRole('button', { name: 'Reverse Complement' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Complement', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'UPPERCASE' })).toBeVisible();
        await page.screenshot({ path: 'test/evidence/13-transform-menu.png', fullPage: true });
    });

    // #11 - Keyboard Shortcuts
    test('? key opens keyboard shortcuts help', async ({ page }) => {
        // Click on the main view area first to ensure focus
        await page.click('.flex-1.overflow-hidden');
        await page.waitForTimeout(100);
        await page.keyboard.press('?');
        await page.waitForTimeout(300);
        await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible();
        await expect(page.locator('text=Jump to position')).toBeVisible();
        await expect(page.locator('text=Search sequence')).toBeVisible();
        await page.screenshot({ path: 'test/evidence/11-shortcuts-help.png', fullPage: true });
    });

    // #10 - NCBI BLAST
    test('BLAST button shows blastn/blastx options', async ({ page }) => {
        await expect(page.locator('button[title="NCBI BLAST"]')).toBeVisible();
        await page.click('button[title="NCBI BLAST"]');
        await page.waitForTimeout(200);
        await expect(page.locator('text=Nucleotide BLAST')).toBeVisible();
        await expect(page.locator('text=Translated BLAST')).toBeVisible();
        await page.screenshot({ path: 'test/evidence/10-blast-menu.png', fullPage: true });
    });

    // #9 - Digestion Simulation
    test('Digest tab shows digestion simulation panel', async ({ page }) => {
        await page.click('button[title="Digestion Simulation"]');
        await page.waitForTimeout(300);
        await expect(page.locator('text=Digestion Simulation')).toBeVisible();
        await expect(page.locator('text=Select enzymes to simulate digestion')).toBeVisible();
        await page.screenshot({ path: 'test/evidence/09-digest-panel.png', fullPage: true });
    });

    // #8 - Primer Design
    test('Primers tab shows primer design panel', async ({ page }) => {
        await page.click('button[title="Primer Design"]');
        await page.waitForTimeout(300);
        await expect(page.locator('text=Primer Design')).toBeVisible();
        await expect(page.locator('text=Analyze a primer')).toBeVisible();
        await expect(page.locator('text=Design Parameters')).toBeVisible();
        await page.screenshot({ path: 'test/evidence/08-primer-panel.png', fullPage: true });
    });

    // #8 - Primer Analysis
    test('Primer analysis calculates Tm and GC%', async ({ page }) => {
        await page.click('button[title="Primer Design"]');
        await page.waitForTimeout(300);
        await page.fill('input[placeholder="Paste primer sequence..."]', 'ATGCGATCGATCGATCGATCG');
        await page.waitForTimeout(200);
        await expect(page.getByText('Tm', { exact: true })).toBeVisible();
        await expect(page.getByText('GC%', { exact: true })).toBeVisible();
        await page.screenshot({ path: 'test/evidence/08-primer-analysis.png', fullPage: true });
    });

    // #12 - Pairwise Alignment
    test('Align tab shows alignment panel', async ({ page }) => {
        await page.click('button[title="Pairwise Alignment"]');
        await page.waitForTimeout(300);
        await expect(page.locator('text=Pairwise Alignment')).toBeVisible();
        await expect(page.locator('text=Paste a sequence above to align')).toBeVisible();
        await page.screenshot({ path: 'test/evidence/12-alignment-panel.png', fullPage: true });
    });

    // #18 - Codon Usage
    test('Codons tab shows codon usage panel', async ({ page }) => {
        await page.click('button[title="Codon Usage"]');
        await page.waitForTimeout(300);
        await expect(page.locator('text=Codon Usage Analysis')).toBeVisible();
        await expect(page.getByText(/^\d+ codons$/)).toBeVisible();
        await page.screenshot({ path: 'test/evidence/18-codon-usage.png', fullPage: true });
    });

    // #17 - Feature Colors
    test('Colors tab shows feature color settings', async ({ page }) => {
        await page.click('button[title="Feature Colors"]');
        await page.waitForTimeout(300);
        await expect(page.locator('text=Feature Colors')).toBeVisible();
        await expect(page.locator('text=CDS')).toBeVisible();
        await page.screenshot({ path: 'test/evidence/17-feature-colors.png', fullPage: true });
    });

    // #16 - Dark Mode
    test('Theme toggle exists in top bar', async ({ page }) => {
        const themeButton = page.locator('button[title*="Theme"]');
        await expect(themeButton).toBeVisible();
        await themeButton.click();
        await page.waitForTimeout(200);
        await page.screenshot({ path: 'test/evidence/16-theme-toggle.png', fullPage: true });
    });

    // #19 - Cloning Simulation
    test('Clone tab shows cloning simulation panel', async ({ page }) => {
        await page.click('button[title="Cloning Simulation"]');
        await page.waitForTimeout(300);
        await expect(page.locator('text=Cloning Simulation')).toBeVisible();
        await expect(page.getByText('Insert Sequence', { exact: true })).toBeVisible();
        await page.screenshot({ path: 'test/evidence/19-cloning-sim.png', fullPage: true });
    });

    // #15 - Print/Export
    test('Export menu includes Print option', async ({ page }) => {
        await page.click('button[title="Export Sequence"]');
        await page.waitForTimeout(200);
        await expect(page.locator('text=Print / PDF')).toBeVisible();
        await page.screenshot({ path: 'test/evidence/15-print-option.png', fullPage: true });
    });
});
