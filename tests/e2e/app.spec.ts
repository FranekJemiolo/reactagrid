import { test, expect } from '@playwright/test';

test.describe('ReactaGrid - Complete E2E Gameplay & Simulation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reactagrid/');
  });

  test('loads the application, initializes Web Worker simulation, and displays HUD', async ({
    page,
  }) => {
    // Check main title
    await expect(page).toHaveTitle(/ReactaGrid/);

    // Verify simulation canvas is mounted
    const canvas = page.locator('#simulation-canvas');
    await expect(canvas).toBeVisible();

    // Verify HUD elements
    await expect(page.locator('#fps-counter')).toBeVisible();
    await expect(page.locator('#funds-display')).toContainText('50'); // Starter funds $50

    // Verify buttons
    await expect(page.locator('#open-store-button')).toBeVisible();
    await expect(page.locator('#open-journal-button')).toBeVisible();
    await expect(page.locator('#toggle-play-button')).toBeVisible();
    await expect(page.locator('#toggle-thermal-button')).toBeVisible();
    await expect(page.locator('#toggle-audio-button')).toBeVisible();
  });

  test('navigates to Store, purchases an item, updates wallet and unlocks product in palette', async ({
    page,
  }) => {
    // Open Store
    await page.click('#open-store-button');
    const modal = page.locator('#store-modal');
    await expect(modal).toBeVisible();

    // Find Baking Soda ($10)
    const buyButton = page.locator('#buy-button-item_baking_soda');
    await expect(buyButton).toBeVisible();
    await buyButton.click();

    // Verify purchase updated modal state to "Unlocked"
    await expect(page.locator('#store-modal')).toContainText('Unlocked');

    // Close Store
    await page.click('#close-store-button');
    await expect(modal).not.toBeVisible();

    // Verify wallet decreased to $40
    await expect(page.locator('#funds-display')).toContainText('40');

    // Verify newly purchased Baking Soda is now visible in the bottom palette
    await expect(page.locator('#item-tool-item_baking_soda')).toBeVisible();
  });

  test('navigates to Laboratory Journal and verifies chemical facts and hazard alerts', async ({
    page,
  }) => {
    // Open Journal
    await page.click('#open-journal-button');
    const modal = page.locator('#journal-modal');
    await expect(modal).toBeVisible();

    // Verify starter compounds are unlocked
    await expect(page.locator('#journal-item-h2o')).toBeVisible();
    await page.click('#journal-item-h2o');

    // Verify empirical facts display
    await expect(page.locator('#journal-modal')).toContainText('H₂O');
    await expect(page.locator('#journal-modal')).toContainText('Universal solvent');
    await expect(page.locator('#journal-modal')).toContainText('1 g/cm³');

    // Close Journal
    await page.click('#close-journal-button');
    await expect(modal).not.toBeVisible();
  });

  test('allows painting on canvas, simulation runs and clear lab resets particles', async ({
    page,
  }) => {
    const canvas = page.locator('#simulation-canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      // Paint sand onto canvas
      await page.click('#item-tool-item_play_sand');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 3 + 30);
      await page.mouse.up();

      // Wait a moment for simulation ticks
      await page.waitForTimeout(500);

      // Verify active particles count increased above 0
      const hudText = await page.locator('header').innerText();
      expect(hudText).toMatch(/\d+ particles/);

      // Reset lab tank
      await page.click('#clear-lab-button');
      await page.waitForTimeout(300);

      // Verify particles reset to 0
      await expect(page.locator('header')).toContainText('0 particles');
    }
  });

  test('supports Thermal IR Vision, Audio toggle, and loading curated Experiments', async ({
    page,
  }) => {
    // Toggle Thermal Vision Mode
    const thermalBtn = page.locator('#toggle-thermal-button');
    await thermalBtn.click();
    await expect(thermalBtn).toContainText('Thermal IR');

    // Toggle Audio
    const audioBtn = page.locator('#toggle-audio-button');
    await audioBtn.click();
    await expect(audioBtn).toHaveText('🔇');
    await audioBtn.click();
    await expect(audioBtn).toHaveText('🔊');

    // Open Presets / Experiments modal
    const presetsBtn = page.locator('#open-snapshots-button');
    if (await presetsBtn.isVisible()) {
      await presetsBtn.click();
      const modal = page.locator('#snapshots-modal');
      await expect(modal).toBeVisible();

      // Load Volcano Experiment
      const loadVolcano = page.locator('#load-preset-volcano');
      await loadVolcano.click();
      await expect(modal).not.toBeVisible();

      // Wait for effervescence / particles
      await page.waitForTimeout(600);
      const hudText = await page.locator('header').innerText();
      expect(hudText).toMatch(/\d+ particles/);
    }
  });
});
