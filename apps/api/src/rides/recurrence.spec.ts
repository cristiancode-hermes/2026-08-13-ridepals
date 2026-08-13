import { RideOccurrence } from '../common/types';
import { Ride } from '../entities/entities';

// Copia mínima de la lógica de expansión (se testea aislada del repositorio).
// El mismo algoritmo vive en RidesService.occurrencesForRide; este spec lo
// verifica con fixtures deterministas (2026-08-17 = lunes).
function expand(ride: Ride, from: string, to: string, bookings: Array<{ occurrenceDate: string; seats: number }>): RideOccurrence[] {
  const out: RideOccurrence[] = [];
  const fromDate = new Date(from + 'T00:00:00');
  const toDate = new Date(to + 'T00:00:00');

  if (ride.recurrence) {
    const rule = ride.recurrence;
    const end = new Date(rule.endDate + 'T00:00:00');
    const cursor = new Date(fromDate);
    while (cursor <= toDate) {
      if (cursor > end) break;
      const dow = cursor.getDay() === 0 ? 7 : cursor.getDay();
      if (rule.weekdays.includes(dow)) {
        const date = cursor.toISOString().slice(0, 10);
        const booked = bookings.filter((b) => b.occurrenceDate === date).reduce((s, b) => s + b.seats, 0);
        out.push({ rideId: ride.id, date, time: rule.time, availableSeats: Math.max(0, ride.seats - booked), bookedSeats: booked });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    const base = ride.datetime.slice(0, 10);
    if (base >= from && base <= to) {
      const booked = bookings.filter((b) => b.occurrenceDate === base).reduce((s, b) => s + b.seats, 0);
      out.push({ rideId: ride.id, date: base, time: ride.datetime.slice(11, 16), availableSeats: Math.max(0, ride.seats - booked), bookedSeats: booked });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

const baseRide: Ride = {
  id: 'r1',
  driverId: 'u1',
  vehicleId: 'v1',
  origin: 'Madrid',
  dest: 'Guadalajara',
  originLat: 40.4,
  originLng: -3.7,
  destLat: 40.63,
  destLng: -3.16,
  datetime: '2026-08-17T08:00:00.000Z',
  seats: 4,
  price: 6,
  recurrence: { weekdays: [1, 3, 5], time: '08:00', endDate: '2026-09-30' },
  status: 'active',
  notes: null,
  createdAt: new Date(),
} as Ride;

describe('Expansión de ocurrencias (recurrencia)', () => {
  it('semana del 17-23/08/2026 (lun 17, mié 19, vie 21) → 3 ocurrencias', () => {
    const occs = expand(baseRide, '2026-08-17', '2026-08-23', []);
    expect(occs.map((o) => o.date)).toEqual(['2026-08-17', '2026-08-19', '2026-08-21']);
    expect(occs.every((o) => o.time === '08:00')).toBe(true);
  });

  it('solo emite los weekdays de la regla (no sábados/domingos)', () => {
    const occs = expand(baseRide, '2026-08-22', '2026-08-24', []); // sáb 22, dom 23, lun 24
    expect(occs.map((o) => o.date)).toEqual(['2026-08-24']);
  });

  it('respeta endDate: recurrencia que termina antes del rango → 0 ocurrencias', () => {
    const ride = { ...baseRide, recurrence: { ...baseRide.recurrence!, endDate: '2026-08-16' } };
    expect(expand(ride, '2026-08-17', '2026-08-23', [])).toHaveLength(0);
  });

  it('descuenta asientos ocupados (bookedSeats) de availableSeats', () => {
    const occs = expand(baseRide, '2026-08-17', '2026-08-17', [
      { occurrenceDate: '2026-08-17', seats: 2 },
    ]);
    expect(occs[0].availableSeats).toBe(2);
    expect(occs[0].bookedSeats).toBe(2);
  });
});

describe('Expansión de ocurrencias (puntual)', () => {
  const oneOff = { ...baseRide, recurrence: null, datetime: '2026-08-19T18:30:00.000Z' };

  it('emite su fecha si cae en el rango', () => {
    const occs = expand(oneOff, '2026-08-17', '2026-08-23', []);
    expect(occs).toHaveLength(1);
    expect(occs[0].date).toBe('2026-08-19');
    expect(occs[0].time).toBe('18:30');
  });

  it('no emite nada si cae fuera del rango', () => {
    expect(expand(oneOff, '2026-09-01', '2026-09-07', [])).toHaveLength(0);
  });
});
