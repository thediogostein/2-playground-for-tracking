import { test, expect } from "@playwright/test";

const BASE = process.env.TEST_URL || "https://playground-for-tracking.pages.dev";

test.describe("Formulário de Contato", () => {
  test("fluxo completo — formulário único até /obrigado", async ({ page }) => {
    await page.route("**/api/contact", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });
    await page.goto(`${BASE}/contact`);
    await page.waitForTimeout(2000); // espera React carregar

    // Todos os campos devem estar visíveis na mesma página.
    await expect(page.locator('input[placeholder*="Digite seu nome"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="(11)"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="seu@email"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Nome da sua empresa"]')).toBeVisible();
    await expect(page.locator('select[name="revenue"]')).toBeVisible();

    await page.fill('input[placeholder*="Digite seu nome"]', "Maria Teste");
    await page.fill('input[placeholder*="(11)"]', "11988887777");
    await page.fill('input[placeholder*="seu@email"]', "maria@teste.com");
    await page.fill('input[placeholder*="Nome da sua empresa"]', "Empresa Teste");
    await page.locator('select[name="revenue"]').selectOption("ate-10k");
    await expect(page.locator('select[name="revenue"]')).toHaveValue("ate-10k");
    await page.click('button:has-text("Enviar dados")');

    await page.waitForURL("**/obrigado", { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Obrigado pelo contato!" })).toBeVisible();
  });

  test("validação — nome muito curto mostra erro", async ({ page }) => {
    await page.goto(`${BASE}/contact`);
    await page.waitForTimeout(2000);

    const nameInput = page.locator('input[placeholder*="Digite seu nome"]');
    await nameInput.fill("A");
    await nameInput.blur();

    await expect(page.getByText("Mínimo 2 caracteres.")).toBeVisible();
  });

  test("validação — email inválido mostra erro", async ({ page }) => {
    await page.goto(`${BASE}/contact`);
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[placeholder*="seu@email"]');
    await emailInput.fill("nao-e-email");
    await emailInput.blur();

    await expect(page.getByText("E-mail inválido.")).toBeVisible();
  });
});
