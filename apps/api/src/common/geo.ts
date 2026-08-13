import { CO2_PER_KM, EARTH_RADIUS_KM } from './types';

/** Distancia haversine en km entre dos puntos. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/** CO₂ ahorrado (kg) por una distancia recorrida en coche compartido. */
export function co2SavedKg(distanceKm: number): number {
  return distanceKm * CO2_PER_KM;
}

/** Formatea un Date como "YYYY-MM-DD" (local). */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Formatea un Date como "HH:mm" (local). */
export function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Suma n días a una fecha. */
export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** ISO-8601 (UTC) del Date actual + n días. */
export function isoDaysFromNow(days: number): string {
  return addDays(new Date(), days).toISOString();
}
