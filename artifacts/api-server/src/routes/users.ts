import { Router } from "express";
import { db, usersTable, tripsTable, favoriteLocationsTable, driversTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../lib/authMiddleware";

const router = Router();

// GET /api/users/me
router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(req.user);
});

// PATCH /api/users/me
router.patch("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { firstName, lastName, phone, avatarUrl } = req.body;
  const [updated] = await db
    .update(usersTable)
    .set({
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, req.user!.id))
    .returning();
  res.json(updated);
});

// GET /api/users/me/trips
router.get("/me/trips", requireAuth, async (req: AuthenticatedRequest, res) => {
  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;
  const trips = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.customerId, req.user!.id))
    .orderBy(desc(tripsTable.createdAt))
    .limit(limit)
    .offset(offset);
  res.json(trips);
});

// GET /api/users/me/favorites
router.get("/me/favorites", requireAuth, async (req: AuthenticatedRequest, res) => {
  const favs = await db
    .select()
    .from(favoriteLocationsTable)
    .where(eq(favoriteLocationsTable.userId, req.user!.id))
    .orderBy(desc(favoriteLocationsTable.createdAt));
  res.json(favs);
});

// POST /api/users/me/favorites
router.post("/me/favorites", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { label, address, lat, lng, icon } = req.body;
  const [fav] = await db
    .insert(favoriteLocationsTable)
    .values({ userId: req.user!.id, label, address, lat, lng, icon: icon ?? "home" })
    .returning();
  res.status(201).json(fav);
});

// DELETE /api/users/me/favorites/:id
router.delete("/me/favorites/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  await db
    .delete(favoriteLocationsTable)
    .where(eq(favoriteLocationsTable.id, id));
  res.status(204).send();
});

export default router;
