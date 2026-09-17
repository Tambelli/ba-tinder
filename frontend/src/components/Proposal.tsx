import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "../api";
import { budgetCents, money } from "../domain";
import type { Creator, Quote, Session } from "../types";
import { ErrorBox, Icon, Modal } from "./UI";
export function Proposal({
  creator,
  session,
  onClose,
  onSent,
}: {
  creator: Creator;
  session: Session;
  onClose: () => void;
  onSent: () => void;
}) {
  const [budget, setBudget] = useState("10000");
  const [brief, setBrief] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setQuote(null);
    setQuoteError("");
    const timer = setTimeout(async () => {
      try {
        const value = budgetCents(budget);
        const q = await api<Quote>(`/quote?budgetCents=${value}`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setQuote(q);
      } catch (e) {
        if (!controller.signal.aborted) setQuoteError(errorMessage(e));
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [budget]);
  const currentQuote =
    quote?.budgetCents ===
    (() => {
      try {
        return budgetCents(budget);
      } catch {
        return -1;
      }
    })()
      ? quote
      : null;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending.current || !currentQuote) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      await api("/deals", {
        method: "POST",
        body: JSON.stringify({
          creatorId: creator.id,
          budgetCents: budgetCents(budget),
          brief: brief.trim(),
        }),
      });
      onSent();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`Uma ideia para ${creator.name.split(" ")[0]}.`}
      onClose={onClose}
      busy={busy}
    >
      <p className="muted">
        Conte o que você imagina. A GoInsiders recebe seu interesse e acompanha
        os próximos passos.
      </p>
      <form onSubmit={submit}>
        <label>
          {session.commissionMode === "INCLUDED"
            ? "Investimento total"
            : "Investimento em mídia"}{" "}
          (R$)
          <input
            autoFocus
            type="number"
            min="1"
            max="1000000"
            step="0.01"
            required
            value={budget}
            disabled={busy}
            onChange={(e) => setBudget(e.target.value)}
          />
        </label>
        <div className="quote" aria-live="polite">
          {currentQuote ? (
            <>
              <div>
                <span>Execução / creator</span>
                <strong>{money(currentQuote.executionCents)}</strong>
              </div>
              <div>
                <span>GoInsiders · 30%</span>
                <strong>{money(currentQuote.commissionCents)}</strong>
              </div>
              <div>
                <span>Total da marca</span>
                <strong>{money(currentQuote.totalCents)}</strong>
              </div>
            </>
          ) : (
            <p>{quoteError || "Calculando valores…"}</p>
          )}
          <small>
            Comissão{" "}
            {session.commissionMode === "INCLUDED"
              ? "incluída no investimento total"
              : "adicionada ao investimento em mídia"}
            .
          </small>
        </div>
        <label>
          Qual é a sua ideia?
          <textarea
            rows={4}
            minLength={1}
            maxLength={1500}
            required
            disabled={busy}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Produto, objetivo, entregas desejadas e prazo…"
          />
          <span className="field-hint">{brief.length}/1500 caracteres</span>
        </label>
        <p className="disclaimer">
          O envio não confirma contratação nem realiza cobrança.{" "}
          {session.matchMode === "MEDIATED"
            ? "A equipe obtém e registra a concordância do creator."
            : "O creator também precisa aceitar o convite no app."}
        </p>
        <ErrorBox message={error} />
        <button
          className="primary full"
          disabled={busy || !currentQuote || !brief.trim()}
        >
          {busy ? "Enviando…" : "Enviar interesse"}
          <Icon name="arrow" />
        </button>
      </form>
    </Modal>
  );
}
