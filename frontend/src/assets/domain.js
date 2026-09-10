export const labels = {
  REQUESTED: "Interesse enviado",
  CONTACTING: "Em contato",
  AWAITING_CREATOR: "Aguardando creator",
  ACCEPTED: "Aceite confirmado",
  NEGOTIATING: "Em negociação",
  CLOSED: "Fechada",
  DECLINED: "Recusada",
  CANCELLED: "Cancelada",
};
export const money = (cents) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const number = (value) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function budgetCents(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value)))
    throw new Error(
      "Informe um investimento válido, com até duas casas decimais.",
    );
  const [whole, decimal = ""] = String(value).split(".");
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 100 || cents > 100000000)
    throw new Error("O investimento deve estar entre R$ 1 e R$ 1.000.000.");
  return cents;
}
export function nextStages(deal) {
  return (
    {
      REQUESTED: ["CONTACTING", "CANCELLED"],
      CONTACTING:
        deal.matchMode === "MEDIATED"
          ? ["ACCEPTED", "DECLINED", "CANCELLED"]
          : ["AWAITING_CREATOR", "CANCELLED"],
      AWAITING_CREATOR: ["CANCELLED"],
      ACCEPTED: ["NEGOTIATING", "CANCELLED"],
      NEGOTIATING: ["CLOSED", "CANCELLED"],
    }[deal.status] || []
  );
}
