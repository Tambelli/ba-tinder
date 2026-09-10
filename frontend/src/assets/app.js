import {
  labels,
  money,
  number,
  escapeHtml as h,
  budgetCents,
  nextStages,
} from "./domain.js";

const app = document.querySelector("#app");
let session,
  creators = [],
  deals = [],
  skipped = new Set(),
  view = "discover",
  filters = {},
  busy = false;
const states = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
const productNiches = [
  "Beleza",
  "Esporte",
  "Alimentos",
  "Eletrônicos",
  "Vestuário",
  "Turismo",
];
const creatorNiches = [
  "Lifestyle",
  "Fitness",
  "Gastronomia",
  "Tecnologia",
  "Moda",
  "Viagem",
];
const icons = { discover: "◈", deals: "↗", ops: "▤" };
function toast(text, error = false) {
  const el = document.querySelector("#toast");
  el.textContent = text;
  el.className = error ? "show error" : "show";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.className = ""), 5500);
}
async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !(options.body instanceof URLSearchParams))
    headers["Content-Type"] = "application/json";
  if (options.method && options.method !== "GET")
    headers["X-CSRF-TOKEN"] = session.csrfToken;
  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (!response.ok) {
    if (response.status === 401 && path !== "/login") {
      session = await (await fetch("/api/session")).json();
      login();
      throw new Error("Sua sessão expirou. Entre novamente.");
    }
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.message ||
        {
          401: "Usuário ou senha incorretos.",
          403: "Ação não permitida. Atualize a página e tente novamente.",
        }[response.status] ||
        "Não foi possível concluir. Tente novamente.",
    );
  }
  return response.status === 204 ? null : response.json();
}
async function run(task) {
  if (busy) return;
  busy = true;
  try {
    await task();
  } catch (e) {
    toast(e.message, true);
  } finally {
    busy = false;
  }
}
function brand() {
  return '<a class="brand" href="/" aria-label="GoInsiders início"><span class="brand-mark">g<span>i</span></span> goinsiders<span class="brand-dot">®</span></a>';
}
function login() {
  app.innerHTML = `<main class="login"><section class="login-story">${brand()}<div><span class="eyebrow">GOINSIDERS MATCH</span><h1>Boas marcas.<br>Creators certos.<br><em>Conexões reais.</em></h1><p>Um encontro com potencial.<br>Uma equipe para fazer acontecer.</p></div><span class="small">Curadoria humana. Afinidade de verdade.</span></section><section class="login-form"><div class="login-box"><span class="eyebrow">SEU PRÓXIMO MATCH COMEÇA AQUI</span><h2>Vamos conectar?</h2><p class="muted">Entre para encontrar creators e acompanhar suas negociações.</p><form id="login-form"><label>Usuário<input name="username" autocomplete="username" required placeholder="Seu usuário"></label><label>Senha<input name="password" type="password" autocomplete="current-password" required placeholder="Sua senha"></label><button class="primary" type="submit">Entrar <span>↗</span></button><p id="login-error" role="alert"></p></form>${session.demo ? `<aside class="demo"><strong>Ambiente de demonstração</strong><p>Perfis e métricas fictícios. Escolha um acesso para explorar:</p><div class="demo-buttons"><button data-demo="marca">Marca</button><button data-demo="operacao">Operação</button><button data-demo="creator">Creator</button></div><small>Usuário: marca, operacao ou creator.<br>Senha: demo-{usuário}-2026.</small></aside>` : ""}</div></section></main>`;
  document.querySelectorAll("[data-demo]").forEach(
    (button) =>
      (button.onclick = () => {
        const form = document.querySelector("#login-form");
        form.username.value = button.dataset.demo;
        form.password.value = `demo-${button.dataset.demo}-2026`;
        form.requestSubmit();
      }),
  );
  document.querySelector("#login-form").onsubmit = (event) => {
    event.preventDefault();
    run(async () => {
      const button = event.target.querySelector("[type=submit]");
      button.disabled = true;
      try {
        await api("/login", {
          method: "POST",
          body: new URLSearchParams(new FormData(event.target)),
        });
        session = await api("/session");
        view =
          session.role === "BRAND"
            ? "discover"
            : session.role === "OPS"
              ? "ops"
              : "deals";
        await reload();
      } catch (e) {
        document.querySelector("#login-error").textContent = e.message;
      } finally {
        button.disabled = false;
      }
    });
  };
}
function select(name, options, placeholder) {
  return `<select name="${name}"><option value="">${placeholder}</option>${options.map((o) => `<option ${filters[name] === o ? "selected" : ""} value="${h(o)}">${h(o)}</option>`).join("")}</select>`;
}
function shell(content) {
  const roleLabel = {
    BRAND: "Área da marca",
    OPS: "Operação GoInsiders",
    CREATOR: "Área do creator",
  }[session.role];
  app.innerHTML = `<header>${brand()}<nav aria-label="Principal">${session.role === "BRAND" ? `<button data-view="discover" class="${view === "discover" ? "active" : ""}">${icons.discover} Descobrir</button>` : ""}<button data-view="${session.role === "OPS" ? "ops" : "deals"}" class="${view !== "discover" ? "active" : ""}">${icons.deals} ${session.role === "OPS" ? "Fila operacional" : session.role === "CREATOR" ? "Meus convites" : "Meus interesses"} <span class="count">${deals.length}</span></button></nav><div class="account"><span class="avatar mini">${h(session.username[0].toUpperCase())}</span><div><strong>${h(session.username)}</strong><small>${roleLabel}</small></div><button class="text-button" id="logout">Sair</button></div></header>${session.demo ? '<div class="demo-bar">DEMONSTRAÇÃO · Perfis e métricas fictícios · Nenhum contato ou pagamento é enviado</div>' : ""}<main class="workspace">${content}</main><footer><strong>goinsiders match</strong><span>Do primeiro interesse à parceria, a gente acompanha.</span><span>Matchmaking com intermediação humana ↗</span></footer>`;
  document.querySelectorAll("[data-view]").forEach(
    (b) =>
      (b.onclick = () => {
        view = b.dataset.view;
        render();
      }),
  );
  document.querySelector("#logout").onclick = () =>
    run(async () => {
      await api("/logout", { method: "POST" });
      session = await api("/session");
      creators = [];
      deals = [];
      skipped.clear();
      filters = {};
      login();
    });
}
function available() {
  const selected = new Set(deals.map((d) => d.creator.id));
  return creators.filter((c) => !skipped.has(c.id) && !selected.has(c.id));
}
function render() {
  if (!session.authenticated) return login();
  if (view === "discover") discover();
  else negotiations();
}
function discover() {
  const candidates = available(),
    c = candidates[0];
  shell(
    `<section class="page-heading"><div><span class="eyebrow">ENCONTRE SUA PRÓXIMA PARCERIA</span><h1>Afinidade primeiro.<br><span>O match vem depois.</span></h1><p class="muted">Você escolhe quem faz sentido. A GoInsiders cuida da conexão.</p></div><span class="service-tag"><span class="green-dot"></span> Curadoria & intermediação</span></section><div class="discovery-layout"><aside class="filters panel"><div class="section-title"><h2>Seu match ideal</h2><span>⌕</span></div><p class="muted small">Refine a busca para encontrar afinidade.</p><form id="filters"><label>Nicho do produto${select("productNiche", productNiches, "Todos os produtos")}</label><label>Nicho do creator${select("creatorNiche", creatorNiches, "Todos os nichos")}</label><label>Estado${select("state", states, "Todo o Brasil")}</label><fieldset><legend>Seguidores</legend><div class="input-row"><label class="sr-only" for="min-followers">Mínimo de seguidores</label><input id="min-followers" name="minFollowers" type="number" min="0" max="1000000000" placeholder="Mínimo" value="${h(filters.minFollowers || "")}"><span>–</span><label class="sr-only" for="max-followers">Máximo de seguidores</label><input id="max-followers" name="maxFollowers" type="number" min="0" max="1000000000" placeholder="Máximo" value="${h(filters.maxFollowers || "")}"></div></fieldset><fieldset><legend>Engajamento (%)</legend><div class="input-row"><label class="sr-only" for="min-engagement">Engajamento mínimo</label><input id="min-engagement" name="minEngagement" type="number" min="0" max="100" step="0.1" placeholder="Mínimo" value="${h(filters.minEngagement || "")}"><span>–</span><label class="sr-only" for="max-engagement">Engajamento máximo</label><input id="max-engagement" name="maxEngagement" type="number" min="0" max="100" step="0.1" placeholder="Máximo" value="${h(filters.maxEngagement || "")}"></div></fieldset><button class="primary full">Encontrar creators <span>→</span></button><button class="text-button full" type="button" id="clear-filters">Limpar filtros</button></form></aside><section class="match-area"><div class="results-line"><strong>${candidates.length} creators para descobrir</strong><span>Maior engajamento primeiro</span></div>${
      c
        ? `<article class="creator-card" id="swipe-card"><div class="creator-art ${h(c.color)}"><span class="art-label">${h(c.creatorNiche)}<br><small>CREATOR PROFILE</small></span><div class="art-rings"></div><span class="monogram">${h(
            c.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join(""),
          )}</span><span class="location">↗ ${h(c.city)}, ${h(c.state)}</span></div><div class="creator-content"><div class="creator-heading"><div><h2>${h(c.name)}</h2><span class="muted">${h(c.handle)}</span></div><span class="pill">${h(c.creatorNiche)}</span></div><p class="bio">${h(c.bio)}</p><div class="metrics"><div><strong>${number(c.followers)}</strong><span>seguidores</span></div><div><strong>${c.engagement.toLocaleString("pt-BR")}<small>%</small></strong><span>engajamento</span></div><div><strong>${h(c.state)}</strong><span>localização</span></div></div><div class="affinity"><span>↳</span> Afinidade com produtos de <strong>${h(c.productNiche.toLowerCase())}</strong></div></div></article><div class="swipe-actions"><button id="skip" class="skip"><span>×</span> Pular por agora</button><button id="interest" class="primary"><span>♡</span> Tenho interesse</button></div><p class="swipe-hint">Arraste o card para a direita para demonstrar interesse.<br>O envio abre um briefing antes da confirmação.</p>`
        : `<div class="empty panel"><span>◈</span><h2>${creators.length ? "Você viu todos por aqui." : "Nenhum creator com esses filtros."}</h2><p>Experimente ampliar sua busca ou revisitar os perfis que pulou.</p><button class="primary" id="restart">Revisitar perfis</button></div>`
    }</section><aside class="concierge"><div class="concierge-icon">✳</div><span class="eyebrow">SEU TIME DE CONEXÕES</span><h2>Você dá o match.<br>A gente aproxima.</h2><p>Uma equipe dedicada transforma seu interesse em uma conversa com propósito.</p><ol><li><span>01</span><div><strong>Encontre afinidade</strong><p>Filtre e conheça os creators.</p></div></li><li><span>02</span><div><strong>Demonstre interesse</strong><p>Conte sua ideia e investimento.</p></div></li><li><span>03</span><div><strong>Deixe com a GoInsiders</strong><p>Contato, aceite e negociação acompanhados.</p></div></li></ol><div class="commission-note"><strong>30<span>%</span></strong><p>de comissão GoInsiders<br>${session.commissionMode === "INCLUDED" ? "incluída no investimento total." : "adicionada ao investimento em mídia."}</p></div><small>Modelo de negociação direta, separado de campanhas abertas e valores por post.</small></aside></div>`,
  );
  document.querySelector("#filters").onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      const next = Object.fromEntries(
        [...new FormData(e.target)].filter(([, v]) => v !== ""),
      );
      const result = await api("/creators?" + new URLSearchParams(next));
      filters = next;
      creators = result;
      skipped.clear();
      render();
    });
  };
  document.querySelector("#clear-filters").onclick = () =>
    run(async () => {
      const result = await api("/creators");
      filters = {};
      skipped.clear();
      creators = result;
      render();
    });
  if (c) {
    document.querySelector("#skip").onclick = () => {
      skipped.add(c.id);
      render();
    };
    document.querySelector("#interest").onclick = () => interest(c);
    let start;
    const card = document.querySelector("#swipe-card");
    card.onpointerdown = (e) => {
      if (e.button === 0) start = { x: e.clientX, y: e.clientY };
    };
    card.onpointercancel = () => (start = null);
    card.onpointerup = (e) => {
      if (!start) return;
      const dx = e.clientX - start.x,
        dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dy) < 80) {
        if (dx > 85) interest(c);
        else if (dx < -85) {
          skipped.add(c.id);
          render();
        }
      }
    };
  } else
    document.querySelector("#restart").onclick = () => {
      skipped.clear();
      render();
    };
}
function dialog(content) {
  document.querySelector("dialog")?.remove();
  const el = document.createElement("dialog");
  el.innerHTML = `<button class="dialog-close" aria-label="Fechar">×</button>${content}`;
  document.body.append(el);
  el.querySelector(".dialog-close").onclick = () => el.close();
  el.addEventListener("close", () => el.remove());
  el.showModal();
  return el;
}
function interest(c) {
  const el = dialog(
    `<span class="eyebrow">UM BOM ENCONTRO COMEÇA COM UMA IDEIA</span><h2>Vamos conectar sua marca<br>a ${h(c.name.split(" ")[0])}?</h2><p class="muted">A GoInsiders recebe seu briefing e coordena os próximos passos.</p><form id="interest-form"><label>${session.commissionMode === "INCLUDED" ? "Investimento total" : "Investimento em mídia"} (R$)<input name="budget" type="number" min="1" max="1000000" step="0.01" value="10000" required></label><div id="quote" class="quote" aria-live="polite">Calculando valores…</div><label>Conte sua ideia<textarea name="brief" maxlength="1500" rows="4" required placeholder="Produto, objetivo, entregas desejadas e prazo da parceria…"></textarea></label><p class="small muted">O interesse não confirma a contratação nem realiza cobrança. ${session.matchMode === "MEDIATED" ? "A equipe registrará o aceite do creator." : "O creator também precisará aprovar o convite no app."}</p><button class="primary full" type="submit">Enviar interesse <span>↗</span></button></form>`,
  );
  const form = el.querySelector("form");
  let quoteId = 0;
  async function quote() {
    const current = ++quoteId;
    try {
      const q = await api(
        "/quote?budgetCents=" + budgetCents(form.budget.value),
      );
      if (current === quoteId)
        el.querySelector("#quote").innerHTML =
          `<div><span>Execução / creator</span><strong>${money(q.executionCents)}</strong></div><div><span>GoInsiders · 30%</span><strong>${money(q.commissionCents)}</strong></div><div><span>Total da marca</span><strong>${money(q.totalCents)}</strong></div>`;
    } catch (e) {
      if (current === quoteId)
        el.querySelector("#quote").textContent = e.message;
    }
  }
  form.budget.oninput = quote;
  quote();
  form.onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      const button = form.querySelector("[type=submit]");
      button.disabled = true;
      try {
        await api("/deals", {
          method: "POST",
          body: JSON.stringify({
            creatorId: c.id,
            budgetCents: budgetCents(form.budget.value),
            brief: form.brief.value,
          }),
        });
        el.close();
        await reload();
        toast("Interesse enviado. Agora a GoInsiders acompanha sua conexão.");
      } finally {
        button.disabled = false;
      }
    });
  };
}
function negotiations() {
  const ops = session.role === "OPS";
  const active = deals.filter(
    (d) => !["CLOSED", "CANCELLED", "DECLINED"].includes(d.status),
  );
  shell(
    `<section class="page-heading"><div><span class="eyebrow">${ops ? "INTERMEDIAÇÃO HUMANA, DO INÍCIO AO FIM" : "CADA CONEXÃO TEM UMA HISTÓRIA"}</span><h1>${ops ? "Conexões em movimento." : session.role === "CREATOR" ? "Seus próximos encontros." : "Seus interesses."}</h1><p class="muted">${ops ? "Assuma o contato, registre o aceite e acompanhe cada negociação." : "Acompanhe os próximos passos com a GoInsiders."}</p></div><button id="refresh" class="secondary">↻ Atualizar</button></section><div class="summary"><div><span>Em acompanhamento</span><strong>${active.length}</strong></div><div><span>Parcerias fechadas</span><strong>${deals.filter((d) => d.status === "CLOSED").length}</strong></div><div><span>${ops ? "Comissão em parcerias fechadas" : "Total em parcerias fechadas"}</span><strong>${money(deals.filter((d) => d.status === "CLOSED").reduce((sum, d) => sum + (ops ? d.commissionCents : d.totalCents), 0))}</strong></div></div><section class="deal-list">${
      deals.length
        ? deals
            .map(
              (d) =>
                `<article class="deal panel"><div class="deal-profile"><span class="avatar ${h(d.creator.color)}">${h(
                  d.creator.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join(""),
                )}</span><div><h2>${h(d.creator.name)}</h2><span class="muted small">${h(d.creator.creatorNiche)} · ${h(d.creator.state)}${ops ? " · Marca: " + h(d.brandId) : ""}</span></div><span class="status ${h(d.status.toLowerCase())}">${h(labels[d.status])}</span></div><p class="deal-brief">${h(d.brief)}</p><div class="deal-bottom"><span>Total <strong>${money(d.totalCents)}</strong></span><span>Comissão <strong>${money(d.commissionCents)}</strong></span><span>Responsável <strong>${h(d.owner || "Aguardando atribuição")}</strong></span><button class="secondary" data-deal="${h(d.id)}">${ops ? "Gerenciar" : "Ver detalhes"} →</button></div></article>`,
            )
            .join("")
        : `<div class="empty panel"><span>↗</span><h2>${session.role === "CREATOR" ? "Nenhum convite por enquanto." : "As próximas conexões aparecem aqui."}</h2><p>${session.role === "BRAND" ? "Descubra creators e envie seu primeiro interesse." : session.role === "CREATOR" ? "Os convites aparecem após a equipe iniciar a intermediação, quando o aceite no app está habilitado." : "Os interesses das marcas entrarão nesta fila."}</p>${session.role === "BRAND" ? '<button class="primary" id="go-discover">Descobrir creators</button>' : ""}</div>`
    }</section>`,
  );
  document.querySelector("#refresh").onclick = () => run(reload);
  document.querySelector("#go-discover")?.addEventListener("click", () => {
    view = "discover";
    render();
  });
  document
    .querySelectorAll("[data-deal]")
    .forEach(
      (b) =>
        (b.onclick = () => detail(deals.find((d) => d.id === b.dataset.deal))),
    );
}
function detail(d) {
  const stages = nextStages(d),
    ops = session.role === "OPS",
    creator = session.role === "CREATOR" && d.status === "AWAITING_CREATOR";
  const el = dialog(
    `<span class="eyebrow">ACOMPANHAMENTO DA CONEXÃO</span><h2>${h(d.creator.name)}</h2><span class="status ${h(d.status.toLowerCase())}">${h(labels[d.status])}</span><p class="deal-brief">${h(d.brief)}</p><div class="quote"><div><span>Execução / creator</span><strong>${money(d.executionCents)}</strong></div><div><span>Comissão GoInsiders</span><strong>${money(d.commissionCents)}</strong></div><div><span>Total da marca</span><strong>${money(d.totalCents)}</strong></div></div><p class="small muted">Comissão ${d.commissionMode === "INCLUDED" ? "incluída no total" : "adicionada à mídia"} · ${d.matchMode === "MEDIATED" ? "Aceite intermediado pela equipe" : "Dupla aprovação no app"}</p><h3>Histórico</h3><ol class="timeline">${d.events.map((e) => `<li><strong>${h(labels[e.status])}</strong><p>${h(e.note)}</p><small>${h(e.actor)} · ${new Date(e.createdAt).toLocaleString("pt-BR")}</small></li>`).join("")}</ol>${ops && stages.length ? `<form id="update-form"><h3>Próximo passo</h3><label>Responsável comercial<input name="owner" required maxlength="100" value="${h(d.owner || "")}" placeholder="Nome de quem acompanha"></label><label>Nova etapa<select name="status">${stages.map((s) => `<option value="${s}">${labels[s]}</option>`).join("")}</select></label><label>Registro da operação<textarea name="note" required maxlength="1000" rows="3" placeholder="Registre o contato e, em caso de aceite, a evidência da concordância do creator."></textarea></label><button class="primary full">Registrar etapa →</button></form>` : ""}${creator ? '<form id="decision-form"><label>Sua resposta<textarea name="note" required maxlength="1000" rows="3" placeholder="Disponibilidade, condições ou motivo da recusa…"></textarea></label><div class="input-row"><button class="secondary" name="decision" value="false">Recusar</button><button class="primary" name="decision" value="true">Aceitar convite</button></div></form>' : ""}`,
  );
  el.querySelector("#update-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    run(async () => {
      await api("/ops/deals/" + d.id, {
        method: "PATCH",
        body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
      });
      el.close();
      await reload();
      toast("Etapa registrada no histórico.");
    });
  });
  el.querySelector("#decision-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const accepted = e.submitter.value === "true";
    run(async () => {
      await api("/creator/deals/" + d.id + "/decision", {
        method: "POST",
        body: JSON.stringify({ accepted, note: e.target.note.value }),
      });
      el.close();
      await reload();
      toast("Sua resposta foi registrada.");
    });
  });
}
async function reload() {
  const results = await Promise.all([
    api("/creators?" + new URLSearchParams(filters)),
    api("/deals"),
  ]);
  [creators, deals] = results;
  render();
}
async function start() {
  try {
    session = await api("/session");
    if (session.authenticated) {
      view =
        session.role === "BRAND"
          ? "discover"
          : session.role === "OPS"
            ? "ops"
            : "deals";
      await reload();
    } else login();
  } catch (e) {
    app.innerHTML = `<main class="empty"><h1>Não foi possível conectar.</h1><p>Verifique se o backend está em execução e tente novamente.</p><button class="primary" id="retry">Tentar novamente</button></main>`;
    document.querySelector("#retry").onclick = start;
  }
}
start();
