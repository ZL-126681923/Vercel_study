import { expect, test, type Page } from '@playwright/test';

const gameLabel = '\u5f39\u5f13\u5c0f\u9e1f Matter \u7269\u7406\u6e38\u620f';

async function openBirdGame(page: Page) {
  await page.goto('/games');
  await page.getByAltText('Boomerang mini game illustration').click();
  const runtime = page.getByLabel(gameLabel);
  await expect(runtime).toBeVisible();
  const canvas = runtime.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  return { runtime, canvas };
}

test('Phaser Matter bird game renders and launches a bird', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const { runtime, canvas } = await openBirdGame(page);
  const pixels = await canvas.evaluate((node: HTMLCanvasElement) => {
    const gl = (node.getContext('webgl2') || node.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return { opaque: 0, colors: 0 };
    const data = new Uint8Array(node.width * node.height * 4);
    gl.readPixels(0, 0, node.width, node.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
    const colors = new Set<string>();
    let opaque = 0;
    for (let i = 0; i < data.length; i += 160) {
      if (data[i + 3] > 0) opaque += 1;
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
    return { opaque, colors: colors.size };
  });
  expect(pixels.opaque).toBeGreaterThan(1000);
  expect(pixels.colors).toBeGreaterThan(0);
  const initialFrame = await canvas.screenshot();
  expect(initialFrame.byteLength).toBeGreaterThan(5_000);

  const birdOptions = page.getByLabel('\u9009\u62e9\u5c0f\u9e1f').getByRole('button');
  await birdOptions.nth(1).click();
  await expect(birdOptions.nth(1)).toHaveAttribute('aria-pressed', 'true');

  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  const start = { x: box.x + box.width * (155 / 960), y: box.y + box.height * (390 / 540) };
  const end = { x: box.x + box.width * (58 / 960), y: box.y + box.height * (435 / 540) };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await expect(runtime.locator('[data-game-state]')).toHaveAttribute('data-game-state', 'dragging');
  await page.mouse.up();
  await expect(runtime.locator('[data-game-state]')).toHaveAttribute('data-game-state', 'flying');
  await expect(runtime.locator('[data-game-state]')).toHaveAttribute('data-launch-velocity', /.+,.+/);
  const releasedPosition = await runtime.locator('[data-game-state]').getAttribute('data-bird-position');
  await page.waitForTimeout(350);
  const movingPosition = await runtime.locator('[data-game-state]').getAttribute('data-bird-position');
  expect(movingPosition).not.toBe(releasedPosition);
  await birdOptions.nth(1).click();
  await expect(runtime.locator('[data-game-state]')).toHaveAttribute('data-skill-used', 'yellow');
  const state = runtime.locator('[data-game-state]');
  await expect(state).toHaveAttribute('data-pig-type', 'rookie');
  await expect(page.getByRole('button', { name: '快速发射' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '释放技能' })).toHaveCount(0);


  await runtime.screenshot({ path: 'test-results/phaser-bird-desktop.png' });
  expect(errors).toEqual([]);
});



test('clicking the loaded bird launches with a default trajectory', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const { runtime, canvas } = await openBirdGame(page);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');

  const bird = {
    x: box.x + box.width * (155 / 960),
    y: box.y + box.height * (390 / 540),
  };
  await page.mouse.click(bird.x, bird.y);

  const state = runtime.locator('[data-game-state]');
  await expect(state).toHaveAttribute('data-game-state', 'flying');
  await expect(state).toHaveAttribute('data-launch-velocity', /.+,.+/);
  const releasedPosition = await state.getAttribute('data-bird-position');
  await page.waitForTimeout(300);
  await expect.poll(async () => state.getAttribute('data-bird-position')).not.toBe(releasedPosition);
  await expect.poll(
    async () => Number(await state.getAttribute('data-bird-block-impacts')),
    { timeout: 5_000 },
  ).toBeGreaterThan(0);
  await expect.poll(
    async () => Number(await state.getAttribute('data-blocks-moved')),
    { timeout: 5_000 },
  ).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
test('Phaser Matter bird game fits a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { runtime, canvas } = await openBirdGame(page);
  const runtimeBox = await runtime.boundingBox();
  const canvasBox = await canvas.boundingBox();
  expect(runtimeBox).not.toBeNull();
  expect(canvasBox).not.toBeNull();
  expect(runtimeBox!.x + runtimeBox!.width).toBeLessThanOrEqual(390);
  expect(canvasBox!.width).toBeGreaterThan(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await runtime.screenshot({ path: 'test-results/phaser-bird-mobile.png' });
});

test('Phaser Matter scene can unmount and mount again without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await openBirdGame(page);
  await page.getByRole('button', { name: '\u8fd4\u56de\u6e38\u620f\u5217\u8868' }).click();
  await expect(page.getByAltText('Boomerang mini game illustration')).toBeVisible();
  await page.getByAltText('Boomerang mini game illustration').click();
  await expect(page.getByLabel(gameLabel).locator('canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(500);

  expect(errors).toEqual([]);
});
