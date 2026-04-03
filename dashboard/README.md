This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

Login is handled by [Auth.js](https://authjs.dev/) and validated against the OrbitDB API.

1. Copy `.env.example` to `.env.local` and set:
   - `AUTH_SECRET` — run `openssl rand -base64 32` to generate one.
   - `ORBITDB_API_URL` — base URL of your OrbitDB API (e.g. `http://localhost:3001`).

2. **OrbitDB backend** (`codepop_backend/orbitdb`): the dashboard calls the existing login endpoint.

   - **URL**: `POST {ORBITDB_API_URL}/backend/auth/login/`
   - **Body**: `{ "username": "...", "password": "..." }` (the login form sends the email field as `username`)
   - **Success (200)**: `{ "token", "user_id", "first_name", "is_admin", "is_manager" }`
   - **Failure (4xx)**: dashboard shows “Invalid email or password.”

   Ensure CORS allows your dashboard origin (e.g. `http://localhost:3000`) so the browser can call the API. Run the OrbitDB peer with `npm run peer` and set `ORBITDB_API_URL=http://localhost:3001`.

3. Protected routes (everything except `/login` and `/signup`) redirect to `/login` when not signed in. After login, users are redirected back to the page they tried to open or to `/`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
