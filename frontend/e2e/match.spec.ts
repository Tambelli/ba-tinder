import { test, expect, type Page } from "@playwright/test";
const catalog = [
  {
    id: 1,
    name: "Marina Costa",
    handle: "@marina.exemplo",
    creatorNiche: "Lifestyle",
    productNiche: "Beleza",
    state: "SP",
    city: "São Paulo",
    followers: 128000,
    engagement: 5.8,
    bio: "Rotina real, beleza consciente e conversas que aproximam. Uma comunidade que participa.",
    color: "rose",
  },
  {
    id: 2,
    name: "Lucas Ribeiro",
    handle: "@lucas.exemplo",
    creatorNiche: "Fitness",
    productNiche: "Esporte",
    state: "RJ",
    city: "Rio de Janeiro",
    followers: 86000,
    engagement: 5.2,
    bio: "Movimento para todos os dias. Treinos acessíveis e corrida de rua.",
    color: "lime",
  },
];
async function setup(
  page: Page,
  role = "BRAND",
  authenticated = true,
  initialDeals: any[] = [],
) {
  let logged = authenticated;
  const deals = [...initialDeals];
  const requests: any[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const json = (body: any, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path === "/api/session")
      return json({
        authenticated: logged,
        username:
          role === "OPS"
            ? "operacao"
            : role === "CREATOR"
              ? "creator"
              : "marca",
        role: logged ? role : "",
        csrfToken: "test-token",
        demo: true,
        matchMode: "MEDIATED",
        commissionMode: "INCLUDED",
      });
    if (path === "/api/login") {
      expect(request.headers()["x-csrf-token"]).toBe("test-token");
      logged = true;
      return route.fulfill({ status: 204 });
    }
    if (path === "/api/logout") {
      logged = false;
      return route.fulfill({ status: 204 });
    }
    if (!logged) return json({}, 401);
    if (path === "/api/creators")
      return json(
        catalog.filter(
          (c) =>
            !url.searchParams.get("state") ||
            c.state === url.searchParams.get("state"),
        ),
      );
    if (path === "/api/quote") {
      const budgetCents = Number(url.searchParams.get("budgetCents"));
      return json({
        budgetCents,
        commissionCents: Math.round(budgetCents * 0.3),
        executionCents: budgetCents - Math.round(budgetCents * 0.3),
        totalCents: budgetCents,
        commissionMode: "INCLUDED",
      });
    }
    if (path === "/api/deals" && method === "GET") return json(deals);
    if (path === "/api/deals" && method === "POST") {
      const body = request.postDataJSON();
      requests.push(body);
      expect(request.headers()["x-csrf-token"]).toBe("test-token");
      const d = {
        ...body,
        id: "deal-1",
        brandId: "marca",
        creator: catalog.find((c) => c.id === body.creatorId),
        status: "REQUESTED",
        commissionMode: "INCLUDED",
        matchMode: "MEDIATED",
        commissionCents: 300000,
        executionCents: 700000,
        totalCents: body.budgetCents,
        owner: null,
        events: [],
      };
      deals.push(d);
      return json(d, 201);
    }
    if (path.startsWith("/api/ops/deals/") || path.endsWith("/decision")) {
      requests.push(request.postDataJSON());
      return json({});
    }
    return json({ message: "Rota inesperada" }, 404);
  });
  await page.goto("/");
  return requests;
}
async function showFilters(page: Page) {
  const toggle = page.getByRole("button", { name: /Filtros/ });
  if (await toggle.isVisible()) await toggle.click();
}
test("descoberta, desfazer e filtros funcionam sem overflow", async ({
  page,
}, info) => {
  await setup(page);
  await expect(
    page.getByRole("heading", { name: "Marina Costa" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Pular creator", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lucas Ribeiro" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Desfazer último perfil pulado" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Marina Costa" }),
  ).toBeVisible();
  await showFilters(page);
  await page.getByLabel("Localização · UF").selectOption("RJ");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(
    page.getByRole("heading", { name: "Lucas Ribeiro" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/discovery-${info.project.name}.png`,
    fullPage: true,
  });
});
test("interesse exige briefing, mostra comissão e aparece nas conexões", async ({
  page,
}) => {
  const requests = await setup(page);
  await page
    .getByRole("button", { name: "Tenho interesse", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("R$ 3.000,00", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enviar interesse" }),
  ).toBeDisabled();
  await page
    .getByLabel("Qual é a sua ideia?")
    .fill("Vídeo sobre a nova linha de produtos, para outubro.");
  await page.getByRole("button", { name: "Enviar interesse" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(requests).toHaveLength(1);
  expect(requests[0].budgetCents).toBe(1000000);
  await page.getByRole("link", { name: /Conexões/ }).click();
  await expect(
    page.getByText("Interesse enviado", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver detalhes" }).click();
  await expect(
    page.getByRole("heading", { name: "Histórico da conexão" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Registrar etapa" }),
  ).toHaveCount(0);
});
test("cancelar briefing não envia interesse", async ({
  page,
}) => {
  const requests = await setup(page);
  await page
    .getByRole("button", { name: "Tenho interesse", exact: true })
    .click();
  await page
    .getByLabel("Qual é a sua ideia?")
    .fill("<img src=x onerror=alert(1)>");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  expect(requests).toHaveLength(0);
  await expect(
    page.getByRole("heading", { name: "Marina Costa" }),
  ).toBeVisible();
});
test("demo login e logout limpam a área autenticada", async ({ page }) => {
  await setup(page, "BRAND", false);
  await page.getByRole("button", { name: "Sou marca" }).click();
  await expect(
    page.getByRole("heading", { name: "Marina Costa" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(
    page.getByRole("button", { name: "Entrar na minha conta" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Marina Costa" })).toHaveCount(
    0,
  );
});
test("falha de rede pode ser recuperada sem perder navegação", async ({
  page,
}) => {
  await setup(page);
  await expect(
    page.getByRole("heading", { name: "Marina Costa" }),
  ).toBeVisible();
  await page.route("**/api/creators?*", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: '{"message":"Falha temporária"}',
    }),
  );
  await showFilters(page);
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.getByRole("alert")).toContainText("Falha temporária");
  await page.unroute("**/api/creators?*");
  await page.getByRole("button", { name: "Tentar carregar novamente" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
const pending = {
  id: "deal-1",
  brandId: "marca",
  creator: catalog[0],
  budgetCents: 1000000,
  totalCents: 1000000,
  executionCents: 700000,
  commissionCents: 300000,
  commissionMode: "INCLUDED",
  matchMode: "DOUBLE_OPT_IN",
  status: "CONTACTING",
  brief: "Uma parceria para outubro",
  owner: "Equipe",
  events: [
    {
      status: "REQUESTED",
      note: "Briefing recebido",
      actor: "marca",
      createdAt: "2026-09-16T12:00:00Z",
    },
  ],
};
test("operação respeita dupla aprovação e registra responsável", async ({
  page,
}) => {
  const requests = await setup(page, "OPS", true, [pending]);
  await page.getByRole("button", { name: "Ver detalhes" }).click();
  await expect(
    page.getByLabel("Etapa").getByRole("option", { name: "Aceite confirmado" }),
  ).toHaveCount(0);
  await page.getByLabel("Etapa").selectOption("AWAITING_CREATOR");
  await page
    .getByLabel("Registro para o histórico")
    .fill("Convite preparado após contato.");
  await page.getByRole("button", { name: "Registrar etapa" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(requests[0]).toMatchObject({
    status: "AWAITING_CREATOR",
    owner: "Equipe",
  });
});
test("creator responde seu convite", async ({ page }) => {
  const requests = await setup(page, "CREATOR", true, [
    { ...pending, status: "AWAITING_CREATOR" },
  ]);
  await expect(page.getByRole("link", { name: "Descobrir" })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver detalhes" }).click();
  await page
    .getByLabel("Sua resposta")
    .fill("Tenho interesse em conversar sobre as entregas.");
  await page.getByRole("button", { name: "Aceitar convite" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(requests[0].accepted).toBe(true);
});
