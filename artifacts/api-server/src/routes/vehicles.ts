import { Router } from "express";
import { db, vehiclesTable, driversTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../lib/authMiddleware";

const router = Router();

// POST /api/vehicles
router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { make, model, year, plate, color, serviceTypeId, photoUrl, capacity } = req.body;
  const [driver] = await db
    .select()
    .from(driversTable)
    .where(eq(driversTable.userId, req.user!.id))
    .limit(1);
  if (!driver) { res.status(403).json({ error: "Must be a driver" }); return; }

  const [vehicle] = await db.insert(vehiclesTable).values({
    driverId: driver.id,
    make, model, year, plate, color, serviceTypeId,
    photoUrl: photoUrl ?? null,
    capacity: capacity ?? 4,
  }).returning();
  res.status(201).json(vehicle);
});

// GET /api/vehicles/:id
router.get("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id)).limit(1);
  if (!vehicle) { res.status(404).json({ error: "Not found" }); return; }
  res.json(vehicle);
});

// PATCH /api/vehicles/:id
router.patch("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { make, model, year, plate, color, photoUrl, capacity } = req.body;
  const [updated] = await db.update(vehiclesTable)
    .set({
      ...(make && { make }),
      ...(model && { model }),
      ...(year && { year }),
      ...(plate && { plate }),
      ...(color && { color }),
      ...(photoUrl !== undefined && { photoUrl }),
      ...(capacity && { capacity }),
    })
    .where(eq(vehiclesTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

export default router;
