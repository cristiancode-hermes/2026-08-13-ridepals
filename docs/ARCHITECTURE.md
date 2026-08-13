# RidePals — Arquitectura

> Coche compartido comunitario: publica rutas, reserva asientos, construye reputación.
> Build diario: **2026-08-13** · Specs: `/opt/data/hermes-design-specs/2026-08-13-ridepals/`

## 1. Visión general

Monorepo npm workspaces con dos apps:

```
2026-08-13-ridepals/
├── apps/
│   ├── api/    NestJS 11 + TypeORM 1.x + better-sqlite3 (SQLite dev / Neon prod)
│   └── web/    Angular 22 standalone + Tailwind v4 (design system "Open Road")
├── package.json  (workspaces, scripts raíz)
└── docs/         (este archivo + API.md + FRONTEND.md)
```

Pipeline del Daily Builder: `design-specs-builder (02:30) → daily-builder (03:30, este) → qa-tester-deployer (07:00)`.

## 2. Dominio

| Entidad | Tabla | Notas |
|---|---|---|
| `User` | users | uuid, username único, email único, passwordHash (bcryptjs), bio |
| `Vehicle` | vehicles | máx. 4 por usuario; fuelType `gasolina\|diesel\|hibrido\|electrico` |
| `Ride` | rides | puntual o recurrente (regla JSON en `recurrence`); status `active\|cancelled` |
| `Booking` | bookings | por (ride, occurrenceDate, passenger); máquina de estados |
| `Review` | reviews | cruzada tras viaje completado; 1 por (booking, autor) |
| `Message` | messages | hilos por (rideId, bookingId) |
| `FavoriteRoute` | favorite_routes | rutas guardadas (máx. 10) |

**Recurrencia:** `recurrence = { weekdays: number[] (1=lun…7=dom), time: "HH:mm", endDate: "YYYY-MM-DD" }`.
Se expande perezosamente (nunca se materializan filas): `RidesService.occurrencesForRide(ride, from, to, bookingsByRide)`.

## 3. Decisiones clave

### 3.1 Concurrencia de reservas (better-sqlite3)
`BookingsService.create` envuelve la transacción en un **mutex en proceso** (`withLock`):

```ts
private lock: Promise<unknown> = Promise.resolve();
private withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = this.lock.then(fn, fn);
  this.lock = run.catch(() => undefined);
  return run;
}
```

- **Por qué:** better-sqlite3 es una conexión única síncrona; TypeORM lanza `cannot start a transaction within a transaction` si dos `transaction()` se solapan (dos HTTP requests concurrentes).
- **Resultado:** las reservas se serializan; cada una re-chequea capacidad dentro de su transacción (`SUM(seats)` de `pending+confirmed`); la que excede recibe `409 Ya no quedan plazas`.
- **En Neon/Postgres** (prod): el mutex es innecesario; usar `SELECT … FOR UPDATE` sobre el ride o un índice único. El resto del servicio no cambia.

### 3.2 Máquina de estados de reservas (`booking-state.ts`)

```
pending → confirmed | rejected | cancelled
confirmed → cancelled | completed
rejected | cancelled | completed  (terminales)
```

`OCCUPYING = ['pending', 'confirmed']` — solo estos ocupan plaza (una cancelada o rechazada libera asiento).

### 3.3 Haversine y CO₂ (`common/geo.ts`)
- `haversineKm(lat1, lng1, lat2, lng2)` → km (radio terrestre 6371 km).
- `CO2_PER_KM = 0.1162` kg CO₂/km (factor medio España).
- Búsqueda de viajes ordena resultados por proximidad al origen de búsqueda (centro de Madrid por defecto) y calcula `distanceKm` por viaje.

### 3.4 Auth
- JWT (Passport) con `JwtAuthGuard` global por controller + `@CurrentUser()`.
- **Login acepta username O email** (`where: [{email}, {username}]` — preferencia de Cristian).
- Rate limit simple por identifier en memoria: 5 intentos → bloqueo 60 s.
- `bcryptjs` (no `bcrypt`) — evita el binding nativo.

### 3.5 Seed idempotente (`seed/seed.service.ts`)
- `onApplicationBootstrap`: si `users` está vacío, crea **demo@ridepals.dev / demo1234** con datos reales (3 usuarios, 2 vehículos, 3 viajes —uno recurrente—, 3 reservas, 2 reseñas cruzadas, 1 favorito, 2 mensajes).
- El frontend muestra las credenciales demo bajo el login (regla de Cristian: nunca autocompletar).

## 4. Estructura de la API

```
apps/api/src/
├── main.ts                  # bootstrap + ValidationPipe + Swagger (/docs)
├── app.module.ts            # ConfigModule + TypeOrmModule (sqlite|postgres por env)
├── entities/entities.ts     # 7 entidades + índices
├── common/                  # types.ts (enums, constantes, DashboardStats), geo.ts
├── auth/                    # register/login/profile(PATCH) + JWT + rate limit
├── users/                   # GET :id, :id/reviews, :id/stats
├── vehicles/                # CRUD (máx. 4, 409 si tiene viajes futuros al borrar)
├── rides/                   # CRUD + search + occurrences + overlap check (30 min)
├── bookings/                # create (mutex) + mine/as-driver + status + cancel + complete
├── reviews/                 # create (solo completed, sin duplicados) + by ride
├── messages/                # hilos (solo participantes)
├── favorites/               # CRUD (máx. 10, único por (user, origin, dest))
├── dashboard/               # KPIs + serie mensual (COALESCE → 0)
└── seed/                    # datos demo idempotentes
```

DTOs centralizados en `dto/dto.ts` (class-validator; `RecurrenceRuleDto` con `ValidateNested`).

## 5. Persistencia y entorno

| Variable | Default | Uso |
|---|---|---|
| `PORT` | 3000 (deploy: 3047) | Puerto HTTP |
| `DATABASE_TYPE` | `better-sqlite3` | `postgres` para Neon |
| `DATABASE_PATH` | `data/ridepals.db` | Ruta SQLite |
| `DATABASE_URL` | — | DSN de Neon (solo postgres) |
| `JWT_SECRET` | — | Firma del token (obligatorio en prod) |

`synchronize: true` (dev). En prod considerar migraciones.

## 6. Tests (30)

| Suite | Cubre |
|---|---|
| `common/geo.spec.ts` | haversine (Madrid-Barcelona ≈505 km, simetría, mismo punto), CO₂ |
| `rides/recurrence.spec.ts` | expansión semanal, filtro de weekdays, endDate, descuento de asientos, puntual |
| `bookings/booking-state.spec.ts` | transiciones válidas/inválidas, terminales, OCCUPYING |
| `bookings/bookings.concurrency.spec.ts` | **integración real better-sqlite3**: 3 pasajeros × 1 plaza → 1 éxito + 2×409; duplicado 409; propio viaje 400; 404; complete→completed |
| `reviews/reviews.service.spec.ts` | solo completed, sin duplicados, no auto-reseña, roles conductor/pasajero |
| `auth/auth.service.spec.ts` | registro, email duplicado 409, login por email Y por username, 401 |

```bash
cd apps/api && npm test        # jest
```

## 7. Build

```bash
cd apps/api && npm run build   # tsc
cd ../web && npm run build     # build-css.cjs (Tailwind v4) + ng build
```
