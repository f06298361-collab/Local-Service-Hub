---
name: Clerk Expo v3 auth flow
description: Root causes and fixes for the OAuth login not redirecting after sign-in in the TransMóvil Expo app
---

## Rule
`@clerk/expo@4.x` (Core v3) requires `useSSO` + `startSSOFlow` + `AuthSession.makeRedirectUri()`.
`useOAuth` / `startOAuthFlow` still exist but are deprecated and silently fail to complete the session on web.

**Why:** The v2 → v3 SDK broke the OAuth hook API. `useOAuth`/`startOAuthFlow` is no longer the correct path.

**How to apply:** In any Expo auth screen doing Google OAuth, import from `@clerk/expo` using `useSSO`, not `useOAuth`.

## RoleRouter stuck-state pattern
When `isSignedIn=true`, `isLoadingProfile=false`, `profile=undefined` (new user or API error), the original code fell through all branches and left the user on the login screen.

Fix: add an explicit branch — `else if (!profile) { router.replace('/profile-setup') }` — so a signed-in user with no backend profile always lands somewhere actionable.

## ClerkProvider props for Expo
- `proxyUrl={process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined}` — empty in dev (intentional), auto-set in prod.
- Wrap content with `<ClerkLoaded>` so child components only render once Clerk is initialized.
- `setBaseUrl` must be conditional: `if (domain) setBaseUrl(...)`.

## Scheme mismatch
`app.json` declares `"scheme": "transport-app"`. Any `Linking.createURL` with `{ scheme: 'transmovil' }` creates an invalid redirect URI. Use `AuthSession.makeRedirectUri()` (no explicit scheme) — it resolves correctly for both web and native.
