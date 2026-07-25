import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── ENUMS ──────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["customer", "driver", "admin", "super_admin"]);
export const driverStatusEnum = pgEnum("driver_status", ["pending", "approved", "suspended"]);
export const vehicleCategoryEnum = pgEnum("vehicle_category", ["auto", "moto", "other"]);
export const tripStatusEnum = pgEnum("trip_status", [
  "searching",
  "accepted",
  "arriving",
  "in_progress",
  "completed",
  "cancelled",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "mercadopago", "card"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "trip_request",
  "trip_accepted",
  "driver_arriving",
  "trip_started",
  "trip_completed",
  "trip_cancelled",
  "system",
]);

// ─── CITIES ─────────────────────────────────────────────────────────────────

export const citiesTable = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  state: text("state"),
  isActive: boolean("is_active").notNull().default(true),
  lat: real("lat"),
  lng: real("lng"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCitySchema = createInsertSchema(citiesTable).omit({ id: true, createdAt: true });
export type InsertCity = z.infer<typeof insertCitySchema>;
export type City = typeof citiesTable.$inferSelect;

// ─── SERVICE TYPES ───────────────────────────────────────────────────────────

export const serviceTypesTable = pgTable("service_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("car"),
  description: text("description").notNull().default(""),
  category: vehicleCategoryEnum("category").notNull().default("auto"),
  basePrice: real("base_price").notNull().default(0),
  pricePerKm: real("price_per_km").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertServiceTypeSchema = createInsertSchema(serviceTypesTable).omit({ id: true, createdAt: true });
export type InsertServiceType = z.infer<typeof insertServiceTypeSchema>;
export type ServiceType = typeof serviceTypesTable.$inferSelect;

// ─── USERS ───────────────────────────────────────────────────────────────────

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  role: userRoleEnum("role").notNull().default("customer"),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  email: text("email").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// ─── DRIVER PROFILES ─────────────────────────────────────────────────────────

export const driversTable = pgTable("drivers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: driverStatusEnum("status").notNull().default("pending"),
  isAvailable: boolean("is_available").notNull().default(false),
  rating: real("rating").notNull().default(5.0),
  totalTrips: integer("total_trips").notNull().default(0),
  totalEarnings: real("total_earnings").notNull().default(0),
  serviceTypeId: integer("service_type_id").references(() => serviceTypesTable.id),
  bio: text("bio"),
  lat: real("lat"),
  lng: real("lng"),
  // Personal / identity
  dni: text("dni"),
  birthDate: timestamp("birth_date"),
  address: text("address"),
  // Emergency contact
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  // Driver's license
  licenseNumber: text("license_number"),
  licenseExpiry: timestamp("license_expiry"),
  licensePhotoUrl: text("license_photo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDriverSchema = createInsertSchema(driversTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof driversTable.$inferSelect;

// ─── VEHICLES ────────────────────────────────────────────────────────────────

export const vehiclesTable = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driversTable.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  plate: text("plate").notNull(),
  color: text("color").notNull(),
  serviceTypeId: integer("service_type_id").notNull().references(() => serviceTypesTable.id),
  photoUrl: text("photo_url"),
  capacity: integer("capacity").notNull().default(4),
  // Documents
  insuranceExpiry: timestamp("insurance_expiry"),
  technicalInspectionExpiry: timestamp("technical_inspection_expiry"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVehicleSchema = createInsertSchema(vehiclesTable).omit({ id: true, createdAt: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehiclesTable.$inferSelect;

// ─── TRIPS ───────────────────────────────────────────────────────────────────

export const tripsTable = pgTable("trips", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => usersTable.id),
  driverId: integer("driver_id").references(() => driversTable.id),
  status: tripStatusEnum("status").notNull().default("searching"),
  pickupAddress: text("pickup_address").notNull(),
  pickupLat: real("pickup_lat").notNull(),
  pickupLng: real("pickup_lng").notNull(),
  destinationAddress: text("destination_address").notNull(),
  destinationLat: real("destination_lat").notNull(),
  destinationLng: real("destination_lng").notNull(),
  serviceTypeId: integer("service_type_id").notNull().references(() => serviceTypesTable.id),
  estimatedPrice: real("estimated_price"),
  finalPrice: real("final_price"),
  paymentMethod: paymentMethodEnum("payment_method").default("cash"),
  cancelReason: text("cancel_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const insertTripSchema = createInsertSchema(tripsTable).omit({ id: true, createdAt: true });
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof tripsTable.$inferSelect;

// ─── PAYMENTS ────────────────────────────────────────────────────────────────

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => tripsTable.id),
  driverId: integer("driver_id").notNull().references(() => driversTable.id),
  amount: real("amount").notNull(),
  driverAmount: real("driver_amount").notNull(),
  platformAmount: real("platform_amount").notNull(),
  method: paymentMethodEnum("method").notNull().default("cash"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  tripId: integer("trip_id").references(() => tripsTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;

// ─── FAVORITE LOCATIONS ──────────────────────────────────────────────────────

export const favoriteLocationsTable = pgTable("favorite_locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  address: text("address").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  icon: text("icon").default("home"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFavoriteLocationSchema = createInsertSchema(favoriteLocationsTable).omit({ id: true, createdAt: true });
export type InsertFavoriteLocation = z.infer<typeof insertFavoriteLocationSchema>;
export type FavoriteLocation = typeof favoriteLocationsTable.$inferSelect;

// ─── PLATFORM CONFIG ─────────────────────────────────────────────────────────

export const platformConfigTable = pgTable("platform_config", {
  id: serial("id").primaryKey(),
  commissionPercent: real("commission_percent").notNull().default(20),
  minTripPrice: real("min_trip_price").notNull().default(100),
  maxSearchRadius: real("max_search_radius").notNull().default(10),
  allowedPaymentMethods: text("allowed_payment_methods").notNull().default('["cash","mercadopago","card"]'),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PlatformConfig = typeof platformConfigTable.$inferSelect;
