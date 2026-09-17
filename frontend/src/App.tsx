import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage, getSession } from "./api";
import type { Creator, Deal, Filters, Session } from "./types";
import { Brand, ErrorBox, Icon } from "./components/UI";
import { Login } from "./components/Login";
import { Discovery } from "./components/Discovery";
import { Proposal } from "./components/Proposal";
import { Negotiations } from "./components/Negotiations";
export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialError, setInitialError] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState(
    location.hash === "#connections" ? "connections" : "discover",
  );
  const [filters, setFilters] = useState<Filters>({});
  const [creators, setCreators] = useState<Creator[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [proposal, setProposal] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const request = useRef<AbortController | null>(null);
  const boot = useCallback(async () => {
    setInitialError("");
    try {
      setSession(await getSession());
    } catch (e) {
      setInitialError(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    void boot();
    const expired = () => {
      request.current?.abort();
      setProposal(null);
      setCreators([]);
      setDeals([]);
      setFilters({});
      setSession(null);
      setNotice("Sua sessão expirou. Entre novamente.");
      void boot();
    };
    const navigate = () => {
      if (location.hash === "#connections") setView("connections");
      if (location.hash === "#discover") setView("discover");
    };
    window.addEventListener("session-expired", expired);
    window.addEventListener("hashchange", navigate);
    return () => {
      request.current?.abort();
      window.removeEventListener("session-expired", expired);
      window.removeEventListener("hashchange", navigate);
    };
  }, [boot]);
  const reload = useCallback(
    async (nextFilters: Filters) => {
      if (!session?.authenticated) return;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setError("");
      try {
        const [catalog, negotiations] = await Promise.all([
          session.role === "BRAND"
            ? api<Creator[]>(`/creators?${new URLSearchParams(nextFilters)}`, {
                signal: controller.signal,
              })
            : Promise.resolve([]),
          api<Deal[]>("/deals", { signal: controller.signal }),
        ]);
        if (!controller.signal.aborted) {
          setCreators(catalog);
          setDeals(negotiations);
          setFilters(nextFilters);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(errorMessage(e));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [session],
  );
  useEffect(() => {
    if (session?.authenticated) void reload({});
  }, [session, reload]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  async function logout() {
    setLogoutBusy(true);
    try {
      await api("/logout", { method: "POST" });
      request.current?.abort();
      setSession(null);
      setCreators([]);
      setDeals([]);
      setFilters({});
      setProposal(null);
      await boot();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLogoutBusy(false);
    }
  }
  if (!session)
    return (
      <main className="boot">
        <Brand />
        {initialError ? (
          <>
            <h1>Vamos tentar de novo?</h1>
            <p>Não foi possível conectar ao servidor.</p>
            <ErrorBox message={initialError} />
            <button className="primary" onClick={boot}>
              Tentar novamente
            </button>
          </>
        ) : (
          <>
            <span className="loader" />
            <p>Preparando suas próximas conexões…</p>
          </>
        )}
      </main>
    );
  if (!session.authenticated)
    return (
      <>
        <Login
          session={session}
          onLogin={(s) => {
            setSession(s);
            location.hash = s.role === "BRAND" ? "discover" : "connections";
          }}
        />
        {notice && (
          <div className="toast" role="status">
            {notice}
          </div>
        )}
      </>
    );
  const discover = view === "discover" && session.role === "BRAND";
  const navLabel =
    session.role === "OPS"
      ? "Fila operacional"
      : session.role === "CREATOR"
        ? "Meus convites"
        : "Conexões";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <header className="app-header">
        <Brand />
        <nav aria-label="Navegação principal">
          {session.role === "BRAND" && (
            <a
              href="#discover"
              className={discover ? "active" : ""}
              aria-current={discover ? "page" : undefined}
            >
              <Icon name="discover" />
              Descobrir
            </a>
          )}
          <a
            href="#connections"
            className={!discover ? "active" : ""}
            aria-current={!discover ? "page" : undefined}
          >
            <Icon name="connections" />
            {navLabel}
            <span className="count">{deals.length}</span>
          </a>
        </nav>
        <div className="account">
          <span className="account-avatar">
            {session.username[0].toUpperCase()}
          </span>
          <div>
            <strong>{session.username}</strong>
            <small>
              {session.role === "BRAND"
                ? "Área da marca"
                : session.role === "OPS"
                  ? "GoInsiders · Operação"
                  : "Área do creator"}
            </small>
          </div>
          <button
            className="icon-button"
            aria-label="Sair da conta"
            disabled={logoutBusy}
            onClick={logout}
          >
            <Icon name="logout" size={19} />
          </button>
        </div>
      </header>
      {session.demo && (
        <div className="demo-bar">
          <span>DEMONSTRAÇÃO</span>Perfis e métricas fictícios. Nenhum contato
          ou pagamento real.
        </div>
      )}
      <main id="main" className="workspace" tabIndex={-1}>
        <ErrorBox message={error} />
        {error && (
          <button
            className="secondary retry"
            disabled={loading}
            onClick={() => reload(filters)}
          >
            Tentar carregar novamente
          </button>
        )}
        {discover ? (
          <Discovery
            creators={creators}
            selectedIds={deals.map((d) => d.creator.id)}
            filters={filters}
            onFilter={reload}
            onInterest={setProposal}
            loading={loading}
          />
        ) : (
          <Negotiations
            deals={deals}
            session={session}
            loading={loading}
            refresh={() => reload(filters)}
          />
        )}
      </main>
      <footer>
        <span>
          goinsiders <strong>match</strong>
        </span>
        <span>Boas conexões. Novas possibilidades.</span>
        <span>Feito para criar junto ↗</span>
      </footer>
      {proposal && (
        <Proposal
          creator={proposal}
          session={session}
          onClose={() => setProposal(null)}
          onSent={() => {
            setProposal(null);
            setNotice(
              "Interesse enviado! A GoInsiders acompanha os próximos passos.",
            );
            void reload(filters);
          }}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
