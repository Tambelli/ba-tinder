import { useRef, useState, type FormEvent, type PointerEvent } from "react";
import type { Creator, Filters } from "../types";
import { initials, number, swipeDirection } from "../domain";
import { Icon } from "./UI";
const states =
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(
    " ",
  );
export function Discovery({
  creators,
  selectedIds,
  filters,
  onFilter,
  onInterest,
  loading,
}: {
  creators: Creator[];
  selectedIds: number[];
  filters: Filters;
  onFilter: (f: Filters) => void;
  onInterest: (c: Creator) => void;
  loading: boolean;
}) {
  const [skipped, setSkipped] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const candidates = creators.filter(
    (c) => !skipped.includes(c.id) && !selectedIds.includes(c.id),
  );
  const c = candidates[0];
  const activeFilters = Object.values(filters).filter(Boolean).length;
  function skip() {
    if (c && !loading) {
      setSkipped((s) => [...s, c.id]);
      setDrag(0);
    }
  }
  function filterSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(
      [...new FormData(e.currentTarget)].filter(([, v]) => v !== ""),
    ) as Filters;
    onFilter(data);
    setSkipped([]);
    setOpen(false);
  }
  function release(e: PointerEvent<HTMLElement>) {
    if (!start.current) return;
    const direction = swipeDirection(
      e.clientX - start.current.x,
      e.clientY - start.current.y,
    );
    start.current = null;
    setDrag(0);
    if (!loading && c) {
      if (direction === "skip") skip();
      if (direction === "interest") onInterest(c);
    }
  }
  const choice = (name: keyof Filters, title: string, options: string[]) => (
    <label>
      {title}
      <select name={name} defaultValue={filters[name] || ""}>
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
  return (
    <>
      <section className="page-heading">
        <div>
          <span className="eyebrow">UM NOVO JEITO DE CRIAR JUNTO</span>
          <h1>
            Encontre sua próxima <em>parceria.</em>
          </h1>
          <p>O creator certo para a história que sua marca quer contar.</p>
        </div>
        <button
          className={`filter-toggle secondary ${open ? "selected" : ""}`}
          aria-expanded={open}
          aria-controls="discovery-filters"
          onClick={() => setOpen(!open)}
        >
          <Icon name="filter" />
          Filtros
          {activeFilters > 0 && <span className="count">{activeFilters}</span>}
        </button>
      </section>
      <div className="discovery-layout">
        <aside
          id="discovery-filters"
          className={`filters panel ${open ? "is-open" : ""}`}
        >
          <div className="section-heading">
            <h2>Sua combinação</h2>
            <Icon name="filter" size={18} />
          </div>
          <p className="muted small">Menos procura. Mais afinidade.</p>
          <form key={JSON.stringify(filters)} onSubmit={filterSubmit}>
            {choice("productNiche", "Produto da marca", [
              "Beleza",
              "Esporte",
              "Alimentos",
              "Eletrônicos",
              "Vestuário",
              "Turismo",
            ])}
            {choice("creatorNiche", "Universo do creator", [
              "Lifestyle",
              "Fitness",
              "Gastronomia",
              "Tecnologia",
              "Moda",
              "Viagem",
            ])}
            {choice("state", "Localização · UF", states)}
            <fieldset>
              <legend>Seguidores</legend>
              <div className="input-row">
                <input
                  name="minFollowers"
                  aria-label="Mínimo de seguidores"
                  type="number"
                  min="0"
                  max="1000000000"
                  placeholder="Mínimo"
                  defaultValue={filters.minFollowers}
                />
                <span>—</span>
                <input
                  name="maxFollowers"
                  aria-label="Máximo de seguidores"
                  type="number"
                  min="0"
                  max="1000000000"
                  placeholder="Máximo"
                  defaultValue={filters.maxFollowers}
                />
              </div>
            </fieldset>
            <fieldset>
              <legend>Engajamento (%)</legend>
              <div className="input-row">
                <input
                  name="minEngagement"
                  aria-label="Engajamento mínimo"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Mínimo"
                  defaultValue={filters.minEngagement}
                />
                <span>—</span>
                <input
                  name="maxEngagement"
                  aria-label="Engajamento máximo"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Máximo"
                  defaultValue={filters.maxEngagement}
                />
              </div>
            </fieldset>
            <button className="primary full" disabled={loading}>
              {loading ? "Buscando…" : "Aplicar filtros"}
            </button>
            <button
              type="button"
              className="text-button full"
              disabled={loading}
              onClick={() => {
                onFilter({});
                setSkipped([]);
              }}
            >
              Limpar filtros
            </button>
          </form>
          <div className="filter-foot">
            <Icon name="check" size={16} />
            <span>
              Você escolhe os critérios.
              <br />A gente aproxima as pessoas.
            </span>
          </div>
        </aside>
        <section
          className="match-area"
          aria-label="Descoberta de creators"
          aria-busy={loading}
        >
          <div className="results-line">
            <span>
              <span className="live-dot" />
              {loading
                ? "Atualizando creators…"
                : `${candidates.length} perfis para descobrir`}
            </span>
            <span>Por engajamento</span>
          </div>
          {c ? (
            <>
              <article
                key={c.id}
                className={`creator-card ${c.color} ${loading ? "is-loading" : ""}`}
                style={{
                  transform: `translateX(${drag}px) rotate(${drag / 28}deg)`,
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0 || loading) return;
                  start.current = { x: e.clientX, y: e.clientY };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (start.current) {
                    if (Math.abs(e.clientY - start.current.y) > 80) {
                      start.current = null;
                      setDrag(0);
                    } else
                      setDrag(
                        Math.max(
                          -145,
                          Math.min(145, e.clientX - start.current.x),
                        ),
                      );
                  }
                }}
                onPointerUp={release}
                onPointerCancel={() => {
                  start.current = null;
                  setDrag(0);
                }}
              >
                <div className="creator-art">
                  <div className="card-topline">
                    <span className="glass-pill">{c.creatorNiche}</span>
                    <span className="profile-label">CREATOR PROFILE</span>
                  </div>
                  <div className="art-orbit orbit-one" />
                  <div className="art-orbit orbit-two" />
                  <span className="creator-initials" aria-hidden="true">
                    {initials(c.name)}
                  </span>
                  <span className="art-spark" aria-hidden="true">
                    ✳
                  </span>
                  <span className="art-caption">
                    Feito para
                    <br />
                    <em>criar junto.</em>
                  </span>
                  {Math.abs(drag) > 35 && (
                    <span className={`swipe-stamp ${drag > 0 ? "yes" : ""}`}>
                      {drag > 0 ? "VAMOS CONECTAR" : "POR AGORA, NÃO"}
                    </span>
                  )}
                  <div className="card-identity">
                    <span className="location">
                      <Icon name="pin" size={14} />
                      {c.city}, {c.state}
                    </span>
                    <h2>{c.name}</h2>
                    <span>{c.handle}</span>
                  </div>
                </div>
                <div className="creator-content">
                  <div className="metrics">
                    <div>
                      <strong>{number(c.followers)}</strong>
                      <span>seguidores</span>
                    </div>
                    <div>
                      <strong>
                        {c.engagement.toLocaleString("pt-BR")}
                        <small>%</small>
                      </strong>
                      <span>engajamento</span>
                    </div>
                    <div>
                      <strong>{c.state}</strong>
                      <span>localização</span>
                    </div>
                  </div>
                  <p className="bio">{c.bio}</p>
                  <div className="affinity">
                    <span>COMBINA COM</span>
                    <strong>{c.productNiche}</strong>
                    <span className="affinity-line" />
                  </div>
                </div>
              </article>
              <div className="swipe-actions">
                <div>
                  <button
                    className="round-action undo"
                    disabled={!skipped.length || loading}
                    aria-label="Desfazer último perfil pulado"
                    onClick={() => setSkipped((s) => s.slice(0, -1))}
                  >
                    <Icon name="undo" />
                  </button>
                  <span>Voltar</span>
                </div>
                <div>
                  <button
                    className="round-action pass"
                    aria-label="Pular creator"
                    disabled={loading}
                    onClick={skip}
                  >
                    <Icon name="close" size={31} />
                  </button>
                  <span>Agora não</span>
                </div>
                <div>
                  <button
                    className="round-action connect"
                    aria-label="Tenho interesse"
                    disabled={loading}
                    onClick={() => onInterest(c)}
                  >
                    <Icon name="connections" size={30} />
                  </button>
                  <span>Tenho interesse</span>
                </div>
              </div>
              <p className="swipe-hint">
                Arraste para explorar ou use os botões acima.
                <br />
                Demonstrar interesse abre um briefing. A escolha final vem
                depois.
              </p>
            </>
          ) : (
            <div className="empty panel">
              <span className="empty-icon">
                <Icon name="discover" size={40} />
              </span>
              <h2>
                {creators.length
                  ? "Você chegou ao fim desta seleção."
                  : "Seu match pode estar em outra busca."}
              </h2>
              <p>Amplie os filtros ou volte aos perfis que pulou.</p>
              <button
                className="primary"
                disabled={loading}
                onClick={() => {
                  setSkipped([]);
                  onFilter({});
                }}
              >
                Explorar novamente
              </button>
            </div>
          )}
        </section>
        <aside className="concierge">
          <span className="concierge-star">✳</span>
          <span className="eyebrow">CONEXÃO COM PROPÓSITO</span>
          <h2>
            Você descobre.
            <br />A gente <em>aproxima.</em>
          </h2>
          <p>Por trás de um bom match, tem uma equipe que faz acontecer.</p>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Encontre afinidade</strong>
                <p>Conheça o creator além dos números.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Compartilhe sua ideia</strong>
                <p>Envie objetivo, briefing e investimento.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Vamos fazer a conexão</strong>
                <p>A GoInsiders acompanha contato, aceite e negociação.</p>
              </div>
            </li>
          </ol>
          <div className="concierge-note">
            <Icon name="connections" />
            <p>
              <strong>Parcerias, não paqueras.</strong>
              <br />
              Aqui, o que combina são marcas, conteúdo e oportunidades.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
