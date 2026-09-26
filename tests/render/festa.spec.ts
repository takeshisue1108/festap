import { expect, test, type Page } from "@playwright/test";

// Festa canvas test (implementation design §8.2) on synthetic frames: the contact frame lands on the touch
// point anywhere in the app box, and a see-through control over Festa still receives the touch.

async function open(page: Page) {
  await page.goto("harness/harness/festa.html");
  await page.waitForFunction(() => document.title === "ready");
}

async function pixelAfterTap(page: Page, x: number, y: number, ms: number) {
  await page.touchscreen.tap(x, y);
  return page.evaluate(([px, py, t]) => (window as any).festaPixelAt(t, px, py), [x, y, ms] as const);
}

test("the contact frame's fingertip lands on the touch point, on both sides and near every corner (UX S2)", async ({ page }) => {
  await open(page);
  const { width, height } = page.viewportSize()!;
  const points = [
    [width * 0.8, height * 0.4],
    [width * 0.2, height * 0.4],
    [8, 8],
    [width - 8, 8],
    [8, height - 8],
    [width - 8, height - 8],
    [width * 0.5 + 20, height * 0.9],
  ];
  for (const [x, y] of points) {
    const p = await pixelAfterTap(page, x, y, 50);
    expect(p.frameIndex, `frame at ${x},${y}`).toBe(1);
    expect(p.rgb, `pixel at ${x},${y}`).toEqual([255, 0, 0]);
    expect(p.alpha).toBe(255);
  }
});

test("consecutive presses alternate hands, and each still lands on its own touch point", async ({ page }) => {
  await open(page);
  const { width, height } = page.viewportSize()!;
  const sides: string[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = [width * 0.8, height * (0.3 + 0.1 * i)]; // same side of her body every time
    const p = await pixelAfterTap(page, x, y, 50);
    expect(p.rgb, `tap ${i}`).toEqual([255, 0, 0]);
    sides.push(p.side);
  }
  for (let i = 1; i < sides.length; i++) expect(sides[i], `tap ${i}`).not.toBe(sides[i - 1]);
});

test("the reaction moves on from the contact frame and leaves the touch point", async ({ page }) => {
  await open(page);
  const { width, height } = page.viewportSize()!;
  const p = await pixelAfterTap(page, width * 0.2, height * 0.3, 700);
  expect(p.frameIndex).toBeGreaterThan(1);
  expect(p.rgb).not.toEqual([255, 0, 0]);
});

test("Festa is behind the controls: a see-through control on top still gets the touch (UX S3, P9)", async ({ page }) => {
  await open(page);
  const box = (await page.locator("#control").boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const p = await pixelAfterTap(page, x, y, 50);
  expect(p.rgb).toEqual([255, 0, 0]); // Festa is drawn under the control ...
  expect(await page.evaluate(() => (window as any).festaControlHits)).toBe(1); // ... and the control got the touch
  const top = await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.id, [x, y] as const);
  expect(top).toBe("control");
  const canvas = page.locator("#festa");
  await expect(canvas).toHaveCSS("pointer-events", "none");
  await expect(canvas).toHaveAttribute("aria-hidden", "true");
});
