import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:4173/");
});

test("test classpath preview for windows", async ({ page }) => {
  await page.getByRole("textbox", { name: "The classpath used for" }).click();
  await page.getByRole("textbox", { name: "The classpath used for" }).fill("a\nb");
  await page.getByLabel("semicolon (;) for Windows").click();

  await expect(page.locator("#preview")).toContainText("classpath = a,b"); // TODO ; ist nicht korrekt!!!!
});

test("test classpath preview for linux and macOS", async ({ page }) => {
  await page.getByRole("textbox", { name: "The classpath used for" }).click();
  await page.getByRole("textbox", { name: "The classpath used for" }).fill("a\nb");
  await page.getByLabel("colon (:) for Linux and MacOS").click();

  await expect(page.locator("#preview")).toContainText("classpath = a:b");
});
