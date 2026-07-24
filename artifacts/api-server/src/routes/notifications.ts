import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../lib/authMiddleware";

const router = Router();

// GET /api/notifications
router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const unreadOnly = req.query.unreadOnly === "true";
  const limit = Number(req.query.limit) || 30;

  const conditions = [eq(notificationsTable.userId, req.user!.id)];
  if (unreadOnly) conditions.push(eq(notificationsTable.isRead, false));

  const notifs = await db
    .select()
    .from(notificationsTable)
    .where(and(...conditions))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit);

  res.json(notifs);
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const [updated] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.user!.id)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// PATCH /api/notifications/read-all
router.patch("/read-all", requireAuth, async (req: AuthenticatedRequest, res) => {
  const result = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, req.user!.id));
  res.json({ updated: result.rowCount ?? 0 });
});

export default router;
