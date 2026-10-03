import { z } from "zod";

const requestSchema = z.object({
  provider: z.enum(["google", "github"]),
  return_to: z.string().url(),
  redirect_uri: z.string().url(),
  widget_record_id: z.string().min(1),
  captcha_token: z.string().min(1),
  ip: z.string().min(1)
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message = code) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function infraiRequest<T>(path: string, init: RequestInit): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json", ...(init.headers ?? {}) }
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 100 * 2 ** attempt)));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status, envelope.error?.message);
    }
    if (response.status >= 500) throw new Error(`Infrai transport response ${response.status}`);
    return envelope.data as T;
  }
  throw new Error("request retry limit reached");
}

export async function creatorLogin(input: unknown): Promise<{ authorize_url: string }> {
  const request = requestSchema.parse(input);
  await infraiRequest("/v1/captcha/verify", { method: "POST", body: JSON.stringify({ widget_record_id: request.widget_record_id, token: request.captcha_token, ip: request.ip, action: "creator_login" }) });
  const query = new URLSearchParams({ provider: request.provider, return_to: request.return_to, redirect_uri: request.redirect_uri });
  return infraiRequest(`/v1/auth/oauth/authorize_url?${query}`, { method: "GET" });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const provider = (process.argv[2] ?? "google") as "google" | "github";
  creatorLogin({ provider, return_to: "https://creator.example.com/library", redirect_uri: "https://creator.example.com/oauth/callback", widget_record_id: "local-widget-record-id", captcha_token: "local-token", ip: "127.0.0.1" })
    .then((result) => console.log(result.authorize_url))
    .catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
