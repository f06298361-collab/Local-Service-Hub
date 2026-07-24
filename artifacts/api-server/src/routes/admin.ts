import { Router } from "express";
import {
  db, usersTable, driversTable, tripsTable, paymentsTable,
  serviceTypesTable, platformConfigTable, citiesTable,
} from "@workspace/db";
import { eq, desc, count, sum, gte, and, like, ilike } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthenticatedRequest } from "../lib/authMiddleware";

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/stats
router.get("/stats", async (req: AuthenticatedRequest, res) => {
  const [{ total: totalUsers }] = await db.select({ total: count() }).from(usersTable);
  const [{ total: totalDrivers }] = await db.select({ total: count() }).from(driversTable);
  const [{ total: pendingDrivers }] = await db.select({ total: count() }).from(driversTable).where(eq(driversTable.status, "pending"));
  const [{ total: totalTrips }] = await db.select({ total: count() }).from(tripsTable);
  const [{ total: activeDrivers }] = await db.select({ total: count() }).from(driversTable).where(and(eq(driversTable.isAvailable, true), eq(driversTable.status, "approved")));
  const [{ total: activeTrips }] = await db.select({ total: count() }).from(tripsTable).where(eq(tripsTable.status, "in_progress"));

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const [{ total: tripsToday }] = await db.select({ total: count() }).from(tripsTable).where(gte(tripsTable.createdAt, todayStart));

  const earningsTodayRows = await db.select({ total: sum(paymentsTable.amount) }).from(paymentsTable).where(gte(paymentsTable.createdAt, todayStart));
  const earningsToday = Number(earningsTodayRows[0]?.total ?? 0);

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const earningsMonthRows = await db.select({ total: sum(paymentsTable.amount) }).from(paymentsTable).where(gte(paymentsTable.createdAt, monthStart));
  const earningsMonth = Number(earningsMonthRows[0]?.total ?? 0);

  res.json({
    totalUsers: Number(totalUsers),
    totalDrivers: Number(totalDrivers),
    pendingDrivers: Number(pendingDrivers),
    totalTrips: Number(totalTrips),
    activeTrips: Number(activeTrips),
    activeDrivers: Number(activeDrivers),
    tripsToday: Number(tripsToday),
    earningsToday,
    earningsMonth,
  });
});

// GET /api/admin/users
router.get("/users", async (req: AuthenticatedRequest, res) => {
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);
  const [{ total }] = await db.select({ total: count() }).from(usersTable);
  res.json({ data: users, total: Number(total) });
});

// GET /api/admin/users/:id
router.get("/users/:id", async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(user);
});

// PATCH /api/admin/users/:id
router.patch("/users/:id", async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { role, isActive, firstName, lastName } = req.body;
  const [updated] = await db.update(usersTable)
    .set({
      ...(role !== undefined && { role }),
      ...(isActive !== undefined && { isActive }),
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
    })
    .where(eq(usersTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).send();
});

// GET /api/admin/drivers
router.get("/drivers", async (req: AuthenticatedRequest, res) => {
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;
  const status = req.query.status as string | undefined;

  const conditions = status ? [eq(driversTable.status, status as any)] : [];
  const rows = await db.select().from(driversTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(driversTable.createdAt)).limit(limit).offset(offset);

  const [{ total }] = await db.select({ total: count() }).from(driversTable)
    .where(conditions.length ? and(...conditions) : undefined);

  // Enrich with user data
  const enriched = await Promise.all(rows.map(async (d) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, d.userId)).limit(1);
    const [stype] = await db.select().from(serviceTypesTable).where(eq(serviceTypesTable.id, d.serviceTypeId)).limit(1);
    return { ...d, user: user ?? null, vehicle: null, serviceType: stype ?? null };
  }));

  res.json({ data: enriched, total: Number(total) });
});

