import { useState, type FormEvent } from "react";
import { api, getSession, errorMessage } from "../api";
import type { Session } from "../types";
import { Brand, ErrorBox, Icon } from "./UI";
export function Login({
  session,
  onLogin,
}: {
  session: Session;
  onLogin: (s: Session) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event?: FormEvent, demo?: string) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/login", {
        method: "POST",
        body: new URLSearchParams({
          username: demo || username,
          password: demo ? `demo-${demo}-2026` : password,
        }),
      });
      onLogin(await getSession());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <section className="login-story">
        <Brand />
        <div className="login-pitch">
          <span className="eyebrow">MARCAS + CREATORS + POSSIBILIDADES</span>
          <h1>
            Seu próximo
            <br />
            grande match
            <br />é uma <em>parceria.</em>
          </h1>
          <p>
            Encontre quem combina com a sua marca.
            <br />A GoInsiders faz a conexão acontecer.
          </p>
          <div className="story-card">
            <span className="story-orbit">✳</span>
            <div>
              <strong>Afinidade encontra oportunidade.</strong>
              <span>Descubra. Conecte. Crie junto.</span>
            </div>
            <Icon name="arrow" />
          </div>
        </div>
        <span className="story-foot">
          Conexões profissionais. Potencial de verdade.
        </span>
      </section>
      <section className="login-form">
        <div className="login-box">
          <span className="eyebrow">BEM-VINDO AO MATCH</span>
          <h2>
            Boas parcerias
            <br />
            começam aqui.
          </h2>
          <p className="muted">
            Entre para descobrir creators e acompanhar cada conexão.
          </p>
          <form onSubmit={submit}>
            <label>
              Usuário
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Seu usuário"
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Sua senha"
              />
            </label>
            <ErrorBox message={error} />
            <button className="primary full" disabled={busy}>
              {busy ? "Entrando…" : "Entrar na minha conta"}
              <Icon name="arrow" />
            </button>
          </form>
          {session.demo && (
            <aside className="demo-login">
              <span className="eyebrow">EXPLORE A DEMONSTRAÇÃO</span>
              <p>Perfis fictícios. Nenhum contato ou pagamento real.</p>
              <div className="demo-buttons">
                {[
                  ["marca", "Sou marca"],
                  ["operacao", "Sou operação"],
                  ["creator", "Sou creator"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className="secondary"
                    disabled={busy}
                    onClick={() => submit(undefined, value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </aside>
          )}
          <p className="login-note">
            Curadoria humana em cada etapa.
            <br />
            Tecnologia para aproximar, pessoas para fazer acontecer.
          </p>
        </div>
      </section>
    </main>
  );
}
