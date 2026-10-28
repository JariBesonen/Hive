# Hive

Hive is a full-stack social platform where users create and join topic-based
communities ("hives"), post and comment, follow other hives, message each
other directly, and get notified about activity on their content.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, React Router
- **Backend:** Node.js, Express 5, TypeScript
- **Database:** PostgreSQL

## Project structure

```
backend/    Express API (controllers, models, routes, middleware, db)
frontend/   React app (pages, components, context, API client)
```

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a connection string to a hosted instance)

### 1. Database

Create a database (e.g. `Hive`) and copy the example env file:

```bash
cd backend
cp .env.example .env
```

Update `.env` with your own `DATABASE_URL`, `SESSION_SECRET`, and
`FRONTEND_URL`. The schema is created automatically on server startup via
`backend/src/db/init.ts`.

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

The API runs on `http://localhost:5000` by default.

### Optional sample content

To populate the local database with synthetic profiles and text-only community
content, run this from the `backend` directory after configuring `.env`:

```bash
npm run seed
```

The script creates 20 fictional profiles, 17 public Hives, 85 text-only posts,
comments and replies, varied votes, memberships, and follows. Seeded accounts
use reserved `.invalid` email addresses and randomly generated, undisclosed
passwords; they are not intended for login. The script never deletes data or
updates existing accounts. It is safe to rerun: matching seeded records and
relationships are reused, and a collision with a non-seed username or Hive
name aborts the transaction rather than modifying that record.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173` by default and expects the API at
`http://localhost:5000` unless `VITE_API_URL` is set.

## Features

- Email/password authentication with session cookies
- Create and browse hives, follow/unfollow (with private-hive requests)
- Posts with comments, likes, and replies
- Direct messaging between users
- Notifications for likes, comments, replies, and hive follows
- Search across hives and posts
- Profile customization and account settings
