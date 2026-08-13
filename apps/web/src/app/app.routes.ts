import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/rides', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPageComponent),
  },
  {
    path: 'rides',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/rides/rides-search.page').then((m) => m.RidesSearchPageComponent),
  },
  {
    path: 'rides/new',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/rides/ride-create.page').then((m) => m.RideCreatePageComponent),
  },
  {
    path: 'rides/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/rides/ride-detail.page').then((m) => m.RideDetailPageComponent),
  },
  {
    path: 'bookings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/bookings/bookings.page').then((m) => m.BookingsPageComponent),
  },
  {
    path: 'bookings/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/bookings/booking-detail.page').then((m) => m.BookingDetailPageComponent),
  },
  {
    path: 'vehicles',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/vehicles/vehicles.page').then((m) => m.VehiclesPageComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePageComponent),
  },
  {
    path: 'profile/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/public-profile.page').then((m) => m.PublicProfilePageComponent),
  },
  {
    path: 'messages/:rideId',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/messages/messages.page').then((m) => m.MessagesPageComponent),
  },
  {
    path: 'favorites',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/favorites/favorites.page').then((m) => m.FavoritesPageComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPageComponent),
  },
  { path: '**', redirectTo: '/rides' },
];
