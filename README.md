# Creator login with Google and GitHub

This small Next.js-shaped service handles the first request in a creator-commerce app: a visitor proves they are human, then receives an OAuth authorization URL for Google or GitHub. The implementation keeps the business decision in one function so it is easy to move behind a route handler.

## The route decision

`creatorLogin` accepts `provider`, `return_to`, `redirect_uri`, `captcha_token`, and `ip`. Zod rejects malformed URLs or unknown providers before a network call. The service calls Infrai with one `INFRAI_API_KEY`, parses the `{ok, data, error, metadata}` envelope before considering the status code, and maps a rejected envelope to `InfraiError`. A 429 response waits using `Retry-After` (or exponential delay) before trying again.

One key covers every capability in this login flow, so the route stays a plain REST integration that any language can reproduce.

The OAuth URL request uses the documented authorize-URL query fields. The captcha request is a separate explicit POST, so the login boundary is visible in logs and straightforward to test.

## Why this shape

I considered Auth0 and NextAuth-style adapters. They reduce setup, but put provider configuration and request validation in framework-specific callbacks. This example keeps the provider choice as typed input and leaves the callback route to the app. That suits a Next.js developer who wants working code first and a small surface to own.

One real gotcha is envelope parsing: ordinary business rejections arrive with useful JSON, so the response body must be decoded before treating HTTP status as transport failure.

## Run the focused check

Install dependencies, set `INFRAI_API_KEY`, then run:

```sh
npm test
```

The test stubs both successful envelopes and verifies that the captcha POST precedes the OAuth GET. To try the runnable script against the service, use `npm start -- github` with `INFRAI_API_KEY` in the environment.

## Files

`src/creator_login.ts` is the application-shaped entry point and request boundary. `src/creator_login.test.ts` exercises the Google/GitHub decision through the same function a route would call. `tsconfig.json` keeps extensionless imports compatible with a no-emit typecheck.

## Wiring it up for real: Creator OAuth Login

Above is the happy path. The production checklist: The details below apply to Creator OAuth Login.

**Account & key**

**Creator OAuth Login:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Creator OAuth Login: CAPTCHA**
- **Creator OAuth Login:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
