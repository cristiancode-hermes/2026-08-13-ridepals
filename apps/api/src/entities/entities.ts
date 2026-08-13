import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 30 })
  username: string;

  @Column({ unique: true, length: 255 })
  email: string;

  /** Nunca serializar: expuesto vía ClassSerializerInterceptor global. */
  @Exclude()
  @Column()
  passwordHash: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Vehicle, (v) => v.owner)
  vehicles: Vehicle[];

  @OneToMany(() => Ride, (r) => r.driver)
  rides: Ride[];

  @OneToMany(() => Booking, (b) => b.passenger)
  bookings: Booking[];
}

@Entity('vehicles')
@Index(['ownerId'])
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerId: string;

  @ManyToOne(() => User, (u) => u.vehicles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ length: 50 })
  brand: string;

  @Column({ length: 50 })
  model: string;

  @Column({ unique: true, length: 10 })
  plate: string;

  @Column({ type: 'smallint' })
  seats: number;

  @Column({ length: 10 })
  fuelType: string;
}

@Entity('rides')
@Index(['driverId'])
@Index(['originLat', 'originLng'])
@Index(['datetime'])
export class Ride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  driverId: string;

  @ManyToOne(() => User, (u) => u.rides, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driverId' })
  driver: User;

  @Column()
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column({ length: 150 })
  origin: string;

  @Column({ length: 150 })
  dest: string;

  @Column({ type: 'real' })
  originLat: number;

  @Column({ type: 'real' })
  originLng: number;

  @Column({ type: 'real' })
  destLat: number;

  @Column({ type: 'real' })
  destLng: number;

  /** Fecha base: puntual = fecha real; recurrente = primera ocurrencia. ISO string. */
  @Column({
    type: 'datetime',
    transformer: {
      to: (v: string) => v,
      from: (v: Date | string) => (v instanceof Date ? v.toISOString() : v),
    },
  })
  datetime: string;

  @Column({ type: 'smallint' })
  seats: number;

  @Column({ type: 'real' })
  price: number;

  /** Regla de recurrencia {weekdays, time, endDate} — JSONB en Neon, TEXT en SQLite. */
  @Column({ type: 'simple-json', nullable: true })
  recurrence: RecurrenceRule | null;

  @Column({ length: 12, default: 'active' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Booking, (b) => b.ride)
  bookings: Booking[];
}

export interface RecurrenceRule {
  /** 1=lunes … 7=domingo */
  weekdays: number[];
  /** "HH:mm" hora de salida */
  time: string;
  /** "YYYY-MM-DD" fecha fin inclusiva */
  endDate: string;
}

@Entity('bookings')
@Index(['rideId', 'occurrenceDate'])
@Index(['passengerId'])
@Index(['status'])
@Index(['rideId', 'occurrenceDate', 'passengerId'], { unique: true })
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  rideId: string;

  @ManyToOne(() => Ride, (r) => r.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rideId' })
  ride: Ride;

  @Column()
  passengerId: string;

  @ManyToOne(() => User, (u) => u.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'passengerId' })
  passenger: User;

  /** "YYYY-MM-DD" — fecha concreta de la ocurrencia */
  @Column({ type: 'date' })
  occurrenceDate: string;

  @Column({ type: 'smallint' })
  seats: number;

  @Column({ length: 12, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  cancelReason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('reviews')
@Index(['targetId'])
@Index(['bookingId', 'authorId'], { unique: true })
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column()
  authorId: string;

  @Column()
  targetId: string;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('messages')
@Index(['rideId', 'bookingId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  rideId: string;

  @Column()
  bookingId: string;

  @Column()
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ length: 1000 })
  body: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('favorite_routes')
@Index(['userId', 'origin', 'dest'], { unique: true })
export class FavoriteRoute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ length: 150 })
  origin: string;

  @Column({ length: 150 })
  dest: string;

  @CreateDateColumn()
  createdAt: Date;
}
