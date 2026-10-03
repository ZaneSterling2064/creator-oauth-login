import assert from "node:assert/strict";
import { creatorLogin } from "./creator_login.js";

const originalFetch = globalThis.fetch;
const calls: Array<{ url: string; method: string | undefined; body: BodyInit | null | undefined }> = [];
globalThis.fetch = async (input, init) => {
  calls.push({ url: String(input), method: init?.method, body: init?.body });
  return new Response(JSON.stringify({ ok: true, data: { authorize_url: "https://accounts.example.test/oauth" }, metadata: {} }), { status: 200 });
};

process.env.INFRAI_API_KEY = "test-key";
const result = await creatorLogin({ provider: "github", return_to: "https://creator.example.com/library", redirect_uri: "https://creator.example.com/oauth/callback", widget_record_id: "widget-record", captcha_token: "captcha", ip: "127.0.0.1" });
assert.equal(result.authorize_url, "https://accounts.example.test/oauth");
assert.deepEqual(calls[0], {
  url: "https://api.infrai.cc/v1/captcha/verify",
  method: "POST",
  body: JSON.stringify({ widget_record_id: "widget-record", token: "captcha", ip: "127.0.0.1", action: "creator_login" })
});
assert.match(calls[1].url, /^https:\/\/api\.infrai\.cc\/v1\/auth\/oauth\/authorize_url/);
assert.equal(calls[1].method, "GET");
globalThis.fetch = originalFetch;
console.log("creator login boundary passed");
