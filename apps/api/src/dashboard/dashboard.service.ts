import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, Review, Ride } from '../entities/entities';
import { addDays, haversineKm, toDateStr } from '../common/geo';
import { CO2_PER_KM, DashboardStats } from '../common/types';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Ride) private readonly ridesRepo: Repository<Ride>,
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
    @InjectRepository(Review) private readonly reviewsRepo: Repository<Review>,
  ) {}

  async stats(userId: string): Promise<DashboardStats> {
    // Viajes dados (todos) y tomados (completados como pasajero)
    const ridesGiven = await this.ridesRepo.count({ where: { driverId: userId } });
    const ridesTaken = await this.bookingsRepo.count({
      where: { passengerId: userId, status: 'completed' },
    });

    // Reservas completadas como pasajero → km / CO₂ / € ahorrados
    const completed = await this.bookingsRepo.find({
      where: { passengerId: userId, status: 'completed' },
      relations: { ride: true },
    });
    let kmSaved = 0;
    let moneySaved = 0;
    for (const b of completed) {
      const km = haversineKm(
        b.ride.originLat,
        b.ride.originLng,
        b.ride.destLat,
        b.ride.destLng,
      );
      kmSaved += km;
      moneySaved += b.seats * b.ride.price;
    }
    const co2SavedKg = kmSaved * CO2_PER_KM;

    // Rating recibido
    const reviews = await this.reviewsRepo.find({ where: { targetId: userId } });
    const avgRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
        : 0;

    // Próximos viajes (como pasajero confirmed o como conductor)
    const today = toDateStr(new Date());
    const upcoming: Array<{ rideId: string; date: string; origin: string; dest: string }> = [];
    const myBookings = await this.bookingsRepo.find({
      where: { passengerId: userId, status: 'confirmed' as const },
      relations: { ride: true },
    });
    for (const b of myBookings) {
      if (b.occurrenceDate >= today) {
        upcoming.push({ rideId: b.rideId, date: b.occurrenceDate, origin: b.ride.origin, dest: b.ride.dest });
      }
    }
    const myRides = await this.ridesRepo.find({
      where: { driverId: userId, status: 'active' },
    });
    for (const r of myRides) {
      if (r.datetime.slice(0, 10) >= today) {
        upcoming.push({ rideId: r.id, date: r.datetime.slice(0, 10), origin: r.origin, dest: r.dest });
      }
    }
    upcoming.sort((a, b) => (a.date < b.date ? -1 : 1));

    // Viajes dados por mes (últimos 6 meses)
    const monthly: Record<string, number> = {};
    const from = addDays(new Date(), -180);
    const fromStr = from.toISOString();
    const myAllRides = await this.ridesRepo.find({ where: { driverId: userId } });
    for (const r of myAllRides) {
      const iso = r.datetime.slice(0, 10);
      if (iso < fromStr.slice(0, 10)) continue;
      const month = iso.slice(0, 7);
      monthly[month] = (monthly[month] ?? 0) + 1;
    }
    const monthlySeries = Object.keys(monthly)
      .sort()
      .slice(-6)
      .map((month) => ({ month, rides: monthly[month] }));

    return {
      ridesGiven,
      ridesTaken,
      kmSaved: Math.round(kmSaved * 100) / 100,
      co2SavedKg: Math.round(co2SavedKg * 10) / 10,
      moneySaved: Math.round(moneySaved * 100) / 100,
      avgRating,
      reviewCount: reviews.length,
      upcomingRides: upcoming.slice(0, 6),
      monthlySeries,
    };
  }
}
