import { BookingStatus } from '../common/types';

/**
 * Máquina de estados de una reserva:
 * pending → confirmed | rejected | cancelled
 * confirmed → cancelled | completed
 * rejected | cancelled | completed → terminales
 */
export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['cancelled', 'completed'],
  rejected: [],
  cancelled: [],
  completed: [],
};

export function canTransition(from: string, to: string): boolean {
  return (BOOKING_TRANSITIONS[from as BookingStatus] ?? []).includes(to as BookingStatus);
}

/** Estados que ocupan asiento. */
export const OCCUPYING: BookingStatus[] = ['pending', 'confirmed'];
