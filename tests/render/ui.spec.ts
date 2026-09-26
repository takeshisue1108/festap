import { expect, test, type Page } from "@playwright/test";

// UI smoke tests on the production build served under /festap/ at iPhone 13 size.

async function startApp(page: Page) {
  await page.goto("./");
  await page.getByText("Tap to start").tap();
  await expect(page.getByText("Tap to start")).toBeHidden();
}

async function tapCenter(page: Page, selector: string) {
  const box = (await page.locator(selector).first().boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

test("starts on a phone where only a finger lift may start audio (iPhone Safari and Chrome)", async ({ page }) => {
  // WebKit on iPhone refuses AudioContext.resume() during pointerdown/touchstart and allows it during
  // pointerup/touchend/click. Model that: the context starts suspended and resume() works only in those events.
  await page.addInitScript(() => {
    let gesture = false;
    for (const type of ["pointerup", "touchend", "click"]) {
      window.addEventListener(type, () => { gesture = true; setTimeout(() => (gesture = false), 0); }, { capture: true });
    }
    const Real = window.AudioContext;
    class PhoneAudioContext extends Real {
      private allowed = false;
      constructor(options?: AudioContextOptions) { super(options); void super.suspend(); }
      get state(): AudioContextState { return this.allowed ? super.state : "suspended"; }
      resume(): Promise<void> {
        if (!gesture) return Promise.reject(new DOMException("not a gesture", "NotAllowedError"));
        this.allowed = true;
        return super.resume().then(() => { this.dispatchEvent(new Event("statechange")); });
      }
    }
    (window as unknown as { AudioContext: typeof AudioContext }).AudioContext = PhoneAudioContext;
  });
  await startApp(page); // one tap on "Tap to start" must be enough
  await tapCenter(page, ".part.drum .pad");
  await expect(page.locator(".part.drum .pad")).toHaveClass(/sounding/, { timeout: 2000 });
});

test("one screen, no scroll, every region visible", async ({ page }) => {
  await startApp(page);
  const { sw, sh, w, h } = await page.evaluate(() => ({
    sw: document.scrollingElement!.scrollWidth,
    sh: document.scrollingElement!.scrollHeight,
    w: innerWidth,
    h: innerHeight,
  }));
  expect(sw).toBeLessThanOrEqual(w);
  expect(sh).toBeLessThanOrEqual(h);
  for (const sel of [".scale", ".meter", ".big-clap", ".part.drum", ".part.bass", ".keys", ".tonic", ".gesture", ".oneshot"]) {
    const box = await page.locator(sel).first().boundingBox();
    expect(box, sel).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(h + 0.5);
    expect(box!.x + box!.width).toBeLessThanOrEqual(w + 0.5);
  }
  await page.screenshot({ path: "test-results/screen-major.png" });
});

test("Major/Minor toggle turns blue and keeps the tonic (spec §4)", async ({ page }) => {
  await startApp(page);
  await tapCenter(page, ".scale .pill");
  await expect(page.locator(".scale .pill")).toHaveText("Minor");
  await expect
    .poll(() => page.locator(".scale .pill").evaluate((el) => getComputedStyle(el).backgroundColor))
    .toBe("rgb(46, 106, 209)");
  await expect(page.locator(".tonic .knob")).toHaveText("C");
  await page.screenshot({ path: "test-results/screen-minor.png" });
});

/** Screen y of the centre of keyboard key i (0 = top ド). */
async function keyCenterY(page: Page, i: number): Promise<number> {
  const b = (await page.locator(".keys .white").nth(i).boundingBox())!;
  return b.y + b.height / 2;
}

async function knobCenter(page: Page): Promise<{ x: number; y: number }> {
  await page.waitForTimeout(200); // let the snap transition finish
  const k = (await page.locator(".tonic .knob").boundingBox())!;
  return { x: k.x + k.width / 2, y: k.y + k.height / 2 };
}

test("tonic bar lines up with the keyboard: C at the top key, pitch rising downward", async ({ page }) => {
  await startApp(page);
  expect(Math.abs((await knobCenter(page)).y - (await keyCenterY(page, 0)))).toBeLessThanOrEqual(1);

  // drag to just past E's key (between E and F) and release: glides, then snaps onto E's key centre
  const x = (await knobCenter(page)).x;
  await page.mouse.move(x, (await knobCenter(page)).y);
  await page.mouse.down();
  await page.mouse.move(x, await keyCenterY(page, 1), { steps: 5 });
  await expect(page.locator(".tonic .knob")).toHaveText("D");
  const e = await keyCenterY(page, 2);
  const f = await keyCenterY(page, 3);
  await page.mouse.move(x, e + (f - e) * 0.3, { steps: 5 });
  await expect(page.locator(".tonic .knob")).toHaveText("E");
  await page.mouse.up();
  await expect(page.locator(".tonic .knob")).toHaveText("E");
  expect(Math.abs((await knobCenter(page)).y - e)).toBeLessThanOrEqual(1);

  // F# sits level with the black key between F and G
  const g = await keyCenterY(page, 4);
  await page.mouse.move(x, e);
  await page.mouse.down();
  await page.mouse.move(x, (f + g) / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(".tonic .knob")).toHaveText("F#");
  const black = (await page.locator(".keys .black").nth(2).boundingBox())!;
  expect(Math.abs((await knobCenter(page)).y - (black.y + black.height / 2))).toBeLessThanOrEqual(1);

  // the bottom key is the octave C, and the knob stays there
  await page.mouse.move(x, (f + g) / 2);
  await page.mouse.down();
  await page.mouse.move(x, (await keyCenterY(page, 7)) + 30, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(".tonic .knob")).toHaveText("C");
  expect(Math.abs((await knobCenter(page)).y - (await keyCenterY(page, 7)))).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "test-results/screen-tonic-axis.png" });
});

