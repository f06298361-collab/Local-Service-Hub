import { Router } from "express";
import {
  db,
  tripsTable,
  driversTable,
  usersTable,
  serviceTypesTable,
  notificationsTable,
  paymentsTable,
  platformConfigTable,
} from "@workspace/db";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../lib/authMiddleware";

const router = Router();

// GET /api/trips/active — active trip for current user
router.get("/active", requireAuth, async (req: AuthenticatedRequest, res) => {
  const activeStatuses = ["searching", "accepted", "arriving", "in_progress"] as const;
  const [trip] = await db
    .select()
    .from(tripsTable)
    .where(
      and(
        eq(tripsTable.customerId, req.user!.id),
        or(
          eq(tripsTable.status, "searching"),
          eq(tripsTable.status, "accepted"),
          eq(tripsTable.status, "arriving"),
          eq(tripsTable.status, "in_progress"),
        ),
      ),
    )
    .orderBy(desc(tripsTable.createdAt))
    .limit(1);

  if (!trip) { res.status(404).json({ error: "No active trip" }); return; }

  // Attach related data
  const [stype] = await db.select().from(serviceTypesTable).where(eq(serviceTypesTable.id, trip.serviceTypeId)).limit(1);
  let driverData = null;
  if (trip.driverId) {
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, trip.driverId)).limit(1);
    if (driver) {
      const [dUser] = await db.select().from(usersTable).where(eq(usersTable.id, driver.userId)).limit(1);
      driverData = {
        id: driver.id,
        firstName: dUser?.firstName ?? "",
        lastName: dUser?.lastName ?? "",
        avatarUrl: dUser?.avatarUrl ?? null,
        rating: driver.rating,
        totalTrips: driver.totalTrips,
        isAvailable: driver.isAvailable,
        serviceTypeId: driver.serviceTypeId,
        serviceTypeName: stype?.name ?? "",
        lat: driver.lat,
        lng: driver.lng,
        vehicleMake: null,
        vehicleModel: null,
        vehicleColor: null,
        vehiclePlate: null,
        vehiclePhotoUrl: null,
      };
    }
  }

  const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, trip.customerId)).limit(1);
  res.json({ ...trip, customer: customer ?? null, driver: driverData, serviceType: stype ?? null });
});

// POST /api/trips — request a trip
router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const {
    pickupAddress, pickupLat, pickupLng,
    destinationAddress, destinationLat, destinationLng,
    serviceTypeId, paymentMethod, notes,
  } = req.body;

  // Calculate estimated price
  const [config] = await db.select().from(platformConfigTable).limit(1);
  const [stype] = await db.select().from(serviceTypesTable).where(eq(serviceTypesTable.id, serviceTypeId)).limit(1);
  const distKm = Math.sqrt(
    Math.pow((destinationLat - pickupLat) * 111, 2) +
    Math.pow((destinationLng - pickupLng) * 111, 2),
  );
  const estimatedPrice = stype
    ? Math.max(
        (config?.minTripPrice ?? 100),
        stype.basePrice + stype.pricePerKm * distKm,
      )
    : config?.minTripPrice ?? 100;

  const [trip] = await db.insert(tripsTable).values({
    customerId: req.user!.id,
    serviceTypeId,
    pickupAddress,
    pickupLat,
    pickupLng,
    destinationAddress,
    destinationLat,
    destinationLng,
    paymentMethod: paymentMethod ?? "cash",
    notes: notes ?? null,
    estimatedPrice,
    status: "searching",
  }).returning();

  res.status(201).json(trip);
});