// PATCH /api/admin/drivers/:id
router.patch("/drivers/:id", async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const [updated] = await db.update(driversTable)
    .set({ ...(status !== undefined && { status }) })
    .where(eq(driversTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// GET /api/admin/trips
router.get("/trips", async (req: AuthenticatedRequest, res) => {
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;
  const status = req.query.status as string | undefined;
  const conditions = status ? [eq(tripsTable.status, status as any)] : [];
  const rows = await db.select().from(tripsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(tripsTable.createdAt)).limit(limit).offset(offset);
  const [{ total }] = await db.select({ total: count() }).from(tripsTable)
    .where(conditions.length ? and(...conditions) : undefined);
  res.json({ data: rows, total: Number(total) });
});

// GET /api/admin/config
router.get("/config", async (req: AuthenticatedRequest, res) => {
  const [config] = await db.select().from(platformConfigTable).limit(1);
  if (!config) {
    const [created] = await db.insert(platformConfigTable).values({}).returning();
    res.json(created); return;
  }
  res.json(config);
});

// PATCH /api/admin/config
router.patch("/config", async (req: AuthenticatedRequest, res) => {
  const { commissionPercent, minTripPrice, maxSearchRadius, allowedPaymentMethods, maintenanceMode } = req.body;
  const [config] = await db.select().from(platformConfigTable).limit(1);
  if (!config) {
    const [created] = await db.insert(platformConfigTable).values({
      ...(commissionPercent !== undefined && { commissionPercent }),
      ...(minTripPrice !== undefined && { minTripPrice }),
      ...(maxSearchRadius !== undefined && { maxSearchRadius }),
      ...(allowedPaymentMethods !== undefined && { allowedPaymentMethods: JSON.stringify(allowedPaymentMethods) }),
      ...(maintenanceMode !== undefined && { maintenanceMode }),
    }).returning();
    res.json(created); return;
  }
  const [updated] = await db.update(platformConfigTable)
    .set({
      ...(commissionPercent !== undefined && { commissionPercent }),
      ...(minTripPrice !== undefined && { minTripPrice }),
      ...(maxSearchRadius !== undefined && { maxSearchRadius }),
      ...(allowedPaymentMethods !== undefined && { allowedPaymentMethods: JSON.stringify(allowedPaymentMethods) }),
      ...(maintenanceMode !== undefined && { maintenanceMode }),
      updatedAt: new Date(),
    })
    .where(eq(platformConfigTable.id, config.id))
    .returning();
  res.json(updated);
});

// GET /api/admin/cities
router.get("/cities", async (req: AuthenticatedRequest, res) => {
  const cities = await db.select().from(citiesTable).orderBy(citiesTable.name);
  res.json(cities);
});

// POST /api/admin/cities
router.post("/cities", async (req: AuthenticatedRequest, res) => {
  const { name, country, state, isActive, lat, lng } = req.body;
  const [city] = await db.insert(citiesTable).values({
    name, country, state: state ?? null,
    isActive: isActive ?? true,
    lat: lat ?? null, lng: lng ?? null,
  }).returning();
  res.status(201).json(city);
});

// PATCH /api/admin/cities/:id
router.patch("/cities/:id", async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { name, country, state, isActive, lat, lng } = req.body;
  const [updated] = await db.update(citiesTable)
    .set({
      ...(name && { name }),
      ...(country && { country }),
      ...(state !== undefined && { state }),
      ...(isActive !== undefined && { isActive }),
      ...(lat !== undefined && { lat }),
      ...(lng !== undefined && { lng }),
    })
    .where(eq(citiesTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// GET /api/admin/earnings
router.get("/earnings", async (req: AuthenticatedRequest, res) => {
  const period = (req.query.period as string) || "month";
  const now = new Date();
  let since: Date;
  if (period === "today") { since = new Date(now.setHours(0, 0, 0, 0)); }
  else if (period === "week") { since = new Date(Date.now() - 7 * 86400000); }
  else if (period === "month") { since = new Date(Date.now() - 30 * 86400000); }
  else { since = new Date(0); }

  const payments = await db.select().from(paymentsTable).where(gte(paymentsTable.createdAt, since));
  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const platformRevenue = payments.reduce((s, p) => s + p.platformAmount, 0);
  const driverRevenue = payments.reduce((s, p) => s + p.driverAmount, 0);

  res.json({
    period,
    totalRevenue,
    platformRevenue,
    driverRevenue,
    totalTrips: payments.length,
    topDrivers: [],
  });
});

export default router;
