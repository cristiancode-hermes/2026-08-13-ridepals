# RidePals

Coche compartido comunitario: **publica rutas, reserva asientos, construye reputación**.

- **API:** NestJS 11 + TypeORM + better-sqlite3 (SQLite dev / Neon prod) + JWT (login por username O email).
- **Web:** Angular 22 standalone + Tailwind v4, design system **"Open Road"** (señalética vial europea).
- **Demo:** `demo@ridepals.dev` / `demo1234` (el seed crea viajes, reservas y reseñas reales).
- **Docs:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/API.md`](docs/API.md) · [`docs/FRONTEND.md`](docs/FRONTEND.md)

## Quick start

```bash
npm install --legacy-peer-deps --no-audit --no-fund
cd apps/api && npm run build && npm start        # API en :3000 (seed automático)
cd apps/web && npm run build                     # → dist/web/browser/
```

## Tests (30)

```bash
cd apps/api && npm test
```

Cubren: concurrencia de reservas (integración real better-sqlite3), expansión de recurrencias,
haversine/CO₂, máquina de estados de reservas, reglas de reseñas, auth username-o-email.

## Stack

Angular 22 · NestJS 11 · TypeORM 1.x · Tailwind v4 · better-sqlite3 · bcryptjs · JWT · Jest
