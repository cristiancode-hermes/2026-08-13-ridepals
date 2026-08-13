// Tipos compartidos del dominio RidePals

export type FuelType = 'gasolina' | 'diesel' | 'hibrido' | 'electrico';
export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
export type RideStatus = 'active' | 'cancelled';

export const FUEL_TYPES: FuelType[] = ['gasolina', 'diesel', 'hibrido', 'electrico'];

export const ECO_FUEL_TYPES: FuelType[] = ['hibrido', 'electrico'];

/** Factor medio de CO₂ por km recorrido en coche ocupado (España, kg CO₂/km). */
export const CO2_PER_KM = 0.1162;

/** Radio medio terrestre en km (haversine). */
export const EARTH_RADIUS_KM = 6371;

export interface RecurrenceRule {
  /** 1=lunes … 7=domingo */
  weekdays: number[];
  /** "HH:mm" */
  time: string;
  /** "YYYY-MM-DD" inclusiva */
  endDate: string;
}

/** Ocurrencia concreta de un viaje (puntual = 1; recurrente = expandida). */
export interface RideOccurrence {
  rideId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (de la ocurrencia)
  availableSeats: number;
  bookedSeats: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Estadísticas de un usuario (COALESCE → 0). */
export interface UserStats {
  ridesGiven: number;
  ridesTaken: number;
  kmSaved: number;
  co2SavedKg: number;
  moneySaved: number;
  avgRating: number;
  reviewCount: number;
}

export interface MonthlyRideCount {
  month: string; // YYYY-MM
  rides: number;
}

/** Dashboard personal. */
export interface DashboardStats {
  ridesGiven: number;
  ridesTaken: number;
  kmSaved: number;
  co2SavedKg: number;
  moneySaved: number;
  avgRating: number;
  reviewCount: number;
  upcomingRides: Array<{ rideId: string; date: string; origin: string; dest: string }>;
  monthlySeries: MonthlyRideCount[];
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  completed: 'Completada',
};
