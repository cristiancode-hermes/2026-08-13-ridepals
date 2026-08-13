# RidePals — Frontend (Angular 22)

Aplicación Angular 22 standalone + Tailwind v4, design system **"Open Road"**
(definido en las specs `DESIGN_SYSTEM.md`; implementado en `apps/web/src/styles.source.css`).

## Stack

- **Angular 22** standalone, zoneless (`provideZonelessChangeDetection`), lazy routes con `loadComponent`.
- **Tailwind CSS v4** pre-compilado con `scripts/build-css.cjs` (postcss + `@tailwindcss/postcss`).
  Angular 22 no procesa `@import "tailwindcss"` → se compila `styles.source.css → styles.css` antes de `ng build`.
- Señales (`signal`/`computed`) en todos los servicios y páginas. Sin NgModules, sin RxJS de estado.

## Design system "Open Road"

Paleta de señalética vial europea + conducción nocturna (filosofía de superficies PostHog):

| Token (light) | Valor | Uso |
|---|---|---|
| `bg` | `#F7F7F4` | Fondo página |
| `surface` / `surface-muted` | `#FFFFFF` / `#EEF0EC` | Tarjetas / secundarios |
| `ink` / `ink-muted` / `ink-faint` | `#1C2430` / `#5A6472` / `#8A93A0` | Texto 1º/2º/placeholder |
| `primary` | `#0E7A4B` | Acciones (verde autopista) |
| `accent` | `#EA580C` | Naranja cono de obra: hover flash, CTA "Publicar" |
| `border` | `#D8DCD4` | Bordes 1px (separación, no sombras) |

Dark mode: clase `.dark` en `<html>` intercambia los tokens por variable (asfalto nocturno);
las utilidades generadas por `@theme` se recoloran solas (sin prefijos `dark:`).

**Reglas Impeccable aplicadas:** sin gradient text, sin glassmorphism, sin side-stripe borders,
sin card grids idénticos sin variación, sin eyebrows uppercase, motion 150-250 ms ease-out-expo,
`prefers-reduced-motion: reduce` global, contraste verificado (accent-hover `#C2410C` sobre blanco = AA).

Tipografía: **Space Grotesk** (display), **Inter** (body), **JetBrains Mono** (matrículas, fechas, precios).
`text-wrap: balance` en h1-h3.

## Rutas (13 lazy chunks)

| Ruta | Página | Notas |
|---|---|---|
| `/login` · `/register` | Auth | `guestGuard`; login con username O email; credenciales demo visibles bajo el formulario (inputs vacíos, `autocomplete` off) |
| `/rides` | Búsqueda | formulario + resultados `repeat(auto-fit, minmax(280px,1fr))`, chips de rutas favoritas, query params `?origin&dest` |
| `/rides/new` | Publicar | puntual (datetime-local) o recurrente (días L-D + hora + fin); requiere vehículo |
| `/rides/:id` | Detalle | reserva (plazas × precio), ocurrencias, reseñas, cancelar (conductor) |
| `/bookings` | Mis reservas | pestañas pasajero/conductor |
| `/bookings/:id` | Detalle reserva | confirmar/rechazar (conductor), cancelar (pasajero), completar viaje |
| `/vehicles` | CRUD | añadir/editar/eliminar, badge eco |
| `/profile` | Mi perfil | editar bio |
| `/profile/:id` | Perfil público | stats + reseñas recibidas |
| `/messages/:rideId` | Hilo | burbujas, envío (conductor usa `as-driver` para resolver el booking) |
| `/favorites` | Rutas | guardar/eliminar/buscar |
| `/dashboard` | Panel | KPIs (viajes, km, €, CO₂), rating, barras mensuales, próximos |

## Servicios

| Servicio | Responsabilidad |
|---|---|
| `AuthService` | token `rp_token` en localStorage, señales `token/user/isAuthenticated`, login/register/profile, logout |
| `ThemeService` | `rp_theme` en localStorage, clase `.dark`, default light |
| `ToastService` | toasts por señal (éxito/error/info), 3.5 s |
| `authInterceptor` | inyecta `Authorization: Bearer` en `/api/*` salvo login/register |
| `apiError()` | extrae `message` de errores NestJS (string o array) |

## Estructura

```
apps/web/src/
├── index.html            # fuentes Google + script de tema pre-paint (sin flash)
├── styles.source.css     # @theme Open Road + dark swap + componentes base (versionado)
├── styles.css            # compilado por build-css.cjs (no tocar)
├── main.ts               # bootstrapApplication
└── app/
    ├── app.config.ts / app.routes.ts / app.component.ts (shell: nav, mobile nav, toasts, footer)
    ├── guards/           # authGuard, guestGuard (funcionales)
    ├── interceptors/     # auth.interceptor.ts
    ├── interfaces/       # models.ts (espejo de la API)
    ├── services/         # auth, theme, toast
    ├── shared/           # ride-card, status-badge, stars, empty-state
    ├── utils/            # errors.ts
    └── pages/            # login, register, rides×3, bookings×2, vehicles, profile×2, messages, favorites, dashboard
```

## Build

```bash
cd apps/web
npm run build:css   # styles.source.css → styles.css (Tailwind v4)
npm run build       # build:css + ng build → dist/web/browser/
```

## Notas de implementación

- `private readonly x` NO es accesible desde templates (strict templates): usar `protected` cuando el template lo referencia.
- Objetos `Record<string, unknown>` requieren acceso por corchetes (`body['recurrence']`).
- El hilo de mensajes guarda el `bookingId` en `localStorage('rp_last_booking')` para que el conductor pueda responder sin haber recibido mensajes aún.
- Demo: `demo@ridepals.dev / demo1234` (seed idempotente de la API).
