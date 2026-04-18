This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Testing

- **Unit / component tests** (Vitest): `npm run test` — see [TESTING.md](./TESTING.md) for coverage, manual checklists, and how to add tests.
- **E2E** (Playwright): start `npm run dev`, then `npx playwright install` once, then `npm run test:e2e`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Authentication

Login is handled by [Auth.js](https://authjs.dev/) and validated against the **OrbitDB peer** REST API (same contract as the mobile app).

1. Copy `.env.example` to `.env.local` and set:
   - `AUTH_SECRET` — run `openssl rand -base64 32` to generate one.
   - `ORBITDB_API_URL` or `DJANGO_API_URL` — base URL including `/backend` when required (e.g. `http://127.0.0.1:3001/backend`). See `lib/orbit-fetch.ts`.

2. **Orbit peer** (`codepop_backend/orbitdb`): the dashboard calls `POST {baseUrl}/auth/login` with `{ "username", "password" }`. Success returns a `token` and user fields; failures show “Invalid username or password.”

3. Optional **dev bypass**: set `NEXT_PUBLIC_DEV_AUTH_BYPASS=true` (non-production) to skip Orbit login and pick a dashboard role from the login page. Orbit BFF routes still need a real `accessToken` unless you test only static UI.

4. Protected routes redirect to `/login` when not signed in. After login, users return to the requested page or `/`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
