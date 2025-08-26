# Getting Started

## Prerequisites
- Node.js 18+
- PostgreSQL 15+
- (Future) Redis

## Backend Setup
Copy env file:
```
copy backend\.env.example backend\.env
```

Install dependencies:
```
cd backend
npm install
```

Run Prisma migrations (after editing schema if needed):
```
npx prisma migrate dev --name init
```

Start dev server:
```
npm run dev
```

## Frontend Setup
```
cd frontend
npm install
npm run dev
```

## Auth Flow
POST /auth/register -> email/password
POST /auth/login -> returns access & refresh tokens
POST /auth/refresh -> rotate refresh token
POST /auth/logout -> revoke refresh token

Use Authorization: Bearer <access_token> for protected endpoints.

## Lint & Test
Backend:
```
npm run lint
npm test
```

Frontend:
```
npm run lint
npm test
```
