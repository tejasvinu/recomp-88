# Recomp 88

Body recomposition tracker built with **Next.js** and **NextAuth**. Supports:

- **Guest mode**: use the app without signing in (data stays local).
- **Accounts**: sign up with email/password or Google.
- **Cloud sync**: signed-in users can sync data to MongoDB.

## Tech stack

- **Next.js** (App Router)
- **React**
- **NextAuth** (JWT session strategy)
- **MongoDB** via **Mongoose**
- **Tailwind CSS**

## Getting started

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env.local
```

Run the dev server:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Environment variables

This project reads these variables at runtime:

- `MONGODB_URI`: Mongo connection string (required for sign-up, profiles, and sync).
- `AUTH_SECRET`: NextAuth secret used to sign/encrypt tokens.
- `AUTH_GOOGLE_ID`: Google OAuth client id.
- `AUTH_GOOGLE_SECRET`: Google OAuth client secret.

If `MONGODB_URI` is missing, database features are disabled (sign-up / profile / sync won’t work).

## Auth & API routes

- **Sign in / sign up UI**: `src/app/auth/signin/page.tsx`
- **NextAuth handler**: `src/app/api/auth/[...nextauth]/route.ts`
- **Register (credentials sign-up)**: `POST /api/auth/register`
- **Cloud sync**: `GET /api/sync`, `POST /api/sync` (requires auth)
- **Profile**: `GET /api/user/profile`, `PATCH /api/user/profile` (requires auth)

## Scripts

- `npm run dev`: start dev server
- `npm run build`: production build
- `npm run start`: start production server
- `npm run lint`: run ESLint
