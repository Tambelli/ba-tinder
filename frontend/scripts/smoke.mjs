// Run only against an isolated local demo database. This creates a negotiation.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const origin = process.env.SMOKE_URL || "http://127.0.0.1:8080";
assert.ok(
  ["127.0.0.1", "localhost"].includes(new URL(origin).hostname),
  "Smoke test requires a local demo server.",
);
await mkdir(new URL("../test-results/", import.meta.url), { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin);
  await page.getByRole("button", { name: "Sou marca" }).click();
  await page
    .getByRole("button", { name: "Tenho interesse", exact: true })
    .waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: new URL(
      "../test-results/live-desktop.png",
      import.meta.url,
    ).pathname.replace(/^\/(\w:)/, "$1"),
    fullPage: true,
  });
  const creatorName = await page.locator(".card-identity h2").innerText();
  await page
    .getByRole("button", { name: "Tenho interesse", exact: true })
    .click();
  await page.getByLabel("Investimento total (R$)").fill("17500.37");
  await page.getByText("R$ 5.250,11", { exact: true }).waitFor();
  await page
    .getByLabel("Qual é a sua ideia?")
    .fill(
      "Validação local: lançamento de produto e vídeo com direitos e prazo a negociar.",
    );
  await page.getByRole("button", { name: "Enviar interesse" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("link", { name: /Conexões/ }).click();
  await page.getByRole("heading", { name: creatorName, exact: true }).waitFor();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.getByRole("button", { name: "Sou operação" }).click();
  for (const [stage, note] of [
    ["CONTACTING", "Contato iniciado no teste local."],
    ["ACCEPTED", "Aceite fictício registrado por telefone no teste local."],
    ["NEGOTIATING", "Entregas e prazo em negociação no teste."],
    ["CLOSED", "Condições confirmadas apenas para validação local."],
  ]) {
    await page.getByRole("button", { name: "Ver detalhes" }).first().click();
    await page.getByLabel("Etapa").selectOption(stage);
    await page.getByLabel("Registro para o histórico").fill(note);
    await page.getByRole("button", { name: "Registrar etapa" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  }
  await page.getByText("Parceria fechada", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.getByRole("button", { name: "Sou marca" }).click();
  await page.getByRole("link", { name: /Conexões/ }).click();
  await page.getByText("Parceria fechada", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Ver detalhes" }).first().click();
  assert.equal(await page.locator(".timeline li").count(), 5);
  await page.getByText("R$ 12.250,26", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.screenshot({
    path: new URL(
      "../test-results/live-connections.png",
      import.meta.url,
    ).pathname.replace(/^\/(\w:)/, "$1"),
    fullPage: true,
  });
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  mobile.on("pageerror", (error) => errors.push(error.message));
  await mobile.goto(origin);
  await mobile.getByRole("button", { name: "Sou marca" }).click();
  await mobile
    .getByRole("button", { name: "Tenho interesse", exact: true })
    .waitFor();
  await mobile.evaluate(() => document.fonts.ready);
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await mobile.screenshot({
    path: new URL(
      "../test-results/live-mobile.png",
      import.meta.url,
    ).pathname.replace(/^\/(\w:)/, "$1"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: real Java API, session/CSRF, exact quote, interest, mediated workflow, history and responsive layout.",
  );
} finally {
  await browser.close();
}
