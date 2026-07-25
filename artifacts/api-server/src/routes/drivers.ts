import { Router } from "express";
import {
  db,
  driversTable,
  usersTable,
  vehiclesTable,
  serviceTypesTable,
  tripsTable,
  paymentsTable,
} from "@workspace/db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../lib/authMiddleware";

const router = Router();

// Helper: build public driver object
async function buildDriverPublic(driver: typeof driversTable.$inferSelect) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, driver.userId)).limit(1);
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.driverId, driver.id)).limit(1);
  const [stype] = await db.select().from(serviceTypesTable).where(eq(serviceTypesTable.id, driver.serviceTypeId)).limit(1);
  return {
    id: driver.id,
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    avatarUrl: user?.avatarUrl ?? null,
    rating: driver.rating,
    totalTrips: driver.totalTrips,
    isAvailable: driver.isAvailable,
    serviceTypeId: driver.serviceTypeId,
    serviceTypeName: stype?.name ?? "",
    vehicleMake: vehicle?.make ?? null,
    vehicleModel: vehicle?.model ?? null,
    vehicleColor: vehicle?.color ?? null,
    vehiclePlate: vehicle?.plate ?? null,
    vehiclePhotoUrl: vehicle?.photoUrl ?? null,
    lat: driver.lat,
    lng: driver.lng,
  };
}

// GET /api/drivers/available
router.get("/available", requireAuth, async (req: AuthenticatedRequest, res) => {
  const serviceTypeId = req.query.serviceTypeId ? Number(req.query.serviceTypeId) : undefined;
  const conditions = [eq(driversTable.isOnline, true), eq(driversTable.isAvailable, true), eq(driversTable.status, "approved")];
  if (serviceTypeId) conditions.push(eq(driversTable.serviceTypeId, serviceTypeId));

  const drivers = await db
    .select()
    .from(driversTable)
    .where(and(...conditions))
    .limit(20);

  const result = await Promise.all(drivers.map(buildDriverPublic));
  res.json(result);
});

// GET /api/drivers/me
router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const [driver] = await db
    .select()
    .from(driversTable)
    .where(eq(driversTable.userId, req.user!.id))
    .limit(1);
  if (!driver) { res.status(404).json({ error: "Not a driver" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, driver.userId)).limit(1);
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.driverId, driver.id)).limit(1);
  const [stype] = await db.select().from(serviceTypesTable).where(eq(serviceTypesTable.id, driver.serviceTypeId)).limit(1);
  res.json({ ...driver, user, vehicle: vehicle ?? null, serviceType: stype ?? null });
});

// POST /api/drivers/me — register as driver
router.post("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const {
    serviceTypeId, bio,
    dni, birthDate, address,
    emergencyContactName, emergencyContactPhone,
    licenseNumber, licenseExpiry, licensePhotoUrl,
  } = req.body;
  const existing = await db.select().from(driversTable).where(eq(driversTable.userId, req.user!.id)).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Already a driver" }); return; }

  const [driver] = await db.insert(driversTable).values({
    userId: req.user!.id,
    serviceTypeId: serviceTypeId ?? null,
    bio: bio ?? null,
    status: "pending",
    dni: dni ?? null,
    birthDate: birthDate ? new Date(birthDate) : null,
    address: address ?? null,
    emergencyContactName: emergencyContactName ?? null,
    emergencyContactPhone: emergencyContactPhone ?? null,
    licenseNumber: licenseNumber ?? null,
    licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
    licensePhotoUrl: licensePhotoUrl ?? null,
  }).returning();

  // Update user role
  await db.update(usersTable).set({ role: "driver" }).where(eq(usersTable.id, req.user!.id));

  res.status(201).json(driver);
});

// PATCH /api/drivers/me
router.patch("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const {
    serviceTypeId, bio,
    dni, birthDate, address,
    emergencyContactName, emergencyContactPhone,
    licenseNumber, licenseExpiry, licensePhotoUrl,
  } = req.body;
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, req.user!.id)).limit(1);
  if (!driver) { res.status(404).json({ error: "Not a driver" }); return; }

  const [updated] = await db.update(driversTable)
    .set({
      ...(serviceTypeId !== undefined && { serviceTypeId }),
      ...(bio !== undefined && { bio }),
      ...(dni !== undefined && { dni }),
      ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
      ...(address !== undefined && { address }),
      ...(emergencyContactName !== undefined && { emergencyContactName }),
      ...(emergencyContactPhone !== undefined && { emergencyContactPhone }),
      ...(licenseNumber !== undefined && { licenseNumber }),
      ...(licenseExpiry !== undefined && { licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null }),
      ...(licensePhotoUrl !== undefined && { licensePhotoUrl }),
      updatedAt: new Date(),
    })
    .where(eq(driversTable.id, driver.id))
    .returning();
  res.json(updated);
});

