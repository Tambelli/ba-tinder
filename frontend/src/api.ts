import type { Session } from "./types";
let token = "";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof URLSearchParams))
    headers.set("Content-Type", "application/json");
  if (options.method && options.method !== "GET")
    headers.set("X-CSRF-TOKEN", token);
  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (!response.ok) {
    if (response.status === 401 && path !== "/login")
      window.dispatchEvent(new Event("session-expired"));
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      body.message ||
        {
          401: "Usuário ou senha incorretos.",
          403: "Ação não permitida. Atualize a página e tente novamente.",
        }[response.status] ||
        "Não foi possível concluir. Tente novamente.",
      response.status,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export async function getSession() {
  const session = await api<Session>("/session");
  token = session.csrfToken;
  return session;
}
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Algo deu errado. Tente novamente.";
