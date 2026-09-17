import type { Deal, Stage } from "./types.ts";
export const labels: Record<Stage, string> = {
  REQUESTED: "Interesse enviado",
  CONTACTING: "Em contato",
  AWAITING_CREATOR: "Aguardando creator",
  ACCEPTED: "Aceite confirmado",
  NEGOTIATING: "Em negociação",
  CLOSED: "Parceria fechada",
  DECLINED: "Recusada",
  CANCELLED: "Cancelada",
};
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const number = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
export const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
export const terminal = (status: Stage) =>
  ["CLOSED", "CANCELLED", "DECLINED"].includes(status);
export function budgetCents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error(
      "Informe um investimento válido, com até duas casas decimais.",
    );
  const [whole, decimal = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 100 || cents > 100000000)
    throw new Error("O investimento deve estar entre R$ 1 e R$ 1.000.000.");
  return cents;
}
export function nextStages(deal: Pick<Deal, "status" | "matchMode">): Stage[] {
  const stages: Partial<Record<Stage, Stage[]>> = {
    REQUESTED: ["CONTACTING", "CANCELLED"],
    CONTACTING:
      deal.matchMode === "MEDIATED"
        ? ["ACCEPTED", "DECLINED", "CANCELLED"]
        : ["AWAITING_CREATOR", "CANCELLED"],
    AWAITING_CREATOR: ["CANCELLED"],
    ACCEPTED: ["NEGOTIATING", "CANCELLED"],
    NEGOTIATING: ["CLOSED", "CANCELLED"],
  };
  return stages[deal.status] || [];
}
export function swipeDirection(
  dx: number,
  dy: number,
): "interest" | "skip" | null {
  if (Math.abs(dy) > 80 || Math.abs(dx) < 100) return null;
  return dx > 0 ? "interest" : "skip";
}