test("keyboard: ド … ド from the top; a key sets the chord for the current tonic (spec §17.1)", async ({ page }) => {
  await startApp(page);
  const keys = page.locator(".keys .white");
  await expect(keys).toHaveCount(8);
  await expect(keys.nth(0)).toHaveAttribute("aria-label", "ド: CM");
  await expect(keys.nth(7)).toHaveAttribute("aria-label", "ド: CM");
  await tapCenter(page, ".keys .white >> nth=1"); // レ with tonic C
  await expect(keys.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(keys.nth(1)).toContainText("Dm");
  // move the tonic to D (level with the レ key): the same key now means Em
  const k = await knobCenter(page);
  await page.mouse.move(k.x, k.y);
  await page.mouse.down();
  await page.mouse.move(k.x, await keyCenterY(page, 1), { steps: 5 });
  await page.mouse.up();
  await expect(keys.nth(1)).toContainText("Em");
  await page.screenshot({ path: "test-results/screen-keyboard.png" });
});

test("clap capture: start, taps anywhere, end → meter and BPM; controls underneath do not fire (spec §6)", async ({ page }) => {
  await startApp(page);
  await tapCenter(page, ".big-clap");
  await expect(page.locator(".big-clap")).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(400);
  await tapCenter(page, ".part.drum .auto"); // would toggle Auto if it were not captured
  await page.waitForTimeout(400);
  await tapCenter(page, ".scale .pill"); // would switch to Minor
  await page.waitForTimeout(400);
  await tapCenter(page, ".big-clap");
  await expect(page.locator(".big-clap")).toHaveAttribute("aria-pressed", "false");

  await expect(page.locator(".part.drum .auto")).toHaveAttribute("aria-checked", "false");
  await expect(page.locator(".scale .pill")).toHaveText("Major");
  await expect(page.locator(".meter .clap")).toHaveCount(3); // 4 beats = big + 3 small
  const bpm = Number(await page.locator(".meter .bpm span").textContent());
  expect(bpm).toBeGreaterThan(110); // three 400 ms gaps ≈ 150 BPM plus test-runner overhead
  expect(bpm).toBeLessThan(160);
});

test("a 101-beat capture does not break the screen (spec §7.2–7.3)", async ({ page }) => {
  await startApp(page);
  await tapCenter(page, ".big-clap");
  // ~50 ms per tap: fast, but under MAX_BPM (a faster capture is rejected by design, see next test)
  for (let i = 0; i < 99; i++) {
    await page.touchscreen.tap(60, 400);
    await page.waitForTimeout(40);
  }
  await tapCenter(page, ".big-clap");
  await expect(page.locator(".meter .clap")).toHaveCount(4);
  await expect(page.locator(".meter .clap b")).toHaveText(["25", "25", "25", "25"]);
  const sw = await page.evaluate(() => document.scrollingElement!.scrollWidth <= innerWidth);
  expect(sw).toBe(true);
  await page.screenshot({ path: "test-results/screen-101.png" });
});

test("an impossible capture (beat < 30 ms) is rejected visibly and the old tempo stays (spec §14.1)", async ({ page }) => {
  await startApp(page);
  await tapCenter(page, ".big-clap");
  await expect(page.locator(".capture")).toBeVisible();
  // 40 input claps and the end clap within a millisecond or so: beat ≪ 30 ms, independent of runner speed
  await page.evaluate(() => {
    const down = () => new PointerEvent("pointerdown", { bubbles: true, cancelable: true });
    const overlay = document.querySelector(".capture")!;
    for (let i = 0; i < 40; i++) overlay.dispatchEvent(down());
    document.querySelector(".big-clap")!.dispatchEvent(down());
  });
  await expect(page.locator(".big-clap")).toHaveClass(/rejected/);
  await expect(page.locator(".meter .bpm span")).toHaveText("120");
  await expect(page.locator(".meter .clap")).toHaveCount(3);
});

test("pads accept presses and Auto toggles; one-shots can be spammed", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await startApp(page);
  await tapCenter(page, ".part.drum .auto");
  await tapCenter(page, ".part.bass .auto");
  await expect(page.locator(".part.drum .auto")).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".part.bass .auto")).toHaveAttribute("aria-checked", "true");
  for (const sel of [".part.drum .pad", ".part.bass .pad", ".gesture >> nth=0", ".gesture >> nth=1", ".gesture >> nth=2", ".gesture >> nth=3"]) {
    await tapCenter(page, sel);
  }
  for (let i = 0; i < 20; i++) {
    await tapCenter(page, ".oneshot");
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/screen-playing.png" });
  expect(errors).toEqual([]);
});
