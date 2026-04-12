# Dashboard testing guide

This document describes automated tests, how to run them, and manual checks against the OrbitDB-backed dashboard.

## Tooling

| Layer        | Stack                                      | Command              |
| ------------ | ------------------------------------------ | -------------------- |
| Unit / UI    | [Vitest](https://vitest.dev/), [Testing Library](https://testing-library.com/react), jsdom | `npm run test`       |
| Watch mode   | Same                                       | `npm run test:watch` |
| End-to-end   | [Playwright](https://playwright.dev/)      | `npm run test:e2e`   |

Configuration: `vitest.config.ts` (path alias `@/` → project root), `test/setup.ts` (`@testing-library/jest-dom`), `playwright.config.ts`.

## Running unit tests

```bash
cd dashboard
npm install
npm run test
```

All tests should pass without a running Next server or Orbit peer.

## Unit test inventory

Tests live next to the code they cover (`*.test.ts` / `*.test.tsx`).

| File                       | What it verifies |
| -------------------------- | ---------------- |
| `app/login/page.test.tsx`  | Login form: failed credentials show an alert; successful `signIn` navigates to callback URL and refreshes the router. |
| `lib/orbit-role-map.test.ts` | Orbit role strings map to dashboard `Role[]` and back (`dashboardRoleToOrbit`, `orbitRoleToDashboardRoles`, `defaultDashboardRoleForOrbit`). |
| `lib/orbit-session.test.ts`  | Session helpers: `getAccessToken`, and BFF gates (`hasOrbitStaffDashboardRole`, `hasOrbitManagerDashboardRole`, `hasOrbitRepairDashboardRole`, etc.) match the intended role sets. |
| `lib/csv.test.ts`            | `parseCsvText` / `rowsToCsv` quoting rules; `downloadTextFile` triggers blob URL, anchor click, and `revokeObjectURL`. |

### Adding unit tests

1. Prefer **pure functions** and small modules (easier to test than full pages).
2. For **client pages**, mock `next/navigation` and `next-auth/react` like `app/login/page.test.tsx`.
3. For **Route Handlers** (`app/api/.../route.ts`), either extract logic into `lib/` and unit test it, or add integration tests that call `GET`/`POST` with mocked `auth()` and `orbitJson` (future work).

## End-to-end (Playwright)

E2E tests assume the **Next.js dev server** is already listening on the base URL (default `http://127.0.0.1:3000`). Only one `next dev` instance can hold the dashboard `.next` lock; stop extra dev servers before running Playwright, or point at an already-running URL.

```bash
# Terminal 1
cd dashboard
npm run dev

# Terminal 2 (first time only: install browsers)
npx playwright install

cd dashboard
npm run test:e2e
```

Optional:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
```

### Current E2E cases

| Spec                         | Behavior |
| ---------------------------- | -------- |
| `e2e/login-smoke.spec.ts`    | `/login` shows “Sign in”, username/password fields, and the sign-in button. |

Extend `e2e/` with flows that require Orbit (e.g. login with seed user, open repair dashboard, assert machines) once a stable test user and `ORBITDB_API_URL` are available in CI.

## Manual / integration checklist

Use this when validating releases with a real Orbit peer (`codepop_backend/orbitdb`) and `.env` / `.env.local`.

### Environment

- [ ] `AUTH_SECRET` is set.
- [ ] `ORBITDB_API_URL` or `DJANGO_API_URL` points at the peer base including `/backend` if required by `lib/orbit-fetch.ts` (see dashboard README / code comments).

### Authentication

- [ ] **Production-style login**: valid Orbit user redirects to home; invalid credentials show an error (no crash).
- [ ] **Dev bypass** (if enabled): role picker appears; chosen role affects dashboard visibility; note that bypass sessions may lack `accessToken` and Orbit BFF routes can return 401.

### Role-based UI (spot checks)

- [ ] **Customer**: cannot access staff-only areas (redirect or empty state as designed).
- [ ] **Repair Staff**: repair dashboard loads; with seeded data, machines appear for a selected **store** (`storeId` query); status/history actions behave when authorized.
- [ ] **Manager / Logistics / Admin / Super Admin**: respective dashboards load; manager-tier APIs respond when the Orbit user has appropriate `assignedStores` / role.

### Regression targets

- [ ] Login page: username + password labels, submit, error alert.
- [ ] CSV import preview on dashboards that use `parseCsvText` (quoted commas, CRLF).
- [ ] After Orbit or auth changes, re-run `npm run test` and re-check the manual list above.

## CI suggestions

- **Minimum**: `npm run test` (Vitest) on every PR.
- **Optional**: Playwright against a disposable Next server + mocked Orbit, or a pinned staging URL with secrets in CI variables.

## Related docs

- App setup and auth env vars: [README.md](./README.md) (update `DJANGO_API_URL` references to match your Orbit deployment if you no longer use Django for login).
