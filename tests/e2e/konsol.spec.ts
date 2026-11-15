import { expect, test, type Page } from "@playwright/test";

/** Galat console yang bukan dari situs ini (mis. cabang data belum ada) diabaikan. */
function catatGalat(page: Page): string[] {
  const galat: string[] = [];
  page.on("pageerror", (e) => galat.push(String(e)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const url = m.location().url ?? "";
    if (url.includes("raw.githubusercontent.com") || url.includes("openfreemap") || /favicon/.test(url)) return;
    if (/Failed to load resource/.test(m.text()) && !url.includes("127.0.0.1")) return;
    galat.push(`${m.text()} @ ${url}`);
  });
  return galat;
}

async function tungguPeta(page: Page) {
  await page.waitForFunction(() => {
    const w = window as unknown as { __peta?: { loaded(): boolean }; __kanvas?: unknown };
    return Boolean(w.__peta?.loaded() && w.__kanvas);
  }, null, { timeout: 30_000 });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("cam-lang", "id"));
});

test("halaman termuat: judul, peta, busur serangan, tanpa galat", async ({ page }) => {
  const galat = catatGalat(page);
  await page.goto("/");
  await expect(page).toHaveTitle(/Cyber Attack Map ID/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await tungguPeta(page);
  // busur muncul (snapshot bawaan punya data Cloudflare Radar)
  await page.waitForFunction(() => ((window as unknown as { __kanvas: { aktif: number } }).__kanvas.aktif ?? 0) > 0, null, { timeout: 15_000 });
  await expect(page.getByText(/THREAT INTEL/).first()).toBeVisible();
  expect(galat).toEqual([]);
});

test("gak ada scroll horizontal", async ({ page }) => {
  await page.goto("/");
  await tungguPeta(page);
  const lebar = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(lebar[0]).toBeLessThanOrEqual(lebar[1]);
});

test("modal Tentang data: penjelasan jujur + status sumber, tutup pakai Escape", async ({ page }) => {
  await page.goto("/");
  await tungguPeta(page);
  await page.getByRole("button", { name: "Tentang data" }).click();
  const dialog = page.getByRole("dialog", { name: "Tentang data ini" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("bukan rekaman serangan live");
  await expect(dialog.getByTestId("daftar-sumber").locator("li")).not.toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("ganti bahasa ke English", async ({ page }) => {
  await page.goto("/");
  await tungguPeta(page);
  await page.getByRole("button", { name: "Ganti bahasa" }).click();
  await expect(page.getByRole("button", { name: "About the data" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("filter kategori bisa dimatikan dan dinyalakan", async ({ page }) => {
  await page.goto("/");
  await tungguPeta(page);
  const chip = page.getByRole("group", { name: "Filter kategori" }).getByRole("button").first();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "false");
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
});

test("jeda animasi", async ({ page }) => {
  await page.goto("/");
  await tungguPeta(page);
  await page.getByRole("button", { name: "Jeda animasi" }).click();
  await expect(page.getByRole("button", { name: "Lanjutkan animasi" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __kanvas: { jeda: boolean } }).__kanvas.jeda)).toBe(true);
});

test.describe("desktop", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, "khusus desktop");

  test("panel kiri, kanan, tren, dan feed terisi", async ({ page }) => {
    await page.goto("/");
    await tungguPeta(page);
    await expect(page.getByTestId("panel-kiri")).toBeVisible();
    await expect(page.getByTestId("panel-kanan")).toBeVisible();
    await expect(page.getByTestId("grafik-tren")).toBeVisible();
    await expect(page.getByTestId("daftar-asal").locator("li")).not.toHaveCount(0);
    await expect(page.getByTestId("feed").locator("li").first()).toBeVisible({ timeout: 15_000 });
  });

  test("tab DDoS L3 menampilkan catatan lokasi data center", async ({ page }) => {
    await page.goto("/");
    await tungguPeta(page);
    await page.getByRole("tab", { name: "DDoS · L3" }).click();
    await expect(page.getByText(/data center Cloudflare/)).toBeVisible();
  });
});

test.describe("HP", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 1024, "khusus HP");

  test("lembar bawah: tiap tab terbuka dan muat di layar", async ({ page }) => {
    await page.goto("/");
    await tungguPeta(page);
    const lembar = page.getByTestId("lembar");
    await expect(lembar).toBeVisible();
    for (const nama of ["Asal", "Feed", "Indonesia", "Tren", "Intel"]) {
      await lembar.getByRole("tab", { name: nama }).click();
      const panel = page.getByRole("tabpanel");
      await expect(panel).toBeVisible();
      const kotak = await panel.boundingBox();
      const vp = page.viewportSize()!;
      expect(kotak!.x).toBeGreaterThanOrEqual(0);
      expect(kotak!.x + kotak!.width).toBeLessThanOrEqual(vp.width + 1);
      expect(kotak!.y + kotak!.height).toBeLessThanOrEqual(vp.height + 1);
    }
    await lembar.getByRole("button", { expanded: true }).click();
    await expect(page.getByRole("tabpanel")).toBeHidden();
  });

  test("judul dan tombol header muat tanpa kepotong tombol", async ({ page }) => {
    await page.goto("/");
    await tungguPeta(page);
    const info = await page.getByRole("button", { name: "Tentang data" }).boundingBox();
    expect(info!.x + info!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});
