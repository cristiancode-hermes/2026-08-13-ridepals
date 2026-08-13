# RidePals — API Reference

Base: `/api` · Auth: `Authorization: Bearer <token>` (JWT) · Swagger UI en `/docs` (dev).
Errores: `{ statusCode, message, error }`; validación NestJS devuelve `message: string[]`.

## Auth

| Método | Path | Auth | Body | Respuesta |
|---|---|---|---|---|
| POST | `/api/auth/register` | — | `{username (3-30, ^[a-zA-Z0-9_.-]+$), email, password (≥6)}` | 201 `{token, user}` · 409 duplicado |
| POST | `/api/auth/login` | — | `{identifier (username O email), password}` | 200 `{token, user}` · 401 · 429 rate (5 intentos/60 s) |
| GET | `/api/auth/profile` | JWT | — | 200 `User` (sin password) |
| PATCH | `/api/auth/profile` | JWT | `{bio? (≤500)}` | 200 `User` |

## Users

| Método | Path | Auth | Respuesta |
|---|---|---|---|
| GET | `/api/users/:id` | JWT | 200 `{...User, vehicleCount}` · 404 |
| GET | `/api/users/:id/reviews` | JWT | 200 `Review[]` |
| GET | `/api/users/:id/stats` | JWT | 200 `{ridesGiven, ridesTaken, kmSaved, co2SavedKg, moneySaved, avgRating, reviewCount}` |

## Vehicles

| Método | Path | Body | Respuesta |
|---|---|---|---|
| POST | `/api/vehicles` | `{brand, model, plate, seats (2-9), fuelType}` | 201 · 409 máx. 4 |
| GET | `/api/vehicles` | — | 200 `Vehicle[]` (solo míos) |
| PATCH | `/api/vehicles/:id` | `{seats?, fuelType?}` | 200 · 404 |
| DELETE | `/api/vehicles/:id` | — | 204 · 409 si tiene viajes futuros |

## Rides

| Método | Path | Body/Query | Respuesta |
|---|---|---|---|
| POST | `/api/rides` | `{origin, dest, originLat?, originLng?, destLat?, destLng?, datetime, seats, price, vehicleId, recurrence?, notes?}` | 201 `Ride` + `distanceKm` + `rideType` · 400 fecha pasada/plazas · 409 solapamiento ±30 min |
| GET | `/api/rides` | query `{origin?, dest?, date?, seats?, eco?, minRating?}` | 200 `RideOccurrence[]` (con `ride` expandido: driver, vehicle, distanceKm) ordenadas por proximidad |
| GET | `/api/rides/mine` | — | 200 `Ride[]` |
| GET | `/api/rides/:id` | — | 200 `Ride` + conductor + vehículo · 404 |
| PATCH | `/api/rides/:id` | `{price?, seats?, notes?}` | 200 · 403 si no eres el conductor |
| DELETE | `/api/rides/:id` | — | 204 (cancela viaje y reservas futuras) |
| GET | `/api/rides/:id/occurrences` | query `{from, to?}` | 200 `RideOccurrence[]` expandidas |

**Recurrencia (ejemplo):**
```json
{
  "origin": "Plaza del Sol, Madrid", "dest": "Polígono Norte, Alcobendas",
  "originLat": 40.4168, "originLng": -3.7038, "destLat": 40.5050, "destLng": -3.6550,
  "datetime": "2026-08-14T08:10:00Z", "seats": 3, "price": 2.50, "vehicleId": "vhc-1",
  "recurrence": { "weekdays": [1,2,3,4,5], "time": "08:10", "endDate": "2026-12-18" }
}
```

## Bookings

| Método | Path | Body | Respuesta |
|---|---|---|---|
| POST | `/api/bookings` | `{rideId, occurrenceDate, seats}` | 201 `Booking` (pending) · 409 sin plazas / duplicado · 400 propio viaje |
| GET | `/api/bookings/mine` | — | 200 `Booking[]` con ride+conductor+vehículo |
| GET | `/api/bookings/as-driver` | — | 200 `Booking[]` de mis viajes |
| GET | `/api/bookings/:id` | — | 200 completo · 403 no participante |
| PATCH | `/api/bookings/:id/status` | `{status: confirmed\|rejected, reason?}` | 200 · 403 solo conductor |
| PATCH | `/api/bookings/:id/cancel` | `{reason?}` | 200 (cancelled) · 400 si completado |
| POST | `/api/bookings/complete` | `{rideId, occurrenceDate}` | 200 `{completed: n}` (confirmed → completed, habilita reseñas) |

**Concurrencia:** 3 peticiones simultáneas por 1 plaza → exactamente 1 recibe 201; las demás `409 Ya no quedan plazas` (mutex en proceso, ver ARCHITECTURE.md).

## Reviews

| Método | Path | Body | Respuesta |
|---|---|---|---|
| POST | `/api/reviews` | `{bookingId, rating (1-5), comment?}` | 201 · 403 no completado / no participante · 409 duplicada |
| GET | `/api/reviews/ride/:rideId` | — | 200 `Review[]` |

## Messages

| Método | Path | Body | Respuesta |
|---|---|---|---|
| GET | `/api/messages/:rideId` | — | 200 `Message[]` (con sender) · 403 no participante |
| POST | `/api/messages` | `{rideId, bookingId, body (≤1000)}` | 201 · 400 vacío/largo |

## Favorites

| Método | Path | Body | Respuesta |
|---|---|---|---|
| POST | `/api/favorites` | `{origin, dest}` | 201 · 409 duplicado · 400 máx. 10 |
| GET | `/api/favorites` | — | 200 `FavoriteRoute[]` |
| DELETE | `/api/favorites/:id` | — | 204 · 404 |

## Dashboard

| Método | Path | Respuesta |
|---|---|---|
| GET | `/api/dashboard/stats` | 200 `{ridesGiven, ridesTaken, kmSaved, co2SavedKg, moneySaved, avgRating, reviewCount, upcomingRides[6], monthlySeries[6]}` |

## Tipos

```ts
FuelType = 'gasolina' | 'diesel' | 'hibrido' | 'electrico'
BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed'
RideOccurrence = { rideId, date: 'YYYY-MM-DD', time: 'HH:mm', availableSeats, bookedSeats }
```
