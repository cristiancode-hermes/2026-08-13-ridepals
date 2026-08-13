import { co2SavedKg, haversineKm } from './geo';

describe('haversineKm (distancias reales)', () => {
  it('Madrid → Barcelona ≈ 505 km (±5%)', () => {
    const km = haversineKm(40.4168, -3.7038, 41.3874, 2.1686);
    expect(km).toBeGreaterThan(480);
    expect(km).toBeLessThan(530);
  });

  it('el mismo punto → 0 km', () => {
    expect(haversineKm(40.4168, -3.7038, 40.4168, -3.7038)).toBe(0);
  });

  it('es simétrica (A→B === B→A)', () => {
    const ab = haversineKm(40.4168, -3.7038, 41.3874, 2.1686);
    const ba = haversineKm(41.3874, 2.1686, 40.4168, -3.7038);
    expect(Math.abs(ab - ba)).toBeLessThan(0.001);
  });
});

describe('co2SavedKg', () => {
  it('factor por km (CO2_PER_KM = 0.1162 kg/km)', () => {
    expect(co2SavedKg(100)).toBeCloseTo(11.62, 2);
    expect(co2SavedKg(0)).toBe(0);
  });
});