// GET /api/trips/:id
router.get("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id)).limit(1);
  if (!trip) { res.status(404).json({ error: "Not found" }); return; }

  const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, trip.customerId)).limit(1);
  const [stype] = await db.select().from(serviceTypesTable).where(eq(serviceTypesTable.id, trip.serviceTypeId)).limit(1);

  let driverData = null;
  if (trip.driverId) {
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, trip.driverId)).limit(1);
    if (driver) {
      const [dUser] = await db.select().from(usersTable).where(eq(usersTable.id, driver.userId)).limit(1);
      driverData = {
        id: driver.id,
        firstName: dUser?.firstName ?? "",
        lastName: dUser?.lastName ?? "",
        avatarUrl: dUser?.avatarUrl ?? null,
        rating: driver.rating,
        totalTrips: driver.totalTrips,
        isAvailable: driver.isAvailable,
        serviceTypeId: driver.serviceTypeId,
        serviceTypeName: stype?.name ?? "",
        lat: driver.lat,
        lng: driver.lng,
        vehicleMake: null,
        vehicleModel: null,
        vehicleColor: null,
        vehiclePlate: null,
        vehiclePhotoUrl: null,
      };
    }
  }

  res.json({ ...trip, customer: customer ?? null, driver: driverData, serviceType: stype ?? null });
});

// PATCH /api/trips/:id/status — update trip status
router.patch("/:id/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { status, driverId } = req.body;

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id)).limit(1);
  if (!trip) { res.status(404).json({ error: "Not found" }); return; }

  const now = new Date();
  const updates: Record<string, unknown> = { status };

  if (status === "accepted") {
    updates.driverId = driverId;
    updates.acceptedAt = now;
  } else if (status === "in_progress") {
    updates.startedAt = now;
  } else if (status === "completed") {
    updates.completedAt = now;

    // Create payment record
    const [config] = await db.select().from(platformConfigTable).limit(1);
    const commissionPct = config?.commissionPercent ?? 20;
    const amount = trip.finalPrice ?? trip.estimatedPrice ?? 0;
    const platformAmount = (amount * commissionPct) / 100;
    const driverAmount = amount - platformAmount;

    if (trip.driverId) {
      await db.insert(paymentsTable).values({
        tripId: trip.id,
        driverId: trip.driverId,
        amount,
        driverAmount,
        platformAmount,
        method: trip.paymentMethod ?? "cash",
        status: "completed",
      });

      // Update driver stats
      await db.update(driversTable)
        .set({
          totalTrips: sql`total_trips + 1`,
          totalEarnings: sql`total_earnings + ${driverAmount}`,
        })
        .where(eq(driversTable.id, trip.driverId));
    }
  }

  const [updated] = await db.update(tripsTable)
    .set(updates as any)
    .where(eq(tripsTable.id, id))
    .returning();

  // Notify customer
  const notifMap: Record<string, { title: string; body: string }> = {
    accepted: { title: "Conductor asignado", body: "Un conductor aceptó tu viaje y está en camino." },
    arriving: { title: "Conductor llegando", body: "Tu conductor está llegando a buscarte." },
    in_progress: { title: "Viaje iniciado", body: "Tu viaje ha comenzado. ¡Buen viaje!" },
    completed: { title: "Viaje completado", body: "Tu viaje ha finalizado. ¡Gracias por usar TransMóvil!" },
  };
  const notif = notifMap[status];
  if (notif && trip.customerId) {
    const typeMap: Record<string, any> = {
      accepted: "trip_accepted",
      arriving: "driver_arriving",
      in_progress: "trip_started",
      completed: "trip_completed",
    };
    await db.insert(notificationsTable).values({
      userId: trip.customerId,
      type: typeMap[status] ?? "system",
      title: notif.title,
      body: notif.body,
      tripId: trip.id,
    });
  }

  res.json(updated);
});

// PATCH /api/trips/:id/cancel
router.patch("/:id/cancel", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { reason } = req.body;

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id)).limit(1);
  if (!trip) { res.status(404).json({ error: "Not found" }); return; }

  const [updated] = await db.update(tripsTable)
    .set({ status: "cancelled", cancelReason: reason ?? null })
    .where(eq(tripsTable.id, id))
    .returning();

  // Notify the other party
  const targetUserId = req.user!.id === trip.customerId
    ? trip.driverId // notify driver (need driver's userId)
    : trip.customerId;

  if (targetUserId) {
    await db.insert(notificationsTable).values({
      userId: targetUserId,
      type: "trip_cancelled",
      title: "Viaje cancelado",
      body: reason ? `Viaje cancelado: ${reason}` : "El viaje fue cancelado.",
      tripId: trip.id,
    });
  }

  res.json(updated);
});

export default router;
