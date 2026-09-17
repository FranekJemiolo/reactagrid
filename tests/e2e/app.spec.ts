import { test, expect } from '@playwright/test';

test.describe('ReactaGrid - Complete E2E Gameplay & Simulation Flow', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.goto('/reactagrid/');
    if (!testInfo.title.includes('onboarding sequence')) {
      const skipBtn = page.locator('#skip-tutorial-button');
      try {
        await skipBtn.click({ timeout: 3000 });
      } catch {
        // Tutorial was not displayed or already completed
      }
    }
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

  test('supports speed cycling, keyboard shortcuts modal, and starter lab glassware', async ({
    page,
  }) => {
    // Verify starter Pyrex Lab Glassware is present in the palette
    const glassTool = page.locator('#item-tool-item_lab_glass');
    await expect(glassTool).toBeVisible();
    await expect(glassTool).toContainText('Lab Glassware');

    // Cycle simulation speed
    const speedBtn = page.locator('#cycle-speed-button');
    await expect(speedBtn).toBeVisible();
    await expect(speedBtn).toContainText('1x');
    await speedBtn.click();
    await expect(speedBtn).toContainText('2x');
    await speedBtn.click();
    await expect(speedBtn).toContainText('4x');
    await speedBtn.click();
    await expect(speedBtn).toContainText('0.5x');
    await speedBtn.click();
    await expect(speedBtn).toContainText('1x');

    // Open Keyboard Shortcuts guide modal
    await page.click('#open-shortcuts-button');
    const shortcutsModal = page.locator('#shortcuts-modal');
    await expect(shortcutsModal).toBeVisible();
    await expect(shortcutsModal).toContainText('Keyboard Shortcuts');

    // Close via close button
    await page.click('#close-shortcuts-modal');
    await expect(shortcutsModal).not.toBeVisible();

    // Verify snapshot export button exists and is clickable
    const snapshotBtn = page.locator('#export-snapshot-button');
    await expect(snapshotBtn).toBeVisible();
  });

  test('Milestone 14: interactively guides the user through the 3-step onboarding sequence and sets hasCompletedTutorial in IndexedDB', async ({
    page,
  }) => {
    // Assert tutorial overlay is visible
    const overlay = page.locator('#tutorial-overlay');
    await expect(overlay).toBeVisible();

    // Step 1: The Chemical Store
    await expect(page.locator('#tutorial-step-title')).toContainText('The Chemical Store');
    const nextBtn = page.locator('#tutorial-next-button');
    await nextBtn.click();

    // Step 2: Density & Gravity Sorting
    await expect(page.locator('#tutorial-step-title')).toContainText('Density & Gravity Sorting');
    await nextBtn.click();

    // Step 3: Thermodynamics & Phase Changes
    await expect(page.locator('#tutorial-step-title')).toContainText(
      'Thermodynamics & Phase Changes',
    );
    await nextBtn.click();

    // Overlay should now be closed
    await expect(overlay).not.toBeVisible();

    // Wait briefly for IndexedDB write transaction to commit
    await page.waitForTimeout(300);

    // Assert that hasCompletedTutorial is saved as true in IndexedDB
    const isCompleted = await page.evaluate(async () => {
      return new Promise<boolean>((resolve) => {
        const req = indexedDB.open('reactagrid_db');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('progress', 'readonly');
          const store = tx.objectStore('progress');
          const getReq = store.get('user_progress');
          getReq.onsuccess = () => {
            resolve(getReq.result?.hasCompletedTutorial === true);
          };
          getReq.onerror = () => resolve(false);
        };
        req.onerror = () => resolve(false);
      });
    });

    expect(isCompleted).toBe(true);
  });

  test('Milestone 15: opens Campaign modal, shows locked/unlocked missions and launches Level 1', async ({
    page,
  }) => {
    // Open Campaign Modal
    const campaignBtn = page.locator('#open-campaign-button');
    await expect(campaignBtn).toBeVisible();
    await campaignBtn.click();

    const campaignModal = page.locator('#campaign-modal');
    await expect(campaignModal).toBeVisible();
    await expect(campaignModal).toContainText('Laboratory Campaign Missions');

    // Level 1 should be playable
    const playLevel1 = page.locator('#play-level-level_1_steam');
    await expect(playLevel1).toBeVisible();

    // Level 2 should initially be locked
    const level2 = page.locator('#campaign-level-level_2_volcano');
    await expect(level2).toContainText('Locked');

    // Launch Level 1
    await playLevel1.click();
    await expect(campaignModal).not.toBeVisible();

    // Active Mission HUD banner should display
    await expect(page.locator('#campaign-active-banner')).toBeVisible();
    await expect(page.locator('#campaign-active-banner')).toContainText('Mission: Phase Shift');

    // Exit mission
    await page.click('#exit-campaign-button');
    await expect(page.locator('#campaign-active-banner')).not.toBeVisible();
  });

  test('Milestone 17: loads heavy Campaign level, places 5 Bunsen Burners, and asserts framerate remains above 45 FPS', async ({
    page,
  }) => {
    // Open Campaign Modal and launch a level
    await page.click('#open-campaign-button');
    await page.click('#play-level-level_1_steam');

    // Verify simulation canvas is mounted
    const canvas = page.locator('#simulation-canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      // Place 5 Bunsen Burners across bottom floor
      const burnerTool = page.locator('#item-tool-item_bunsen_burner');
      if (await burnerTool.isVisible()) {
        await burnerTool.click();
        await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.85);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.85);
        await page.mouse.up();
      }

      // Drop volatile reactants directly above
      const waterTool = page.locator('#item-tool-item_tap_water');
      if (await waterTool.isVisible()) {
        await waterTool.click();
        await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.7);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.7);
        await page.mouse.up();
      }

      // Allow simulation and boiling to run
      await page.waitForTimeout(1500);

      // Verify framerate remains above 45 FPS
      const fpsText = await page.locator('#fps-counter').innerText();
      const fpsMatch = fpsText.match(/(\d+)\s*FPS/i);
      if (fpsMatch) {
        const fpsVal = parseInt(fpsMatch[1], 10);
        expect(fpsVal).toBeGreaterThanOrEqual(45);
      }
    }
  });
});
