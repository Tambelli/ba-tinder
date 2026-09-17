import { useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "../api";
import type { Deal, Session, Stage } from "../types";
import { initials, labels, money, nextStages, terminal } from "../domain";
import { ErrorBox, Icon, Modal } from "./UI";
export function Negotiations({
  deals,
  session,
  loading,
  refresh,
}: {
  deals: Deal[];
  session: Session;
  loading: boolean;
  refresh: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<Deal | null>(null);
  const active = deals.filter((d) => !terminal(d.status));
  const closed = deals.filter((d) => d.status === "CLOSED");
  const ops = session.role === "OPS";
  const visible = deals.filter(
    (d) =>
      filter === "all" ||
      (filter === "active" ? !terminal(d.status) : terminal(d.status)),
  );
  return (
    <>
      <section className="page-heading">
        <div>
          <span className="eyebrow">DO PRIMEIRO INTERESSE À PARCERIA</span>
          <h1>
            {ops
              ? "Conexões em movimento."
              : session.role === "CREATOR"
                ? "Ideias para criar junto."
                : "Suas próximas possibilidades."}
          </h1>
          <p>
            {ops
              ? "Organize contatos, registre decisões e acompanhe cada negociação."
              : "Cada conexão tem uma história. Acompanhe a sua por aqui."}
          </p>
        </div>
        <button className="secondary" onClick={refresh} disabled={loading}>
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </section>
      <section className="summary">
        <div>
          <span>Em acompanhamento</span>
          <strong>{active.length.toString().padStart(2, "0")}</strong>
        </div>
        <div>
          <span>Parcerias fechadas</span>
          <strong>{closed.length.toString().padStart(2, "0")}</strong>
        </div>
        <div>
          <span>
            {ops
              ? "Comissão em parcerias fechadas"
              : "Total em parcerias fechadas"}
          </span>
          <strong>
            {money(
              closed.reduce(
                (sum, d) => sum + (ops ? d.commissionCents : d.totalCents),
                0,
              ),
            )}
          </strong>
        </div>
      </section>
      <div
        className="list-toolbar"
        role="group"
        aria-label="Filtrar negociações"
      >
        {[
          ["all", "Todas"],
          ["active", "Em andamento"],
          ["done", "Finalizadas"],
        ].map(([v, label]) => (
          <button
            className={filter === v ? "selected" : ""}
            aria-pressed={filter === v}
            onClick={() => setFilter(v)}
            key={v}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="deal-list" aria-busy={loading}>
        {visible.length ? (
          visible.map((d) => (
            <article className="deal panel" key={d.id}>
              <div className="deal-profile">
                <span className={`avatar ${d.creator.color}`}>
                  {initials(d.creator.name)}
                </span>
                <div>
                  <h2>{d.creator.name}</h2>
                  <span className="muted small">
                    {d.creator.creatorNiche} · {d.creator.state}
                    {ops && ` · Marca: ${d.brandId}`}
                  </span>
                </div>
                <span className={`status ${d.status.toLowerCase()}`}>
                  {labels[d.status]}
                </span>
              </div>
              <p className="deal-brief">{d.brief}</p>
              <div className="deal-bottom">
                <div>
                  <span>Investimento total</span>
                  <strong>{money(d.totalCents)}</strong>
                </div>
                <div>
                  <span>Responsável</span>
                  <strong>{d.owner || "A atribuir"}</strong>
                </div>
                <button
                  className="secondary"
                  disabled={loading}
                  onClick={() => setDetail(d)}
                >
                  Ver detalhes
                  <Icon name="arrow" size={17} />
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty panel">
            <span className="empty-icon">
              <Icon name="connections" size={36} />
            </span>
            <h2>
              {session.role === "CREATOR"
                ? "Seus convites vão aparecer aqui."
                : "Sua próxima conexão começa com uma ideia."}
            </h2>
            <p>
              {filter !== "all"
                ? "Nenhuma negociação nesta seleção."
                : session.role === "BRAND"
                  ? "Explore os creators e envie seu primeiro interesse."
                  : "Quando houver novas negociações, acompanhe as etapas aqui."}
            </p>
          </div>
        )}
      </section>
      {detail && (
        <DealDetail
          deal={detail}
          session={session}
          onClose={() => setDetail(null)}
          onSaved={() => {
            setDetail(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
function DealDetail({
  deal: d,
  session,
  onClose,
  onSaved,
}: {
  deal: Deal;
  session: Session;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const stages = nextStages(d);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const ops = session.role === "OPS";
    const submitter = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement;
    try {
      await api(
        ops ? `/ops/deals/${d.id}` : `/creator/deals/${d.id}/decision`,
        {
          method: ops ? "PATCH" : "POST",
          body: JSON.stringify(
            ops
              ? data
              : { note: data.note, accepted: submitter.value === "true" },
          ),
        },
      );
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal title={d.creator.name} onClose={onClose} busy={busy}>
      <span className={`status ${d.status.toLowerCase()}`}>
        {labels[d.status]}
      </span>
      <p className="deal-brief">{d.brief}</p>
      <div className="quote">
        <div>
          <span>Execução / creator</span>
          <strong>{money(d.executionCents)}</strong>
        </div>
        <div>
          <span>GoInsiders · 30%</span>
          <strong>{money(d.commissionCents)}</strong>
        </div>
        <div>
          <span>Total da marca</span>
          <strong>{money(d.totalCents)}</strong>
        </div>
        <small>
          Política desta negociação:{" "}
          {d.commissionMode === "INCLUDED"
            ? "comissão incluída"
            : "comissão adicionada"}
          .
        </small>
      </div>
      <h3>Histórico da conexão</h3>
      <ol className="timeline">
        {d.events.map((event, i) => (
          <li key={`${event.createdAt}-${i}`}>
            <strong>{labels[event.status]}</strong>
            <p>{event.note}</p>
            <small>
              {event.actor} ·{" "}
              {new Date(event.createdAt).toLocaleString("pt-BR")}
            </small>
          </li>
        ))}
      </ol>
      {session.role === "OPS" && stages.length > 0 && (
        <form onSubmit={submit}>
          <h3>Próximo passo</h3>
          <label>
            Etapa
            <select name="status" required disabled={busy}>
              {stages.map((s: Stage) => (
                <option value={s} key={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Responsável
            <input
              name="owner"
              required
              maxLength={100}
              defaultValue={d.owner || session.username}
              disabled={busy}
            />
          </label>
          <label>
            Registro para o histórico
            <textarea
              name="note"
              required
              maxLength={1000}
              rows={3}
              disabled={busy}
              placeholder="Descreva a ação e, ao registrar aceite, quando e por qual canal o creator concordou."
            />
          </label>
          <p className="disclaimer">
            Este registro é compartilhado com os participantes da negociação.
          </p>
          <ErrorBox message={error} />
          <button className="primary full" disabled={busy}>
            {busy ? "Salvando…" : "Registrar etapa"}
          </button>
        </form>
      )}
      {session.role === "CREATOR" && d.status === "AWAITING_CREATOR" && (
        <form onSubmit={submit}>
          <label>
            Sua resposta
            <textarea
              name="note"
              maxLength={1000}
              required
              rows={3}
              disabled={busy}
            />
          </label>
          <p className="disclaimer">
            Aceitar sinaliza interesse em negociar. A contratação acontece
            depois.
          </p>
          <ErrorBox message={error} />
          <div className="decision-actions">
            <button className="secondary" value="false" disabled={busy}>
              Recusar convite
            </button>
            <button className="primary" value="true" disabled={busy}>
              Aceitar convite
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
