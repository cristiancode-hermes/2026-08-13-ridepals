# QA Report — 2026-08-13 ridepals

**Project:** RidePals — coche compartido comunitario (publica rutas, reserva asientos, construye reputación)
**Stack:** Angular 22 (signals, zoneless) + Tailwind v4 + NestJS 11 + TypeORM + better-sqlite3 + JWT
**Author:** Hermes Daily Builder (counter=2, non-AI build)

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API compile (`tsc -p tsconfig.build.json`) | ✅ PASS | 39 JS emitidos, 0 errores |
| Web build (`ng build`) | ✅ PASS | 13 lazy chunks, Output: `dist/web/browser` |
| Root TypeScript | ✅ | 6.0.3 (Angular 22 compatible) |

## ✅ 2. Test Results

30 test cases · 6 suites — ALL PASSED (jest)

| Test Suite | Cases | Verdict |
|-----------|-------|---------|
| auth.service.spec.ts | auth register/login, rate limit | ✅ |
| bookings.concurrency.spec.ts | capacidad atómica con lock | ✅ |
| booking-state.spec.ts | máquina de estados (transiciones válidas/inválidas) | ✅ |
| recurrence.spec.ts | expansión recurrencia (días, límites, bisiestos) | ✅ |
| geo.spec.ts | haversine precisión | ✅ |
| reviews.service.spec.ts | validación completado, 1–5, unicidad | ✅ |

## ✅ 3. Endpoint / Runtime Verification (26 checks, todos verdes tras fixes)

| Área | Checks | Resultado |
|------|--------|-----------|
| Auth | register 201, dup 409, login email+username 200, bad 401, profile 200/401 | ✅ 7/7 |
| Vehicles | create 201 (DTO español), list 200 | ✅ 2/2 |
| Rides | one-off 201 + distanceKm, recurrente 201, search 200 (haversine order), detail 200, mine 200, occurrences 10/2 semanas, fecha pasada 400, **solapamiento 409** | ✅ 9/9 |
| Bookings | create 201, dup 409, self-booking 400, mine 200, confirm 200 (driver), 403 (pasajero), complete 201 `{completed:1}` | ✅ 7/7 |
| Reviews | 201 tras completado, duplicada 409, no-completado 403, cross-review 201, rating 400 | ✅ 5/5 |
| Messages | post 201, thread 200 | ✅ 2/2 |
| Favorites | create 201, dup 409, delete 204 | ✅ 3/3 |
| Users/Dashboard | stats 200 (COALESCE, ratings ok), reviews 200, dashboard 200 + monthlySeries + upcomingRides | ✅ 4/4 |

## ✅ 4. Quality Audit

| Criterion | Verdict | Notes |
|-----------|---------|-------|
| Auth (username O email) | ✅ | LoginDto `identifier` busca por email o username; convención portafolio |
| Token key consistency | ✅ | Backend `{token}`, frontend `rp_token` en ambos lados (service + interceptor) |
| Interceptor `***` bug | ✅ | Grep 0 hits; `Bearer ${token}` correcto (el `***` del output era el mask del tool) |
| Seed | ✅ | Idempotente (skip si hay datos), `passwordHash` coherente con entity, demo `demo@ridepals.dev`/`demo1234` |
| SeedModule forFeature/exports | ✅ | No crash de arranque |
| Route prefixes | ✅ | `setGlobalPrefix('api')`, controllers sin `api/` duplicado |
| APP_GUARD global | ✅ | No usa APP_GUARD; guards por controller |
| Rate limit login | ✅ | 429 tras intentos fallidos (in-memory) |

### Bugs encontrados y FIXEADOS

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | **ALTA** | `TypeError: ride.datetime.slice is not a function` en search/detail/occurrences/dashboard: TypeORM hydrata columnas `datetime` como objeto `Date` (formato almacenado `YYYY-MM-DD HH:mm:ss.SSS`), pero el servicio asumía ISO string | Transformer en `Ride.datetime` entity: `from: Date → toISOString()` |
| 2 | **MEDIA** | Solapamiento de viajes del conductor nunca detectaba viajes del MISMO día: `BETWEEN` comparaba `toISOString()` (`T…Z`) contra almacenado (`espacio`), mismatch lexicográfico | Pasar objetos `Date` como parámetros para que el driver serialice en el mismo formato |

### Minor Issues
| Issue | Severity | Suggestion |
|-------|----------|-----------|
| `stats` devuelve `co2SavedKg` (no `co2Saved`) | Info | El frontend consume `co2SavedKg`; clave coherente con dashboard. Sin acción |
| Overlap check no cubierto por specs unitarias | Info | Considerar test del BETWEEN con formato driver en future builds |

## ✅ 5. Security Scan

| Check | Result |
|-------|--------|
| `***` malformed template literals (proyecto completo) | ✅ 0 hits |
| Hardcoded secrets / tokens en repo | ✅ Ninguno |
| bcrypt password hashing | ✅ bcryptjs, hash 10 rounds |
| Rate limit en login | ✅ |
| Validación DTO (class-validator) | ✅ whitelist + transform |

## ✅ 6. Deployment

| Target | Result | Details |
|--------|--------|---------|
| GitHub repo | ✅ | `cristiancode-hermes/2026-08-13-ridepals` |
| API | ✅ | Puerto 3058 (3047 ocupado por goal-compass) |
| Caddy subdomain | ✅ | `ridepals.proyectos.cristiancode.dev` |
| manage-apis.sh | ✅ | Registrado PORTS/NAMES/DIRS |
| Landing page | ✅ | proyectos.cristiancode.dev categoría Social |
| Portfolio locales | ✅ | es.ts + en.ts + pt.ts |
| Excel tracker | ✅ | Fila añadida |
| Capture config | ✅ | config.mjs + prod-capture.mjs |

## Summary

**OVERALL: PASS ✅**

2 bugs corregidos (datetime hydration + overlap BETWEEN), 30 tests verdes, 26 checks de endpoints verdes, deploy completo verificado.
