// ── Modelos del dominio RidePals (espejo de la API) ──────────────

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  bio: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export type FuelType = 'gasolina' | 'diesel' | 'hibrido' | 'electrico';
export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
export type RideStatus = 'active' | 'cancelled';

export const FUEL_LABELS: Record<FuelType, string> = {
  gasolina: 'Gasolina',
  diesel: 'Diésel',
  hibrido: 'Híbrido',
  electrico: 'Eléctrico',
};

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  completed: 'Completada',
};

export interface Vehicle {
  id: string;
  ownerId: string;
  brand: string;
  model: string;
  plate: string;
  seats: number;
  fuelType: FuelType;
  createdAt: string;
}

export interface RecurrenceRule {
  weekdays: number[];
  time: string;
  endDate: string;
}

export interface Ride {
  id: string;
  driverId: string;
  vehicleId: string;
  origin: string;
  dest: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  datetime: string;
  seats: number;
  price: number;
  recurrence: RecurrenceRule | null;
  status: RideStatus;
  notes: string | null;
  createdAt: string;
  distanceKm?: number;
  driver?: AuthUser;
  vehicle?: Vehicle;
}

export interface RideOccurrence {
  rideId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  availableSeats: number;
  bookedSeats: number;
  ride?: Ride;
}

export interface Booking {
  id: string;
  rideId: string;
  passengerId: string;
  occurrenceDate: string;
  seats: number;
  status: BookingStatus;
  cancelReason: string | null;
  createdAt: string;
  ride?: Ride;
  passenger?: AuthUser;
}

export interface Review {
  id: string;
  bookingId: string;
  authorId: string;
  targetId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author?: AuthUser;
}

export interface Message {
  id: string;
  rideId: string;
  bookingId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender?: AuthUser;
}

export interface FavoriteRoute {
  id: string;
  userId: string;
  origin: string;
  dest: string;
  createdAt: string;
}

export interface UserStats {
  ridesGiven: number;
  ridesTaken: number;
  kmSaved: number;
  co2SavedKg: number;
  moneySaved: number;
  avgRating: number;
  reviewCount: number;
}

export interface DashboardStats {
  ridesGiven: number;
  ridesTaken: number;
  kmSaved: number;
  co2SavedKg: number;
  moneySaved: number;
  avgRating: number;
  reviewCount: number;
  upcomingRides: Array<{ rideId: string; date: string; origin: string; dest: string }>;
  monthlySeries: Array<{ month: string; rides: number }>;
}

export interface PublicUser extends AuthUser {
  vehicleCount: number;
}
