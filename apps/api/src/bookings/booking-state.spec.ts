import { canTransition, OCCUPYING } from './booking-state';
import { BookingStatus } from '../common/types';

describe('Máquina de estados de reservas', () => {
  const ALL: BookingStatus[] = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'];

  it('pending → confirmed | rejected | cancelled (permitido)', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true);
    expect(canTransition('pending', 'rejected')).toBe(true);
    expect(canTransition('pending', 'cancelled')).toBe(true);
  });

  it('confirmed → cancelled | completed (permitido)', () => {
    expect(canTransition('confirmed', 'cancelled')).toBe(true);
    expect(canTransition('confirmed', 'completed')).toBe(true);
  });

  it('estados terminales (rejected, cancelled, completed) no transicionan', () => {
    for (const terminal of ['rejected', 'cancelled', 'completed'] as BookingStatus[]) {
      for (const next of ALL) {
        expect(canTransition(terminal, next)).toBe(false);
      }
    }
  });

  it('transiciones inválidas desde pending/confirmed', () => {
    expect(canTransition('pending', 'completed')).toBe(false);
    expect(canTransition('confirmed', 'rejected')).toBe(false);
    expect(canTransition('confirmed', 'confirmed')).toBe(false);
  });

  it('OCCUPYING (reservas que ocupan plaza) = pending + confirmed', () => {
    expect(OCCUPYING).toEqual(expect.arrayContaining(['pending', 'confirmed']));
    expect(OCCUPYING).not.toContain('cancelled');
    expect(OCCUPYING).not.toContain('rejected');
    expect(OCCUPYING).not.toContain('completed');
  });
});