// GET /api/drivers/me/status — current availability snapshot
router.get("/me/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, req.user!.id)).limit(1);
  if (!driver) { res.status(404).json({ error: "Not a driver" }); return; }
  res.json({
    status: driver.status,
    isOnline: driver.isOnline,
    isAvailable: driver.isAvailable,
    availabilityUpdatedAt: driver.availabilityUpdatedAt,
    lat: driver.lat,
    lng: driver.lng,
    // Derived: truly ready to receive trip requests
    readyForTrips: driver.status === "approved" && driver.isOnline && driver.isAvailable,
  });
});

// PATCH /api/drivers/me/availability
// isOnline:   true → driver activated (went online); false → driver deactivated (went offline)
// isAvailable: true → ready to receive trip requests; false → online but not taking trips
// Going offline forces isAvailable = false automatically.
router.patch("/me/availability", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { isOnline, isAvailable, lat, lng } = req.body;
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, req.user!.id)).limit(1);
  if (!driver) { res.status(404).json({ error: "Not a driver" }); return; }
  if (driver.status !== "approved") { res.status(403).json({ error: "Driver not approved" }); return; }

  // Cannot be available while offline
  const nextOnline = isOnline !== undefined ? isOnline : driver.isOnline;
  const nextAvailable = !nextOnline ? false : (isAvailable !== undefined ? isAvailable : driver.isAvailable);

  const [updated] = await db.update(driversTable)
    .set({
      isOnline: nextOnline,
      isAvailable: nextAvailable,
      availabilityUpdatedAt: new Date(),
      ...(lat !== undefined && { lat }),
      ...(lng !== undefined && { lng }),
    })
    .where(eq(driversTable.id, driver.id))
    .returning();

  res.json({
    ...updated,
    readyForTrips: updated.status === "approved" && updated.isOnline && updated.isAvailable,
  });
});

// PATCH /api/drivers/me/location
router.patch("/me/location", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { lat, lng } = req.body;
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, req.user!.id)).limit(1);
  if (!driver) { res.status(404).json({ error: "Not a driver" }); return; }

  const [updated] = await db.update(driversTable)
    .set({ lat, lng })
    .where(eq(driversTable.id, driver.id))
    .returning();
  res.json(updated);
});

// GET /api/drivers/me/earnings
router.get("/me/earnings", requireAuth, async (req: AuthenticatedRequest, res) => {
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, req.user!.id)).limit(1);
  if (!driver) { res.status(404).json({ error: "Not a driver" }); return; }

  const period = (req.query.period as string) || "week";
  const now = new Date();
  let since: Date;
  if (period === "today") { since = new Date(now.setHours(0, 0, 0, 0)); }
  else if (period === "week") { since = new Date(Date.now() - 7 * 86400000); }
  else if (period === "month") { since = new Date(Date.now() - 30 * 86400000); }
  else { since = new Date(0); }

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.driverId, driver.id), gte(paymentsTable.createdAt, since)))
    .orderBy(desc(paymentsTable.createdAt))
    .limit(50);

  const totalEarnings = payments.reduce((s, p) => s + p.amount, 0);
  const driverEarnings = payments.reduce((s, p) => s + p.driverAmount, 0);
  const platformCommission = payments.reduce((s, p) => s + p.platformAmount, 0);

  res.json({
    period,
    totalEarnings,
    platformCommission,
    driverEarnings,
    totalTrips: payments.length,
    recentPayments: payments,
  });
});

// GET /api/drivers/me/trips
router.get("/me/trips", requireAuth, async (req: AuthenticatedRequest, res) => {
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, req.user!.id)).limit(1);
  if (!driver) { res.status(404).json({ error: "Not a driver" }); return; }

  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;
  const trips = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.driverId, driver.id))
    .orderBy(desc(tripsTable.createdAt))
    .limit(limit)
    .offset(offset);
  res.json(trips);
});

// GET /api/drivers/:id
router.get("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, id)).limit(1);
  if (!driver) { res.status(404).json({ error: "Not found" }); return; }
  const pub = await buildDriverPublic(driver);
  res.json(pub);
});

export default router;
